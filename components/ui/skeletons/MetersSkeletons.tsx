/**
 * Meters Skeletons
 *
 * Skeleton components for Meters-related tabs and features
 *
 * Features:
 * - Meters tab skeleton
 * - Meters table skeleton
 */

'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for meters table with filters
 */
export const MetersTableSkeleton = () => (
  <div className="space-y-6">
    {/* Filters skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>

    {/* Table skeleton */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Desktop table skeleton */}
          <div className="hidden md:block">
            <div className="mb-3 h-12 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-14 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
          {/* Mobile cards skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Pagination skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for Meters tab
 * Matches the actual layout: Header, Location Selection card with two columns, Meters Export Report card
 */
export const MetersTabSkeleton = () => (
  <div className="space-y-6">
    {/* Header with Export Buttons */}
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Location Selection & Controls Card */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Column: Location Selection Controls */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>

          {/* Right Column: simple placeholder (inline chart skeleton lives in MetersTab) */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Meters Export Report Card */}
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent>
        {/* Hourly Charts Skeleton - Matches MetersHourlyCharts loading state */}
        <div className="mb-6 space-y-4">
          {/* Games Played - Full Width Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          {/* Coin In and Coin Out - Side by Side Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Search bar skeleton */}
        <div className="mb-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>

        {/* Desktop table skeleton with proper column structure - lg and above */}
        <div className="hidden min-w-0 overflow-x-auto lg:block">
          <div className="min-w-full">
            <table className="w-full min-w-[800px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <Skeleton className="mx-auto h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        <Skeleton className="mx-auto h-4 w-16" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards skeleton - md and below (2x2 grid on md, single column on mobile) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm"
            >
              {/* Header skeleton */}
              <div className="mb-4 flex flex-col border-b border-gray-100 pb-3">
                <Skeleton className="mb-2 h-6 w-24 rounded-lg" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              {/* Metrics grid skeleton */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="rounded-lg bg-white p-3 shadow-sm">
                    <Skeleton className="mb-1 h-3 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
                <div className="col-span-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm">
                  <Skeleton className="mb-1 h-3 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              {/* View Machine button skeleton */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="mt-6 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

