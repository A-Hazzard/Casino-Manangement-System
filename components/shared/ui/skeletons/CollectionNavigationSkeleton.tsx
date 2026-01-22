import { Skeleton } from '@/components/shared/ui/skeleton';

export const CollectionNavigationSkeleton = () => (
  <div className="flex w-full gap-2 overflow-x-auto pb-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-40 flex-shrink-0 rounded-lg" />
    ))}
  </div>
);
