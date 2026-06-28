import { Skeleton } from '@/components/shared/ui/skeleton';

type CollectionReportMonthlyCardSkeletonProps = {
  count?: number;
};

export default function CollectionReportMonthlyCardSkeleton({
  count = 4,
}: CollectionReportMonthlyCardSkeletonProps) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between border-b border-gray-100 pb-3">
            <Skeleton className="h-5 w-3/5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
