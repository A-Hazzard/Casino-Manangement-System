/**
 * Licencee Table Skeleton Component
 * Loading skeleton for licencee table on desktop view.
 *
 * Features:
 * - Matches AdministrationLicenceeTable layout structure
 * - 8 skeleton rows
 * - 8 columns (NAME, COUNTRY, VALID FROM, EXPIRES, PAYMENT STATUS, INCLUDE JACKPOT, LAST EDITED, ACTIONS)
 * - Responsive design
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

function AdministrationLicenceeTableSkeleton() {
  // ============================================================================
  // Render - Table Skeleton
  // ============================================================================
  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full">
          <thead className="bg-button text-white">
            <tr>
              {[
                'NAME',
                'COUNTRY',
                'VALID FROM',
                'EXPIRES',
                'PAYMENT STATUS',
                'INCLUDE JACKPOT',
                'LAST EDITED',
                'ACTIONS',
              ].map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-4 w-24" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-5 w-10 rounded-full" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-5" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdministrationLicenceeTableSkeleton;
