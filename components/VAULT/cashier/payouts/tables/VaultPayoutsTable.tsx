/**
 * Vault Payouts Table Component
 *
 * Displays player payouts with responsive table/card views.
 *
 * @module components/VAULT/cashier/payouts/tables/VaultPayoutsTable
 */
'use client';

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
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, Calendar, FileText, Ticket } from 'lucide-react';

type Payout = {
  id: string;
  ticketNumber: string;
  amount: number;
  cashier: string;
  cashierId?: string;
  station: string;
  processed: string;
  notes: string;
};

export type PayoutSortOption =
  | 'ticketNumber'
  | 'amount'
  | 'cashier'
  | 'station'
  | 'processed';

type VaultPayoutsTableProps = {
  payouts: Payout[];
  sortOption?: PayoutSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: PayoutSortOption) => void;
};

export default function VaultPayoutsTable({
  payouts,
  sortOption,
  sortOrder = 'asc',
  onSort,
}: VaultPayoutsTableProps) {
  const { formatAmount } = useCurrencyFormat();
  const formatDate = (dateString: string) => safeFormatDate(dateString);

  if (payouts.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center shadow-md">
        <p className="text-gray-500">No payouts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight">
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
                Ticket / Type
                {sortOption === 'ticketNumber' && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {sortOrder === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </TableHead>
              <TableHead
                className={cn(
                  'relative cursor-pointer select-none font-semibold text-white text-center',
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
              <TableHead className="font-semibold text-white text-center">Notes</TableHead>
              <TableHead
                className={cn(
                  'relative cursor-pointer select-none font-semibold text-white text-center',
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
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {payouts.map(payout => (
                <motion.tr 
                  key={payout.id} 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell isFirstColumn className="font-medium">
                    <div className="flex items-center gap-2">
                      {payout.ticketNumber.includes('Hand Pay') ? (
                         <Banknote className="h-4 w-4 text-emerald-500" />
                      ) : (
                         <Ticket className="h-4 w-4 text-blue-500" />
                      )}
                      {payout.ticketNumber}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-red-600">-{formatAmount(Math.abs(payout.amount))}</span>
                  </TableCell>

                  <TableCell className="text-center text-sm text-gray-600 truncate max-w-[200px]">{payout.notes || '-'}</TableCell>
                  <TableCell className="text-center text-sm text-gray-600 whitespace-nowrap">{formatDate(payout.processed)}</TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        <AnimatePresence initial={false}>
          {payouts.map(payout => (
            <motion.div 
              key={payout.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden border-l-4 border-l-red-600 shadow-sm h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       {payout.ticketNumber.includes('Hand Pay') ? (
                           <Banknote className="h-4 w-4 text-emerald-500" />
                        ) : (
                           <Ticket className="h-4 w-4 text-blue-500" />
                        )}
                      <span className="font-bold text-gray-900">{payout.ticketNumber}</span>
                    </div>
                    <span className="text-lg font-black text-red-600">-{formatAmount(Math.abs(payout.amount))}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">{formatDate(payout.processed)}</span>
                    </div>
                  </div>
  
                  <div className="flex items-center justify-start pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                       <FileText className="h-3 w-3" />
                       <span className="italic truncate max-w-[150px]">{payout.notes || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>


    </div>
  );
}
