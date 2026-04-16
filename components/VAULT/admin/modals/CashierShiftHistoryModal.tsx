/**
 * Cashier Shift History Modal
 *
 * Displays all shift records for a specific cashier with expandable details.
 *
 * @module components/VAULT/admin/modals/CashierShiftHistoryModal
 */

'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type CashierShift = {
  _id: string;
  openedAt: string;
  closedAt?: string;
  status: string;
  openingBalance: number;
  closingBalance?: number;
  expectedClosingBalance?: number;
  cashierEnteredBalance?: number;
  discrepancy?: number;
  payoutsTotal: number;
  payoutsCount: number;
  floatAdjustmentsTotal?: number;
  vmReviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

type Cashier = {
  _id: string;
  username: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

type CashierShiftHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  cashier: Cashier | null;
};

export default function CashierShiftHistoryModal({
  isOpen,
  onClose,
  onBack,
  cashier,
}: CashierShiftHistoryModalProps) {
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();

  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);
  const limit = 5;

  const locationId = user?.assignedLocations?.[0];

  const fetchShifts = async (page = 0) => {
    if (!cashier || !locationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        cashierId: cashier._id,
        locationId,
        limit: limit.toString(),
        skip: (page * limit).toString(),
      });

      if (showVarianceOnly) {
        params.append('variance', 'true');
      }

      const res = await fetch(`/api/vault/cashier-shift/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setShifts(data.shifts || []);
        setTotalCount(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / limit));
      } else {
        toast.error('Failed to load shift history');
      }
    } catch (error) {
      console.error('Error fetching shift history:', error);
      toast.error('Error loading shift history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cashier) {
      fetchShifts(0);
      setCurrentPage(0);
    }
  }, [isOpen, cashier, showVarianceOnly]);

  useEffect(() => {
    if (isOpen) {
      fetchShifts(currentPage);
    }
  }, [currentPage]);

  if (!cashier) return null;

  const cashierName = cashier.profile
    ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
    : cashier.username;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Active', variant: 'default' },
      closed: { label: 'Closed', variant: 'secondary' },
      pending_review: { label: 'Pending Review', variant: 'destructive' },
      force_closed: { label: 'Force Closed', variant: 'outline' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateShiftDuration = (openedAt: string, closedAt?: string) => {
    const start = new Date(openedAt);
    const end = closedAt ? new Date(closedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-y-auto !z-[200]"
        backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <BarChart3 className="h-5 w-5" />
              <DialogTitle>Shift History - {cashierName}</DialogTitle>
            </div>
            
            {/* Filter Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setShowVarianceOnly(false)}
                    className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                        !showVarianceOnly ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    All Shifts
                </button>
                <button
                    onClick={() => setShowVarianceOnly(true)}
                    className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                        showVarianceOnly ? "bg-white shadow text-orangeHighlight" : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    Variance Only
                </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No shift history found for this cashier
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {shifts.map((shift) => (
                  <div key={shift._id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b bg-gray-50/50 px-4 py-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-bold text-gray-900">
                             {safeFormatDate(shift.openedAt)}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                             Duration: {calculateShiftDuration(shift.openedAt, shift.closedAt)}
                          </div>
                        </div>
                        {getStatusBadge(shift.status)}
                      </div>
                      
                      {/* Variance Badge in Header if significant */}
                      {shift.discrepancy !== undefined && shift.discrepancy !== 0 && (
                         <div className={cn(
                           "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
                           shift.discrepancy > 0 
                             ? "bg-green-50 text-green-700 border-green-200" 
                             : "bg-red-50 text-red-700 border-red-200"
                         )}>
                             <span>Variance:</span>
                             <span>{shift.discrepancy > 0 ? '+' : ''}{formatAmount(shift.discrepancy)}</span>
                         </div>
                      )}
                    </div>

                    {/* Content Grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
                        {/* Column 1: Opening */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</div>
                          <div className="font-mono text-lg font-bold text-gray-900">
                            {formatAmount(shift.openingBalance)}
                          </div>
                        </div>

                        {/* Column 2: Payouts */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payouts</div>
                          <div className="font-mono text-lg font-medium text-gray-700">
                            {formatAmount(shift.payoutsTotal)}
                            <span className="ml-1 text-xs text-gray-400 font-normal">({shift.payoutsCount})</span>
                          </div>
                        </div>

                        {/* Column 3: Float Adjustments */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Float Adj.</div>
                          <div className="font-mono text-lg font-medium text-gray-700">
                            {shift.floatAdjustmentsTotal ? formatAmount(shift.floatAdjustmentsTotal) : '-'}
                          </div>
                        </div>

                        {/* Column 4: Closing */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Balance</div>
                          <div className="font-mono text-lg font-bold text-gray-900">
                            {shift.closingBalance !== undefined ? formatAmount(shift.closingBalance) : '-'}
                          </div>
                        </div>

                        {/* Column 5: Variance (Detailed) */}
                        <div className="space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100 -my-2 flex flex-col justify-center">
                           <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Variance</div>
                           <div className={cn(
                             "font-mono text-lg font-black",
                             !shift.discrepancy ? "text-gray-400" : shift.discrepancy > 0 ? "text-green-600" : "text-red-600"
                           )}>
                             {shift.discrepancy ? (
                               <>{shift.discrepancy > 0 ? '+' : ''}{formatAmount(shift.discrepancy)}</>
                             ) : (
                               <span className="text-gray-300">—</span>
                             )}
                           </div>
                        </div>
                      </div>

                      {/* Review Notes Footer */}
                      {shift.vmReviewNotes && (
                        <div className="mt-4 border-t pt-3">
                          <div className="flex items-start gap-2">
                             <div className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5">Note</div>
                             <div className="text-sm text-gray-600 italic">
                                "{shift.vmReviewNotes}"
                             </div>
                          </div>
                          {shift.reviewedAt && (
                            <div className="mt-1 text-xs text-gray-400 ml-12">
                               Reviewed: {safeFormatDate(shift.reviewedAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                setCurrentPage={setCurrentPage}
                showTotalCount
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
