import { Skeleton } from '@/components/shared/ui/skeleton';
import { Button } from '@/components/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';

export default function CabinetsDetailsActivityLogSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="w-full">
      {/* Filter Controls — replicated from real table but disabled */}
      <div className="mb-4 rounded-lg bg-gray-50 p-4 space-y-4">
        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium text-gray-500">
            Quick Filters:
          </span>
          <Button variant="outline" size="sm" disabled className="border-red-200 text-red-600">
            Critical
          </Button>
          <Button variant="outline" size="sm" disabled className="border-orange-200 text-orange-500">
            Warning
          </Button>
          <Button variant="outline" size="sm" disabled className="border-blue-200 text-blue-500">
            INFO
          </Button>
          <Button variant="outline" size="sm" disabled className="border-purple-200 text-purple-600">
            SAS Event
          </Button>
        </div>

        {/* Granular Filters Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Second filter row: Game + Event Code cursor */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-16 rounded-md" />
          </div>
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden w-full overflow-x-auto rounded-lg lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button text-white">
              <TableHead className="text-white">Type</TableHead>
              <TableHead className="text-white">Event</TableHead>
              <TableHead className="text-white">Event Code</TableHead>
              <TableHead className="text-white">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              >
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="block w-full space-y-4 lg:hidden">
        {Array.from({ length: 5 }).map((_, cardIndex) => (
          <div
            key={cardIndex}
            className="w-full overflow-hidden rounded-lg border border-border bg-container shadow-md"
          >
            <div className="bg-button px-4 py-3">
              <Skeleton className="h-4 w-24 bg-white/20" />
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}
