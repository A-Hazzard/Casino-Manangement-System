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
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCashierShift } from '@/lib/hooks/useCashierShift';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CreatePayoutRequest, Denomination } from '@/shared/types/vault';
import {
    AlertCircle,
    Clock,
    HandCoins,
    Loader2,
    Lock,
    Minus,
    Plus,
    Receipt,
    TrendingUp
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import HandPayForm from './payouts/HandPayForm';
import TicketRedemptionForm from './payouts/TicketRedemptionForm';
import BlindCloseModal from './shifts/BlindCloseModal';
import CashierShiftOpenModal from './shifts/CashierShiftOpenModal';
import FloatRequestModal, {
    type FloatRequestData,
} from './shifts/FloatRequestModal';

type TicketRedemptionData = {
  ticketNumber: string;
  amount: number;
};

export default function CashierDashboardPageContent() {
  const { formatAmount } = useCurrencyFormat();
    const { 
    shift, 
    status, 
    currentBalance, 
    loading: shiftLoading, 
    openShift, 
    closeShift,
    refresh 
  } = useCashierShift();

  const [showShiftOpen, setShowShiftOpen] = useState(false);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showHandPayForm, setShowHandPayForm] = useState(false);
  const [showFloatRequest, setShowFloatRequest] = useState(false);
  const [floatRequestType, setFloatRequestType] = useState<'increase' | 'decrease'>('increase');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Handlers
  const handleShiftOpen = async (denominations: Denomination[]) => {
    const totalAmount = denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
    const success = await openShift(denominations, totalAmount);
    if (success) {
      setShowShiftOpen(false);
    }
  };

  const handleShiftClose = async (physicalCount: number, denominations: Denomination[]) => {
    const success = await closeShift(physicalCount, denominations);
    if (success) {
      setShowShiftClose(false);
    }
  };

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
            refresh(); // Refresh balance
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

  const handleTicketRedemption = async (ticketData: TicketRedemptionData) => {
    await handlePayout({
        cashierShiftId: shift?._id || '',
        type: 'ticket',
        amount: ticketData.amount,
        ticketNumber: ticketData.ticketNumber,
        notes: `Ticket ${ticketData.ticketNumber}`
    });
  };

  // Adapter for Ticket Form that matches its prop signature (ticketNumber, amount, barcode)
  const onTicketSubmit = async (ticketNumber: string, amount: number, _barcode?: string) => {
      await handleTicketRedemption({ ticketNumber, amount });
  };

  const handleHandPay = async (amount: number, machineId?: string, machineName?: string, jackpotType?: string) => {
    await handlePayout({
        cashierShiftId: shift?._id || '',
        type: 'hand_pay',
        amount: amount,
        machineId: machineId,
        notes: `Handpay: ${machineId || 'Unknown'} - ${jackpotType || 'Standard'}`
    });
  };
  
  const handleFloatRequestSubmit = async (_data: FloatRequestData) => {
    toast.info("Mid-shift float requests are coming in Phase 2.");
    setShowFloatRequest(false);
  };
  
  // Render Helpers
  if (shiftLoading) {
     return (
        <PageLayout showHeader={false}>
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400"/>
            </div>
        </PageLayout>
     );
  }

  const isShiftActive = status === 'active';
  const isPendingStart = status === 'pending_start';
  const isPendingReview = status === 'pending_review';

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Cashier Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your shift, process payouts, and monitor your float
              </p>
            </div>
            
            {/* Start / Close Buttons based on Status */}
            {(!shift || (!isShiftActive && !isPendingStart && !isPendingReview)) && (
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

          {/* Status Banners */}
          {isPendingStart && (
             <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Your shift request is <strong>Waiting for Approval</strong> from the Vault Manager.
                      <br/>
                      Total Requested: {formatAmount(shift?.openingBalance || 0)}
                    </p>
                    <Button variant="link" size="sm" onClick={refresh} className="mt-2 text-yellow-800 p-0 h-auto">
                        Check Status
                    </Button>
                  </div>
                </div>
              </div>
          )}

          {isPendingReview && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-orange-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      Your shift is <strong>Under Review</strong>.
                      <br/>
                      Please contact your Vault Manager to resolve any discrepancies.
                    </p>
                    <Button variant="link" size="sm" onClick={refresh} className="mt-2 text-orange-800 p-0 h-auto">
                        Check Status
                    </Button>
                  </div>
                </div>
              </div>
          )}

          {/* Active Shift Dashboard */}
          {isShiftActive && shift && (
            <>
              {/* Shift Status Card */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Current Shift
                    </CardTitle>
                    <Badge variant="default">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-sm text-gray-600">Current Float</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatAmount(currentBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Opening Float</p>
                        <p className="text-lg font-semibold">
                          {formatAmount(shift.openingBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Payouts</p>
                        <p className="text-lg font-semibold text-red-600">
                          {formatAmount(shift.payoutsTotal)}
                        </p>
                        <p className="text-xs text-gray-500">count: {shift.payoutsCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Started At</p>
                        <p className="font-mono text-sm">
                          {new Date(shift.openedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Button
                      variant="outline"
                      className="flex h-20 flex-col gap-2"
                      onClick={() => setShowTicketForm(true)}
                    >
                      <Receipt className="h-6 w-6" />
                      <span className="text-xs">Ticket Redemption</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex h-20 flex-col gap-2"
                      onClick={() => setShowHandPayForm(true)}
                    >
                      <HandCoins className="h-6 w-6" />
                      <span className="text-xs">Hand Pay</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex h-20 flex-col gap-2"
                      onClick={() => {
                        setFloatRequestType('increase');
                        setShowFloatRequest(true);
                      }}
                    >
                      <TrendingUp className="h-6 w-6" />
                      <span className="text-xs">Request More Float</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex h-20 flex-col gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setFloatRequestType('decrease');
                        setShowFloatRequest(true);
                      }}
                    >
                      <Minus className="h-6 w-6" />
                      <span className="text-xs">Return Float</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Modals */}
          <CashierShiftOpenModal
            open={showShiftOpen}
            onClose={() => setShowShiftOpen(false)}
            onSubmit={handleShiftOpen}
            loading={shiftLoading}
          />
          
          <BlindCloseModal
            open={showShiftClose}
            onClose={() => setShowShiftClose(false)}
            onSubmit={handleShiftClose}
            loading={shiftLoading}
          />

          <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Ticket Redemption</DialogTitle>
                <DialogDescription>
                  Process ticket redemption for the customer.
                </DialogDescription>
              </DialogHeader>
              <TicketRedemptionForm 
                 onSubmit={onTicketSubmit}
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
                onSubmit={handleHandPay} 
                loading={actionLoading}
              />
            </DialogContent>
          </Dialog>

          <FloatRequestModal
            open={showFloatRequest}
            onClose={() => setShowFloatRequest(false)}
            onSubmit={handleFloatRequestSubmit}
            type={floatRequestType}
          />
      </div>
    </PageLayout>
  );
}
