// Performance optimization utilities

// Debounce utility for limiting function calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
};

// Throttle utility for limiting function calls
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
};

// Lazy loading utility
export const lazyLoad = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(() =>
    importFunc().catch(error => {
      console.error('Error loading component:', error);
      // Return a fallback component
      return {
        default: (() => React.createElement('div', {
          className: 'flex items-center justify-center p-8 text-red-500',
          children: 'Error loading component'
        })) as T
      };
    })
  );
};

// Virtual scrolling utilities
export const virtualScrollUtils = {
  // Calculate visible items for virtual scrolling
  getVisibleRange: (
    scrollTop: number,
    itemHeight: number,
    containerHeight: number,
    totalItems: number
  ) => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, totalItems);

    return {
      startIndex,
      endIndex,
      visibleCount
    };
  },

  // Get container style for virtual scrolling
  getContainerStyle: (totalHeight: number) => ({
    height: totalHeight,
    position: 'relative' as const
  }),

  // Get item style for virtual scrolling
  getItemStyle: (index: number, itemHeight: number) => ({
    position: 'absolute' as const,
    top: index * itemHeight,
    width: '100%',
    height: itemHeight
  })
};

// Image optimization utilities
export const imageUtils = {
  // Generate responsive image sources
  generateSrcSet: (baseUrl: string, widths: number[]): string => {
    return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
  },

  // Generate sizes attribute for responsive images
  generateSizes: (breakpoints: { breakpoint: string; size: string }[]): string => {
    return breakpoints.map(bp => `(max-width: ${bp.breakpoint}) ${bp.size}`).join(', ');
  },

  // Lazy load image with intersection observer
  lazyLoadImage: (img: HTMLImageElement, src: string, options?: IntersectionObserverInit) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.remove('loading');
          observer.disconnect();
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(img);
    return observer;
  }
};

// Component performance utilities
export const componentUtils = {
  // Measure component render time
  measureRenderTime: (componentName: string) => {
    const startTime = performance.now();

    return {
      end: () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);

        // Log slow renders
        if (renderTime > 16) {
          console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  },

  // Optimize re-renders with shallow comparison
  shallowEqual: (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (!(key in obj2) || obj1[key] !== obj2[key]) return false;
    }

    return true;
  }
};

// Network performance utilities
export const networkUtils = {
  // Prefetch resources
  prefetch: (url: string): void => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  },

  // Preload critical resources
  preload: (url: string, as: string): void => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  },

  // Check network status
  getNetworkStatus: (): Promise<{ online: boolean; connection?: string }> => {
    return new Promise((resolve) => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        resolve({
          online: navigator.onLine,
          connection: connection?.effectiveType || 'unknown'
        });
      } else {
        resolve({ online: navigator.onLine });
      }
    });
  }
};

// Memory management utilities
export const memoryUtils = {
  // Clean up event listeners
  cleanup: (cleanupFunctions: (() => void)[]): void => {
    cleanupFunctions.forEach(cleanup => cleanup());
  },

  // Force garbage collection (if available)
  forceGC: (): void => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  },

  // Monitor memory usage
  getMemoryUsage: (): { used: number; total: number; percentage: number } => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = memory.totalJSHeapSize / 1024 / 1024; // MB
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }
};

// Bundle optimization utilities
export const bundleUtils = {
  // Dynamic imports for code splitting
  loadComponent: async <T>(importFn: () => Promise<{ default: T }>): Promise<T> => {
    try {
      const module = await importFn();
      return module.default;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    }
  },

  // Load multiple components in parallel
  loadComponents: async <T extends Record<string, () => Promise<any>>>(
    imports: T
  ): Promise<{ [K in keyof T]: T[K] extends () => Promise<infer U> ? U : never }> => {
    const keys = Object.keys(imports) as (keyof T)[];
    const promises = keys.map(key => imports[key]());

    try {
      const results = await Promise.all(promises);
      return keys.reduce((acc, key, index) => {
        acc[key] = results[index].default;
        return acc;
      }, {} as any);
    } catch (error) {
      console.error('Failed to load components:', error);
      throw error;
    }
  }
};

// React performance hooks utilities
export const reactUtils = {
  // Custom hook for measuring component performance
  usePerformanceMonitor: (componentName: string) => {
    React.useEffect(() => {
      const timer = componentUtils.measureRenderTime(componentName);
      return timer.end;
    });
  },

  // Custom hook for debounced values
  useDebounce: <T>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  },

  // Custom hook for throttled values
  useThrottle: <T>(value: T, limit: number): T => {
    const [throttledValue, setThrottledValue] = React.useState<T>(value);
    const lastRun = React.useRef<number>(Date.now());

    React.useEffect(() => {
      const now = Date.now();
      if (now - lastRun.current >= limit) {
        setThrottledValue(value);
        lastRun.current = now;
      } else {
        const timer = setTimeout(() => {
          setThrottledValue(value);
          lastRun.current = Date.now();
        }, limit - (now - lastRun.current));

        return () => clearTimeout(timer);
      }
    }, [value, limit]);

    return throttledValue;
  }
};

// Import React for hooks
import React from 'react';
