import React from "react";
import { formatDateString } from "@/lib/utils/dateUtils";
import { CollectorScheduleTableProps } from "@/lib/types/componentProps";

export default function CollectorScheduleTable({
  data,
  loading,
}: CollectorScheduleTableProps) {
  if (loading) {
    return (
      <div className="hidden md:flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-buttonActive"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="hidden md:flex justify-center items-center py-8">
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center w-full max-w-md mx-auto">
          <div className="text-gray-500 text-lg mb-2">No Data Available</div>
          <div className="text-gray-400 text-sm text-center">
            No collector schedules found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block overflow-x-auto bg-white shadow w-full min-w-0 max-w-[90vw]">
      <table className="w-full min-w-0 text-sm text-left">
        <thead className="bg-button">
          <tr>
            <th className="px-4 py-2 text-white font-bold">COLLECTOR</th>
            <th className="px-4 py-2 text-white font-bold">LOCATION</th>
            <th className="px-4 py-2 text-white font-bold">START TIME</th>
            <th className="px-4 py-2 text-white font-bold">END TIME</th>
            <th className="px-4 py-2 text-white font-bold">DURATION</th>
            <th className="px-4 py-2 text-white font-bold">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((schedule, index) => {
            const startTime = new Date(schedule.startTime);
            const endTime = new Date(schedule.endTime);
            const duration = (
              (endTime.getTime() - startTime.getTime()) /
              (1000 * 60 * 60)
            ).toFixed(1);

            return (
              <tr
                key={schedule._id || index}
                className="border-b hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-bold">
                  {schedule.collector || schedule.collectorName}
                </td>
                <td className="px-4 py-2">
                  {schedule.location || schedule.locationName}
                </td>
                <td className="px-4 py-2">
                  {formatDateString(schedule.startTime)}
                </td>
                <td className="px-4 py-2">
                  {formatDateString(schedule.endTime)}
                </td>
                <td className="px-4 py-2">{duration} hours</td>
                <td className="px-4 py-2 capitalize">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      schedule.status === "scheduled" ||
                      schedule.status === "in-progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : schedule.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {schedule.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
