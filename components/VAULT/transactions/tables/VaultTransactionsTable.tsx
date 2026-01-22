/**
 * Vault Transactions Desktop Table Component
 *
 * Desktop table component for displaying vault transactions.
 * Used on large screens (lg and above).
 *
 * Features:
 * - Sortable columns (click headers to sort)
 * - Date/Time column
 * - Transaction type column with badges
 * - Amount column (with +/- indicators and color coding)
 * - Source and Destination columns
 * - Status column (completed/pending)
 * - Denominations and Notes columns
 * - Responsive design (hidden on mobile/tablet)
 *
 * @module components/VAULT/transactions/tables/VaultTransactionsTable
 */
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { Badge } from '@/components/shared/ui/badge';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { ExtendedVaultTransaction, VaultTransactionType } from '@/shared/types/vault';
import { cn } from '@/lib/utils';

export type TransactionSortOption =
  | 'date'
  | 'type'
  | 'amount'
  | 'user'
  | 'status'
  | 'source'
  | 'destination';

type VaultTransactionsTableProps = {
  transactions: ExtendedVaultTransaction[];
  sortOption?: TransactionSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: TransactionSortOption) => void;
  getTransactionTypeBadge: (type: VaultTransactionType) => React.ReactNode;
};

/**
 * Vault Transactions Desktop Table
 * Displays transactions in a sortable table format for desktop screens
 */
export default function VaultTransactionsTable({
  transactions,
  sortOption,
  sortOrder = 'asc',
  onSort,
  getTransactionTypeBadge,
}: VaultTransactionsTableProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (transactions.length === 0) {
    return (
      <div className="hidden rounded-lg bg-container p-8 text-center shadow-md lg:block">
        <p className="text-gray-500">No transactions found</p>
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
              onClick={onSort ? () => onSort('date') : undefined}
            >
              Date & Time
              {sortOption === 'date' && (
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
              onClick={onSort ? () => onSort('type') : undefined}
            >
              Type
              {sortOption === 'type' && (
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
              onClick={onSort ? () => onSort('source') : undefined}
            >
              Source
              {sortOption === 'source' && (
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
              onClick={onSort ? () => onSort('destination') : undefined}
            >
              Destination
              {sortOption === 'destination' && (
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
              onClick={onSort ? () => onSort('status') : undefined}
            >
              Status
              {sortOption === 'status' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead className="font-semibold text-white">Denominations</TableHead>
            <TableHead className="font-semibold text-white">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(tx => {
            const isPositive = tx.amount > 0;
            const isCompleted = tx.status === 'completed';

            return (
              <TableRow key={tx.id} className="transition-colors hover:bg-muted/30">
                <TableCell isFirstColumn className="font-medium">
                  {tx.date}
                </TableCell>
                <TableCell>{getTransactionTypeBadge(tx.type)}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'font-semibold',
                      isPositive ? 'text-button' : 'text-orangeHighlight'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {formatAmount(Math.abs(tx.amount))}
                  </span>
                </TableCell>
                <TableCell>{tx.source || '-'}</TableCell>
                <TableCell>{tx.destination || '-'}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'px-2 py-1',
                      isCompleted
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                    )}
                  >
                    {tx.status === 'completed' ? 'Completed' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{tx.denominations || '-'}</TableCell>
                <TableCell className="text-sm text-gray-600">{tx.notes || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
