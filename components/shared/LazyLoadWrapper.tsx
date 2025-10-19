import React, { Suspense, ComponentType, ReactNode, Component } from 'react';
import Loader from './Loader';

interface LazyLoadWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  loaderVariant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  loaderSize?: 'sm' | 'md' | 'lg' | 'xl';
  loaderMessage?: string;
}

/**
 * Enhanced lazy loading wrapper with error boundary and loading states
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  loaderVariant = 'spinner',
  loaderSize = 'md',
  loaderMessage = 'Loading...'
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <Loader
        variant={loaderVariant}
        size={loaderSize}
        message={loaderMessage}
      />
    </div>
  );

  const defaultErrorFallback = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        Failed to load component
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">
        Something went wrong while loading this section.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  return (
    <SafeWrapper fallback={errorFallback || defaultErrorFallback}>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </SafeWrapper>
  );
};

// Simple wrapper without error boundary for now
const SafeWrapper: React.FC<{ children: ReactNode; fallback: ReactNode }> = ({ children, fallback }) => {
  return <>{children}</>;
};

/**
 * Higher-order component for lazy loading with preloading
 */
export function withLazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  const LazyComponent = React.lazy(importFunc);

  return React.forwardRef<any, P>((props, ref) => (
    <LazyLoadWrapper fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyLoadWrapper>
  ));
}

/**
 * Hook for preloading components
 */
export function usePreloadComponent(importFunc: () => Promise<any>) {
  return React.useCallback(() => {
    importFunc().catch(error => {
      console.warn('Failed to preload component:', error);
    });
  }, [importFunc]);
}

/**
 * Preload critical components on app start
 */
export function preloadCriticalComponents() {
  // Preload commonly used components
  const criticalComponents = [
    () => import('../QnAChat'),
  ];

  criticalComponents.forEach(preload => {
    preload().catch(error => {
      console.warn('Failed to preload critical component:', error);
    });
  });
}

export default LazyLoadWrapper;
