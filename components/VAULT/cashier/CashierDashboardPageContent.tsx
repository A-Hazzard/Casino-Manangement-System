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

import PageLayout from '@/components/shared/layout/PageLayout';
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
import type { GamingMachine } from '@/shared/types/entities';
import type { CreatePayoutRequest, Denomination } from '@/shared/types/vault';
import { Lock, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Components & Sections
import CashierDashboardSkeleton from '@/components/ui/skeletons/CashierDashboardSkeleton';
import CashierActivitySection from './CashierActivitySection';
import HandPayForm from './payouts/HandPayForm';
import TicketRedemptionForm from './payouts/TicketRedemptionForm';
import ActiveShiftDashboard from './sections/ActiveShiftDashboard';
import ShiftStatusBanner from './sections/ShiftStatusBanner';
import BlindCloseModal from './shifts/BlindCloseModal';
import CashierShiftOpenModal from './shifts/CashierShiftOpenModal';
import FloatRequestModal, {
    type FloatRequestData,
} from './shifts/FloatRequestModal';

/**
 * Main Cashier Dashboard Content
 */
export default function CashierDashboardPageContent() {
  // --- Hooks & State ---
  const { 
    shift, 
    status, 
    currentBalance, 
    hasActiveVaultShift,
    loading: shiftLoading, 
    refreshing,
    openShift, 
    confirmApproval,
    closeShift,
    refresh,
    pendingVmApproval,
    pendingRequest
  } = useCashierShift();

  const [showShiftOpen, setShowShiftOpen] = useState(false);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showHandPayForm, setShowHandPayForm] = useState(false);
  const [showFloatRequest, setShowFloatRequest] = useState(false);
  const [floatRequestType, setFloatRequestType] = useState<'increase' | 'decrease'>('increase');
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  
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
   * Handle shift cancellation
   */
  const handleShiftCancel = async () => {
    if (!confirm('Are you sure you want to cancel your shift request?')) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/cashier/shift/cancel', {
        method: 'POST'
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Shift request cancelled');
        refresh(true);
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

  if (shiftLoading) {
     return (
        <PageLayout showHeader={false}>
            <CashierDashboardSkeleton />
        </PageLayout>
     );
  }

  const isShiftActive = status === 'active';
  const isOffShift = (!shift || (!isShiftActive && status !== 'pending_start' && status !== 'pending_review'));

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Cashier Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your shift, process payouts, and monitor your float
              </p>
            </div>
            
             <div className="flex items-center gap-2">
               <Button
                 onClick={() => refresh(true)}
                 disabled={refreshing}
                 variant="outline"
                 size="sm"
                 className="mr-2"
               >
                 <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
               </Button>

               {isOffShift && (
                  <Button
                   onClick={() => setShowShiftOpen(true)}
                   className="bg-green-600 text-white hover:bg-green-700"
                 >
                   <Plus className="mr-2 h-4 w-4" />
                   Start Shift
                 </Button>
               )}
               
               {isShiftActive && (
                  <Button
                   onClick={() => setShowShiftClose(true)}
                   className="bg-red-600 text-white hover:bg-red-700"
                 >
                   <Lock className="mr-2 h-4 w-4" />
                   End Shift
                 </Button>
               )}
             </div>
           </div>

          {/* Pending Banners */}
           <ShiftStatusBanner 
            status={status}
            shift={shift}
            refreshing={refreshing}
            onRefresh={() => refresh(true)}
            onCancel={handleShiftCancel}
            pendingVmApproval={pendingVmApproval}
            pendingRequest={pendingRequest}
            onConfirm={confirmApproval}
          />

          {/* Active Work Area */}
          {isShiftActive && shift && (
            <ActiveShiftDashboard 
               shift={shift}
               currentBalance={currentBalance}
               refreshing={refreshing}
               onTicketRedeem={() => setShowTicketForm(true)}
               onHandPay={() => setShowHandPayForm(true)}
               onRequestFloat={(type) => {
                  setFloatRequestType(type);
                  setShowFloatRequest(true);
               }}
            />
          )}

          {/* Recent Activity Logs */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <CashierActivitySection />
          </div>

          {/* Integrated Modal Management */}
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
              printedAt: pAt?.toISOString(),
              notes: `Ticket ${t}`
            })}
            onHandPaySubmit={(a: number, mid: string, r?: string) => handlePayout({
              cashierShiftId: shift?._id || '',
              type: 'hand_pay',
              amount: a,
              machineId: mid,
              reason: r,
              notes: r || `Hand Pay - Machine ${mid}`
            })}
            onFloatSubmit={handleFloatRequestSubmit}
            onRequestCash={() => {
               setFloatRequestType('increase');
               setShowFloatRequest(true);
            }}
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
  machines, currentBalance,
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
        loading={shiftLoading}
      />
      
      <BlindCloseModal
        open={showClose}
        onClose={onCloseClose}
        onSubmit={onCloseSubmit}
        loading={shiftLoading}
      />

      <Dialog open={showTicket} onOpenChange={onTicketClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ticket Redemption</DialogTitle>
            <DialogDescription>
              Process ticket redemption for the customer.
            </DialogDescription>
          </DialogHeader>
          <TicketRedemptionForm 
              currentBalance={currentBalance}
              onSubmit={onTicketSubmit}
              onRequestCash={onRequestCash}
              loading={actionLoading} 
            />
        </DialogContent>
      </Dialog>

      <Dialog open={showHandPay} onOpenChange={onHandPayClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Hand Pay</DialogTitle>
            <DialogDescription>
              Process a hand pay payout for machine jackpot or lock-up.
            </DialogDescription>
          </DialogHeader>
          <HandPayForm 
            machines={machines || []}
            currentBalance={currentBalance || 0}
            onSubmit={onHandPaySubmit} 
            onRequestCash={onRequestCash}
            loading={actionLoading}
          />
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
