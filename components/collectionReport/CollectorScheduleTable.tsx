/**
 * Collector Schedule Table Component
 * Desktop table view for displaying collector schedules.
 *
 * Features:
 * - Collector schedule data display
 * - Status badges
 * - Date formatting
 * - Loading states
 * - Empty state handling
 * - Responsive design (desktop only)
 *
 * @param data - Array of collector schedule rows
 * @param loading - Whether data is loading
 */
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateString } from '@/lib/utils/dateUtils';
import { CollectorScheduleTableProps } from '@/lib/types/componentProps';

export default function CollectorScheduleTable({
  data,
  loading,
}: CollectorScheduleTableProps) {
  if (loading) {
    return (
      <div className="hidden items-center justify-center py-8 md:flex">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-t-4 border-buttonActive"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="hidden items-center justify-center py-8 md:flex">
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
    <div className="hidden w-full min-w-0 max-w-[90vw] overflow-x-auto rounded-lg bg-white shadow md:block">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule, index) => {
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
                  {schedule.collector || schedule.collectorName}
                </TableCell>
                <TableCell>
                  {schedule.location || schedule.locationName}
                </TableCell>
                <TableCell>{formatDateString(schedule.startTime)}</TableCell>
                <TableCell>{formatDateString(schedule.endTime)}</TableCell>
                <TableCell>{duration} hours</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      schedule.status === 'scheduled' ||
                      schedule.status === 'in-progress'
                        ? 'secondary'
                        : schedule.status === 'completed'
                          ? 'default'
                          : 'destructive'
                    }
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
