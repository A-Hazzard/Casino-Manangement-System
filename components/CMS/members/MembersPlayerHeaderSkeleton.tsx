/**
 * Members Player Header Skeleton Component
 * Loading skeleton for player header component.
 *
 * Features:
 * - Matches MembersPlayerHeader layout structure
 * - Avatar and name/occupation skeletons
 */

export default function MembersPlayerHeaderSkeleton() {
  // ============================================================================
  // Render - Skeleton
  // ============================================================================
  return (
    <div className="my-8 flex items-center">
      <div className="mr-6 h-20 w-20 animate-pulse rounded-full bg-gray-200"></div>
      <div>
        <div className="mb-2 h-8 w-32 animate-pulse rounded bg-gray-200"></div>
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
      </div>
    </div>
  );
}
