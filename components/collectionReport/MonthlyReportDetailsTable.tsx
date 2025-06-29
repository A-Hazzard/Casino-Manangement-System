import React from "react";
import type { MonthlyReportDetailsRow } from "@/lib/types/componentProps"; // Assuming these are types

type Row = MonthlyReportDetailsRow; // Alias if structure is identical, otherwise define explicitly

type ExtendedMonthlyReportDetailsTableProps = {
  details: Row[];
};

export default function MonthlyReportDetailsTable({
  details,
}: ExtendedMonthlyReportDetailsTableProps) {
  return (
    <div className="overflow-x-auto bg-white shadow mt-0">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-button">
          <tr>
            <th className="px-4 py-2 text-white font-bold">LOCATION</th>
            <th className="px-4 py-2 text-white font-bold">DROP</th>
            <th className="px-4 py-2 text-white font-bold">WIN</th>
            <th className="px-4 py-2 text-white font-bold">GROSS</th>
            <th className="px-4 py-2 text-white font-bold">SAS GROSS</th>
          </tr>
        </thead>
        <tbody>
          {details.map((row, idx) => (
            <tr key={idx} className="border-b">
              <td className="px-4 py-2">{row.location}</td>
              <td className="px-4 py-2">{row.drop}</td>
              <td className="px-4 py-2">{row.win}</td>
              <td className="px-4 py-2">{row.gross}</td>
              <td className="px-4 py-2">{row.sasGross}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
