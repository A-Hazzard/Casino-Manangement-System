/**
 * Player Session Table Skeleton Component
 * Loading skeleton for player session table component.
 *
 * Features:
 * - Matches PlayerSessionTable layout structure with shadcn styling
 * - Desktop table skeleton (10 rows, 12 columns)
 * - Mobile card skeleton (3 cards)
 * - Pagination skeleton
 * - Responsive design
 */
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Constants
// ============================================================================

const TABLE_HEADERS = [
  { label: 'Login Time', sortable: true },
  { label: 'Session Length', sortable: true },
  { label: 'Money In', sortable: true },
  { label: 'Money Out', sortable: true },
  { label: 'Jackpot', sortable: true },
  { label: 'Won/Less', sortable: true },
  { label: 'Points', sortable: true },
  { label: 'Games Played', sortable: true },
  { label: 'Games Won', sortable: true },
  { label: 'Coin In', sortable: true },
  { label: 'Coin Out', sortable: true },
  { label: 'Actions', sortable: false },
];

// Session Card Skeleton Component for Mobile/Tablet
const SessionCardSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {/* Card Header */}
      <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Card Content - 2x2 Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function PlayerSessionTableSkeleton() {
  return (
    <div
      className="rounded-md border bg-white"
      suppressHydrationWarning
    >
      {/* Card Grid Skeleton View - below xl */}
      <div className="block p-4 xl:hidden">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SessionCardSkeleton key={index} />
          ))}
        </div>
      </div>

      {/* Desktop Table Skeleton View - xl and above */}
      <div className="hidden xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-button text-white">
              <tr>
                {TABLE_HEADERS.map(header => (
                  <th
                    key={header.label}
                    className="p-3 text-center font-medium text-white"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Skeleton className="h-4 w-20 bg-white/20" />
                      {header.sortable && (
                        <Skeleton className="h-4 w-4 bg-white/20" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="border-b">
                  {TABLE_HEADERS.map(header => (
                    <td
                      key={header.label}
                      className="bg-white p-3 text-center text-sm"
                    >
                      <Skeleton className="mx-auto h-4 w-16" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          {Array.from({ length  : 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-9 w-16"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
