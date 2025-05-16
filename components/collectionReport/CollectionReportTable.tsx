import React from "react";
import Image from "next/image";
import type { CollectionReportRow } from "@/lib/types/componentProps";

type Props = {
  data: CollectionReportRow[];
};

export default function CollectionReportTable({ data }: Props) {
  return (
    <div className="hidden lg:block overflow-x-auto bg-white shadow w-full min-w-0">
      <table className="w-full min-w-0 text-sm text-left">
        <thead className="bg-button text-white">
          <tr>
            <th className="px-2 py-2">COLLECTOR</th>
            <th className="px-2 py-2">LOCATION</th>
            <th className="px-2 py-2">GROSS</th>
            <th className="px-2 py-2">MACHINES</th>
            <th className="px-2 py-2">COLLECTED</th>
            <th className="px-2 py-2">UNCOLLECTED</th>
            <th className="px-2 py-2">LOCATION REVENUE</th>
            <th className="px-2 py-2">TIME</th>
            <th className="px-2 py-2">DETAILS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={`${row.collector}-${row.location}-${row.time}-${index}`}
              className="border-b hover:bg-lighterGreenHighlight"
            >
              <td className="px-4 py-2">{row.collector}</td>
              <td className="px-4 py-2">{row.location}</td>
              <td className="px-4 py-2">{row.gross}</td>
              <td className="px-4 py-2">{row.machines}</td>
              <td className="px-4 py-2">{row.collected}</td>
              <td className="px-4 py-2">{row.uncollected}</td>
              <td className="px-4 py-2">{row.locationRevenue}</td>
              <td className="px-4 py-2">{row.time}</td>
              <td className="px-4 py-2">
                <button className="flex items-center justify-center text-buttonActive px-3 py-1 rounded-md text-xs font-semibold bg-transparent">
                  <span className="sr-only">View</span>
                  <Image
                    src="/details.svg"
                    alt="Details"
                    className="h-5 w-5"
                    width={20}
                    height={20}
                  />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
