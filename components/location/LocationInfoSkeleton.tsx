/**
 * Location Info Skeleton Component
 * Loading skeleton for location information card.
 *
 * Features:
 * - Matches LocationInfo layout structure
 * - Header, address, and metric button skeletons
 * - Responsive design
 */

export default function LocationInfoSkeleton() {
  // ============================================================================
  // Render - Skeleton
  // ============================================================================
  return (
    <div className="mb-4 animate-pulse rounded-lg bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 h-8 w-1/3 rounded bg-gray-200"></div>
      <div className="mb-2 h-4 w-2/3 rounded bg-gray-200"></div>
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
      <div className="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="h-12 w-24 rounded bg-gray-200"></div>
        <div className="h-12 w-24 rounded bg-gray-200"></div>
        <div className="h-12 w-24 rounded bg-gray-200"></div>
      </div>
    </div>
  );
}
