/**
 * Country Card Skeleton Component
 * Loading skeleton for the country card (mobile view).
 */

function AdministrationCountryCardSkeleton() {
  return (
    <div className="block lg:hidden">
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-lg bg-white p-4 shadow-md"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="h-6 w-32 rounded bg-gray-200"></div>
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded bg-gray-200"></div>
                <div className="h-5 w-5 rounded bg-gray-200"></div>
              </div>
            </div>

            {/* Header only, details removed to match real card */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdministrationCountryCardSkeleton;
