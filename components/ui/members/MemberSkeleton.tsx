"use client";

export default function MemberSkeleton() {
  return (
    <div className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto relative border border-border">
      {/* Header with title and action buttons */}
      <div className="flex justify-between items-center mb-2">
        <div className="h-6 w-2/3 skeleton-bg rounded"></div>
        <div className="flex gap-2">
          <div className="h-5 w-5 skeleton-bg rounded"></div>
          <div className="h-5 w-5 skeleton-bg rounded"></div>
        </div>
      </div>

      {/* Member info section */}
      <div className="flex flex-col space-y-2 text-sm mb-2">
        <div className="flex justify-between">
          <div className="h-4 w-20 skeleton-bg rounded"></div>
          <div className="h-4 w-24 skeleton-bg rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 skeleton-bg rounded"></div>
          <div className="h-4 w-16 skeleton-bg rounded"></div>
        </div>
      </div>

      {/* Points section */}
      <div className="flex justify-between mt-1 mb-3">
        <div className="h-4 w-12 skeleton-bg rounded"></div>
        <div className="h-4 w-8 skeleton-bg rounded"></div>
      </div>

      {/* Action buttons section */}
      <div className="flex gap-2 justify-between mt-2">
        <div className="h-7 w-28 skeleton-bg rounded"></div>
        <div className="h-7 w-24 skeleton-bg rounded"></div>
      </div>
    </div>
  );
}
