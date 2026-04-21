/**
 * Monthly Report Details Table Component
 * Table component for displaying monthly report details by location.
 *
 * Features:
 * - Location-based details display
 * - Metrics columns (Location, Drop, Win, Gross, SAS Gross)
 * - Multiple rows for different locations
 * - Clickable location names with navigation to location details
 * - Copyable metrics values
 * - Responsive design
 *
 * @param details - Array of monthly report detail rows
 * @param locations - Array of location objects with id and name for navigation
 */
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { CollectionReportMonthlyDetailsTableProps, MonthlyReportDetailsRow } from '@/lib/types/components';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

import { getGrossColorClass } from '@/lib/utils/financial';

export default function CollectionReportMonthlyDetailsTable({
  details,
  locations = [],
}: CollectionReportMonthlyDetailsTableProps & { locations?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const { formatAmount } = useCurrencyFormat();

  // Helper to format financial values with dollar signs
  const formatVal = (v: number | string | null | undefined) => {
    if (v === '-' || v === undefined || v === null || v === '') return v;
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(num) ? v : formatAmount(num);
  };

  // Returns green/red color class for any raw financial value
  const colorClass = (v: number | string | null | undefined) => {
    if (v === '-' || v === undefined || v === null || v === '') return '';
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(num) ? '' : getGrossColorClass(num);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text.trim() === '' || text === '-') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    // Extract number for copying if it contains a dollar sign
    const cleanText = text.replace('$', '').replace(/,/g, '').trim();

    try {
      await navigator.clipboard.writeText(cleanText);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  // Find location ID by name
  const getLocationId = (locationName: string): string | null => {
    const location = locations.find(loc => loc.name === locationName);
    return location?.id || null;
  };

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
          {details.map((row: MonthlyReportDetailsRow, idx: number) => {
            const locationId = getLocationId(row.location);
            return (
              <TableRow key={idx} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {locationId ? (
                      <>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/locations/${locationId}`);
                          }}
                          className="text-left hover:text-blue-600 hover:underline cursor-pointer"
                          title="Click to view location details"
                        >
                          {row.location}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/locations/${locationId}`);
                          }}
                          className="flex-shrink-0"
                          title="View location details"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600 cursor-pointer transition-transform hover:scale-110" />
                        </button>
                      </>
                    ) : (
                      <span>{row.location}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => copyToClipboard(row.drop, 'Drop')}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                    title="Click to copy"
                  >
                    <span className={colorClass(row.drop)}>{formatVal(row.drop)}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => copyToClipboard(row.win, 'Win')}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                    title="Click to copy"
                  >
                    <span className={colorClass(row.win)}>{formatVal(row.win)}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => copyToClipboard(row.gross, 'Gross')}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                    title="Click to copy"
                  >
                    <span className={colorClass(row.gross)}>{formatVal(row.gross)}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => copyToClipboard(row.sasGross, 'SAS Gross')}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                    title="Click to copy"
                  >
                    <span className={colorClass(row.sasGross)}>{formatVal(row.sasGross)}</span>
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

