import React from 'react';
import Card from '../shared/Card';
import Skeleton, { SkeletonText, SkeletonAvatar } from '../shared/Skeleton';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700/50 flex items-center">
        <Skeleton className="w-6 h-6 mr-3" variant="circular" />
        <div className="flex-1">
          <SkeletonText width="300px" height="24px" lines={1} />
        </div>
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Panel Skeleton */}
          <Card>
            <SkeletonText lines={4} className="mb-4" />
            <div className="flex space-x-4">
              <Skeleton className="w-20 h-8" variant="rounded" />
              <Skeleton className="w-20 h-8" variant="rounded" />
              <Skeleton className="w-20 h-8" variant="rounded" />
            </div>
          </Card>

          {/* Chat Panel Skeleton */}
          <Card title="">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <SkeletonAvatar className="w-8 h-8" />
                <div className="flex-1">
                  <SkeletonText lines={2} />
                </div>
              </div>
              <div className="flex items-start space-x-3 justify-end">
                <div className="flex-1">
                  <SkeletonText lines={2} />
                </div>
                <SkeletonAvatar className="w-8 h-8" />
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Skeleton className="flex-1 h-10" variant="rounded" />
              <Skeleton className="w-20 h-10" variant="rounded" />
            </div>
          </Card>

          {/* Quiz Generator Skeleton */}
          <Card title="">
            <div className="space-y-4">
              <SkeletonText lines={2} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <SkeletonText lines={1} className="w-3/4" />
                  <Skeleton className="w-full h-32" variant="rounded" />
                </div>
                <div className="space-y-3">
                  <SkeletonText lines={1} className="w-3/4" />
                  <Skeleton className="w-full h-32" variant="rounded" />
                </div>
              </div>
            </div>
          </Card>

          {/* Exercise Generator Skeleton */}
          <Card title="">
            <div className="space-y-4">
              <SkeletonText lines={2} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="text-center p-3 border rounded-lg">
                    <Skeleton className="w-8 h-8 mx-auto mb-2" variant="circular" />
                    <SkeletonText lines={1} className="w-full" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Topics Cloud Skeleton */}
          <Card title="">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-8`}
                  variant="rounded"
                  width={`${Math.random() * 60 + 40}px`}
                />
              ))}
            </div>
          </Card>

          {/* Entity Extractor Skeleton */}
          <Card title="">
            <div className="space-y-4">
              <SkeletonText lines={2} />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-6 h-6" variant="circular" />
                      <SkeletonText lines={1} className="w-32" />
                    </div>
                    <Skeleton className="w-16 h-6" variant="rounded" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Document Text Skeleton */}
      <Card title="">
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div className="flex items-center space-x-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonText key={i} lines={1} className="w-24" />
              ))}
            </div>
          </div>
          <SkeletonText lines={8} />
        </div>
      </Card>
    </div>
  );
};

export default DashboardSkeleton;
