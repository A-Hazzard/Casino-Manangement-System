import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type MemberTableSkeletonProps = {
  hideLocationColumn?: boolean;
};

export const MemberTableSkeleton: React.FC<MemberTableSkeletonProps> = ({
  hideLocationColumn = false,
}) => (
  <div className="overflow-x-auto rounded-lg bg-white shadow">
    <Table className="w-full table-fixed">
      <TableHeader>
        <TableRow className="bg-button hover:bg-button">
          <TableHead
            isFirstColumn={true}
            centered
            className="relative cursor-pointer font-semibold text-white"
          >
            <span>FULL NAME</span>
          </TableHead>
          {!hideLocationColumn && (
            <TableHead
              className="relative cursor-pointer font-semibold text-white"
            >
              <span>LOCATION</span>
            </TableHead>
          )}
          <TableHead
            centered
            className="relative cursor-pointer font-semibold text-white"
          >
            <span>WIN/LOSS</span>
          </TableHead>
          <TableHead
            centered
            className="relative cursor-pointer font-semibold text-white"
          >
            <span>JOINED</span>
          </TableHead>
          <TableHead centered className="font-semibold text-white">
            ACTIONS
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="cursor-pointer hover:bg-muted">
            <TableCell isFirstColumn={true} centered>
              <Skeleton className="mb-1 h-4 w-32" />
              <div className="mt-1 flex gap-1">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-3 w-12 rounded-full" />
              </div>
            </TableCell>
            {!hideLocationColumn && (
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            )}
            <TableCell centered>
              <Skeleton className="mx-auto h-4 w-20" />
              <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                <Skeleton className="h-3 w-12" />
                <span className="text-gray-400">|</span>
                <Skeleton className="h-3 w-12" />
              </div>
            </TableCell>
            <TableCell centered>
              <Skeleton className="mx-auto h-4 w-24" />
            </TableCell>
            <TableCell centered>
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default MemberTableSkeleton;
