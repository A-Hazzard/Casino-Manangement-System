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
import type { FloatTransaction } from '@/shared/types/vault';
import { CheckCircle2, Clock, FileText, User, X } from 'lucide-react';

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
  sortOption: _sortOption,
  sortOrder: _sortOrder = 'asc',
  onSort: _onSort,
  onApprove,
  onReject,
  showActions = false,
  disabled = false,
}: VaultFloatTransactionsTableProps) {
  const { formatAmount } = useCurrencyFormat();

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center shadow-md text-gray-400">
        No float transactions found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto rounded-lg bg-container shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button text-white">
              <TableHead className="font-semibold text-white">Date/Time</TableHead>
              <TableHead className="font-semibold text-white">Cashier</TableHead>
              <TableHead className="font-semibold text-white text-center">Type</TableHead>
              <TableHead className="font-semibold text-white text-right">Amount</TableHead>
              <TableHead className="font-semibold text-white">Reason</TableHead>
              <TableHead className="font-semibold text-white text-center">Status</TableHead>
              {showActions && <TableHead className="font-semibold text-white text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => {
              const isIncrease = tx.type === 'float_increase';
              const isCompleted = !tx.isVoid;

              return (
                <TableRow key={tx._id} className="transition-colors hover:bg-muted/30">
                  <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.timestamp)}</TableCell>
                  <TableCell className="font-medium text-sm">{tx.performedByName}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isIncrease ? 'bg-button' : 'bg-lighterBlueHighlight')}>
                      {isIncrease ? 'Increase' : 'Decrease'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-right font-bold', isIncrease ? 'text-button' : 'text-lighterBlueHighlight')}>
                    {isIncrease ? '+' : ''}{formatAmount(Math.abs(tx.amount))}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">{tx.notes || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isCompleted ? 'bg-button' : 'bg-orangeHighlight')}>
                      {isCompleted ? 'Completed' : 'Pending'}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                       {!isCompleted && (
                         <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => !disabled && onApprove?.(tx._id)} 
                              disabled={disabled}
                              className={cn("p-1.5 rounded-full bg-button text-white", disabled && "opacity-40 cursor-not-allowed")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => !disabled && onReject?.(tx._id)} 
                              disabled={disabled}
                              className={cn("p-1.5 rounded-full bg-red-600 text-white", disabled && "opacity-40 cursor-not-allowed")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {transactions.map(tx => {
          const isIncrease = tx.type === 'float_increase';
          const isCompleted = !tx.isVoid;

          return (
            <Card key={tx._id} className={cn("overflow-hidden border-l-4 shadow-sm", isIncrease ? "border-l-button" : "border-l-lighterBlueHighlight")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(tx.timestamp)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <User className="h-3.5 w-3.5 text-gray-400" />
                       <span className="font-bold text-gray-900 text-sm">{tx.performedByName}</span>
                    </div>
                  </div>
                  <span className={cn("text-lg font-black", isIncrease ? "text-button" : "text-lighterBlueHighlight")}>
                    {isIncrease ? '+' : ''}{formatAmount(Math.abs(tx.amount))}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isIncrease ? 'bg-button' : 'bg-lighterBlueHighlight')}>
                        {isIncrease ? 'Increase' : 'Decrease'}
                    </Badge>
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isCompleted ? 'bg-button text-white' : 'bg-orangeHighlight')}>
                      {isCompleted ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <FileText className="h-3 w-3" />
                    <span className="truncate max-w-[100px] italic">{tx.notes || '-'}</span>
                  </div>
                </div>

                {showActions && !isCompleted && (
                  <div className="flex gap-2 pt-2 mt-2">
                    <Button 
                      size="sm" 
                      className={cn("flex-1 bg-button h-8 text-xs", disabled && "opacity-40 cursor-not-allowed")} 
                      onClick={() => !disabled && onApprove?.(tx._id)}
                      disabled={disabled}
                    >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className={cn("flex-1 h-8 text-xs", disabled && "opacity-40 cursor-not-allowed")} 
                      onClick={() => !disabled && onReject?.(tx._id)}
                      disabled={disabled}
                    >
                        <X className="h-3 w-3 mr-1" /> Reject
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
