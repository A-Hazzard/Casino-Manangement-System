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
};

export default function CashierActivityLogModal({
  isOpen,
  onClose,
  onBack,
  cashier,
}: CashierActivityLogModalProps) {
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const locationId = user?.assignedLocations?.[0];

  const fetchActivities = async (page = 1) => {
    if (!cashier || !locationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        locationId,
        cashierId: cashier._id,
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
      });

      const res = await fetch(`/api/vault/activity-log?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setActivities(data.activities || []);
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

  useEffect(() => {
    if (isOpen && cashier) {
      fetchActivities(1);
      setCurrentPage(1);
    }
  }, [isOpen, cashier]);

  useEffect(() => {
    if (isOpen) {
      fetchActivities(currentPage);
    }
  }, [currentPage]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl !z-[200]"
        backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
      >
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
              <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 py-4">Timestamp</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Performed By</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity._id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 leading-none">
                              {new Date(activity.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                              {new Date(activity.timestamp).toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest",
                            activity.type.includes('error') || activity.type.includes('denied') 
                              ? "bg-red-50 text-red-600 border border-red-100" 
                              : "bg-violet-50 text-violet-600 border border-violet-100"
                          )}>
                            {getActivityDescription(activity)}
                          </span>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <div className="h-7 w-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-500 uppercase">
                                {(activity as any).performerName?.[0] || 'U'}
                              </div>
                              <span className="text-xs font-bold text-gray-700">
                                {(activity as any).performerName || 'Unknown System'}
                              </span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-gray-900">
                          {formatAmount(activity.amount || 0)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-[11px] font-medium text-gray-500 italic">
                          {activity.notes ? `"${activity.notes}"` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="pt-4 border-t border-gray-100">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
