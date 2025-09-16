import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlyReportSummary } from "@/lib/types/componentProps";

type ExtendedMonthlyReportSummaryTableProps = {
  summary: MonthlyReportSummary;
};

export default function MonthlyReportSummaryTable({
  summary,
}: ExtendedMonthlyReportSummaryTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow mb-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="text-white font-semibold">DROP</TableHead>
            <TableHead className="text-white font-semibold">
              CANCELLED CREDITS
            </TableHead>
            <TableHead className="text-white font-semibold">GROSS</TableHead>
            <TableHead className="text-white font-semibold">SAS GROSS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="hover:bg-gray-50">
            <TableCell className="font-medium">{summary.drop}</TableCell>
            <TableCell className="font-medium">{summary.cancelledCredits}</TableCell>
            <TableCell className="font-medium">{summary.gross}</TableCell>
            <TableCell className="font-medium">{summary.sasGross}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
