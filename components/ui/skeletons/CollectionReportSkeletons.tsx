
/**
 * Skeleton component for monthly table loading state
 */
export const MonthlyTableSkeleton = () => (
  <div className="hidden w-full min-w-0 animate-pulse overflow-x-auto bg-white shadow lg:block">
    <table className="w-full min-w-0 text-left text-sm">
      <thead className="bg-button text-white">
        <tr>
          <th className="px-4 py-2 font-bold">LOCATION</th>
          <th className="px-4 py-2 font-bold">DROP</th>
          <th className="px-4 py-2 font-bold">WIN</th>
          <th className="px-4 py-2 font-bold">GROSS</th>
          <th className="px-4 py-2 font-bold">SAS GROSS</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(6)].map((_, i) => (
          <tr key={i} className="border-b">
            {Array.from({ length: 5 }).map((_, j) => (
              <td key={j} className="px-4 py-3">
                <div className="h-5 w-full rounded bg-gray-200" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Skeleton component for monthly summary loading state
 */
export const MonthlySummarySkeleton = () => (
  <div className="mb-0 hidden w-full min-w-0 animate-pulse overflow-x-auto bg-white shadow lg:block">
    <table className="w-full min-w-0 text-left text-sm">
      <thead className="bg-button text-white">
        <tr>
          <th className="px-4 py-2 font-bold">DROP</th>
          <th className="px-4 py-2 font-bold">CANCELLED CREDITS</th>
          <th className="px-4 py-2 font-bold">GROSS</th>
          <th className="px-4 py-2 font-bold">SAS GROSS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {Array.from({ length: 4 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-5 w-full rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

/**
 * Skeleton component for manager table loading state
 */
export const ManagerTableSkeleton = () => (
  <div className="hidden w-full min-w-0 animate-pulse overflow-x-auto bg-white shadow lg:block">
    <table className="w-full min-w-0 text-left text-sm">
      <thead className="bg-button text-white">
        <tr>
          <th className="px-4 py-2 font-bold">COLLECTOR</th>
          <th className="px-4 py-2 font-bold">LOCATION</th>
          <th className="px-4 py-2 font-bold">MANAGER</th>
          <th className="px-4 py-2 font-bold">VISIT TIME</th>
          <th className="px-4 py-2 font-bold">CREATED AT</th>
          <th className="px-4 py-2 font-bold">STATUS</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(6)].map((_, i) => (
          <tr key={i} className="border-b">
            {Array.from({ length: 6 }).map((_, j) => (
              <td key={j} className="px-4 py-3">
                <div className="h-5 w-full rounded bg-gray-200" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Skeleton component for card loading state
 */
export const CardSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(2)].map((_, i) => (
      <div key={i} className="h-24 w-full rounded-lg bg-gray-200" />
    ))}
  </div>
);
