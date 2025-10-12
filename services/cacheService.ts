interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // time to live in seconds
  size: number; // estimated size in bytes
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  evictions: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number = 50 * 1024 * 1024; // 50MB default
  private currentSize: number = 0;
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    evictions: 0,
    sets: 0,
    deletes: 0
  };

  constructor(maxSizeMB: number = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024;
    // Auto cleanup every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  /**
   * Generate a unique key for document-based caching
   */
  generateKey(text: string, operation: string, params?: any): string {
    const textHash = this.simpleHash(text);
    const paramsHash = params ? this.simpleHash(JSON.stringify(params)) : '';
    return `${operation}_${textHash}_${paramsHash}`;
  }

  /**
   * Store data in cache with TTL and size management
   */
  set(key: string, data: any, ttlSeconds: number = 3600): void {
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;

    // Check if adding this entry would exceed max size
    if (size > this.maxSize) {
      console.warn(`Cache entry too large: ${size} bytes, max allowed: ${this.maxSize}`);
      return;
    }

    // If key exists, remove old entry first
    if (this.cache.has(key)) {
      this.removeEntry(key);
    }

    // Evict entries if necessary to make room
    this.evictIfNeeded(size);

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds,
      size,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.currentSize += size;
    this.stats.sets++;
  }

  /**
   * Retrieve data from cache if not expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.totalMisses++;
      return null;
    }

    const isExpired = (Date.now() - entry.timestamp) > (entry.ttl * 1000);
    if (isExpired) {
      this.removeEntry(key);
      this.stats.totalMisses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.totalHits++;

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
    this.currentSize = 0;
    this.resetStats();
  }

  /**
   * Remove specific entry
   */
  delete(key: string): void {
    if (this.cache.has(key)) {
      this.removeEntry(key);
      this.stats.deletes++;
    }
  }

  /**
   * Get cache size for monitoring
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get current memory usage in bytes
   */
  memoryUsage(): number {
    return this.currentSize;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      evictions: this.stats.evictions
    };
  }

  /**
   * Clean expired entries and enforce size limits
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > (entry.ttl * 1000)) {
        keysToDelete.push(key);
      }
    }

    // Remove expired entries
    for (const key of keysToDelete) {
      this.removeEntry(key);
    }

    // If still over size limit, evict LRU entries
    if (this.currentSize > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Remove entry and update size tracking
   */
  private removeEntry(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
    }
  }

  /**
   * Evict entries if adding new one would exceed size limit
   */
  private evictIfNeeded(newEntrySize: number): void {
    while (this.currentSize + newEntrySize > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entries (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    // Find least recently accessed entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.removeEntry(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      sets: 0,
      deletes: 0
    };
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
