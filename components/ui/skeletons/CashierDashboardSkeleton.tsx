/**
 * Cashier Dashboard Page Skeleton Loader
 *
 * Matches exact layout of CashierDashboardPageContent
 * Shows loading states for cashier shift interface
 *
 * @module components/ui/skeletons/CashierDashboardSkeleton
 */
'use client';

import { Card, CardContent, CardHeader } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CashierDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Shift Status & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shift Banner Skeleton */}
          <div className="h-24 w-full rounded-lg bg-gray-100 animate-pulse" />

          {/* Balance/Stats Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-40" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="pt-4 border-t">
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Grid Skeleton */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right Column: Activity Section Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
