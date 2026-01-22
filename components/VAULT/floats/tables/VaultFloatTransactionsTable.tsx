/**
 * Vault Float Transactions Desktop Table Component
 *
 * Desktop table component for displaying float transactions.
 * Used on large screens (lg and above).
 *
 * Features:
 * - Sortable columns (click headers to sort)
 * - Date/Time column
 * - Cashier/Station column
 * - Type column (Increase/Decrease)
 * - Amount column
 * - Reason column
 * - Status column
 * - Action buttons for pending transactions
 * - Responsive design (hidden on mobile/tablet)
 *
 * @module components/VAULT/floats/tables/VaultFloatTransactionsTable
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
import type { FloatTransaction } from '@/shared/types/vault';
import { CheckCircle2, Clock, Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FloatTransactionSortOption =
  | 'dateTime'
  | 'cashier'
  | 'type'
  | 'amount'
  | 'reason'
  | 'status';

type VaultFloatTransactionsTableProps = {
  transactions: FloatTransaction[];
  sortOption?: FloatTransactionSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: FloatTransactionSortOption) => void;
  onApprove?: (transactionId: string) => void;
  onReject?: (transactionId: string) => void;
  showActions?: boolean;
};

/**
 * Vault Float Transactions Desktop Table
 * Displays float transactions in a sortable table format for desktop screens
 */
export default function VaultFloatTransactionsTable({
  transactions,
  sortOption,
  sortOrder = 'asc',
  onSort,
  onApprove,
  onReject,
  showActions = false,
}: VaultFloatTransactionsTableProps) {
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
        <p className="text-gray-500">No float transactions found</p>
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
              onClick={onSort ? () => onSort('dateTime') : undefined}
            >
              Date/Time
              {sortOption === 'dateTime' && (
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
              onClick={onSort ? () => onSort('reason') : undefined}
            >
              Reason
              {sortOption === 'reason' && (
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
            {showActions && (
              <TableHead className="font-semibold text-white">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(tx => {
            const isIncrease = tx.type === 'Increase';
            const isCompleted = tx.status === 'completed';

            return (
              <TableRow key={tx.id} className="transition-colors hover:bg-muted/30">
                <TableCell isFirstColumn className="font-medium">
                  {tx.dateTime}
                </TableCell>
                <TableCell>
                  {tx.cashier} / {tx.station}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'px-2 py-1',
                      isIncrease
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-lighterBlueHighlight text-white hover:bg-lighterBlueHighlight/90'
                    )}
                  >
                    {isIncrease ? (
                      <>
                        <Plus className="mr-1 h-3 w-3" />
                        Increase
                      </>
                    ) : (
                      <>
                        <Minus className="mr-1 h-3 w-3" />
                        Decrease
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'font-semibold',
                      isIncrease ? 'text-button' : 'text-lighterBlueHighlight'
                    )}
                  >
                    {isIncrease ? '+' : ''}
                    {formatAmount(Math.abs(tx.amount))}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{tx.reason}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'px-2 py-1',
                      isCompleted
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                    )}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </>
                    )}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell>
                    {!isCompleted && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApprove?.(tx.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-button text-white hover:bg-button/90"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onReject?.(tx.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-600/90"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
