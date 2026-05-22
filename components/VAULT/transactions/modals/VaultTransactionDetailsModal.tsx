/**
 * Vault Transaction Details Modal Component
 *
 * Displays full details of a single vault transaction including
 * amount, source/destination, notes, bank details, and machine info.
 *
 * @module components/VAULT/transactions/modals/VaultTransactionDetailsModal
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { VaultTransaction } from '@/shared/types/vault';
import { Calendar, FileText, Landmark, Receipt, User } from 'lucide-react';

type MachineDetail = {
  identifier?: string;
  game?: string;
  gameType?: string;
};

export type ExtendedTransactionView = Omit<
  VaultTransaction,
  'timestamp' | 'createdAt' | 'updatedAt'
> & {
  timestamp: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  performerName?: string;
  performedByName?: string;
  machineDetails?: MachineDetail[];
};

type VaultTransactionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  transaction: ExtendedTransactionView | null;
};

export default function VaultTransactionDetailsModal({
  open,
  onClose,
  transaction,
}: VaultTransactionDetailsModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  // Guard: No transaction to display
  if (!transaction) return null;

  // Format bank details for display
  const hasBankDetails =
    transaction.bankDetails && Object.keys(transaction.bankDetails).length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
    >
      <DialogContent className="overflow-y-auto md:max-h-[90vh] md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              Transaction Details
            </span>
            {!transaction.isVoid ? (
              <Badge className="border-transparent bg-button text-white">
                Completed
              </Badge>
            ) : (
              <Badge className="border-transparent bg-red-600 text-white">
                Voided
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Main Info Card */}
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Amount
                </span>
                <span
                  className={cn(
                    'text-3xl font-black',
                    transaction.from?.type === 'vault'
                      ? 'text-red-600'
                      : 'text-green-600'
                  )}
                >
                  {transaction.from?.type === 'vault' && '-'}
                  {formatAmount(Math.abs(transaction.amount))}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Date & Time
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {safeFormatDate(transaction.timestamp)}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 bg-white">
              <div className="flex flex-col border-b border-r border-gray-100 p-5">
                <span className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Source (From)
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {transaction.fromName ||
                    transaction.from.id ||
                    transaction.from.type}
                </span>
              </div>
              <div className="flex flex-col items-end border-b border-gray-100 p-5 text-right">
                <span className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Destination (To)
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {transaction.toName ||
                    transaction.to.id ||
                    transaction.to.type}
                </span>
              </div>
              <div className="flex flex-col border-r border-gray-100 p-5">
                <span className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Performed By
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <User className="h-4 w-4 text-gray-400" />
                  {transaction.performerName ||
                    transaction.performedByName ||
                    transaction.performedBy ||
                    'System'}
                </span>
              </div>
              <div className="flex flex-col items-end bg-gray-50/50 p-5 text-right">
                <span className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Transaction Type
                </span>
                <Badge
                  variant="outline"
                  className="bg-white text-[10px] font-bold uppercase tracking-tight"
                >
                  {transaction.type.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Notes & Reason */}
          {(transaction.notes || transaction.reason) && (
            <div className="flex flex-col gap-4 rounded-xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm">
              {transaction.reason && (
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-600">
                    <FileText className="h-3.5 w-3.5" /> Reason
                  </span>
                  <span className="text-sm font-semibold text-violet-900">
                    {transaction.reason}
                  </span>
                </div>
              )}
              {transaction.notes && (
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-600">
                    <FileText className="h-3.5 w-3.5" /> Notes
                  </span>
                  <span className="break-words text-sm font-medium text-violet-800">
                    {transaction.notes}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bank Details Section */}
          {hasBankDetails && (
            <div className="flex flex-col space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Landmark className="h-4.5 w-4.5 text-gray-500" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Bank Details
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {transaction.bankDetails!.nameOnAccount && (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Name On Account
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {transaction.bankDetails!.nameOnAccount}
                    </span>
                  </div>
                )}
                {transaction.bankDetails!.bankName && (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Bank Name
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {transaction.bankDetails!.bankName}
                    </span>
                  </div>
                )}
                {transaction.bankDetails!.accountNumber && (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Account Number
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {transaction.bankDetails!.accountNumber}
                    </span>
                  </div>
                )}
                {transaction.bankDetails!.accountType && (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Account Type
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {transaction.bankDetails!.accountType}
                    </span>
                  </div>
                )}
                {transaction.bankDetails!.transit && (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Transit
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {transaction.bankDetails!.transit}
                    </span>
                  </div>
                )}
                {transaction.bankDetails!.branch && (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Branch
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {transaction.bankDetails!.branch}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category Details Section */}
          {transaction.expenseDetails &&
            Object.keys(transaction.expenseDetails).length > 0 && (
              <div className="flex flex-col space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Receipt className="h-4.5 w-4.5 text-gray-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">
                    Category Details
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {Object.entries(transaction.expenseDetails!).map(
                    ([key, val]) => {
                      if (val === undefined || val === null || val === '')
                        return null;
                      if (
                        [
                          'machineNames',
                          'machineDetails',
                          'machineIds',
                        ].includes(key)
                      )
                        return null;

                      if (typeof val === 'boolean') {
                        return (
                          <div key={key} className="col-span-2 flex flex-col">
                            <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {val ? 'Yes' : 'No'}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="flex flex-col">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {String(val)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

          {/* Machine Details Section */}
          {(transaction as ExtendedTransactionView).machineDetails &&
            (transaction as ExtendedTransactionView).machineDetails!.length >
              0 && (
              <div className="flex flex-col space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Receipt className="h-4.5 w-4.5 text-gray-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">
                    Related Machines
                  </h4>
                </div>
                <div className="overflow-hidden rounded-md border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-bold leading-tight">
                          Machine
                        </th>
                        <th className="px-3 py-2 font-bold leading-tight">
                          Game
                        </th>
                        <th className="px-3 py-2 font-bold leading-tight">
                          Game Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(
                        transaction as ExtendedTransactionView
                      ).machineDetails!.map(
                        (machineDetailItem: MachineDetail, idx: number) => (
                          <tr
                            key={idx}
                            className="transition-colors hover:bg-gray-50/50"
                          >
                            <td className="px-3 py-2.5 font-semibold text-gray-900">
                              {machineDetailItem.identifier || 'N/A'}
                            </td>
                            <td className="max-w-[150px] truncate px-3 py-2.5 text-gray-600">
                              {machineDetailItem.game || (
                                <span className="italic text-red-600">
                                  no game provided
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">
                              {machineDetailItem.gameType || 'N/A'}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
