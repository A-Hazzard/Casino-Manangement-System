/**
 * Vault Overview Page Content
 *
 * Main dashboard for Vault Managers. Displays vault status, metrics,
 * cashier shift requests, and quick actions for cash movements.
 *
 * @module components/VAULT/overview/VaultOverviewPageContent
 */

'use client';

import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import {
    DEFAULT_VAULT_BALANCE,
    DEFAULT_VAULT_METRICS,
} from '@/components/VAULT/overview/data/defaults';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { DEFAULT_POLL_INTERVAL } from '@/lib/constants';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets/helpers';
import {
    fetchVaultOverviewData
} from '@/lib/helpers/vaultHelpers';
import { useUserStore } from '@/lib/store/userStore';
import type { GamingMachine } from '@/shared/types/entities';
import {
    type CashDesk,
    type Denomination,
    type FloatRequest,
    type UnbalancedShiftInfo,
    type VaultBalance,
    type VaultMetrics,
    type VaultTransaction,
} from '@/shared/types/vault';
import { FileText, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdvancedDashboard from './AdvancedDashboard';

// Skeleton & Base UI
import { TableSkeleton } from '@/components/shared/ui/skeletons/CommonSkeletons';
import VaultOverviewSkeleton from '@/components/ui/skeletons/VaultOverviewSkeleton';

// Panel Components
import ShiftReviewPanel from '@/components/VAULT/overview/ShiftReviewPanel';
import VaultFloatRequestsPanel from '@/components/VAULT/overview/VaultFloatRequestsPanel';
import VaultBalanceCard from '@/components/VAULT/overview/cards/VaultBalanceCard';
import VaultInventoryCard from '@/components/VAULT/overview/cards/VaultInventoryCard';
import VaultQuickActionsSection from '@/components/VAULT/overview/sections/VaultQuickActionsSection';
import VaultRecentActivitySection from '@/components/VAULT/overview/sections/VaultRecentActivitySection';

// Extracted Sections
import VaultCashDesksSection from './sections/VaultCashDesksSection';
import VaultHealthGrid from './sections/VaultHealthGrid';
import VaultModals from './sections/VaultModals';
import VaultShiftPromotion from './sections/VaultShiftPromotion';

// Hooks

/**
 * Vault Overview Component
 */
export default function VaultOverviewPageContent() {
   const { user, setHasActiveVaultShift, setIsVaultReconciled } = useUserStore();
  
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  
  // Data State
  const [vaultBalance, setVaultBalance] = useState<VaultBalance>(DEFAULT_VAULT_BALANCE);
  const [metrics, setMetrics] = useState<VaultMetrics>(DEFAULT_VAULT_METRICS);
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [pendingShifts, setPendingShifts] = useState<UnbalancedShiftInfo[]>([]);
  const [floatRequests, setFloatRequests] = useState<FloatRequest[]>([]);
  const [cashDesks, setCashDesks] = useState<CashDesk[]>([]);
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftReviewLoading, setShiftReviewLoading] = useState(false);
  
  // Close Day Sequence State
  const [isClosingDay, setIsClosingDay] = useState(false);

  // Modal Visibility State
  const [modals, setModals] = useState({
    addCash: false,
    removeCash: false,
    recordExpense: false,
    reconcile: false,
    initialize: false,
    collection: false,
    softCount: false,
    viewDenominations: false,
    closeShift: false
  });

  const [viewDenomsData, setViewDenomsData] = useState<{
    title: string;
    denominations: Denomination[];
    total: number;
  } | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch all vault data for the current location
   */
  const fetchData = useCallback(async (isSilent = false) => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await fetchVaultOverviewData(locationId, user?.username || '');
      setVaultBalance(data.vaultBalance);
      setMetrics(data.metrics);
      setTransactions(data.transactions);
      setPendingShifts(data.pendingShifts);
      setFloatRequests(data.floatRequests);
      setCashDesks(data.cashDesks);
      
      // Fetch machines for selection
      try {
        const machinesData = await fetchCabinetsForLocation(
            locationId, 
            undefined, 
            'All Time' 
        );
        if (machinesData && machinesData.data) {
             setMachines(machinesData.data);
        }
      } catch (err) {
         console.error("Failed to fetch machines for vault", err);
      }
    } catch (error) {
      console.error('Failed to fetch vault data', error);
      toast.error('Failed to load vault data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.assignedLocations, user?.username]);

  useEffect(() => {
    fetchData(false);

    // STEP: Periodic refresh for float requests and notifications
    const interval = setInterval(() => {
        fetchData(true); // Silent refresh
    }, DEFAULT_POLL_INTERVAL); // 5 seconds

    return () => clearInterval(interval);
  }, [fetchData]);

  // ============================================================================
  // ACTIONS HANDLERS
  // ============================================================================

  /**
   * Approve/Deny/Edit Float Requests
   */
  const handleFloatApprove = async (requestId: string, approvedAmount?: number, approvedDenominations?: Denomination[]) => {
    try {
      const res = await fetch('/api/vault/float-request/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: 'approved', approvedAmount, approvedDenominations })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Float request approved');
        fetchData(true);
      } else {
        toast.error(data.error || 'Failed to approve request');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleFloatDeny = async (requestId: string, reason?: string) => {
    try {
      const res = await fetch('/api/vault/float-request/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: 'denied', vmNotes: reason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Float request denied');
        fetchData(true);
      } else {
        toast.error(data.error || 'Failed to deny request');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleFloatEdit = async (requestId: string, amount: number, denominations: Denomination[], notes?: string) => {
    try {
      const res = await fetch('/api/vault/float-request/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: 'edited', approvedAmount: amount, approvedDenominations: denominations, vmNotes: notes })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Float request updated');
        fetchData(true);
      } else {
        toast.error(data.error || 'Failed to update request');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleFloatConfirm = async (requestId: string) => {
    try {
      const res = await fetch('/api/vault/float-request/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Float return confirmed and vault updated');
        fetchData(true);
      } else {
        toast.error(data.error || 'Failed to confirm receipt');
      }
    } catch {
      toast.error('Network error');
    }
  };

  /**
   * Resolve Shift Discrepancies
   */
  const handleShiftResolveConfirm = async (shiftId: string, finalBalance: number, auditComment: string, denominations?: Denomination[]) => {
    setShiftReviewLoading(true);
    try {
      const res = await fetch('/api/cashier/shift/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, finalBalance, auditComment, denominations })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Shift discrepancy resolved');
        fetchData(true);
      } else {
        toast.error(data.error || 'Failed to resolve shift');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setShiftReviewLoading(false);
    }
  };

  const handleShiftReject = async (shiftId: string, reason: string) => {
    setShiftReviewLoading(true);
    try {
      const res = await fetch('/api/cashier/shift/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, reason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Shift closure rejected and returned to cashier');
        fetchData(true);
      } else {
        toast.error(data.error || 'Failed to reject shift');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setShiftReviewLoading(false);
    }
  };

  /**
   * Generic Modal Confirm Handlers
   */
  const handleResolveShift = handleShiftResolveConfirm;
  const handleModalConfirm = async (type: string, data?: any) => {
    let endpoint = '';
    const method = 'POST';

    // Base request body
    const requestPayload: any = {
      ...(data || {}),
      locationId: user?.assignedLocations?.[0]
    };
    
    switch (type) {
      case 'addCash': endpoint = '/api/vault/add-cash'; break;
      case 'removeCash': endpoint = '/api/vault/remove-cash'; break;
      case 'recordExpense': endpoint = '/api/vault/expense'; break;
      case 'reconcile': 
        endpoint = '/api/vault/reconcile'; 
        requestPayload.vaultShiftId = vaultBalance.activeShiftId || null; // Ensure vaultShiftId is added
        break;
      case 'initialize': endpoint = '/api/vault/initialize'; break;
      case 'closeShift': 
        endpoint = '/api/vault/shift/close'; 
        requestPayload.vaultShiftId = vaultBalance.activeShiftId || null; // Ensure vaultShiftId is added
        break;
    }

    // Special handling for collection type - wizard handles its own API calls
    if (type === 'collection') {
      setModals(prev => ({ ...prev, collection: false }));
      if (isClosingDay) {
        setModals(prev => ({ ...prev, closeShift: true }));
        setIsClosingDay(false);
      }
      fetchData(true);
      return;
    }

    if (!endpoint) return;

    try {

      // Transform data for Initialize Vault
      if (type === 'initialize') {
         // API expects openingBalance, modal provides totalAmount (optional now)
         if (data?.totalAmount !== undefined) {
             requestPayload.openingBalance = data.totalAmount;
         }
      }

      let requestBody = JSON.stringify(requestPayload);

      // Transform data for Add/Remove Cash
      // The modal returns { breakdown: { hundred: 2, ... }, totalAmount: 200 }
      // The API expects { denominations: [{ denomination: 100, quantity: 2 }, ...], amount: 200 }
      if (type === 'addCash' || type === 'removeCash') {
         const { breakdown, totalAmount, ...rest } = data;
         
         const denominationMap: Record<string, number> = {
            hundred: 100,
            fifty: 50,
            twenty: 20,
            ten: 10,
            five: 5,
            one: 1
         };

         const breakdownObj = breakdown || {};
         const denominationsArray = Object.keys(breakdownObj).map((key) => ({
             denomination: denominationMap[key] || 0,
             quantity: Number(breakdownObj[key as keyof typeof breakdownObj])
         })).filter(d => d.denomination > 0 && d.quantity > 0);

         requestBody = JSON.stringify({
            ...rest,
            amount: totalAmount,
            denominations: denominationsArray,
            locationId: user?.assignedLocations?.[0]
         });
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Action completed');
        setModals(prev => ({ ...prev, [type]: false }));
        
        // STEP: Handle auto-trigger of Close Shift after Collection during Close Day sequence
        if (type === 'collection' && isClosingDay) {
          setModals(prev => ({ ...prev, closeShift: true }));
          setIsClosingDay(false); // Reset sequence flag
        }

        if (type === 'closeShift') {
          // If vault closed, maybe redirect or just refresh
          fetchData(false);
        } else {
          fetchData(true);
        }
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================
  
   const isShiftActive = !!vaultBalance.activeShiftId;
   const isReconciled = !!vaultBalance.isReconciled;
 
   useEffect(() => {
     setHasActiveVaultShift(isShiftActive);
     setIsVaultReconciled(isReconciled);
   }, [isShiftActive, isReconciled, setHasActiveVaultShift, setIsVaultReconciled]);

   const checkShiftStarted = useCallback((actionKey?: string) => {
    if (!isShiftActive) {
      toast.error('Operation Blocked', {
        description: 'You must start a vault shift before performing this operation.'
      });
      return false;
    }

    // BR-X: Mandatory opening reconciliation
    if (!vaultBalance.isReconciled && actionKey !== 'reconcile' && actionKey !== 'closeShift') {
      toast.error('Reconciliation Required', {
        description: 'Please perform the mandatory opening reconciliation before continuing with other operations.'
      });
      return false;
    }

    return true;
  }, [isShiftActive, vaultBalance.isReconciled]);

  const handleAction = (actionKey: keyof typeof modals) => {
    if (!checkShiftStarted(actionKey)) return;

    // STEP: Special handling for Close Day sequence (Collection FIRST)
    if (actionKey === 'closeShift') {
       // Validate if we can actually close before starting the flow
       if (!vaultBalance.canClose) {
         toast.error('Operation Blocked', {
           description: vaultBalance.blockReason || 'All cashier shifts and reviews must be completed.'
         });
         return;
       }
       setIsClosingDay(true);
       setModals(prev => ({ ...prev, collection: true }));
       return;
    }

    setModals(prev => ({ ...prev, [actionKey]: true }));
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  if (loading) {
     return (
        <PageLayout>
            <VaultOverviewSkeleton />
        </PageLayout>
     );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header with Title & Notifications */}
        <VaultManagerHeader
          title="Vault Management"
          showBack={false}
          onFloatActionComplete={() => fetchData(true)}
          description={
            <div className="flex items-center gap-2">
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="h-6 px-1.5 text-gray-400 hover:text-blue-600"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          }
        >
          {isShiftActive && (
            <Button
              onClick={() => handleAction('closeShift')}
              className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
            >
              Close Day
            </Button>
          )}
        </VaultManagerHeader>
        
        {/* Helper for viewing denominations from desks */}
        {/* This bit is handled by the state and passed to VaultModals */}

        {/* Actionable Panels */}

        <VaultShiftPromotion 
            activeShiftId={vaultBalance.activeShiftId}
            onStartShift={() => setModals(m => ({ ...m, initialize: true }))}
        />
        
        <div className="flex justify-end">
          <Link href="/vault/management/reports/end-of-day">
            <Button variant="outline" className="gap-2 border-orangeHighlight text-orangeHighlight hover:bg-orangeHighlight/10">
              <FileText className="h-4 w-4" />
              View End-of-Day Report
            </Button>
          </Link>
        </div>

        {/* Balance Card Section */}
        {loading ? (
           <div className="h-40 w-full rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          <VaultBalanceCard
            balance={vaultBalance}
            onReconcile={() => setModals(m => ({ ...m, reconcile: true }))}
          />
        )}

        {/* Float Requests Panel */}
        {floatRequests.length > 0 && (
          <div id="float-requests-panel" className="scroll-mt-20">
            <VaultFloatRequestsPanel
              floatRequests={floatRequests}
              onApprove={handleFloatApprove}
              onDeny={handleFloatDeny}
              onEdit={handleFloatEdit}
              onConfirm={handleFloatConfirm}
            />
          </div>
        )}

        {/* Shift Review Panel */}
        <div id="shift-review-panel" className="scroll-mt-20">
          <ShiftReviewPanel
            pendingShifts={pendingShifts}
            onResolve={handleResolveShift}
            onReject={handleShiftReject}
            onRefresh={() => fetchData(true)}
            loading={shiftReviewLoading}
          />
        </div>

        {/* Metrics Grid */}
        <VaultHealthGrid metrics={metrics} refreshing={refreshing && !loading} />

        {/* Charts Section */}
        <div className="mt-8">
          <AdvancedDashboard />
        </div>

        {/* Inventory Table */}
        <VaultInventoryCard denominations={vaultBalance.denominations} isLoading={loading} />

        {/* Cash Desks Interface */}
        <VaultCashDesksSection 
          cashDesks={cashDesks} 
          refreshing={refreshing && !loading} 
          onViewDenominations={(desk) => {
            setViewDenomsData({
              title: `Denominations - ${desk.cashierName || desk.name}`,
              denominations: desk.denominations || [],
              total: desk.balance
            });
            setModals(m => ({ ...m, viewDenominations: true }));
          }}
        />

        {/* Action Area & History */}
        <VaultQuickActionsSection
          isShiftActive={isShiftActive}
          isReconciled={vaultBalance.isReconciled}
          onAddCash={() => handleAction('addCash')}
          onRemoveCash={() => handleAction('removeCash')}
          onRecordExpense={() => handleAction('recordExpense')}
          onManageCashiers={() => {
            if (!checkShiftStarted()) return;
            window.location.href = '/vault/management/cashiers';
          }}
          onSoftCount={() => handleAction('softCount')}
        />

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <VaultRecentActivitySection transactions={transactions} />
        )}

        {/* All Vault Modals */}
        <VaultModals 
          modals={modals}
          vaultBalance={vaultBalance.balance}
          currentDenominations={vaultBalance.denominations}
          isInitial={!!vaultBalance.isInitial}
          onClose={(key) => {
             setModals(m => ({ ...m, [key]: false }));
             if (key === 'collection') setIsClosingDay(false); // Cancel sequence if collection closed
          }}
          onConfirm={handleModalConfirm}
          machines={machines}
          viewDenomsData={viewDenomsData}
          canCloseVault={vaultBalance.canClose}
          closeVaultBlockReason={vaultBalance.blockReason}
          currentVaultShiftId={vaultBalance.activeShiftId || undefined}
          currentLocationId={user?.assignedLocations?.[0]}
        />
      </div>
    </PageLayout>
  );
}
