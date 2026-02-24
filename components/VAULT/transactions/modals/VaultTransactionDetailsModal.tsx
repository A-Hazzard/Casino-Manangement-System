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

type VaultTransactionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  transaction: VaultTransaction | null;
};

export default function VaultTransactionDetailsModal({
  open,
  onClose,
  transaction,
}: VaultTransactionDetailsModalProps) {
  const { formatAmount } = useCurrencyFormat();

  if (!transaction) return null;

  // Format bank details for display
  const hasBankDetails = transaction.bankDetails && Object.keys(transaction.bankDetails).length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="md:max-w-[600px] md:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">Transaction Details</span>
            {!transaction.isVoid ? (
              <Badge className="bg-button text-white border-transparent">Completed</Badge>
            ) : (
              <Badge className="bg-red-600 text-white border-transparent">Voided</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Main Info Card */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header Section */}
            <div className="flex items-center justify-between p-5 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</span>
                <span className={cn('text-3xl font-black', transaction.from?.type === 'vault' ? 'text-red-600' : 'text-green-600')}>
                  {transaction.from?.type === 'vault' && '-'}{formatAmount(Math.abs(transaction.amount))}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date & Time</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {safeFormatDate(transaction.timestamp)}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 bg-white">
                <div className="flex flex-col p-5 border-r border-b border-gray-100">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Source (From)</span>
                   <span className="text-sm font-semibold text-gray-900">{transaction.fromName || transaction.from.id || transaction.from.type}</span>
                </div>
                 <div className="flex flex-col p-5 border-b border-gray-100 items-end text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Destination (To)</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.toName || transaction.to.id || transaction.to.type}</span>
                 </div>
                <div className="flex flex-col p-5 border-r border-gray-100">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Performed By</span>
                   <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-gray-400" />
                      {(transaction as any).performerName || (transaction as any).performedByName || transaction.performedBy || 'System'}
                   </span>
                </div>
                <div className="flex flex-col p-5 items-end text-right bg-gray-50/50">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Transaction Type</span>
                   <Badge variant="outline" className="uppercase font-bold tracking-tight text-[10px] bg-white">
                      {transaction.type.replace(/_/g, ' ')}
                   </Badge>
                </div>
            </div>
          </div>

          {/* Notes & Reason */}
          {(transaction.notes || transaction.reason) && (
             <div className="flex flex-col gap-4 p-5 bg-violet-50/50 rounded-xl border border-violet-100 shadow-sm">
                 {transaction.reason && (
                    <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Reason
                       </span>
                       <span className="text-sm font-semibold text-violet-900">{transaction.reason}</span>
                    </div>
                 )}
                 {transaction.notes && (
                    <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Notes
                       </span>
                       <span className="text-sm font-medium text-violet-800 break-words">{transaction.notes}</span>
                    </div>
                 )}
             </div>
          )}

          {/* Bank Details Section */}
          {hasBankDetails && (
            <div className="flex flex-col space-y-4 p-5 rounded-xl border border-gray-200 shadow-sm bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Landmark className="h-4.5 w-4.5 text-gray-500" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Bank Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {transaction.bankDetails!.nameOnAccount && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name On Account</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.bankDetails!.nameOnAccount}</span>
                  </div>
                )}
                {transaction.bankDetails!.bankName && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Name</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.bankDetails!.bankName}</span>
                  </div>
                )}
                {transaction.bankDetails!.accountNumber && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Number</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.bankDetails!.accountNumber}</span>
                  </div>
                )}
                {transaction.bankDetails!.accountType && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Type</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.bankDetails!.accountType}</span>
                  </div>
                )}
                {transaction.bankDetails!.transit && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Transit</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.bankDetails!.transit}</span>
                  </div>
                )}
                {transaction.bankDetails!.branch && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Branch</span>
                    <span className="text-sm font-semibold text-gray-900">{transaction.bankDetails!.branch}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category Details Section */}
          {transaction.expenseDetails && Object.keys(transaction.expenseDetails).length > 0 && (
            <div className="flex flex-col space-y-4 p-5 rounded-xl border border-gray-200 shadow-sm bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Receipt className="h-4.5 w-4.5 text-gray-500" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Category Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {Object.entries(transaction.expenseDetails!).map(([key, val]) => {
                  if (val === undefined || val === null || val === '') return null;
                  if (['machineNames', 'machineDetails', 'machineIds'].includes(key)) return null;

                  if (typeof val === 'boolean') {
                    return (
                      <div key={key} className="flex flex-col col-span-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{val ? 'Yes' : 'No'}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{String(val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Machine Details Section */}
          {(transaction as any).machineDetails && (transaction as any).machineDetails.length > 0 && (
             <div className="flex flex-col space-y-4 p-5 rounded-xl border border-gray-200 shadow-sm bg-white">
               <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                 <Receipt className="h-4.5 w-4.5 text-gray-500" />
                 <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Related Machines</h4>
               </div>
               <div className="rounded-md border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                        <tr>
                           <th className="px-3 py-2 font-bold leading-tight">Machine</th>
                           <th className="px-3 py-2 font-bold leading-tight">Game</th>
                           <th className="px-3 py-2 font-bold leading-tight">Game Type</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 bg-white">
                        {(transaction as any).machineDetails.map((m: any, idx: number) => (
                           <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-3 py-2.5 font-semibold text-gray-900">{m.identifier || 'N/A'}</td>
                              <td className="px-3 py-2.5 text-gray-600 truncate max-w-[150px]">{m.game || <span className="text-red-600 italic">no game provided</span>}</td>
                              <td className="px-3 py-2.5 text-gray-600">{m.gameType || 'N/A'}</td>
                           </tr>
                        ))}
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
