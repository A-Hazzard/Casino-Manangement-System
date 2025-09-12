import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlyReportDetailsRow } from "@/lib/types/componentProps";

type Row = MonthlyReportDetailsRow;

type ExtendedMonthlyReportDetailsTableProps = {
  details: Row[];
};

export default function MonthlyReportDetailsTable({
  details,
}: ExtendedMonthlyReportDetailsTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow mt-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="text-white font-semibold">LOCATION</TableHead>
            <TableHead className="text-white font-semibold">DROP</TableHead>
            <TableHead className="text-white font-semibold">WIN</TableHead>
            <TableHead className="text-white font-semibold">GROSS</TableHead>
            <TableHead className="text-white font-semibold">SAS GROSS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {details.map((row, idx) => (
            <TableRow key={idx} className="hover:bg-gray-50">
              <TableCell className="font-medium">{row.location}</TableCell>
              <TableCell>{row.drop}</TableCell>
              <TableCell>{row.win}</TableCell>
              <TableCell>{row.gross}</TableCell>
              <TableCell>{row.sasGross}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
