import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MonthlyReportSummary } from '@/lib/types/componentProps';

type ExtendedMonthlyReportSummaryTableProps = {
  summary: MonthlyReportSummary;
};

export default function MonthlyReportSummaryTable({
  summary,
}: ExtendedMonthlyReportSummaryTableProps) {
  return (
    <div className="mb-0 overflow-x-auto rounded-lg bg-white shadow">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="font-semibold text-white">DROP</TableHead>
            <TableHead className="font-semibold text-white">
              CANCELLED CREDITS
            </TableHead>
            <TableHead className="font-semibold text-white">GROSS</TableHead>
            <TableHead className="font-semibold text-white">
              SAS GROSS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="hover:bg-gray-50">
            <TableCell className="font-medium">{summary.drop}</TableCell>
            <TableCell className="font-medium">
              {summary.cancelledCredits}
            </TableCell>
            <TableCell className="font-medium">{summary.gross}</TableCell>
            <TableCell className="font-medium">{summary.sasGross}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
