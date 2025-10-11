import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-200 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]';

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-lg';
      default:
        return 'rounded-lg';
    }
  };

  const getSizeClasses = () => {
    if (variant === 'text' && lines > 1) {
      return 'space-y-2';
    }
    return '';
  };

  const getDimensions = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} ${getSizeClasses()}`}
            style={{
              ...getDimensions(),
              height: height || (index === lines - 1 ? '16px' : '20px'), // Last line shorter
              width: width || (index === lines - 1 ? '75%' : '100%') // Last line shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      style={getDimensions()}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="text" />
);

export const SkeletonAvatar: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="circular" />
);

export const SkeletonCard: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="rounded" />
);

export const SkeletonButton: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton {...props} variant="rounded" height={40} />
);

export default Skeleton;
