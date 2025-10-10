interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // time to live in seconds
}

class CacheService {
  private cache = new Map<string, CacheEntry>();

  /**
   * Generate a unique key for document-based caching
   */
  generateKey(text: string, operation: string, params?: any): string {
    const textHash = this.simpleHash(text);
    const paramsHash = params ? this.simpleHash(JSON.stringify(params)) : '';
    return `${operation}_${textHash}_${paramsHash}`;
  }

  /**
   * Store data in cache with TTL
   */
  set(key: string, data: any, ttlSeconds: number = 3600): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }

  /**
   * Retrieve data from cache if not expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = (Date.now() - entry.timestamp) > (entry.ttl * 1000);
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove specific entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get cache size for monitoring
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > (entry.ttl * 1000)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Simple hash function for generating cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Auto cleanup expired entries every 5 minutes
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);
