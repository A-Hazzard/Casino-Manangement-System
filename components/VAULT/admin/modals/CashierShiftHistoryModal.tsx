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
import { ArrowLeft, BarChart3, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const limit = 20;

  const locationId = user?.assignedLocations?.[0];

  const fetchShifts = async (page = 1) => {
    if (!cashier || !locationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        cashierId: cashier._id,
        locationId,
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
      });

      const res = await fetch(`/api/vault/cashier-shift/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setShifts(data.shifts || []);
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
      fetchShifts(1);
      setCurrentPage(1);
    }
  }, [isOpen, cashier]);

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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
              <div className="space-y-2">
                {shifts.map((shift) => {
                  const isExpanded = expandedShiftId === shift._id;
                  return (
                    <div key={shift._id} className="rounded-md border">
                      <div
                        className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50"
                        onClick={() => setExpandedShiftId(isExpanded ? null : shift._id)}
                      >
                        <div className="flex items-center gap-4">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-semibold">
                              {new Date(shift.openedAt).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Duration: {calculateShiftDuration(shift.openedAt, shift.closedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {shift.discrepancy !== undefined && shift.discrepancy !== 0 && (
                            <div className={cn(
                              'font-mono font-semibold',
                              shift.discrepancy > 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {shift.discrepancy > 0 ? '+' : ''}{formatAmount(shift.discrepancy)}
                            </div>
                          )}
                          {getStatusBadge(shift.status)}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4">
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div>
                              <div className="text-sm text-gray-500">Opening Balance</div>
                              <div className="font-mono font-semibold">
                                {formatAmount(shift.openingBalance)}
                              </div>
                            </div>
                            {shift.closingBalance !== undefined && (
                              <div>
                                <div className="text-sm text-gray-500">Closing Balance</div>
                                <div className="font-mono font-semibold">
                                  {formatAmount(shift.closingBalance)}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="text-sm text-gray-500">Payouts</div>
                              <div className="font-semibold">
                                {shift.payoutsCount} ({formatAmount(shift.payoutsTotal)})
                              </div>
                            </div>
                            {shift.floatAdjustmentsTotal !== undefined && (
                              <div>
                                <div className="text-sm text-gray-500">Float Adjustments</div>
                                <div className="font-mono font-semibold">
                                  {formatAmount(shift.floatAdjustmentsTotal)}
                                </div>
                              </div>
                            )}
                          </div>
                          {shift.vmReviewNotes && (
                            <div className="mt-4">
                              <div className="text-sm text-gray-500">VM Review Notes</div>
                              <div className="mt-1 rounded bg-yellow-50 p-2 text-sm">
                                {shift.vmReviewNotes}
                              </div>
                              {shift.reviewedAt && (
                                <div className="mt-1 text-xs text-gray-400">
                                  Reviewed at {new Date(shift.reviewedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
