'use client';

export default function MemberSkeleton() {
  return (
    <div className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm">
      {/* Header with title and action buttons */}
      <div className="mb-2 flex items-center justify-between">
        <div className="skeleton-bg h-6 w-2/3 rounded"></div>
        <div className="flex gap-2">
          <div className="skeleton-bg h-5 w-5 rounded"></div>
          <div className="skeleton-bg h-5 w-5 rounded"></div>
        </div>
      </div>

      {/* Member info section */}
      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex justify-between">
          <div className="skeleton-bg h-4 w-20 rounded"></div>
          <div className="skeleton-bg h-4 w-24 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="skeleton-bg h-4 w-20 rounded"></div>
          <div className="skeleton-bg h-4 w-16 rounded"></div>
        </div>
      </div>

      {/* Points section */}
      <div className="mb-3 mt-1 flex justify-between">
        <div className="skeleton-bg h-4 w-12 rounded"></div>
        <div className="skeleton-bg h-4 w-8 rounded"></div>
      </div>

      {/* Action buttons section */}
      <div className="mt-2 flex justify-between gap-2">
        <div className="skeleton-bg h-7 w-28 rounded"></div>
        <div className="skeleton-bg h-7 w-24 rounded"></div>
      </div>
    </div>
  );
}
