/**
 * Members Player Totals Card Skeleton Component
 * Loading skeleton for player totals card component.
 *
 * Features:
 * - Matches MembersPlayerTotalsCard layout structure
 * - Header, stats, and toggle button skeletons
 */

export default function MembersPlayerTotalsCardSkeleton() {
  // ============================================================================
  // Render - Skeleton
  // ============================================================================
  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="mb-2 h-6 w-32 animate-pulse rounded bg-gray-200"></div>
          <div className="mt-2 flex flex-wrap gap-4">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-4 w-16 animate-pulse rounded bg-gray-200"></div>
          <div className="h-6 w-6 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}
