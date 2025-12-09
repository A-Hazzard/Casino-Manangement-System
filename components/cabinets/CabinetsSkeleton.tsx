
export default function CabinetsSkeleton() {
  return (
    <div className="mb-4 rounded-lg bg-white p-4 shadow-sm md:p-6">
      <div>
        <div className="mb-6 h-6 w-1/4 rounded bg-gray-200"></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="relative rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                {/* Status dot (top right) */}
                <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-gray-200" />
                {/* Asset number + Edit button */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="skeleton-bg h-5 w-1/3 rounded" />
                  <div className="skeleton-bg h-5 w-5 rounded-full" />
                </div>
                {/* SMIB and Location */}
                <div className="mb-3">
                  <div className="skeleton-bg mb-1 h-4 w-1/2 rounded"></div>
                  <div className="skeleton-bg h-4 w-2/3 rounded"></div>
                </div>
                {/* Money In, Money Out, Gross */}
                <div className="mb-2 flex flex-col space-y-2 text-sm">
                  <div className="flex justify-between">
                    <div className="skeleton-bg h-4 w-20 rounded" />
                    <div className="skeleton-bg h-4 w-24 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="skeleton-bg h-4 w-20 rounded" />
                    <div className="skeleton-bg h-4 w-24 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="skeleton-bg h-4 w-16 rounded" />
                    <div className="skeleton-bg h-4 w-24 rounded" />
                  </div>
                </div>
                {/* Buttons at the bottom */}
                <div className="mt-2 flex justify-between gap-2">
                  <div className="skeleton-bg h-7 w-28 rounded" />
                  <div className="skeleton-bg h-7 w-28 rounded" />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
