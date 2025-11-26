/**
 * SMIB Config Skeleton Component
 * Loading skeleton for SMIB configuration section.
 *
 * Features:
 * - Matches SmibConfiguration layout structure
 * - Header and grid layout skeletons
 */
import React from 'react';

export const SmibConfigSkeleton = () => (
  <div className="rounded-lg bg-white p-6 shadow-sm">
    <div className="skeleton-bg mb-4 h-8 w-48"></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="skeleton-bg h-6"></div>
      <div className="skeleton-bg h-6"></div>
      <div className="skeleton-bg h-6"></div>
      <div className="skeleton-bg h-6"></div>
    </div>
  </div>
);

export default SmibConfigSkeleton;
