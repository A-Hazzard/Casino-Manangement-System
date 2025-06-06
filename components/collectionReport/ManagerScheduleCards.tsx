import React from "react";
import type { SchedulerTableRow } from "@/lib/types/componentProps";

type Props = {
  data: SchedulerTableRow[];
  loading: boolean;
};

export default function ManagerScheduleCards({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="lg:hidden flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-buttonActive"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="lg:hidden text-center py-8 text-gray-500">
        No scheduled visits found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden mt-4 w-full">
      {data.map((row) => (
        <div
          key={row.id}
          className="card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <div className="bg-button text-white px-4 py-2 font-semibold text-sm rounded-t-lg">
            {row.location}
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Collector</span>
              <span className="font-semibold">{row.collector}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Manager</span>
              <span className="font-semibold">{row.creator}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Visit Time</span>
              <span className="font-semibold">{row.visitTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Created At</span>
              <span className="font-semibold">{row.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Status</span>
              <span
                className={`font-semibold capitalize px-2 py-1 rounded-full text-xs ${
                  row.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : row.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {row.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
