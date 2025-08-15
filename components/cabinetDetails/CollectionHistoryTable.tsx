import React from "react";
import type { CollectionMetersHistoryEntry } from "@/lib/types/machines";
import { useRouter } from "next/navigation";

/**
 * Renders the Collection History table.
 * @param data - Array of CollectionMetersHistoryEntry objects.
 * @returns Collection history table component.
 */
export function CollectionHistoryTable({
  data,
}: {
  data: CollectionMetersHistoryEntry[];
}) {
  const router = useRouter();
  const sortedData = [...data].sort((a, b) => b.metersIn - a.metersIn);
  return (
    <div className="w-full">
      <div className="hidden lg:block w-full overflow-x-auto rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="p-2 border border-background">Date</th>
              <th className="p-2 border border-background">Meters In</th>
              <th className="p-2 border border-background">Meters Out</th>
              <th className="p-2 border border-background">Prev In</th>
              <th className="p-2 border border-background">Prev Out</th>
              <th className="p-2 border border-background">
                Collection Report
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row._id} className="text-center">
                <td className="p-2 border border-background">
                  {new Date(row.timestamp).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td className="p-2 border border-background">{row.metersIn}</td>
                <td className="p-2 border border-background">
                  {row.metersOut}
                </td>
                <td className="p-2 border border-background">
                  {row.prevMetersIn}
                </td>
                <td className="p-2 border border-background">
                  {row.prevMetersOut}
                </td>
                <td className="p-2 border border-background">
                  <button
                    className="border px-3 py-1 rounded text-buttonActive border-buttonActive"
                    onClick={() =>
                      row.locationReportId &&
                      router.push(
                        `/collection-report/report/${row.locationReportId}`
                      )
                    }
                  >
                    VIEW REPORT
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="block lg:hidden space-y-4 w-full">
        {sortedData.map((row) => (
          <div
            key={row._id}
            className="bg-white rounded-xl shadow-md overflow-hidden w-full"
          >
            <div className="bg-blue-500 text-white px-4 py-2 font-semibold text-sm">
              Time:{" "}
              {new Date(row.timestamp).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </div>
            <div className="p-4 flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-gray-700">Meters In</span>
                <span className="font-medium">{row.metersIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Meters Out</span>
                <span className="font-medium">{row.metersOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Prev. in</span>
                <span className="font-medium">{row.prevMetersIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Prev. Out</span>
                <span className="font-medium">{row.prevMetersOut}</span>
              </div>
              <div className="hidden sm:flex justify-between items-center mt-2">
                <span className="text-gray-700">Collection Report</span>
                <button
                  className="border border-buttonActive text-buttonActive px-3 py-1 rounded font-medium text-xs"
                  onClick={() =>
                    row.locationReportId &&
                    router.push(
                      `/collection-report/report/${row.locationReportId}`
                    )
                  }
                >
                  VIEW REPORT
                </button>
              </div>
              <button
                className="block sm:hidden border border-buttonActive text-buttonActive w-full mt-3 py-2 rounded font-medium text-xs"
                onClick={() =>
                  row.locationReportId &&
                  router.push(
                    `/collection-report/report/${row.locationReportId}`
                  )
                }
              >
                VIEW REPORT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
