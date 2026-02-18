/**
 * Vault Payouts Page Content Component
 *
 * Player payouts page for the Vault Management application.
 *
 * @module components/VAULT/cashier/payouts/VaultPayoutsPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/shared/ui/dialog';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets/helpers';
import { useCashierShift } from '@/lib/hooks/useCashierShift';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import type { CreatePayoutRequest } from '@/shared/types/vault';
import { AlertTriangle, Banknote, CheckCircle2, DollarSign, FileText, Loader2, RefreshCw, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import HandPayForm from './HandPayForm';
import type { PayoutSortOption } from './tables/VaultPayoutsTable';
import VaultPayoutsTable from './tables/VaultPayoutsTable';
import TicketRedemptionForm from './TicketRedemptionForm';

export default function VaultPayoutsPageContent() {
  const router = useRouter();
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  
  // -- State --
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [sortOption, setSortOption] = useState<PayoutSortOption>('processed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalCount, setTotalCount] = useState(0);
  
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showHandPayForm, setShowHandPayForm] = useState(false);
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // -- Shift Hook --
  const { 
    shift, 
    currentBalance, 
    isVaultReconciled,
    refresh: refreshShift 
  } = useCashierShift();

  // -- Data Fetching --
  const fetchPayouts = useCallback(async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;

    setLoading(true);
    try {
        const res = await fetch(`/api/vault/payouts?locationId=${locationId}&limit=50`); 
        const data = await res.json();
        if (data.success) {
            setPayouts(data.payouts.map((p: any) => ({
                id: p._id,
                ticketNumber: p.ticketNumber || (p.type === 'hand_pay' ? 'Hand Pay' : 'N/A'),
                amount: p.amount,
                cashier: p.cashierName || p.cashierId || 'Unknown',
                cashierId: p.cashierId,
                station: 'Vault',
                processed: p.createdAt || p.timestamp,
                notes: p.notes || '-'
            })));
            setTotalCount(data.pagination.total);
        } else {
            toast.error('Failed to fetch payouts');
        }
    } catch (error) {
        toast.error('Connection error');
        console.error('Failed to fetch payouts', error);
    } finally {
        setLoading(false);
    }
  }, [user?.assignedLocations]);

  const fetchMachinesData = useCallback(async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;
    try {
      const res = await fetchCabinetsForLocation(locationId, undefined, 'All Time');
      if (res && res.data) {
        setMachines(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch machines', error);
    }
  }, [user?.assignedLocations]);

  useEffect(() => {
    fetchPayouts();
    fetchMachinesData();
  }, [fetchPayouts, fetchMachinesData]);

  // Periodic refresh only if at least 2 items
  useEffect(() => {
    if (payouts.length < 2) return;

    const interval = setInterval(() => {
        fetchPayouts();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchPayouts, payouts.length]);

  // -- Computations --
  const rawShiftDate = shift?.openedAt ? new Date(shift.openedAt) : null;
  
  // Normalize to end of the calendar day the shift was opened
  const shiftDate = useMemo(() => {
    if (!rawShiftDate) return null;
    const d = new Date(rawShiftDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [rawShiftDate]);

  const isStaleShift = useMemo(() => {
    if (!rawShiftDate) return false;
    const today = new Date();
    return rawShiftDate.toDateString() !== today.toDateString();
  }, [rawShiftDate]);

  const handlePayout = async (data: CreatePayoutRequest) => {
    if (!shift?._id) {
      toast.error('You must have an active shift to process payouts from this page.');
      return;
    }
    
    // Final check before submission
    const today = new Date();
    if (rawShiftDate && rawShiftDate.toDateString() !== today.toDateString()) {
       toast.error('Stale Shift Detected', {
         description: 'This shift is from a previous gaming day. You must close this shift and start a new one.'
       });
       return;
    }

    setActionLoading(true);
    try {
        const res = await fetch('/api/cashier/payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            toast.success('Payout processed successfully');
            setShowTicketForm(false);
            setShowHandPayForm(false);
            fetchPayouts();
            refreshShift(true);
        } else {
            toast.error(result.error || 'Failed to process payout');
        }
    } catch (error) {
        console.error('Payout failed', error);
        toast.error('Connection error');
    } finally {
        setActionLoading(false);
    }
  };

  const handleSort = (column: PayoutSortOption) => {
    if (sortOption === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(column);
      setSortOrder('asc');
    }
  };

  // -- Computations --
  const totalAmount = useMemo(() => payouts.reduce((sum, p) => sum + p.amount, 0), [payouts]);
  const averagePayout = useMemo(() => payouts.length > 0 ? totalAmount / payouts.length : 0, [payouts, totalAmount]);

  const sortedPayouts = useMemo(() => {
    return [...payouts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOption) {
        case 'ticketNumber':
          aValue = (a.ticketNumber || '').toLowerCase();
          bValue = (b.ticketNumber || '').toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'cashier':
          aValue = (a.cashier || '').toLowerCase();
          bValue = (b.cashier || '').toLowerCase();
          break;
        case 'processed':
          aValue = new Date(a.processed).getTime();
          bValue = new Date(b.processed).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payouts, sortOption, sortOrder]);

  if (loading && payouts.length === 0) {
      return (
        <PageLayout>
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        </PageLayout>
      );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <VaultManagerHeader 
          title="Player Payouts" 
          description="View and verify completed player payouts" 
          showNotificationBell={false}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-lg bg-container shadow-md border-t-4 border-button">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Payouts (All Time)</p>
                  <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{totalCount}</p>
                </div>
                <FileText className="h-8 w-8 text-orangeHighlight" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Visible Total</p>
                  <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                    {formatAmount(totalAmount)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orangeHighlight" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-container shadow-md border-t-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Visible Avg</p>
                  <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                    {formatAmount(averagePayout)}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-orangeHighlight" />
              </div>
            </CardContent>
          </Card>
        </div>

        {isStaleShift && (
          <Card className="border-l-4 border-l-red-500 bg-red-50">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Stale Shift Detected</p>
                <p className="text-xs text-red-700">
                  This shift was started on {rawShiftDate?.toLocaleDateString()}. 
                  You must end this shift and start a new one for today before processing new payouts.
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => router.push('/vault/cashier/close-shift')}
              >
                Go to Close Shift
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
                      <DollarSign className="h-4 w-4 text-orangeHighlight" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Payouts</h2>
              </div>
              
              <div className="flex items-center gap-2">
                   <Button 
                      variant="outline" 
                      size="sm"                       onClick={() => {
                        if (!isVaultReconciled) {
                          toast.error('Vault Not Reconciled', {
                            description: 'Payouts are blocked until the vault is reconciled.'
                          });
                          return;
                        }
                        if (isStaleShift) {
                          toast.error('Stale Shift', {
                            description: 'You must close this shift before processing payouts for a new gaming day.'
                          });
                          return;
                        }
                        setShowTicketForm(true);
                      }}
                      className={cn(
                        "border-blue-600 text-blue-600 hover:bg-blue-50",
                        (!isVaultReconciled || isStaleShift) && "opacity-40 cursor-not-allowed"
                      )}
                  >
                      <Ticket className="h-4 w-4 mr-2" />
                      Ticket
                  </Button>
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (!isVaultReconciled) {
                          toast.error('Vault Not Reconciled', {
                            description: 'Payouts are blocked until the vault is reconciled.'
                          });
                          return;
                        }
                        if (isStaleShift) {
                          toast.error('Stale Shift', {
                            description: 'You must close this shift before processing payouts for a new gaming day.'
                          });
                          return;
                        }
                        setShowHandPayForm(true);
                      }}
                      className={cn(
                        "border-emerald-600 text-emerald-600 hover:bg-emerald-50",
                        (!isVaultReconciled || isStaleShift) && "opacity-40 cursor-not-allowed"
                      )}
                  >
                      <Banknote className="h-4 w-4 mr-2" />
                      Hand Pay
                  </Button>
                  <Button variant="ghost" size="sm" onClick={fetchPayouts}>
                      <RefreshCw className="h-4 w-4 mr-2"/> Refresh
                  </Button>
              </div>
          </div>

        <VaultPayoutsTable
          payouts={sortedPayouts}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </div>

        {/* Modal Management */}
        <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Ticket Redemption</DialogTitle>
                    <DialogDescription>
                        Process ticket redemption for the customer.
                    </DialogDescription>
                </DialogHeader>
                <TicketRedemptionForm 
                    currentBalance={currentBalance}
                    maxDate={shiftDate || new Date()}
                    onSubmit={async (t: string, a: number, pAt?: Date) => {
                        await handlePayout({
                            cashierShiftId: shift?._id || '',
                            type: 'ticket',
                            amount: a,
                            ticketNumber: t,
                            printedAt: pAt?.toISOString(),
                            notes: `Ticket ${t}`
                        });
                    }}
                    onRequestCash={() => {
                        setShowTicketForm(false);
                        router.push('/vault/cashier'); 
                    }}
                    loading={actionLoading} 
                />
            </DialogContent>
        </Dialog>

        <Dialog open={showHandPayForm} onOpenChange={setShowHandPayForm}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Hand Pay</DialogTitle>
                    <DialogDescription>
                        Process a hand pay payout for machine jackpot or lock-up.
                    </DialogDescription>
                </DialogHeader>
                <HandPayForm 
                    machines={machines || []}
                    currentBalance={currentBalance}
                    onSubmit={async (a: number, mid: string, r?: string) => {
                        await handlePayout({
                            cashierShiftId: shift?._id || '',
                            type: 'hand_pay',
                            amount: a,
                            machineId: mid,
                            reason: r,
                            notes: r || `Hand Pay - Machine ${mid}`
                        });
                    }} 
                    onRequestCash={() => {
                        setShowHandPayForm(false);
                        router.push('/vault/cashier');
                    }}
                    loading={actionLoading}
                />
            </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
