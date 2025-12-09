import { Skeleton } from '@/components/ui/skeleton';

export const CollectionNavigationSkeleton = () => {
  return (
    <div className="rounded-lg border-b border-gray-200 bg-white shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden space-x-1 px-1 md:flex md:space-x-2 md:px-2 lg:space-x-8 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center space-x-0.5 border-b-2 border-transparent px-0.5 py-1 md:space-x-1 md:px-1 md:py-2 lg:space-x-2 lg:px-2 lg:py-4"
          >
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16 rounded lg:w-20" />
          </div>
        ))}
      </nav>

      {/* Mobile - below md: */}
      <div className="px-4 py-2 md:hidden">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
};
