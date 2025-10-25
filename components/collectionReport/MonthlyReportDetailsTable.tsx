import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MonthlyReportDetailsRow } from '@/lib/types/componentProps';

type Row = MonthlyReportDetailsRow;

type ExtendedMonthlyReportDetailsTableProps = {
  details: Row[];
};

export default function MonthlyReportDetailsTable({
  details,
}: ExtendedMonthlyReportDetailsTableProps) {
  return (
    <div className="mt-0 overflow-x-auto rounded-lg bg-white shadow">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="font-semibold text-white">LOCATION</TableHead>
            <TableHead className="font-semibold text-white">DROP</TableHead>
            <TableHead className="font-semibold text-white">WIN</TableHead>
            <TableHead className="font-semibold text-white">GROSS</TableHead>
            <TableHead className="font-semibold text-white">
              SAS GROSS
            </TableHead>
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
