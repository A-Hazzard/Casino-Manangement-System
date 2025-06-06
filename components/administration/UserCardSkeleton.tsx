"use client";

export default function UserCardSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
        >
          <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <div className="h-5 w-16 skeleton-bg rounded mb-1" />
              <div className="h-4 w-14 skeleton-bg rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-gray-300 h-7 w-7 skeleton-bg" />
              <div className="h-5 w-10 skeleton-bg rounded" />
            </div>
          </div>
          <div className="p-3">
            <div className="h-4 w-40 max-w-full skeleton-bg rounded mb-2" />
            <div className="h-4 w-24 max-w-full skeleton-bg rounded mb-3" />
            <div className="flex justify-end gap-3 items-center mt-2">
              <div className="h-5 w-5 skeleton-bg rounded" />
              <div className="h-5 w-5 skeleton-bg rounded" />
              <div className="h-5 w-5 skeleton-bg rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
