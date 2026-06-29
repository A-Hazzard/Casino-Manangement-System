/**
 * Country Table Skeleton Component
 * Loading skeleton for the country table (desktop view).
 *
 * Features:
 * - Matches AdministrationCountryTable layout structure
 * - 2 columns (NAME, ACTIONS)
 * - 8 skeleton rows
 * - Responsive design (desktop only)
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

function AdministrationCountryTableSkeleton() {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full">
          <thead className="bg-button text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                NAME
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-white">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-3">
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

export default AdministrationCountryTableSkeleton;
