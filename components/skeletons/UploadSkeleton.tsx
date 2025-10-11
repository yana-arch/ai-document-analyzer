import React from 'react';
import Skeleton, { SkeletonText } from '../shared/Skeleton';

const UploadSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-16 sm:py-24 text-center">
      {/* Title Skeleton */}
      <SkeletonText width="400px" height="40px" lines={1} className="mx-auto mb-4" />
      <SkeletonText width="300px" height="20px" lines={1} className="mx-auto mb-8" />

      {/* Instructions Skeleton */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800 max-w-2xl mx-auto">
        <SkeletonText width="200px" height="24px" lines={1} className="mb-2 mx-auto" />
        <SkeletonText width="400px" height="16px" lines={1} className="mb-4 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-2">
              <Skeleton className="w-2 h-2 mt-2 shrink-0" variant="circular" />
              <SkeletonText width={`${Math.random() * 100 + 100}px`} height="16px" lines={1} />
            </div>
          ))}
        </div>
      </div>

      {/* Upload Form Skeleton */}
      <div className="mt-12 bg-white dark:bg-zinc-800/50 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50 max-w-2xl mx-auto">
        {/* URL Input Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="flex-grow h-12" variant="rounded" />
          <Skeleton className="w-32 h-12" variant="rounded" />
        </div>

        {/* Divider Skeleton */}
        <div className="my-6 flex items-center">
          <Skeleton className="flex-grow h-px" variant="rectangular" />
          <SkeletonText width="60px" height="16px" lines={1} className="mx-4" />
          <Skeleton className="flex-grow h-px" variant="rectangular" />
        </div>

        {/* File Upload Area Skeleton */}
        <div className="relative border-2 border-dashed rounded-xl p-12 text-center">
          <Skeleton className="w-10 h-10 mx-auto mb-4" variant="circular" />
          <SkeletonText width="200px" height="20px" lines={1} className="mb-2 mx-auto" />
          <SkeletonText width="150px" height="16px" lines={1} className="mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default UploadSkeleton;
