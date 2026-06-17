/**
 * Collector Schedule Table Component
 * Desktop table view for displaying collector schedules.
 *
 * Features:
 * - Collector schedule data display
 * - Status badges
 * - Edit and soft-delete actions (manager, admin, location admin, owner, developer)
 * - Date formatting and duration calculations
 * - Loading states
 * - Empty state handling
 * - Responsive design (desktop only)
 */
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Skeleton } from '@/components/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type {
  CollectorSchedule,
  CollectorScheduleTableProps,
} from '@/lib/types/components';
import { formatDateString } from '@/lib/utils/date';
import { Pencil, Trash2 } from 'lucide-react';

export default function CollectionReportCollectorScheduleTable({
  data,
  loading,
  onEdit,
  onDelete,
  showActions = false,
}: CollectorScheduleTableProps) {
  // ============================================================================
  // Render
  // ============================================================================
  if (loading) {
    return (
      <div className="hidden w-full min-w-0 overflow-x-auto rounded-lg bg-white shadow lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              <TableHead className="font-semibold text-white">COLLECTOR</TableHead>
              <TableHead className="font-semibold text-white">LOCATION</TableHead>
              <TableHead className="font-semibold text-white">START TIME</TableHead>
              <TableHead className="font-semibold text-white">END TIME</TableHead>
              <TableHead className="font-semibold text-white">DURATION</TableHead>
              <TableHead className="font-semibold text-white">STATUS</TableHead>
              {showActions && (
                <TableHead className="font-semibold text-white">ACTIONS</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-gray-50">
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                {showActions && (
                  <TableCell><div className="flex gap-1"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="hidden items-center justify-center py-8 lg:flex">
        <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-lg bg-white p-8 shadow-md">
          <div className="mb-2 text-lg text-gray-500">No Data Available</div>
          <div className="text-center text-sm text-gray-400">
            No collector schedules found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden w-full min-w-0 overflow-x-auto rounded-lg bg-white shadow lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="font-semibold text-white">
              COLLECTOR
            </TableHead>
            <TableHead className="font-semibold text-white">LOCATION</TableHead>
            <TableHead className="font-semibold text-white">
              START TIME
            </TableHead>
            <TableHead className="font-semibold text-white">END TIME</TableHead>
            <TableHead className="font-semibold text-white">DURATION</TableHead>
            <TableHead className="font-semibold text-white">STATUS</TableHead>
            {showActions && (
              <TableHead className="font-semibold text-white">
                ACTIONS
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule: CollectorSchedule, index: number) => {
            const startTime = new Date(schedule.startTime);
            const endTime = new Date(schedule.endTime);
            const duration = (
              (endTime.getTime() - startTime.getTime()) /
              (1000 * 60 * 60)
            ).toFixed(1);

            return (
              <TableRow
                key={schedule._id || index}
                className="hover:bg-gray-50"
              >
                <TableCell className="font-medium">
                  {schedule.collectorName || schedule.collector || 'Unknown'}
                </TableCell>
                <TableCell>
                  {schedule.locationName || schedule.location}
                </TableCell>
                <TableCell>{formatDateString(schedule.startTime)}</TableCell>
                <TableCell>{formatDateString(schedule.endTime)}</TableCell>
                <TableCell>{duration} hours</TableCell>
                <TableCell>
                  <Badge
                    className={
                      schedule.status === 'scheduled' ||
                      schedule.status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : schedule.status === 'completed'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }
                  >
                    {schedule.status}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-500 hover:text-button"
                        onClick={() => onEdit?.(schedule)}
                        title="Edit schedule"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                        onClick={() => onDelete?.(schedule)}
                        title="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
