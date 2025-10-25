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
                {Array.from({ length: 6 }).map((__, colIdx) => (
                  <td
                    key={colIdx}
                    className="h-10 border-2 border-gray-200 bg-white p-3"
                  >
                    {/* Apply skeleton-bg */}
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
            className="relative mb-4 rounded-lg bg-white p-4 shadow-md"
          >
            {/* Status dot (top right) */}
            <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-gray-200" />
            {/* Title + Edit button */}
            <div className="mb-2 flex items-center justify-between">
              <div className="skeleton-bg h-6 w-2/3 rounded" />
              <div className="skeleton-bg h-6 w-6 rounded-full" />
            </div>
            {/* Money In & Out */}
            <div className="mb-2 flex flex-col space-y-2 text-sm">
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-20 rounded" />
                <div className="skeleton-bg h-4 w-24 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="skeleton-bg h-4 w-20 rounded" />
                <div className="skeleton-bg h-4 w-24 rounded" />
              </div>
            </div>
            {/* Gross */}
            <div className="mb-3 mt-1 flex justify-between">
              <div className="skeleton-bg h-4 w-16 rounded" />
              <div className="skeleton-bg h-4 w-24 rounded" />
            </div>
            {/* Machines & Online Buttons */}
            <div className="mt-2 flex justify-between gap-2">
              <div className="skeleton-bg h-7 w-28 rounded" />
              <div className="skeleton-bg h-7 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
