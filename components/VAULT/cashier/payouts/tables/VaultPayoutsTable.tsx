/**
 * Vault Payouts Table Component
 *
 * Displays player payouts with responsive table/card views.
 *
 * @module components/VAULT/cashier/payouts/tables/VaultPayoutsTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/shared/ui/dialog';
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
import { Banknote, Calendar, FileText, Loader2, RefreshCw, Ticket, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch {
      return dateString;
    }
  };

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
              <TableHead
                className={cn(
                  'relative cursor-pointer select-none font-semibold text-white text-center',
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
                  'relative cursor-pointer select-none font-semibold text-white text-center',
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
              <TableHead className="font-semibold text-white text-center">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map(payout => (
              <TableRow key={payout.id} className="transition-colors hover:bg-muted/30">
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
                  <span className="font-semibold text-button">{formatAmount(payout.amount)}</span>
                </TableCell>
                <TableCell className="text-center">
                  <div 
                    className={cn(
                      "flex items-center justify-center gap-2",
                      payout.cashierId && "cursor-pointer hover:text-button transition-colors underline decoration-dotted underline-offset-4"
                    )}
                    onClick={() => {
                      if (payout.cashierId) {
                        setSelectedCashierId(payout.cashierId);
                        setIsDetailsModalOpen(true);
                      }
                    }}
                  >
                    <Users className="h-4 w-4 text-gray-400" />
                    {payout.cashier}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-button text-white hover:bg-button/90">
                    {payout.station}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm text-gray-600 whitespace-nowrap">{formatDate(payout.processed)}</TableCell>
                <TableCell className="text-center text-sm text-gray-600 truncate max-w-[200px]">{payout.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {payouts.map(payout => (
          <Card key={payout.id} className="overflow-hidden border-l-4 border-l-button shadow-sm">
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
                <span className="text-lg font-black text-button">{formatAmount(payout.amount)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div 
                  className={cn(
                    "flex items-center gap-2",
                    payout.cashierId ? "text-button cursor-pointer font-bold" : "text-gray-500"
                  )}
                  onClick={() => {
                    if (payout.cashierId) {
                      setSelectedCashierId(payout.cashierId);
                      setIsDetailsModalOpen(true);
                    }
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="truncate">{payout.cashier}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 justify-end">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{formatDate(payout.processed)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Badge variant="outline" className="text-[10px] font-medium border-button text-button">
                   {payout.station}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                   <FileText className="h-3 w-3" />
                   <span className="italic truncate max-w-[150px]">{payout.notes || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CashierDetailsModal 
        id={selectedCashierId} 
        open={isDetailsModalOpen} 
        onOpenChange={setIsDetailsModalOpen} 
      />
    </div>
  );
}

/**
 * Cashier Details Modal Component
 */
function CashierDetailsModal({ id, open, onOpenChange }: { id: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [cashier, setCashier] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { formatAmount } = useCurrencyFormat();

  useEffect(() => {
    if (open && id) {
      fetchDetails();
    } else if (!open) {
      setCashier(null);
    }
  }, [open, id]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // First fetch user profile
      const userRes = await fetch(`/api/users/${id}`);
      const userData = await userRes.json();
      
      if (userData.success) {
        // Then check if they have an active shift to get balance/status
        const shiftRes = await fetch(`/api/cashier/shifts?cashierId=${id}&status=active`);
        const shiftData = await shiftRes.json();
        
        let shiftInfo = null;
        if (shiftData.success && shiftData.shifts?.[0]) {
           shiftInfo = shiftData.shifts[0];
        }

        setCashier({
          ...userData.user,
          shiftStatus: shiftInfo?.status || 'inactive',
          currentBalance: shiftInfo?.currentBalance || 0,
          denominations: shiftInfo?.lastSyncedDenominations || shiftInfo?.openingDenominations || []
        });
      } else {
        toast.error('Failed to fetch user details');
      }
    } catch (err) {
      console.error('Failed to fetch cashier details', err);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-button" />
            Cashier Details
          </DialogTitle>
          <DialogDescription>
            Detailed information for selected cashier
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-button" />
            <p className="text-sm text-gray-500">Loading details...</p>
          </div>
        ) : cashier ? (
          <div className="space-y-6 pt-4">
             {/* Header Info */}
             <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-button/10 flex items-center justify-center text-button">
                   <Users className="h-6 w-6" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900">
                      {cashier.profile?.firstName} {cashier.profile?.lastName}
                   </h3>
                   <p className="text-sm text-gray-500">@{cashier.username}</p>
                </div>
                <div className="ml-auto">
                   {!cashier.isEnabled ? (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700">Disabled</Badge>
                   ) : cashier.shiftStatus === 'active' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                         <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                         On-Shift
                      </Badge>
                   ) : (
                      <Badge variant="outline" className="text-gray-500">Off-Shift</Badge>
                   )}
                </div>
             </div>

             {/* Main Details */}
             <div className="grid grid-cols-2 gap-y-4 px-1">
                <DetailItem label="Email Address" value={cashier.emailAddress} />
                <DetailItem label="Last Login" value={cashier.lastLoginAt ? new Date(cashier.lastLoginAt).toLocaleString() : 'Never'} />
                <DetailItem label="Assigned System Roles" value={cashier.roles?.join(', ')} />
                <DetailItem label="Account Created" value={new Date(cashier.createdAt).toLocaleDateString()} />
             </div>

             {/* Shift Balance (if active) */}
             {cashier.shiftStatus === 'active' && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 space-y-3">
                   <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-800">Current Shift Balance:</span>
                      <span className="text-xl font-black text-emerald-600">{formatAmount(cashier.currentBalance)}</span>
                   </div>
                   
                   {cashier.denominations?.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/50">
                         <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-2">Denomination Breakdown</p>
                         <div className="grid grid-cols-3 gap-2">
                            {cashier.denominations.map((d: any) => (
                               <div key={d.denomination} className="flex flex-col bg-white/50 rounded p-1.5 border border-emerald-200/30">
                                  <span className="text-[10px] text-emerald-600 font-medium">${d.denomination} notes</span>
                                  <span className="text-xs font-bold text-emerald-900">x{d.quantity}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             )}

             {/* Notes / Footer */}
             {cashier.notes && (
                <div className="pt-2">
                   <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Administrator Notes
                   </p>
                   <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
                      "{cashier.notes}"
                   </p>
                </div>
             )}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
             Failed to load cashier data.
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close View
          </Button>
          <Button 
            className="w-full sm:w-auto bg-button text-white hover:bg-button/90 flex items-center gap-2"
            onClick={fetchDetails}
          >
             <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
             Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
   return (
      <div className="space-y-0.5">
         <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
         <p className="text-sm font-semibold text-gray-900 truncate pr-2" title={value}>{value || 'N/A'}</p>
      </div>
   );
}
