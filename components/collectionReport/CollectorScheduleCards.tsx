import React from "react";
import { formatDateString } from "@/lib/utils/dateUtils";
import { CollectorScheduleCardsProps } from "@/lib/types/componentProps";

export default function CollectorScheduleCards({
  data,
  loading,
}: CollectorScheduleCardsProps) {
  if (loading) {
    return (
      <div className="lg:hidden flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-buttonActive"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="lg:hidden text-center py-8 text-gray-500">
        No collector schedules found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden mt-4 w-full">
      {data.map((schedule, index) => {
        const startTime = new Date(schedule.startTime);
        const endTime = new Date(schedule.endTime);
        const duration = (
          (endTime.getTime() - startTime.getTime()) /
          (1000 * 60 * 60)
        ).toFixed(1);

        return (
          <div
            key={schedule._id || index}
            className="card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            <div className="bg-button text-white px-4 py-2 font-semibold text-sm rounded-t-lg">
              {schedule.location || schedule.locationName}
            </div>
            <div className="p-4 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Collector</span>
                <span className="font-semibold">
                  {schedule.collector || schedule.collectorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Start Time</span>
                <span className="font-semibold">
                  {formatDateString(schedule.startTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">End Time</span>
                <span className="font-semibold">
                  {formatDateString(schedule.endTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Duration</span>
                <span className="font-semibold">{duration} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Status</span>
                <span
                  className={`font-semibold capitalize px-2 py-1 rounded-full text-xs ${
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
