/**
 * Administration User Table Skeleton Component
 * Loading skeleton for user table on desktop view.
 *
 * Matches the exact column structure of AdministrationUserTable:
 * NAME, USERNAME, EMAIL ADDRESS, ENABLED, LOGIN COUNT, LAST LOGIN, SESSION, ACTIONS
 *
 * @module components/administration/AdministrationUserTableSkeleton
 */

'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

/**
 * Administration User Table Skeleton
 */
export function AdministrationUserTableSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full rounded-lg bg-white shadow-md">
        <thead className="bg-button text-white">
          <tr>
            {[
              'NAME',
              'USERNAME',
              'EMAIL ADDRESS',
              'ENABLED',
              'LOGIN COUNT',
              'LAST LOGIN',
              'SESSION',
              'ACTIONS',
            ].map(col => (
              <th
                key={col}
                className="select-none px-4 py-3 text-left text-sm font-semibold"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, idx) => (
            <tr key={idx} className="border-b last:border-b-0">
              {/* NAME */}
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-3/4" />
              </td>
              {/* USERNAME + role badges */}
              <td className="px-4 py-3">
                <Skeleton className="mb-2 h-4 w-28" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="h-4 w-10 rounded" />
                </div>
              </td>
              {/* EMAIL */}
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-40" />
              </td>
              {/* ENABLED */}
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-12" />
              </td>
              {/* LOGIN COUNT */}
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-8" />
              </td>
              {/* LAST LOGIN */}
              <td className="px-4 py-3">
                <Skeleton className="mb-1 h-4 w-20" />
                <Skeleton className="h-3 w-28" />
              </td>
              {/* SESSION */}
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-12 rounded" />
              </td>
              {/* ACTIONS */}
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
