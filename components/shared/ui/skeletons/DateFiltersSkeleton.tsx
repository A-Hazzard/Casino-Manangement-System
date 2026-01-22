import { Skeleton } from '@/components/shared/ui/skeleton';

export const DateFiltersSkeleton = () => (
  <div className="flex w-full flex-col gap-3">
    <Skeleton className="h-4 w-32" /> {/* Range indicator */}
    <div className="flex w-full flex-wrap items-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-24 rounded-md" />
      ))}
      <Skeleton className="h-10 w-48 rounded-md" /> {/* Calendar picker */}
    </div>
  </div>
);
