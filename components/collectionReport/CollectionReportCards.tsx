import React from "react";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import { useRouter } from "next/navigation";

type ExtendedCollectionReportCardsProps = {
  data: CollectionReportRow[];
  gridLayout?: boolean; // New prop to control grid vs single column layout
};

export default function CollectionReportCards({
  data,
  gridLayout = false,
}: ExtendedCollectionReportCardsProps) {
  const router = useRouter();
  return (
    <div
      className={`flex flex-col mt-4 px-2 md:px-4 gap-4 w-full min-w-0 ${
        gridLayout ? "lg:hidden" : "md:hidden"
      }`}
    >
      <div
        className={`${
          gridLayout ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"
        }`}
      >
        {data?.map((row, index) => (
          <div
            key={`${row?.collector || 'unknown'}-${row?.location || 'unknown'}-${row?.time || 'unknown'}-${index}`}
            className="card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden mb-4 transform hover:scale-[1.02] animate-in fade-in-0 slide-in-from-bottom-2"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: "both",
            }}
          >
            <div className="bg-lighterBlueHighlight text-white px-4 py-3 font-semibold text-md rounded-t-lg">
              Collector: {row?.collector || '-'}
            </div>
            <div className="p-4 flex flex-col gap-3 bg-white">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">
                  Location
                </span>
                <span className="font-semibold text-sm text-right">
                  {row?.location || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">Gross</span>
                <span className="font-semibold text-sm">{row?.gross || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">
                  Machines
                </span>
                <span className="font-semibold text-sm">{row?.machines || '0/0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">
                  Collected
                </span>
                <span className="font-semibold text-sm">{row?.collected || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">
                  Uncollected
                </span>
                <span className="font-semibold text-sm">{row?.uncollected || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">
                  Location Revenue
                </span>
                <span className="font-semibold text-sm">
                  {row?.locationRevenue !== undefined &&
                  row?.locationRevenue !== null
                    ? row.locationRevenue
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium text-sm">Time</span>
                <span className="font-semibold text-sm">{row?.time || '-'}</span>
              </div>
              <div className="flex justify-center mt-3">
                <button
                  className="border border-button text-button px-6 py-2 rounded-md text-sm font-bold tracking-wider bg-transparent transition-all duration-200 hover:bg-button hover:text-white"
                  onClick={() =>
                    router.push(
                      `/collection-report/report/${row?.locationReportId || ''}`
                    )
                  }
                  aria-label="View Details"
                >
                  VIEW DETAILS
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
