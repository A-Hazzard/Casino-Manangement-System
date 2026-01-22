/**
 * Licensee Table Skeleton Component
 * Loading skeleton for licensee table on desktop view.
 *
 * Features:
 * - Matches AdministrationLicenseeTable layout structure
 * - 8 skeleton rows
 * - 5 columns (NAME, COUNTRY, STATUS, EXPIRY DATE, ACTIONS)
 * - Responsive design
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

function AdministrationLicenseeTableSkeleton() {
  // ============================================================================
  // Render - Table Skeleton
  // ============================================================================
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full rounded-lg bg-white shadow-md">
        <thead className="bg-button text-white">
          <tr>
            {['NAME', 'COUNTRY', 'STATUS', 'EXPIRY DATE', 'ACTIONS'].map(
              col => (
                <th
                  key={col}
                  className="select-none px-4 py-3 text-left text-sm font-semibold"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, idx) => (
            <tr key={idx} className="border-b last:border-b-0">
              {Array.from({ length: 5 }).map((__, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton className="h-4 w-3/4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdministrationLicenseeTableSkeleton;

