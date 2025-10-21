import React, { useState, useEffect, useCallback } from 'react';
import Card from './shared/Card';
import { cacheService } from '../services/cacheService';
import { aiService } from '../services/aiService';

interface PerformanceMetrics {
  cacheStats: {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    evictions: number;
    memoryUsed: number;
  };
  aiServiceStats: {
    pendingRequests: number;
    cacheHitRate: number;
    totalRequests: number;
    averageResponseTime: number;
  };
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint?: number;
    firstInputDelay?: number;
    largestContentfulPaint?: number;
  };
  network: {
    pendingRequests: number;
    averageResponseTime: number;
    resourcesLoaded: number;
  };
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheStats: {
      ...cacheService.getStats(),
      memoryUsed: 0
    },
    aiServiceStats: {
      pendingRequests: 0,
      cacheHitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0
    },
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    timing: {
      domContentLoaded: 0,
      loadComplete: 0,
      firstContentfulPaint: 0
    },
    network: {
      pendingRequests: 0,
      averageResponseTime: 0,
      resourcesLoaded: 0
    }
  });

  const [isVisible, setIsVisible] = useState(false);
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    const cacheStats = cacheService.getStats();

    // Memory usage (if available)
    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? {
      used: memoryInfo.usedJSHeapSize,
      total: memoryInfo.totalJSHeapSize,
      percentage: Math.round((memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100)
    } : { used: 0, total: 0, percentage: 0 };

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const timing = {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
      firstContentfulPaint: 0,
      firstInputDelay: 0,
      largestContentfulPaint: 0
    };

    // First Contentful Paint (if available)
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      timing.firstContentfulPaint = fcpEntry.startTime;
    }

    // First Input Delay (if available)
    const fidEntries = performance.getEntriesByType('measure') as PerformanceEntry[];
    const fidEntry = fidEntries.find(entry => entry.name.includes('first-input-delay'));
    if (fidEntry) {
      timing.firstInputDelay = fidEntry.duration;
    }

    // Largest Contentful Paint (if available)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      timing.largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // AI Service statistics
    const aiStats = aiService.getCacheStats();
    const aiServiceStats = {
      pendingRequests: aiService.getPendingRequestCount(),
      cacheHitRate: aiStats.hitRate,
      totalRequests: aiStats.totalHits + aiStats.totalMisses,
      averageResponseTime: 0 // Could be implemented with request timing
    };

    // Network resources
    const resourcesLoaded = performance.getEntriesByType('resource').length;
    const networkRequests = performance.getEntriesByType('resource').filter(
      entry => entry.duration > 0
    ) as PerformanceResourceTiming[];

    const averageResponseTime = networkRequests.length > 0
      ? networkRequests.reduce((sum, req) => sum + req.duration, 0) / networkRequests.length
      : 0;

    setMetrics(prev => ({
      ...prev,
      cacheStats: {
        ...cacheStats,
        memoryUsed: memoryUsage.used
      },
      aiServiceStats,
      memoryUsage,
      timing,
      network: {
        pendingRequests: aiServiceStats.pendingRequests,
        averageResponseTime,
        resourcesLoaded
      }
    }));
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (updateInterval) return;

    collectMetrics(); // Initial collection

    const interval = setInterval(collectMetrics, 5000); // Update every 5 seconds
    setUpdateInterval(interval);
  }, [collectMetrics, updateInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
      setUpdateInterval(null);
    }
  }, [updateInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopMonitoring();
  }, [stopMonitoring]);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format time to human readable
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            setIsVisible(true);
            startMonitoring();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open Performance Monitor"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card title="Performance Monitor" variant="elevated">
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Real-time Monitoring
            </span>
            <button
              onClick={() => {
                setIsVisible(false);
                stopMonitoring();
              }}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              title="Close Monitor"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cache Statistics */}
          <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Cache Performance
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Size:</span>
                <span className="ml-1 font-mono">{metrics.cacheStats.size} entries</span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Hit Rate:</span>
                <span className="ml-1 font-mono text-green-600">
                  {formatPercentage(metrics.cacheStats.hitRate)}
                </span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Hits:</span>
                <span className="ml-1 font-mono">{metrics.cacheStats.totalHits}</span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Misses:</span>
                <span className="ml-1 font-mono">{metrics.cacheStats.totalMisses}</span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Memory:</span>
                <span className="ml-1 font-mono">{formatBytes(metrics.cacheStats.memoryUsed)}</span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Evictions:</span>
                <span className="ml-1 font-mono">{metrics.cacheStats.evictions}</span>
              </div>
            </div>
          </div>

          {/* AI Service Statistics */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">
              AI Service Performance
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-indigo-600 dark:text-indigo-400">Pending Requests:</span>
                <span className="ml-1 font-mono">{metrics.aiServiceStats.pendingRequests}</span>
              </div>
              <div>
                <span className="text-indigo-600 dark:text-indigo-400">Cache Hit Rate:</span>
                <span className="ml-1 font-mono text-green-600">
                  {formatPercentage(metrics.aiServiceStats.cacheHitRate)}
                </span>
              </div>
              <div>
                <span className="text-indigo-600 dark:text-indigo-400">Total Requests:</span>
                <span className="ml-1 font-mono">{metrics.aiServiceStats.totalRequests}</span>
              </div>
              <div>
                <span className="text-indigo-600 dark:text-indigo-400">Avg Response:</span>
                <span className="ml-1 font-mono">{formatTime(metrics.aiServiceStats.averageResponseTime)}</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage.total > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Memory Usage
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">Used:</span>
                  <span className="font-mono">{formatBytes(metrics.memoryUsage.used)}</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${metrics.memoryUsage.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">Total:</span>
                  <span className="font-mono">{formatBytes(metrics.memoryUsage.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timing Information */}
          <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Core Web Vitals
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Largest Contentful Paint:</span>
                <span className="font-mono">{metrics.timing.largestContentfulPaint ? formatTime(metrics.timing.largestContentfulPaint) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">First Input Delay:</span>
                <span className="font-mono">{metrics.timing.firstInputDelay ? formatTime(metrics.timing.firstInputDelay) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">First Contentful Paint:</span>
                <span className="font-mono">{metrics.timing.firstContentfulPaint ? formatTime(metrics.timing.firstContentfulPaint) : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Page Load Times
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">DOM Content Loaded:</span>
                <span className="font-mono">{formatTime(metrics.timing.domContentLoaded)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Load Complete:</span>
                <span className="font-mono">{formatTime(metrics.timing.loadComplete)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={collectMetrics}
              className="flex-1 px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                cacheService.clear();
                aiService.clearCache();
              }}
              className="flex-1 px-3 py-2 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            >
              Clear All Cache
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;
