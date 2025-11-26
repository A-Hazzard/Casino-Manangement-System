/**
 * Skeleton Component
 * Loading skeleton component for displaying placeholder content.
 *
 * Features:
 * - Animated pulse effect
 * - Customizable styling
 * - Used for loading states
 */
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
