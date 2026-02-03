/**
 * Vault Transactions Table Component
 *
 * Displays vault transactions with responsive table/card views.
 *
 * @module components/VAULT/transactions/tables/VaultTransactionsTable
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
import ViewDenominationsModal from '@/components/VAULT/transactions/modals/ViewDenominationsModal';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type {
    Denomination,
    ExtendedVaultTransaction,
    VaultTransactionType,
} from '@/shared/types/vault';
import { ArrowRight, Clock, Eye, FileText } from 'lucide-react';
import { useState } from 'react';

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

export default function VaultTransactionsTable({
  transactions,
  sortOption: _sortOption,
  sortOrder: _sortOrder = 'asc',
  onSort,
  getTransactionTypeBadge,
}: VaultTransactionsTableProps) {
  const { formatAmount } = useCurrencyFormat();
  const [selectedTxDenominations, setSelectedTxDenominations] = useState<{
    denominations: Denomination[];
    amount: number;
  } | null>(null);

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
      <div className="rounded-lg bg-container p-8 text-center shadow-md">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto rounded-lg bg-container shadow-md">
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
              </TableHead>
              <TableHead className="font-semibold text-white">Type</TableHead>
              <TableHead className="font-semibold text-white">Amount</TableHead>
              <TableHead className="font-semibold text-white">Source</TableHead>
              <TableHead className="font-semibold text-white">Destination</TableHead>
              <TableHead className="font-semibold text-white">Status</TableHead>
              <TableHead className="font-semibold text-white">Denoms</TableHead>
              <TableHead className="font-semibold text-white">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => {
              const isPositive = tx.amount > 0;
              const isCompleted = !tx.isVoid;

              return (
                <TableRow key={tx._id} className="transition-colors hover:bg-muted/30">
                  <TableCell isFirstColumn className="font-medium whitespace-nowrap text-xs">
                    {formatDate(tx.timestamp)}
                  </TableCell>
                  <TableCell>{getTransactionTypeBadge(tx.type)}</TableCell>
                  <TableCell>
                    <span className={cn('font-bold', isPositive ? 'text-button' : 'text-orangeHighlight')}>
                      {isPositive ? '+' : ''}{formatAmount(Math.abs(tx.amount))}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[120px]">{tx.fromName || tx.from.type || '-'}</TableCell>
                  <TableCell className="text-xs truncate max-w-[120px]">{tx.toName || tx.to.type || '-'}</TableCell>
                  <TableCell>
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isCompleted ? 'bg-button text-white' : 'bg-red-600 text-white')}>
                      {isCompleted ? 'Completed' : 'Voided'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tx.denominations && tx.denominations.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-blue-600 px-2"
                        onClick={() => setSelectedTxDenominations({ denominations: tx.denominations, amount: Math.abs(tx.amount) })}
                      >
                        <Eye className="mr-1 h-3 w-3" /> View
                      </Button>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400 truncate max-w-[100px]">{tx.notes || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {transactions.map(tx => {
          const isPositive = tx.amount > 0;
          const isCompleted = !tx.isVoid;

          return (
            <Card key={tx._id} className={cn("overflow-hidden border-l-4 shadow-sm", isPositive ? "border-l-button" : "border-l-orangeHighlight")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(tx.timestamp)}
                    </div>
                    <div className="mt-1">{getTransactionTypeBadge(tx.type)}</div>
                  </div>
                  <span className={cn("text-lg font-black", isPositive ? "text-button" : "text-orangeHighlight")}>
                    {isPositive ? '+' : ''}{formatAmount(Math.abs(tx.amount))}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 bg-gray-50 rounded px-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">From</span>
                      <span className="font-semibold truncate max-w-[100px]">{tx.fromName || tx.from.type || '-'}</span>
                   </div>
                   <ArrowRight className="h-4 w-4 text-gray-300 mx-2" />
                   <div className="flex flex-col items-end text-right">
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">To</span>
                      <span className="font-semibold truncate max-w-[100px]">{tx.toName || tx.to.type || '-'}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isCompleted ? 'bg-button' : 'bg-red-600')}>
                        {isCompleted ? 'Completed' : 'Voided'}
                    </Badge>
                    {tx.denominations && tx.denominations.length > 0 && (
                        <button 
                            className="text-[10px] text-blue-600 flex items-center gap-1 font-medium underline"
                            onClick={() => setSelectedTxDenominations({ denominations: tx.denominations, amount: Math.abs(tx.amount) })}
                        >
                            <Eye className="h-3 w-3" /> Denoms
                        </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 max-w-[120px]">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate italic">{tx.notes || 'No notes'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ViewDenominationsModal
        open={!!selectedTxDenominations}
        onClose={() => setSelectedTxDenominations(null)}
        denominations={selectedTxDenominations?.denominations || []}
        totalAmount={selectedTxDenominations?.amount || 0}
      />
    </div>
  );
}
