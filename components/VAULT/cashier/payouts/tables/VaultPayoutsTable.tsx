/**
 * Vault Payouts Desktop Table Component
 *
 * Desktop table component for displaying player payouts.
 * Used on large screens (lg and above).
 *
 * Features:
 * - Sortable columns (click headers to sort)
 * - Ticket number column
 * - Amount column
 * - Player column
 * - Cashier and Station columns
 * - Processed timestamp column
 * - Notes column
 * - Responsive design (hidden on mobile/tablet)
 *
 * @module components/VAULT/cashier/payouts/tables/VaultPayoutsTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

type Payout = {
  id: string;
  ticketNumber: string;
  amount: number;
  player: string;
  cashier: string;
  station: string;
  processed: string;
  notes: string;
};

export type PayoutSortOption =
  | 'ticketNumber'
  | 'amount'
  | 'player'
  | 'cashier'
  | 'station'
  | 'processed';

type VaultPayoutsTableProps = {
  payouts: Payout[];
  sortOption?: PayoutSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: PayoutSortOption) => void;
};

/**
 * Vault Payouts Desktop Table
 * Displays payouts in a sortable table format for desktop screens
 */
export default function VaultPayoutsTable({
  payouts,
  sortOption,
  sortOrder = 'asc',
  onSort,
}: VaultPayoutsTableProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (payouts.length === 0) {
    return (
      <div className="hidden rounded-lg bg-container p-8 text-center shadow-md lg:block">
        <p className="text-gray-500">No payouts found</p>
      </div>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-lg bg-container shadow-md lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead
              isFirstColumn
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('ticketNumber') : undefined}
            >
              Ticket Number
              {sortOption === 'ticketNumber' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('amount') : undefined}
            >
              Amount
              {sortOption === 'amount' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('player') : undefined}
            >
              Player
              {sortOption === 'player' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('cashier') : undefined}
            >
              Cashier
              {sortOption === 'cashier' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('station') : undefined}
            >
              Station
              {sortOption === 'station' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('processed') : undefined}
            >
              Processed
              {sortOption === 'processed' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead className="font-semibold text-white">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map(payout => (
            <TableRow key={payout.id} className="transition-colors hover:bg-muted/30">
              <TableCell isFirstColumn className="font-medium">
                {payout.ticketNumber}
              </TableCell>
              <TableCell>
                <span className="font-semibold text-button">{formatAmount(payout.amount)}</span>
              </TableCell>
              <TableCell>{payout.player}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  {payout.cashier}
                </div>
              </TableCell>
              <TableCell>
                <Badge className="bg-button text-white hover:bg-button/90">
                  {payout.station}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">{payout.processed}</TableCell>
              <TableCell className="text-sm text-gray-600">{payout.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
