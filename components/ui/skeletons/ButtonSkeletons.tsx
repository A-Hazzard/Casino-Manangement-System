'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic button skeleton component
 * Matches the layout of standard buttons with icon and text
 */
export const ButtonSkeleton = ({
  width = 'w-24',
  height = 'h-10',
  showIcon = true,
  className = '',
}: {
  width?: string;
  height?: string;
  showIcon?: boolean;
  className?: string;
}) => (
  <div
    className={`${height} ${width} ${className} flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2`}
  >
    {showIcon && <Skeleton className="h-4 w-4" />}
    <Skeleton className="h-4 flex-1" />
  </div>
);

/**
 * Refresh button skeleton
 * Matches the exact layout of refresh buttons
 */
export const RefreshButtonSkeleton = () => (
  <div className="flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2">
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-16" />
  </div>
);

/**
 * Action button skeleton (like "Add Cabinet", "New Location", etc.)
 * Matches the layout of primary action buttons
 */
export const ActionButtonSkeleton = ({
  width = 'w-32',
  showIcon = true,
}: {
  width?: string;
  showIcon?: boolean;
}) => (
  <div
    className={`h-10 ${width} flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2`}
  >
    {showIcon && <Skeleton className="h-4 w-4" />}
    <Skeleton className="h-4 flex-1" />
  </div>
);

/**
 * Small button skeleton for compact layouts
 */
export const SmallButtonSkeleton = ({
  width = 'w-20',
  showIcon = false,
}: {
  width?: string;
  showIcon?: boolean;
}) => (
  <div
    className={`h-8 ${width} flex items-center gap-2 rounded-md bg-gray-200 px-3 py-1`}
  >
    {showIcon && <Skeleton className="h-3 w-3" />}
    <Skeleton className="h-3 flex-1" />
  </div>
);

/**
 * Button group skeleton for multiple buttons
 */
export const ButtonGroupSkeleton = ({
  count = 2,
  buttonWidth = 'w-24',
}: {
  count?: number;
  buttonWidth?: string;
}) => (
  <div className="flex items-center gap-2">
    {[...Array(count)].map((_, i) => (
      <ButtonSkeleton key={i} width={buttonWidth} />
    ))}
  </div>
);
