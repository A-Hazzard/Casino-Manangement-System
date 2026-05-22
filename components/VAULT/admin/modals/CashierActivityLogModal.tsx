/**
 * Cashier Activity Log Modal
 *
 * Displays all activity/transactions for a specific cashier.
 *
 * @module components/VAULT/admin/modals/CashierActivityLogModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { ArrowLeft, History, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ActivityLog = {
  _id: string;
  timestamp: string;
  type: string;
  amount: number;
  notes?: string;
  performerName?: string;
};

type Cashier = {
  _id: string;
  username: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

type CashierActivityLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  cashier: Cashier | null;
  shiftId?: string | null;
};

export default function CashierActivityLogModal({
  isOpen,
  onClose,
  onBack,
  cashier,
  shiftId,
}: CashierActivityLogModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const locationId = user?.assignedLocations?.[0];

  // ============================================================================
  // Handlers
  // ============================================================================
  // Note: fetchActivities is declared before Effects since useEffect depends on it.
  const fetchActivities = async (page = 0) => {
    if (!cashier || !locationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        locationId,
        cashierId: cashier._id,
        limit: limit.toString(),
        skip: (page * limit).toString(),
      });

      if (shiftId) {
        params.append('cashierShiftId', shiftId);
      }

      const res = await fetch(`/api/vault/activity-log?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setActivities(data.activities || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(Math.ceil((data.totalCount || 0) / limit));
      } else {
        toast.error('Failed to load activity log');
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
      toast.error('Error loading activity log');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (isOpen && cashier) {
      fetchActivities(0);
      setCurrentPage(0);
    }
  }, [isOpen, cashier]);

  useEffect(() => {
    if (isOpen) {
      fetchActivities(currentPage);
    }
  }, [currentPage]);

  // ============================================================================
  // Computed
  // ============================================================================

  // Guard: cashier must be present
  if (!cashier) return null;

  const cashierName = cashier.profile
    ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
    : cashier.username;

  const getActivityDescription = (activity: ActivityLog) => {
    const typeMap: Record<string, string> = {
      cashier_shift_open: 'Shift Opened',
      cashier_shift_close: 'Shift Closed',
      float_increase: 'Float Increased',
      float_decrease: 'Float Decreased',
      payout: 'Payout',
      expense: 'Expense',
    };
    return typeMap[activity.type] || activity.type;
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!z-[200] max-w-4xl"
        backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button onClick={onBack} variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <History className="h-5 w-5" />
            <DialogTitle>Activity Log - {cashierName}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No activity found for this cashier
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Timestamp
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Type
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Performed By
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Amount
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Notes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map(activity => (
                      <TableRow
                        key={activity._id}
                        className="transition-colors hover:bg-gray-50/50"
                      >
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black leading-none text-gray-900">
                              {new Date(activity.timestamp).toLocaleString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                            <span className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                              {new Date(activity.timestamp).toLocaleString(
                                'en-US',
                                {
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  hour12: true,
                                }
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest',
                              activity.type.includes('error') ||
                                activity.type.includes('denied')
                                ? 'border border-red-100 bg-red-50 text-red-600'
                                : 'border border-violet-100 bg-violet-50 text-violet-600'
                            )}
                          >
                            {getActivityDescription(activity)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-black uppercase text-gray-500">
                              {activity.performerName?.[0] || 'U'}
                            </div>
                            <span className="text-xs font-bold text-gray-700">
                              {activity.performerName || 'Unknown System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-black text-gray-900">
                          {formatAmount(activity.amount || 0)}
                        </TableCell>
                        <TableCell className="max-w-[200px] whitespace-normal break-words text-[11px] font-medium italic text-gray-500">
                          {activity.notes ? `"${activity.notes}"` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
