/**
 * Cashier Dashboard Page Content Component
 *
 * Main dashboard for cashiers showing current shift status, float information,
 * and quick actions for payouts and float requests.
 *
 * @module components/VAULT/cashier/CashierDashboardPageContent
 */

'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Clock,
  Plus,
  Minus,
  Receipt,
  HandCoins,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import CashierShiftOpenModal from './shifts/CashierShiftOpenModal';
import FloatRequestModal, {
  type FloatRequestData,
} from './shifts/FloatRequestModal';
import TicketRedemptionForm from './payouts/TicketRedemptionForm';
import HandPayForm from './payouts/HandPayForm';
import PasswordUpdateModal from '@/components/shared/ui/PasswordUpdateModal';
import type { Denomination } from '@/shared/types/vault';

// Mock data for current shift
const mockCurrentShift = {
  id: 'shift_123',
  status: 'active',
  openedAt: '2024-01-25T09:00:00Z',
  currentFloat: 8500,
  openingFloat: 8000,
  payoutsTotal: 1250,
  payoutsCount: 8,
  lastActivity: '2024-01-25T14:30:00Z',
};

const mockRecentPayouts = [
  {
    id: '1',
    type: 'ticket',
    amount: 500,
    time: '14:25',
    ticketNumber: 'T123456',
  },
  {
    id: '2',
    type: 'hand_pay',
    amount: 250,
    time: '14:15',
    machineId: 'SLOT-07',
  },
  {
    id: '3',
    type: 'ticket',
    amount: 300,
    time: '13:45',
    ticketNumber: 'T123455',
  },
];

export default function CashierDashboardPageContent() {
  const { formatAmount } = useCurrencyFormat();
  const { user } = useAuth();
  const [showShiftOpen, setShowShiftOpen] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showHandPayForm, setShowHandPayForm] = useState(false);
  const [showFloatRequest, setShowFloatRequest] = useState(false);
  const [floatRequestType, setFloatRequestType] = useState<
    'increase' | 'decrease'
  >('increase');
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);

  // Check if user requires password update (first login)
  useEffect(() => {
    if (user?.requiresPasswordUpdate) {
      setShowPasswordUpdate(true);
    }
  }, [user]);

  const handleShiftOpen = async (_denominations: Denomination[]) => {
    // TODO: Call API to open shift with float request
    toast.success('Shift opened successfully with requested float');
    setShowShiftOpen(false);
  };

  const handleTicketRedemption = async (_ticketData: any) => {
    // TODO: Call payout API
    toast.success('Ticket redeemed successfully');
    setShowTicketForm(false);
  };

  const handleHandPay = async (_handPayData: any) => {
    // TODO: Call payout API
    toast.success('Hand pay processed successfully');
    setShowHandPayForm(false);
  };

  const handleFloatRequest = (type: 'increase' | 'decrease') => {
    setFloatRequestType(type);
    setShowFloatRequest(true);
  };

  const handleFloatRequestSubmit = async (_requestData: FloatRequestData) => {
    // TODO: Call float request API
    toast.success(
      `${floatRequestType === 'increase' ? 'Increase' : 'Decrease'} float request submitted`
    );
    setShowFloatRequest(false);
  };

  const handlePasswordUpdate = async (_newPassword: string) => {
    setPasswordUpdateLoading(true);
    try {
      // TODO: Call password update API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password updated successfully');
      setShowPasswordUpdate(false);
      // TODO: Update user state to clear requiresPasswordUpdate
    } finally {
      setPasswordUpdateLoading(false);
    }
  };

  const isShiftActive = mockCurrentShift.status === 'active';
  const requiresPasswordUpdate = user?.requiresPasswordUpdate;

  return (
    <PageLayout showHeader={false}>
      {/* Password Update Modal for First Login */}
      <PasswordUpdateModal
        open={showPasswordUpdate}
        onClose={() => setShowPasswordUpdate(false)}
        onUpdate={handlePasswordUpdate}
        loading={passwordUpdateLoading}
      />

      {/* Main Dashboard Content - Only show if password update not required */}
      {!requiresPasswordUpdate && (
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
            {!isShiftActive && (
              <Button
                onClick={() => setShowShiftOpen(true)}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Start Shift
              </Button>
            )}
          </div>

          {/* Shift Status */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Shift
                </CardTitle>
                <Badge variant={isShiftActive ? 'default' : 'secondary'}>
                  {isShiftActive ? 'Active' : 'Not Started'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isShiftActive ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Float</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatAmount(mockCurrentShift.currentFloat)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Opening Float</p>
                    <p className="text-lg font-semibold">
                      {formatAmount(mockCurrentShift.openingFloat)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Payouts</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatAmount(mockCurrentShift.payoutsTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Started At</p>
                    <p className="font-mono text-sm">
                      {new Date(mockCurrentShift.openedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">
                  No active shift. Click "Start Shift" to begin your cashier
                  session.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {isShiftActive && (
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
                    onClick={() => handleFloatRequest('increase')}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-xs">Request More Float</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex h-20 flex-col gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => handleFloatRequest('decrease')}
                  >
                    <Minus className="h-6 w-6" />
                    <span className="text-xs">Return Float</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {isShiftActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRecentPayouts.map(payout => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {payout.type === 'ticket' ? (
                          <Receipt className="h-4 w-4 text-blue-500" />
                        ) : (
                          <HandCoins className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {payout.type === 'ticket'
                              ? 'Ticket Redemption'
                              : 'Hand Pay'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {payout.type === 'ticket'
                              ? `Ticket: ${payout.ticketNumber}`
                              : `Machine: ${payout.machineId}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">
                          -{formatAmount(payout.amount)}
                        </p>
                        <p className="text-xs text-gray-500">{payout.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modals */}
          <CashierShiftOpenModal
            open={showShiftOpen}
            onClose={() => setShowShiftOpen(false)}
            onSubmit={handleShiftOpen}
          />

          {/* Ticket Redemption Modal */}
          <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Ticket Redemption</DialogTitle>
                <DialogDescription>
                  Process ticket redemption for the customer.
                </DialogDescription>
              </DialogHeader>
              <TicketRedemptionForm onSubmit={handleTicketRedemption} />
            </DialogContent>
          </Dialog>

          {/* Hand Pay Modal */}
          <Dialog open={showHandPayForm} onOpenChange={setShowHandPayForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Hand Pay</DialogTitle>
                <DialogDescription>
                  Process a hand pay payout for machine jackpot or lock-up.
                </DialogDescription>
              </DialogHeader>
              <HandPayForm onSubmit={handleHandPay} />
            </DialogContent>
          </Dialog>

          {/* Float Request Modal */}
          <FloatRequestModal
            open={showFloatRequest}
            onClose={() => setShowFloatRequest(false)}
            onSubmit={handleFloatRequestSubmit}
            type={floatRequestType}
          />
        </div>
      )}
    </PageLayout>
  );
}
