/**
 * Members Table Skeleton Component
 * Matches the actual layout of MembersTable (both mobile cards and desktop table)
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

type MembersTableSkeletonProps = {
  forcedLocationId?: string;
};

export default function MembersTableSkeleton({
  forcedLocationId,
}: MembersTableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Mobile View: Cards Skeleton */}
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="relative mx-auto w-full rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-5 w-3/4" />
                {!forcedLocationId && (
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-3 rounded-sm" />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View: Table Skeleton */}
      <div className="hidden overflow-x-auto bg-white shadow lg:block">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
              <TableHead
                isFirstColumn={true}
                className="font-semibold text-white"
              >
                <span>FULL NAME</span>
              </TableHead>
              <TableHead className="font-semibold text-white">
                <span>ADDRESS</span>
              </TableHead>
              <TableHead className="font-semibold text-white">
                <span>PHONE NUMBER</span>
              </TableHead>
              <TableHead className="font-semibold text-white">
                <span>LAST LOGIN</span>
              </TableHead>
              <TableHead className="font-semibold text-white">
                <span>CREATED AT</span>
              </TableHead>
              <TableHead className="font-semibold text-white">
                <span>WIN/LOSS</span>
              </TableHead>
              {!forcedLocationId && (
                <TableHead className="font-semibold text-white">
                  <span>LOCATION</span>
                </TableHead>
              )}
              <TableHead className="font-semibold text-white">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i} className="border-b hover:bg-muted/30">
                <TableCell isFirstColumn={true} className="bg-white p-3">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="bg-white p-3">
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="bg-white p-3">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="bg-white p-3">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="bg-white p-3">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="bg-white p-3">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                {!forcedLocationId && (
                  <TableCell className="bg-white p-3">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                )}
                <TableCell className="bg-white p-3">
                  <Skeleton className="h-8 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


