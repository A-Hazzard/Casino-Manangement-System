import React from "react";
import type { SchedulerTableRow } from "@/lib/types/componentProps";

type Props = {
  data: SchedulerTableRow[];
  loading: boolean;
};

export default function ManagerScheduleTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="hidden lg:flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-buttonActive"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="hidden lg:block text-center py-8 text-gray-500">
        No scheduled visits found.
      </div>
    );
  }

  return (
    <div className="hidden lg:block overflow-x-auto bg-white shadow w-full min-w-0 max-w-[90vw]">
      <table className="w-full min-w-0 text-sm text-left">
        <thead className="bg-button">
          <tr>
            <th className="px-4 py-2 text-white font-bold">COLLECTOR</th>
            <th className="px-4 py-2 text-white font-bold">LOCATION</th>
            <th className="px-4 py-2 text-white font-bold">MANAGER</th>
            <th className="px-4 py-2 text-white font-bold">VISIT TIME</th>
            <th className="px-4 py-2 text-white font-bold">CREATED AT</th>
            <th className="px-4 py-2 text-white font-bold">STATUS</th>
            <th className="px-4 py-2 text-white font-bold">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 font-bold">{row.collector}</td>
              <td className="px-4 py-2">{row.location}</td>
              <td className="px-4 py-2">{row.creator}</td>
              <td className="px-4 py-2">{row.visitTime}</td>
              <td className="px-4 py-2">{row.createdAt}</td>
              <td className="px-4 py-2 capitalize">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    row.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : row.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <button className="border border-buttonActive text-buttonActive px-3 py-1 rounded-md text-xs font-semibold bg-transparent">
                  VIEW
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
