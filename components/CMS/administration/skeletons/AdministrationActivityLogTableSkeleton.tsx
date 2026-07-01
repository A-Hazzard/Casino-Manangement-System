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

export default function AdministrationActivityLogTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 font-semibold">
              <Skeleton className="h-4 w-4 rounded" />
            </TableHead>
            <TableHead className="font-semibold">Timestamp</TableHead>
            <TableHead centered className="font-semibold">User</TableHead>
            <TableHead centered className="font-semibold">Action</TableHead>
            <TableHead centered className="font-semibold">Resource</TableHead>
            <TableHead className="min-w-0 max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl font-semibold">Description</TableHead>
            <TableHead centered className="font-semibold">IP Address</TableHead>
            <TableHead centered className="font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-4 rounded" />
              </TableCell>
              <TableCell className="font-mono text-sm">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell centered>
                <div className="space-y-1">
                  <Skeleton className="mx-auto h-4 w-20" />
                  <Skeleton className="mx-auto h-3 w-32" />
                  <Skeleton className="mx-auto h-3 w-24" />
                </div>
              </TableCell>
              <TableCell centered>
                <Skeleton className="mx-auto h-6 w-16 rounded-full" />
              </TableCell>
              <TableCell centered>
                <Skeleton className="mx-auto h-6 w-20 rounded-full" />
              </TableCell>
              <TableCell className="min-w-0 max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </TableCell>
              <TableCell centered>
                <div className="flex items-center justify-center gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-3 rounded" />
                </div>
              </TableCell>
              <TableCell centered>
                <Skeleton className="mx-auto h-8 w-8 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
