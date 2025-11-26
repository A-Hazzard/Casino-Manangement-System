/**
 * Filter Controls Skeleton Component
 * Loading skeleton for filter controls component.
 *
 * Features:
 * - Matches filter controls layout structure
 * - Label and filter button skeletons
 */
import React from 'react';

export default function FilterControlsSkeleton() {
  // ============================================================================
  // Render - Skeleton
  // ============================================================================
  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
        <div className="flex space-x-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-8 w-16 animate-pulse rounded bg-gray-200"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
