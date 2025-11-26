/**
 * Player Session Table Skeleton Component
 * Loading skeleton for player session table component.
 *
 * Features:
 * - Matches PlayerSessionTable layout structure
 * - Desktop table skeleton (10 rows, 12 columns)
 * - Mobile card skeleton (3 cards)
 * - Pagination skeleton
 * - Responsive design
 */
import React from 'react';

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

// Session Card Skeleton Component for Mobile
const SessionCardSkeleton = () => {
  return (
    <div className="mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200"></div>
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlayerSessionTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg bg-white shadow-md"
      suppressHydrationWarning
    >
      {/* Mobile Card Skeleton View */}
      <div className="block lg:hidden">
        <div className="grid grid-cols-1 gap-4 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SessionCardSkeleton key={index} />
          ))}
        </div>
      </div>

      {/* Desktop Table Skeleton View */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-center">
            <thead className="bg-button text-white">
              <tr>
                {TABLE_HEADERS.map(header => (
                  <th
                    key={header.label}
                    className={`relative border border-border p-3 text-sm ${
                      header.sortable ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{header.label}</span>
                      {header.sortable && (
                        <div className="h-4 w-4 opacity-30">
                          <div className="h-4 w-4 animate-pulse rounded bg-gray-300"></div>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="hover:bg-muted">
                  {TABLE_HEADERS.map(header => (
                    <td
                      key={header.label}
                      className="border border-border bg-container p-3 text-left text-sm hover:bg-accent"
                    >
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-8 w-8 animate-pulse rounded bg-gray-200"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
