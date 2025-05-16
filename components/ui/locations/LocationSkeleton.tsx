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
                        <th className="p-3 border border-[#00b517] text-sm">MONEY IN</th>
                        <th className="p-3 border border-[#00b517] text-sm">MONEY OUT</th>
                        <th className="p-3 border border-[#00b517] text-sm">GROSS</th>
                        <th className="p-3 border border-[#00b517] text-sm">ACTIONS</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <tr key={idx}>
                            {Array.from({ length: 5 }).map((__, colIdx) => (
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
                    <div key={idx} className="mb-4 bg-white rounded-lg shadow-md p-4">
            {/* Location name - apply skeleton-bg */}
            <div className="h-6 w-3/4 mb-4 skeleton-bg"></div>
                        
            {/* Stats grid - apply skeleton-bg */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                <div className="h-4 w-1/2 mb-1 skeleton-bg"></div>
                <div className="h-5 w-3/4 skeleton-bg"></div>
                            </div>
                            <div>
                <div className="h-4 w-1/2 mb-1 skeleton-bg"></div>
                <div className="h-5 w-3/4 skeleton-bg"></div>
                            </div>
                            <div>
                <div className="h-4 w-1/2 mb-1 skeleton-bg"></div>
                <div className="h-5 w-3/4 skeleton-bg"></div>
                            </div>
                            <div>
                <div className="h-4 w-1/2 mb-1 skeleton-bg"></div>
                <div className="h-5 w-3/4 skeleton-bg"></div>
                            </div>
                        </div>
                        
            {/* Action buttons - apply skeleton-bg */}
                        <div className="flex justify-end space-x-2 mt-3">
              <div className="h-8 w-16 skeleton-bg"></div>
              <div className="h-8 w-16 skeleton-bg"></div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
