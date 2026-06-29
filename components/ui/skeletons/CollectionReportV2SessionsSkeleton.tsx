/**
 * Collection Report V2 Sessions Skeleton Loader
 *
 * Matches exact layout of CollectionReportV2Desktop and CollectionReportV2Mobile.
 * Shows loading states for session list during data fetching.
 */

'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';

export default function CollectionReportV2SessionsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <div className="rounded-lg bg-white shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-button hover:bg-button">
                <TableHead isFirstColumn className="font-semibold text-white">
                  LOCATION
                </TableHead>
                <TableHead className="font-semibold text-white">
                  COLLECTOR
                </TableHead>
                <TableHead centered className="font-semibold text-white">
                  MATCHED
                </TableHead>
                <TableHead centered className="font-semibold text-white">
                  MACHINE GROSS
                </TableHead>
                <TableHead centered className="font-semibold text-white">
                  SAS GROSS
                </TableHead>
                <TableHead centered className="font-semibold text-white">
                  VARIATION
                </TableHead>
                <TableHead centered className="font-semibold text-white">
                  CREATED
                </TableHead>
                <TableHead centered className="font-semibold text-white">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell centered>
                    <Skeleton className="mx-auto h-4 w-12" />
                  </TableCell>
                  <TableCell centered>
                    <Skeleton className="mx-auto h-4 w-20" />
                  </TableCell>
                  <TableCell centered>
                    <Skeleton className="mx-auto h-4 w-20" />
                  </TableCell>
                  <TableCell centered>
                    <Skeleton className="mx-auto h-4 w-20" />
                  </TableCell>
                  <TableCell centered>
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                  <TableCell centered>
                    <div className="flex items-center justify-center gap-2">
                      <Skeleton className="h-6 w-14 rounded" />
                      <Skeleton className="h-6 w-14 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="space-y-4 md:hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="transform overflow-hidden rounded-lg bg-white shadow-sm"
          >
            {/* Header Section — matches "Session: [location]" and "Collector: [name]" */}
            <div className="bg-lighterBlueHighlight px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Session:</span>
                  <Skeleton className="h-4 w-32 bg-blue-300/50" />
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs text-blue-100">Collector: </span>
                <Skeleton className="h-3 w-24 bg-blue-300/50" />
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col gap-3 p-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Status
                </span>
                <Skeleton className="h-6 w-20 rounded bg-blue-100" />
              </div>

              {/* Stats Fields */}
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Machines Matched
                </span>
                <Skeleton className="h-5 w-12" />
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Machine Gross
                </span>
                <Skeleton className="h-5 w-20" />
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  SAS Gross
                </span>
                <Skeleton className="h-5 w-20" />
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Variation
                </span>
                <Skeleton className="h-5 w-20" />
              </div>

              <div className="flex justify-between border-t border-gray-100 pt-3">
                <span className="text-sm font-medium text-gray-700">
                  Date Created
                </span>
                <Skeleton className="h-5 w-24" />
              </div>

              {/* Action Buttons — matches actual: View Details + Submit + Edit + Delete */}
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-full rounded" />
                  <Skeleton className="h-9 w-full rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-full rounded" />
                  <Skeleton className="h-9 w-full rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
