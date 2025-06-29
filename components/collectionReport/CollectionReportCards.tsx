import React from "react";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import { useRouter } from "next/navigation";

type ExtendedCollectionReportCardsProps = {
  data: CollectionReportRow[];
};

export default function CollectionReportCards({
  data,
}: ExtendedCollectionReportCardsProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col lg:hidden mt-4 px-2 md:px-4 gap-4 w-full min-w-0">
      {data.map((row, index) => (
        <div
          key={`${row.collector}-${row.location}-${row.time}-${index}`}
          className="card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden mb-4"
        >
          <div className="bg-lighterBlueHighlight text-white px-4 py-3 font-semibold text-md rounded-t-lg">
            Collector: {row.collector}
          </div>
          <div className="p-4 flex flex-col gap-3 bg-white">
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">
                Location
              </span>
              <span className="font-semibold text-sm text-right">
                {row.location}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">Gross</span>
              <span className="font-semibold text-sm">{row.gross}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">
                Machines
              </span>
              <span className="font-semibold text-sm">{row.machines}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">
                Collected
              </span>
              <span className="font-semibold text-sm">{row.collected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">
                Uncollected
              </span>
              <span className="font-semibold text-sm">{row.uncollected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">
                Location Revenue
              </span>
              <span className="font-semibold text-sm">
                {row.locationRevenue !== undefined &&
                row.locationRevenue !== null
                  ? row.locationRevenue
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium text-sm">Time</span>
              <span className="font-semibold text-sm">{row.time}</span>
            </div>
            <div className="flex justify-center mt-3">
              <button
                className="border border-button text-button px-6 py-2 rounded-md text-sm font-bold tracking-wider bg-transparent"
                onClick={() =>
                  router.push(
                    `/collection-report/report/${row.locationReportId}`
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
  );
}
