'use client';

export default function LocationSkeleton() {
  return (
    <>
      {/* Desktop skeleton (table) - removed animate-pulse */}
      <div className="m-0 hidden w-full overflow-x-auto lg:block">
        <table className="w-full table-fixed border-collapse text-center">
          <thead className="bg-[#00b517] text-white">
            <tr>
              <th className="border border-[#00b517] p-3 text-sm">
                LOCATION NAME
              </th>
              <th className="border border-[#00b517] p-3 text-sm">HANDLE</th>
              <th className="border border-[#00b517] p-3 text-sm">MONEY OUT</th>
              <th className="border border-[#00b517] p-3 text-sm">JACKPOT</th>
              <th className="border border-[#00b517] p-3 text-sm">GROSS</th>
              <th className="border border-[#00b517] p-3 text-sm">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, idx) => (
              <tr key={idx}>
                {/* First column: Location name with two rows */}
                <td className="border-2 border-gray-200 bg-white p-3">
                  <div className="flex flex-col gap-1.5">
                    {/* Row 1: Location name with membership icon */}
                    <div className="flex items-center gap-1.5">
                      <div className="skeleton-bg h-4 w-32" />
                      <div className="skeleton-bg h-4 w-4 rounded-full flex-shrink-0" />
                    </div>
                    {/* Row 2: Status badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="skeleton-bg h-6 w-20 rounded-full" />
                      <div className="skeleton-bg h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </td>
                {/* Other columns: Financial data */}
                {Array.from({ length: 5 }).map((__, colIdx) => (
                  <td
                    key={colIdx}
                    className="h-10 border-2 border-gray-200 bg-white p-3"
                  >
                    <div className="skeleton-bg mx-auto h-4 w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile skeleton (cards) - removed animate-pulse */}
      <div className="mt-4 block lg:hidden">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="relative mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            {/* Location Name - can wrap to multiple lines */}
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex items-start gap-1.5">
                <div className="skeleton-bg h-6 w-3/4 rounded" />
                {/* Membership icon placeholder */}
                <div className="skeleton-bg h-4 w-4 rounded-full flex-shrink-0 mt-0.5" />
              </div>
              
              {/* Status Badges Below Name */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Online/Offline Badge */}
                <div className="skeleton-bg h-6 w-24 rounded-full" />
                {/* Members Badge */}
                <div className="skeleton-bg h-6 w-20 rounded-full" />
              </div>
            </div>

            {/* Financial Metrics */}
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

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
              <div className="skeleton-bg h-8 flex-1 rounded" />
              <div className="skeleton-bg h-8 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
