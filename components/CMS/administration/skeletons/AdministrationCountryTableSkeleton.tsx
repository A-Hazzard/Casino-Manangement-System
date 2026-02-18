/**
 * Country Table Skeleton Component
 * Loading skeleton for the country table (desktop view).
 */

function AdministrationCountryTableSkeleton() {
  return (
    <div className="hidden lg:block">
      <div className="animate-pulse rounded-lg bg-white p-6 shadow-md">
        {/* Table Header */}
        <div className="mb-4 flex gap-4">
          <div className="h-6 flex-1 rounded bg-gray-200"></div>
          <div className="h-6 w-24 rounded bg-gray-200"></div>
        </div>

        {/* Table Rows */}
        {[...Array(5)].map((_, index) => (
          <div key={index} className="mb-3 flex gap-4">
            <div className="h-10 flex-1 rounded bg-gray-100"></div>
            <div className="h-10 w-24 rounded bg-gray-100"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdministrationCountryTableSkeleton;
