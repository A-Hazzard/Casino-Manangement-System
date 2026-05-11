/**
 * Vault Transactions Table Component
 *
 * Displays vault transactions with responsive table/card views.
 *
 * @module components/VAULT/transactions/tables/VaultTransactionsTable
 */
'use client';

import { ReactNode } from 'react';
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
import VaultTransactionDetailsModal from '@/components/VAULT/transactions/modals/VaultTransactionDetailsModal';
import ViewDenominationsModal from '@/components/VAULT/transactions/modals/ViewDenominationsModal';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type {
  Denomination,
  ExtendedVaultTransaction,
  VaultTransactionType,
} from '@/shared/types/vault';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Clock, Eye, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  getTransactionTypeBadge: (type: VaultTransactionType) => ReactNode;
  itemsPerPage?: number;
  disablePagination?: boolean;
};

export default function VaultTransactionsTable({
  transactions,
  onSort,
  getTransactionTypeBadge,
  itemsPerPage = 10,
  disablePagination = false,
}: VaultTransactionsTableProps) {
  const { formatAmount } = useCurrencyFormat();
  const [selectedTxDenominations, setSelectedTxDenominations] = useState<{
    denominations: Denomination[];
    amount: number;
  } | null>(null);

  const [selectedTransactionDetails, setSelectedTransactionDetails] =
    useState<ExtendedVaultTransaction | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);

  const formatDate = (date: string | Date) => safeFormatDate(date);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const pagedTransactions = useMemo(() => {
    if (disablePagination) return transactions;
    const start = currentPage * itemsPerPage;
    return transactions.slice(start, start + itemsPerPage);
  }, [transactions, currentPage, itemsPerPage, disablePagination]);

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
      <div className="hidden overflow-x-auto rounded-lg bg-container shadow-md lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              {transactions.some(tx => tx.locationName) && (
                <TableHead isFirstColumn className="font-semibold text-white">
                  Location
                </TableHead>
              )}
              <TableHead
                className={cn(
                  'font-semibold text-white',
                  !transactions.some(tx => tx.locationName) && 'pl-4'
                )}
              >
                Type
              </TableHead>
              <TableHead className="font-semibold text-white">Amount</TableHead>
              <TableHead className="font-semibold text-white">Source</TableHead>
              <TableHead className="font-semibold text-white">
                Destination
              </TableHead>
              <TableHead className="font-semibold text-white">Status</TableHead>
              <TableHead className="text-center font-semibold text-white">
                Actions
              </TableHead>
              <TableHead className="max-w-[150px] truncate font-semibold text-white">
                Notes
              </TableHead>
              <TableHead
                className={cn(
                  'relative cursor-pointer select-none font-semibold text-white',
                  onSort && 'hover:bg-button/90'
                )}
                onClick={onSort ? () => onSort('date') : undefined}
              >
                Date & Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {pagedTransactions.map(tx => {
                const isCompleted = !tx.isVoid;

                return (
                  <motion.tr
                    key={tx._id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {tx.locationName && (
                      <TableCell
                        isFirstColumn
                        className="text-[10px] font-bold uppercase tracking-tighter text-gray-400"
                      >
                        {tx.locationName}
                      </TableCell>
                    )}
                    <TableCell className={cn(!tx.locationName && 'pl-4')}>
                      {getTransactionTypeBadge(tx.type)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-bold',
                          tx.from?.type === 'vault'
                            ? 'text-red-600'
                            : 'text-green-600'
                        )}
                      >
                        {tx.from?.type === 'vault' && '-'}
                        {formatAmount(Math.abs(tx.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {tx.fromName || tx.from.type || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {tx.toName || tx.to.type || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'px-2 py-0.5 text-[10px]',
                          isCompleted
                            ? 'bg-button text-white'
                            : 'bg-red-600 text-white'
                        )}
                      >
                        {isCompleted ? 'Completed' : 'Voided'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {tx.denominations && tx.denominations.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-blue-600"
                            onClick={() =>
                              setSelectedTxDenominations({
                                denominations: tx.denominations,
                                amount: Math.abs(tx.amount),
                              })
                            }
                          >
                            <Eye className="mr-1 h-3 w-3" /> Denoms
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-bold text-violet-600"
                          onClick={() => setSelectedTransactionDetails(tx)}
                        >
                          <FileText className="mr-1 h-3 w-3" /> Details
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate whitespace-nowrap text-xs text-gray-400">
                      {tx.notes || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-medium">
                      {formatDate(tx.timestamp)}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        <AnimatePresence initial={false}>
          {pagedTransactions.map(tx => {
            const isCompleted = !tx.isVoid;

            return (
              <motion.div
                key={tx._id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn(
                    'overflow-hidden border-l-4 shadow-sm',
                    tx.from?.type === 'vault'
                      ? 'border-l-red-600'
                      : 'border-l-green-600'
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="h-3 w-3" />{' '}
                          {formatDate(tx.timestamp)}
                        </div>
                        {tx.locationName && (
                          <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                            {tx.locationName}
                          </div>
                        )}
                        <div className="mt-1">
                          {getTransactionTypeBadge(tx.type)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-lg font-black',
                          tx.from?.type === 'vault'
                            ? 'text-red-600'
                            : 'text-green-600'
                        )}
                      >
                        {tx.from?.type === 'vault' && '-'}
                        {formatAmount(Math.abs(tx.amount))}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded bg-gray-50 px-2 py-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                          From
                        </span>
                        <span className="max-w-[160px] truncate font-semibold">
                          {tx.fromName || tx.from.type || '-'}
                        </span>
                      </div>
                      <ArrowRight className="mx-2 h-4 w-4 text-gray-300" />
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                          To
                        </span>
                        <span className="max-w-[160px] truncate font-semibold">
                          {tx.toName || tx.to.type || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            'px-2 py-0.5 text-[10px]',
                            isCompleted ? 'bg-button' : 'bg-red-600'
                          )}
                        >
                          {isCompleted ? 'Completed' : 'Voided'}
                        </Badge>
                        {tx.denominations && tx.denominations.length > 0 && (
                          <button
                            className="flex items-center gap-1 text-[10px] font-medium text-blue-600 underline"
                            onClick={() =>
                              setSelectedTxDenominations({
                                denominations: tx.denominations,
                                amount: Math.abs(tx.amount),
                              })
                            }
                          >
                            <Eye className="h-3 w-3" /> Denoms
                          </button>
                        )}
                        <button
                          className="ml-2 flex items-center gap-1 text-[10px] font-bold text-violet-600 underline"
                          onClick={() => setSelectedTransactionDetails(tx)}
                        >
                          <FileText className="h-3 w-3" /> Details
                        </button>
                      </div>
                      <div className="flex max-w-[120px] items-center gap-1.5 text-xs text-gray-400">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-normal break-words text-xs italic text-gray-400">
                          {tx.notes || 'No notes'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {!disablePagination && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={transactions.length}
          setCurrentPage={setCurrentPage}
          showTotalCount
        />
      )}

      <ViewDenominationsModal
        open={!!selectedTxDenominations}
        onClose={() => setSelectedTxDenominations(null)}
        denominations={selectedTxDenominations?.denominations || []}
        totalAmount={selectedTxDenominations?.amount || 0}
      />
      <VaultTransactionDetailsModal
        open={!!selectedTransactionDetails}
        onClose={() => setSelectedTransactionDetails(null)}
        transaction={selectedTransactionDetails}
      />
    </div>
  );
}
