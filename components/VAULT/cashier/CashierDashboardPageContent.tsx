/**
 * Cashier Dashboard Page Content Component
 *
 * Main dashboard for cashiers showing current shift status, float information,
 * and quick actions for payouts and float requests.
 *
 * Integrates with useCashierShift hook for API interactions.
 *
 * @module components/VAULT/cashier/CashierDashboardPageContent
 */

'use client';

import DebugSection from '@/components/shared/debug/DebugSection';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets/helpers';
import { useCashierShift } from '@/lib/hooks/useCashierShift';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import type { CreatePayoutRequest, Denomination } from '@/shared/types/vault';
import { Lock, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Components & Sections
import ConfirmationModal from '@/components/shared/ui/ConfirmationModal';
import CashierDashboardSkeleton from '@/components/ui/skeletons/CashierDashboardSkeleton';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import StaleShiftDetectedBlock from '@/components/VAULT/shared/StaleShiftDetectedBlock';
import CashierActivitySection from './CashierActivitySection';
import HandPayForm from './payouts/HandPayForm';
import TicketRedemptionForm from './payouts/TicketRedemptionForm';
import ActiveShiftDashboard from './sections/ActiveShiftDashboard';
import GlobalCashierShiftsView from './sections/GlobalCashierShiftsView';
import ShiftStatusBanner from './sections/ShiftStatusBanner';
import BlindCloseModal from './shifts/BlindCloseModal';
import CashierShiftOpenModal from './shifts/CashierShiftOpenModal';
import FloatRequestModal, {
    type FloatRequestData,
} from './shifts/FloatRequestModal';

export default function CashierDashboardPageContent() {
  // --- Hooks & State ---
  const { user } = useUserStore();
  const isAdminOrDev = user?.roles?.some(r => ['admin', 'developer'].includes(r.toLowerCase()));

  const { 
    shift, 
    status, 
    currentBalance, 
    hasActiveVaultShift,
    isVaultReconciled,
    loading: shiftLoading, 
    refreshing,
    openShift, 
    confirmApproval,
    closeShift,
    refresh,
    pendingVmApproval,
    pendingRequest,
    cancelFloatRequest,
    isStaleShift
  } = useCashierShift();

  const [showShiftOpen, setShowShiftOpen] = useState(false);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showHandPayForm, setShowHandPayForm] = useState(false);
  const [showFloatRequest, setShowFloatRequest] = useState(false);
  const [floatRequestType, setFloatRequestType] = useState<'increase' | 'decrease'>('increase');
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [globalCashDesks, setGlobalCashDesks] = useState<any[]>([]);
  
  // Confirmation state for requests
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showShiftCancelConfirm, setShowShiftCancelConfirm] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  /**
   * Fetch global shifts (for Admin/Dev view)
   */
  const fetchGlobalShifts = useCallback(async () => {
      if (!isAdminOrDev) return;
      try {
          const res = await fetch('/api/cashier/shifts?status=active,pending_start');
          if (res.ok) {
              const data = await res.json();
              if (data.success) {
                  const mapped = data.shifts.map((s: any) => ({
                      _id: s._id,
                      name: s.cashierName || s.cashierUsername || 'Unknown',
                      cashierName: s.cashierName || s.cashierUsername,
                      balance: s.currentBalance || s.openingBalance || 0,
                      lastAudit: s.openedAt || s.createdAt,
                      status: s.status,
                      locationName: s.locationName
                  }));
                  setGlobalCashDesks(mapped);
              }
          }
      } catch (err) {
          console.error('Global shifts fetch failed', err);
      }
  }, [isAdminOrDev]);

  useEffect(() => {
      if (isAdminOrDev) {
          fetchGlobalShifts();
      }
  }, [isAdminOrDev, fetchGlobalShifts]);
  
  // --- Logic Handlers ---

  /**
   * Fetch machines for payout selection
   */
  const fetchMachines = useCallback(async () => {
    if (!shift?.locationId) return;
    try {
      const res = await fetchCabinetsForLocation(shift.locationId, undefined, 'All Time');
      if (res && res.data) {
        setMachines(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch machines', error);
    }
  }, [shift?.locationId]);

  useEffect(() => {
    if (status === 'active') {
      fetchMachines();
    }
  }, [status, fetchMachines]);

  /**
   * Process shift opening
   */
  const handleShiftOpen = async (denominations: Denomination[]) => {
    const totalAmount = denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
    const success = await openShift(denominations, totalAmount);
    if (success) {
      setShowShiftOpen(false);
    }
  };

  /**
   * Process shift closing
   */
  const handleShiftClose = async (physicalCount: number, denominations: Denomination[]) => {
    const success = await closeShift(physicalCount, denominations);
    if (success) {
      setShowShiftClose(false);
    }
  };

  /**
   * Process generic payouts (Ticket/Handpay)
   */
  const handlePayout = async (data: CreatePayoutRequest) => {
    if (!shift?._id) return;
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
            refresh(true); // Silent refresh
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

  /**
   * Handle shift cancellation request (trigger modal)
   */
  const handleShiftCancel = () => {
    setShowShiftCancelConfirm(true);
  };

  /**
   * Execute shift cancellation
   */
  const executeShiftCancel = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/cashier/shift/cancel', {
        method: 'POST'
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Shift request cancelled');
        refresh(true);
        setShowShiftCancelConfirm(false);
      } else {
        toast.error(result.error || 'Failed to cancel shift request');
      }
    } catch (error) {
      console.error('Cancel failed', error);
      toast.error('Connection error');
    } finally {
      setActionLoading(false);
    }
  };
  
  /**
   * Handle float request submission
   */
  const handleFloatRequestSubmit = async (data: FloatRequestData) => {
    if (!shift?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/vault/float-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          locationId: shift.locationId,
          cashierShiftId: shift._id
        })
      });

      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Float request submitted successfully');
        setShowFloatRequest(false);
      } else {
        toast.error(result.error || 'Failed to submit float request');
      }
    } catch (error) {
      console.error('Float request failed', error);
      toast.error('Connection error');
    } finally {
      setActionLoading(false);
    }
  };
  
  // --- Render Sections ---

  if (shiftLoading && !isAdminOrDev) {
     return (
        <PageLayout>
            <CashierDashboardSkeleton />
        </PageLayout>
     );
  }

  const isShiftActive = status === 'active';
  const isOffShift = (!shift || (!isShiftActive && status !== 'pending_start' && status !== 'pending_review'));
  
  const shiftCancelMessage = status === 'pending_review'
      ? 'Are you sure you want to cancel your shift closure request? Your shift will remain active.'
      : 'Are you sure you want to cancel your shift opening request?';

  return (
    <PageLayout>
      <div className="space-y-6">
          {/* Dashboard Header */}
          <VaultManagerHeader
            title={isAdminOrDev ? "Location Shifts Monitoring" : "Cashier Dashboard"}
            showBack={false}
            showNotificationBell={false}
            description={
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => isAdminOrDev ? fetchGlobalShifts() : refresh(false)}
                  disabled={refreshing}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-gray-400 hover:text-blue-600"
                >
                  <RefreshCw className={`h-4 w-4 ${(refreshing || (shiftLoading && shift)) ? 'animate-spin' : ''}`} />
                </Button>
                <span className="text-xs font-medium text-gray-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                {isAdminOrDev && (
                  <Badge variant="outline" className="text-orangeHighlight border-orangeHighlight/20 bg-orangeHighlight/5">
                    Read-Only Mode
                  </Badge>
                )}
              </div>
            }
          >
            {isOffShift && !isAdminOrDev && (
                <Button
                onClick={() => {
                  if (isStaleShift) {
                    toast.error('Shift Disabled', {
                      description: 'You cannot start a new shift while a stale shift is active. Please resolve it first.'
                    });
                    return;
                  }
                  if (!isVaultReconciled) {
                    toast.error('Vault Not Reconciled', {
                      description: 'Please ask a Vault Manager to perform the mandatory opening reconciliation.'
                    });
                    return;
                  }
                  setShowShiftOpen(true);
                }}
                className={cn(
                  "bg-green-600 text-white hover:bg-green-700",
                  (!isVaultReconciled || isStaleShift) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Plus className="mr-2 h-4 w-4" />
                Start Shift
              </Button>
            )}
            
            {isShiftActive && !isAdminOrDev && (
               <Button
                onClick={() => setShowShiftClose(true)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Lock className="mr-2 h-4 w-4" />
                End Shift
              </Button>
            )}
          </VaultManagerHeader>

          {!isAdminOrDev && (
            <div className="flex justify-end -mt-4 mb-2">
              <DebugSection title="Shift State" data={{ shift, status, currentBalance }} />
            </div>
          )}

          <StaleShiftDetectedBlock isStale={isStaleShift} openedAt={shift?.openedAt} type="cashier">
            {/* Pending Banners */}
            {!isAdminOrDev && (
               <ShiftStatusBanner 
                status={status}
                shift={shift}
                refreshing={refreshing}
                onRefresh={() => refresh(true)}
                onCancel={handleShiftCancel}
                pendingVmApproval={pendingVmApproval}
                pendingRequest={pendingRequest}
                onConfirm={confirmApproval}
                onCancelRequest={(requestId) => {
                  setPendingCancelId(requestId);
                  setShowCancelConfirmation(true);
                }}
              />
            )}
          </StaleShiftDetectedBlock>

          {/* Active Work Area */}
          {isAdminOrDev ? (
            <GlobalCashierShiftsView cashDesks={globalCashDesks} refreshing={refreshing} />
          ) : (
            isShiftActive && shift && (
              <ActiveShiftDashboard 
                 shift={shift}
                 currentBalance={currentBalance}
                 refreshing={refreshing}
                 onTicketRedeem={() => {
                   if (isStaleShift) return;
                   if (!isVaultReconciled) {
                     toast.error('Vault Not Reconciled', {
                       description: 'Operations are blocked until the vault is reconciled.'
                     });
                     return;
                   }
                   setShowTicketForm(true);
                 }}
                 onHandPay={() => {
                    if (isStaleShift) return;
                    if (!isVaultReconciled) {
                      toast.error('Vault Not Reconciled', {
                        description: 'Operations are blocked until the vault is reconciled.'
                      });
                      return;
                    }
                    setShowHandPayForm(true);
                 }}
                 onRequestFloat={(type) => {
                    if (isStaleShift) {
                      toast.error('Operations Restricted', {
                        description: 'Float requests are disabled while the shift is stale. Please close your shift.'
                      });
                      return;
                    }
                    if (!isVaultReconciled) {
                      toast.error('Vault Not Reconciled', {
                        description: 'Operations are blocked until the vault is reconciled.'
                      });
                      return;
                    }
                    if (pendingRequest) {
                      toast.error('Request Pending', {
                        description: 'You already have a pending float request. Please wait for the Vault Manager to process it.'
                      });
                      return;
                    }
                    setFloatRequestType(type);
                    setShowFloatRequest(true);
                 }}
                 isVaultReconciled={isVaultReconciled}
              />
            )
          )}

          {/* Recent Activity Logs */}
          <CashierActivitySection />

          {/* Integrated Modal Management */}
          {!isAdminOrDev && (
            <ShiftModals 
              showOpen={showShiftOpen}
              showClose={showShiftClose}
              showTicket={showTicketForm}
              showHandPay={showHandPayForm}
              showFloat={showFloatRequest}
              floatType={floatRequestType}
              actionLoading={actionLoading}
              shiftLoading={shiftLoading}
              hasActiveVaultShift={hasActiveVaultShift}
              isVaultReconciled={isVaultReconciled}
              machines={machines}
              currentBalance={currentBalance}
              onOpenClose={() => setShowShiftOpen(false)}
              onCloseClose={() => setShowShiftClose(false)}
              onTicketClose={() => setShowTicketForm(false)}
              onHandPayClose={() => setShowHandPayForm(false)}
              onFloatClose={() => setShowFloatRequest(false)}
              onOpenSubmit={handleShiftOpen}
              onCloseSubmit={handleShiftClose}
              onTicketSubmit={(t: string, a: number, pAt?: Date) => handlePayout({
                cashierShiftId: shift?._id || '',
                type: 'ticket',
                amount: a,
                ticketNumber: t,
                printedAt: pAt?.toISOString()
              })}
              onHandPaySubmit={(a: number, mid: string) => handlePayout({
                cashierShiftId: shift?._id || '',
                type: 'hand_pay',
                amount: a,
                machineId: mid
              })}
              onFloatSubmit={handleFloatRequestSubmit}
              onRequestCash={() => {
                 setFloatRequestType('increase');
                 setShowFloatRequest(true);
              }}
            />
          )}

          <ConfirmationModal
            open={showCancelConfirmation}
            onOpenChange={setShowCancelConfirmation}
            title="Cancel Request"
            description="Are you sure you want to cancel this float request? This action cannot be undone."
            confirmLabel="Yes, Cancel Request"
            cancelLabel="Keep Request"
            variant="destructive"
            loading={actionLoading}
            onConfirm={async () => {
              if (pendingCancelId) {
                setActionLoading(true); 
                await cancelFloatRequest(pendingCancelId);
                setActionLoading(false);
                setShowCancelConfirmation(false);
                setPendingCancelId(null);
              }
            }}
          />
          
          <ConfirmationModal
             open={showShiftCancelConfirm}
             onOpenChange={setShowShiftCancelConfirm}
             title="Cancel Shift Request"
             description={shiftCancelMessage}
             confirmLabel="Yes, Cancel Request"
             cancelLabel="No, Keep It"
             variant="destructive"
             loading={actionLoading}
             onConfirm={executeShiftCancel}
          />
      </div>
    </PageLayout>
  );
}

/**
 * Sub-component for cleaning up modal logic from main component
 */
function ShiftModals({
  showOpen, showClose, showTicket, showHandPay, showFloat, 
  floatType, actionLoading, shiftLoading, hasActiveVaultShift,
  isVaultReconciled, machines, currentBalance,
  onOpenClose, onCloseClose, onTicketClose, onHandPayClose, onFloatClose,
  onOpenSubmit, onCloseSubmit, onTicketSubmit, onHandPaySubmit, onFloatSubmit,
  onRequestCash
}: any) {
  return (
    <>
      <CashierShiftOpenModal
        open={showOpen}
        onClose={onOpenClose}
        onSubmit={onOpenSubmit}
        hasActiveVaultShift={hasActiveVaultShift}
        isVaultReconciled={isVaultReconciled}
        loading={shiftLoading}
      />
      
      <BlindCloseModal
        open={showClose}
        onClose={onCloseClose}
        onSubmit={onCloseSubmit}
        loading={shiftLoading}
      />

      <Dialog open={showTicket} onOpenChange={onTicketClose}>
        <DialogContent className="md:max-w-[500px] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100 shrink-0">
            <DialogTitle>Ticket Redemption</DialogTitle>
            <DialogDescription>
              Process ticket redemption for the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar md:max-h-[80vh]">
            <TicketRedemptionForm 
                currentBalance={currentBalance}
                onSubmit={onTicketSubmit}
                onRequestCash={onRequestCash}
                loading={actionLoading} 
              />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHandPay} onOpenChange={onHandPayClose}>
        <DialogContent className="md:max-w-[500px] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100 shrink-0">
            <DialogTitle>Hand Pay</DialogTitle>
            <DialogDescription>
              Process a hand pay payout for machine jackpot or lock-up.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar md:max-h-[80vh]">
            <HandPayForm 
              machines={machines || []}
              currentBalance={currentBalance || 0}
              onSubmit={onHandPaySubmit} 
              onRequestCash={onRequestCash}
              loading={actionLoading}
            />
          </div>
        </DialogContent>
      </Dialog>

      <FloatRequestModal
        open={showFloat}
        onClose={onFloatClose}
        onSubmit={onFloatSubmit}
        type={showFloat ? floatType : 'increase'}
      />
    </>
  );
}
