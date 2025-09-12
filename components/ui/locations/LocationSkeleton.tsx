"use client";

export default function LocationSkeleton() {
  return (
    <>
      {/* Desktop skeleton (table) - removed animate-pulse */}
      <div className="hidden lg:block m-0 w-full overflow-x-auto">
        <table className="table-fixed w-full border-collapse text-center">
          <thead className="bg-[#00b517] text-white">
            <tr>
              <th className="p-3 border border-[#00b517] text-sm">
                LOCATION NAME
              </th>
              <th className="p-3 border border-[#00b517] text-sm">HANDLE</th>
              <th className="p-3 border border-[#00b517] text-sm">MONEY OUT</th>
              <th className="p-3 border border-[#00b517] text-sm">JACKPOT</th>
              <th className="p-3 border border-[#00b517] text-sm">GROSS</th>
              <th className="p-3 border border-[#00b517] text-sm">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, idx) => (
              <tr key={idx}>
                {Array.from({ length: 6 }).map((__, colIdx) => (
                  <td
                    key={colIdx}
                    className="p-3 bg-white border-2 border-gray-200 h-10"
                  >
                    {/* Apply skeleton-bg */}
                    <div className="h-4 mx-auto w-3/4 skeleton-bg"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile skeleton (cards) - removed animate-pulse */}
      <div className="block lg:hidden mt-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="mb-4 bg-white rounded-lg shadow-md p-4 relative"
          >
            {/* Status dot (top right) */}
            <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gray-200" />
            {/* Title + Edit button */}
            <div className="flex justify-between items-center mb-2">
              <div className="h-6 w-2/3 skeleton-bg rounded" />
              <div className="h-6 w-6 skeleton-bg rounded-full" />
            </div>
            {/* Money In & Out */}
            <div className="flex flex-col space-y-2 text-sm mb-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 skeleton-bg rounded" />
                <div className="h-4 w-24 skeleton-bg rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-20 skeleton-bg rounded" />
                <div className="h-4 w-24 skeleton-bg rounded" />
              </div>
            </div>
            {/* Gross */}
            <div className="flex justify-between mt-1 mb-3">
              <div className="h-4 w-16 skeleton-bg rounded" />
              <div className="h-4 w-24 skeleton-bg rounded" />
            </div>
            {/* Machines & Online Buttons */}
            <div className="flex gap-2 justify-between mt-2">
              <div className="h-7 w-28 skeleton-bg rounded" />
              <div className="h-7 w-28 skeleton-bg rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
