/**
 * Monthly Report Summary Table Component
 * Table component for displaying monthly report summary metrics.
 *
 * Features:
 * - Summary metrics display (Drop, Cancelled Credits, Gross, SAS Gross)
 * - Single row summary table
 * - Copyable metrics values
 * - Responsive design
 *
 * @param summary - Monthly report summary data
 */
import { toast } from 'sonner';
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
  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text.trim() === '' || text === '-') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text.trim());
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

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
            <TableCell className="font-medium">
              <button
                onClick={() => copyToClipboard(summary.drop, 'Drop')}
                className="hover:text-blue-600 hover:underline cursor-pointer"
                title="Click to copy"
              >
                {summary.drop}
              </button>
            </TableCell>
            <TableCell className="font-medium">
              <button
                onClick={() => copyToClipboard(summary.cancelledCredits, 'Cancelled Credits')}
                className="hover:text-blue-600 hover:underline cursor-pointer"
                title="Click to copy"
              >
                {summary.cancelledCredits}
              </button>
            </TableCell>
            <TableCell className="font-medium">
              <button
                onClick={() => copyToClipboard(summary.gross, 'Gross')}
                className="hover:text-blue-600 hover:underline cursor-pointer"
                title="Click to copy"
              >
                {summary.gross}
              </button>
            </TableCell>
            <TableCell className="font-medium">
              <button
                onClick={() => copyToClipboard(summary.sasGross, 'SAS Gross')}
                className="hover:text-blue-600 hover:underline cursor-pointer"
                title="Click to copy"
              >
                {summary.sasGross}
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
