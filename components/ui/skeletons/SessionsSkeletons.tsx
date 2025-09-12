import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Specific skeleton component for Sessions Page
 * Matches the exact layout of the sessions page with filters, table, and pagination
 */
export const SessionsPageSkeleton = () => (
  <div className="w-full mt-8 space-y-6">
    {/* Page Header skeleton */}
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Filters skeleton */}
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Sessions Table skeleton */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table Skeleton */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {Array.from({ length: 8 }).map((_, i) => (
                  <th key={i} className="text-center p-3">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-8 w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="lg:hidden space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div>
                  <Skeleton className="h-3 w-14 mb-1" />
                  <Skeleton className="h-4 w-18" />
                </div>
                <div>
                  <Skeleton className="h-3 w-10 mb-1" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            </div>
          ))}
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
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/**
 * Specific skeleton component for Session Events Page
 * Matches the exact layout of the session events page
 */
export const SessionEventsPageSkeleton = () => (
  <div className="w-full mt-8 space-y-6">
    {/* Page Header skeleton */}
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-8" />
      </div>
      <Skeleton className="h-4 w-80" />
    </div>

    {/* Session Info Card skeleton */}
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Events Table skeleton */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="text-center p-3">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);
