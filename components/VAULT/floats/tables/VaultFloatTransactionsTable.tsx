/**
 * Vault Float Transactions Table Component
 *
 * Displays float transactions with responsive table/card views.
 *
 * @module components/VAULT/floats/tables/VaultFloatTransactionsTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
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
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { FloatTransaction } from '@/shared/types/vault';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  FileText,
  User,
  X,
} from 'lucide-react';

export type FloatTransactionSortOption =
  | 'timestamp'
  | 'performedByName'
  | 'type'
  | 'amount'
  | 'notes'
  | 'isVoid';

type VaultFloatTransactionsTableProps = {
  transactions: FloatTransaction[];
  sortOption?: FloatTransactionSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: FloatTransactionSortOption) => void;
  onApprove?: (transactionId: string) => void;
  onReject?: (transactionId: string) => void;
  showActions?: boolean;
  disabled?: boolean;
};

export default function VaultFloatTransactionsTable({
  transactions,
  onApprove,
  onReject,
  showActions = false,
  disabled = false,
}: VaultFloatTransactionsTableProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Handlers
  // ============================================================================
  const formatDate = (dateString: string | Date) => {
    return safeFormatDate(dateString);
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center text-gray-400 shadow-md">
        No float transactions found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden overflow-x-auto rounded-lg bg-container shadow-md lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button text-white hover:bg-button">
              <TableHead isFirstColumn className="font-semibold text-white">
                Cashier
              </TableHead>
              <TableHead className="text-center font-semibold text-white">
                Type
              </TableHead>
              <TableHead className="text-right font-semibold text-white">
                Amount
              </TableHead>
              <TableHead className="font-semibold text-white">Reason</TableHead>
              <TableHead className="font-semibold text-white">
                Date/Time
              </TableHead>
              {showActions && (
                <TableHead className="text-right font-semibold text-white">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => {
              // Transactions that add money to the cashier's float
              const isInflow =
                tx.type === 'float_increase' ||
                tx.type === 'cashier_shift_open';
              const isCompleted = !tx.isVoid;

              // Map type to display label
              const getLabel = (type: string) => {
                switch (type) {
                  case 'float_increase':
                    return 'Increase';
                  case 'float_decrease':
                    return 'Decrease';
                  case 'cashier_shift_open':
                    return 'Shift Open';
                  case 'payout':
                    return 'Payout';
                  default:
                    return type.replace(/_/g, ' ');
                }
              };

              return (
                <TableRow
                  key={tx._id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell isFirstColumn className="text-sm font-medium">
                    {tx.to?.type === 'cashier'
                      ? tx.toName || tx.to.id
                      : tx.from?.type === 'cashier'
                        ? tx.fromName || tx.from.id
                        : tx.performedByName}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={cn(
                        'mx-auto flex w-fit items-center justify-center gap-1 border-none px-2 py-0.5 text-[10px] capitalize',
                        isInflow
                          ? 'bg-green-600 text-white'
                          : 'bg-orangeHighlight text-white'
                      )}
                    >
                      {isInflow ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                      {getLabel(tx.type)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-bold',
                      isInflow ? 'text-green-600' : 'text-orangeHighlight'
                    )}
                  >
                    {formatAmount(Math.abs(tx.amount))}
                  </TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal break-words text-xs text-gray-500">
                    {tx.notes || '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(tx.timestamp)}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {!isCompleted && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => !disabled && onApprove?.(tx._id)}
                            disabled={disabled}
                            className={cn(
                              'rounded-full bg-button p-1.5 text-white',
                              disabled && 'cursor-not-allowed opacity-40'
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => !disabled && onReject?.(tx._id)}
                            disabled={disabled}
                            className={cn(
                              'rounded-full bg-red-600 p-1.5 text-white',
                              disabled && 'cursor-not-allowed opacity-40'
                            )}
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

      {/* Mobile/Tablet Card View */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        {transactions.map(tx => {
          const isInflow =
            tx.type === 'float_increase' || tx.type === 'cashier_shift_open';
          const isCompleted = !tx.isVoid;

          const getLabel = (type: string) => {
            switch (type) {
              case 'float_increase':
                return 'Increase';
              case 'float_decrease':
                return 'Decrease';
              case 'cashier_shift_open':
                return 'Shift Open';
              case 'payout':
                return 'Payout';
              default:
                return type.replace(/_/g, ' ');
            }
          };

          return (
            <Card
              key={tx._id}
              className={cn(
                'overflow-hidden border-l-4 shadow-sm',
                isInflow ? 'border-l-green-600' : 'border-l-orangeHighlight'
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" /> {formatDate(tx.timestamp)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-bold text-gray-900">
                        {tx.to?.type === 'cashier'
                          ? tx.toName || tx.to.id
                          : tx.from?.type === 'cashier'
                            ? tx.fromName || tx.from.id
                            : tx.performedByName}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-lg font-black',
                      isInflow ? 'text-green-600' : 'text-orangeHighlight'
                    )}
                  >
                    {formatAmount(Math.abs(tx.amount))}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        'border-none px-2 py-0.5 text-[10px] capitalize',
                        isInflow
                          ? 'bg-green-600 text-white'
                          : 'bg-orangeHighlight text-white'
                      )}
                    >
                      {getLabel(tx.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <FileText className="h-3 w-3" />
                    <span className="max-w-[100px] truncate italic">
                      {tx.notes || '-'}
                    </span>
                  </div>
                </div>

                {showActions && !isCompleted && (
                  <div className="mt-2 flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className={cn(
                        'h-8 flex-1 bg-button text-xs',
                        disabled && 'cursor-not-allowed opacity-40'
                      )}
                      onClick={() => !disabled && onApprove?.(tx._id)}
                      disabled={disabled}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className={cn(
                        'h-8 flex-1 text-xs',
                        disabled && 'cursor-not-allowed opacity-40'
                      )}
                      onClick={() => !disabled && onReject?.(tx._id)}
                      disabled={disabled}
                    >
                      <X className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
