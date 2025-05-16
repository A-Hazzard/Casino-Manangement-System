import React from "react";
import type { MonthlyReportSummary } from "@/lib/types/componentProps"; // Assuming this is a type

type Props = {
  summary: MonthlyReportSummary;
};

export default function MonthlyReportSummaryTable({ summary }: Props) {
  return (
    <div className="overflow-x-auto bg-white shadow mb-0">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-button">
          <tr>
            <th className="px-4 py-2 text-white font-bold">DROP</th>
            <th className="px-4 py-2 text-white font-bold">
              CANCELLED CREDITS
            </th>
            <th className="px-4 py-2 text-white font-bold">GROSS</th>
            <th className="px-4 py-2 text-white font-bold">SAS GROSS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2 font-bold">{summary.drop}</td>
            <td className="px-4 py-2 font-bold">{summary.cancelledCredits}</td>
            <td className="px-4 py-2 font-bold">{summary.gross}</td>
            <td className="px-4 py-2 font-bold">{summary.sasGross}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
