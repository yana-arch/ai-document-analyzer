import { cacheService } from '../services/cacheService';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface RequestConfig {
  timeout?: number;
  retries?: RetryOptions;
  cache?: boolean;
  cacheTtl?: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

class APIUtils {
  private pendingRequests = new Map<string, PendingRequest>();
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  /**
   * Generate a unique key for request deduplication
   */
  private generateRequestKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}_${url}_${body}`;
  }

  /**
   * Execute API call with retry mechanism and caching
   */
  async executeWithRetry<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const requestKey = this.generateRequestKey(url, options);
    const {
      timeout = 30000,
      retries = this.defaultRetryOptions,
      cache = false,
      cacheTtl = 300 // 5 minutes default
    } = config;

    // Check cache first if enabled
    if (cache) {
      const cacheKey = `api_${requestKey}`;
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for pending request to avoid duplicates
    const pending = this.pendingRequests.get(requestKey);
    if (pending) {
      // If request is still fresh (less than 30 seconds old), reuse it
      if (Date.now() - pending.timestamp < 30000) {
        return pending.promise;
      } else {
        // Abort old request
        pending.abortController?.abort();
        this.pendingRequests.delete(requestKey);
      }
    }

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    const requestOptions = {
      ...options,
      signal: abortController.signal
    };

    // Create the request promise
    const requestPromise = this.executeWithRetryLogic<T>(url, requestOptions, retries);

    // Store pending request
    this.pendingRequests.set(requestKey, {
      promise: requestPromise,
      timestamp: Date.now(),
      abortController
    });

    try {
      const result = await requestPromise;

      // Cache result if enabled
      if (cache) {
        const cacheKey = `api_${requestKey}`;
        cacheService.set(cacheKey, result, cacheTtl);
      }

      return result;
    } finally {
      // Clean up
      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Core retry logic with exponential backoff
   */
  private async executeWithRetryLogic<T>(
    url: string,
    options: RequestInit,
    retryOptions: RetryOptions
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text() as unknown as T;
        }
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          const statusCode = error.message.match(/HTTP (\d+)/)?.[1];
          if (statusCode && statusCode !== '429') {
            throw error;
          }
        }

        // Don't retry if it's the last attempt
        if (attempt === retryOptions.maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryOptions.baseDelay * Math.pow(retryOptions.backoffFactor, attempt),
          retryOptions.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        console.warn(`API request failed (attempt ${attempt + 1}/${retryOptions.maxRetries + 1}), retrying in ${Math.round(jitteredDelay)}ms:`, error);
        await this.delay(jitteredDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Batch multiple API calls
   */
  async batchRequests<T>(
    requests: Array<{
      url: string;
      options?: RequestInit;
      config?: RequestConfig;
    }>
  ): Promise<T[]> {
    const promises = requests.map(({ url, options = {}, config = {} }) =>
      this.executeWithRetry<T>(url, options, config)
    );

    return Promise.all(promises);
  }

  /**
   * Execute multiple similar requests in parallel with rate limiting
   */
  async executeParallelWithRateLimit<T>(
    requests: Array<{
      url: string;
      options?: RequestInit;
      config?: RequestConfig;
    }>,
    concurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);

      const batchPromises = batch.map(async ({ url, options = {}, config = {} }, index) => {
        const result = await this.executeWithRetry<T>(url, options, config);
        results[i + index] = result;
      });

      executing.push(...batchPromises);

      // Wait for current batch to complete before starting next
      if (i + concurrency < requests.length) {
        await Promise.all(executing);
        executing.length = 0; // Clear the array
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Create a cancellable request
   */
  createCancellableRequest<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): {
    execute: () => Promise<T>;
    cancel: () => void;
  } {
    const abortController = new AbortController();

    const execute = async () => {
      return this.executeWithRetry<T>(url, {
        ...options,
        signal: abortController.signal
      }, config);
    };

    const cancel = () => {
      abortController.abort();
    };

    return { execute, cancel };
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Clear API cache
   */
  clearCache() {
    // Clear only API-related cache entries
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('api_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiUtils = new APIUtils();

// Export types for use in other modules
export type { RetryOptions, RequestConfig, PendingRequest };
