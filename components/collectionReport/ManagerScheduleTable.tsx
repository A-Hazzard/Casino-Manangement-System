/**
 * Manager Schedule Table Component
 * Desktop table view for displaying manager schedules.
 *
 * Features:
 * - Manager schedule data display
 * - Status badges
 * - Loading states
 * - Empty state handling
 * - Responsive design (desktop only)
 *
 * @param data - Array of scheduler table rows
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
import type { SchedulerTableRow } from '@/lib/types/componentProps';

type Props = {
  data: SchedulerTableRow[];
  loading: boolean;
};

export default function ManagerScheduleTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="hidden items-center justify-center py-8 md:flex">
        <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-t-4 border-buttonActive"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="hidden items-center justify-center py-8 md:flex">
        <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-lg bg-white p-8 shadow-md">
          <div className="mb-2 text-lg text-gray-500">No Data Available</div>
          <div className="text-center text-sm text-gray-400">
            No scheduled visits found.
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
            <TableHead className="font-semibold text-white">MANAGER</TableHead>
            <TableHead className="font-semibold text-white">
              VISIT TIME
            </TableHead>
            <TableHead className="font-semibold text-white">
              CREATED AT
            </TableHead>
            <TableHead className="font-semibold text-white">STATUS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(row => (
            <TableRow key={row.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{row.collector}</TableCell>
              <TableCell>{row.location}</TableCell>
              <TableCell>{row.creator}</TableCell>
              <TableCell>{row.visitTime}</TableCell>
              <TableCell>{row.createdAt}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    row.status === 'pending'
                      ? 'secondary'
                      : row.status === 'completed'
                        ? 'default'
                        : 'destructive'
                  }
                  className={
                    row.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : row.status === 'completed'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
