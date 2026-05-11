/**
 * Map Skeleton Component
 * Simple skeleton component for map display.
 *
 * Features:
 * - Map container skeleton
 * - Consistent styling
 */
export default function MapSkeleton() {
  // ============================================================================
  // Render - Skeleton
  // ============================================================================
  return (
    <div className="relative w-full rounded-lg bg-container p-4 shadow-md">
      <div className="skeleton-bg mt-2 h-48 w-full rounded-lg"></div>
    </div>
  );
}
