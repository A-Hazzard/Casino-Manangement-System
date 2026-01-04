/**
 * Members Member Table Skeleton Component
 *
 * Loading skeleton for the member table view.
 * Matches the exact structure of MembersMemberTable component.
 *
 * @module components/members/tabs/MembersMemberTableSkeleton
 */
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export type MembersMemberTableSkeletonProps = {
  hideLocationColumn?: boolean;
};

export default function MembersMemberTableSkeleton({
  hideLocationColumn = false,
}: MembersMemberTableSkeletonProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg bg-white shadow">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-button">
            <th className="p-4 text-left font-semibold text-white">FULL NAME</th>
            {!hideLocationColumn && (
              <th className="p-4 text-left font-semibold text-white">LOCATION</th>
            )}
            <th className="p-4 text-center font-semibold text-white">WIN/LOSS</th>
            <th className="p-4 text-center font-semibold text-white">JOINED</th>
            <th className="p-4 text-center font-semibold text-white">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100">
              <td className="p-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded-full" />
                  </div>
                </div>
              </td>
              {!hideLocationColumn && (
                <td className="p-4 text-left">
                  <Skeleton className="h-4 w-40" />
                </td>
              )}
              <td className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </td>
              <td className="p-4 text-center text-center">
                <Skeleton className="mx-auto h-4 w-24" />
              </td>
              <td className="p-4 text-center text-center">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
