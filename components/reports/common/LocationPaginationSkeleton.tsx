'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { LocationPaginationSkeletonProps } from '@/lib/types/components';

export default function LocationPaginationSkeleton({
  count = 10,
}: LocationPaginationSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* Location name and status */}
              <div className="flex items-center space-x-4">
                <div className="h-4 w-32 rounded bg-gray-200"></div>
                <div className="h-6 w-16 rounded bg-gray-200"></div>
              </div>

              {/* Metrics */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="mb-1 h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </div>
                <div className="text-center">
                  <div className="mb-1 h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </div>
                <div className="text-center">
                  <div className="mb-1 h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </div>
                <div className="text-center">
                  <div className="mb-1 h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 rounded-full bg-gray-200"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
