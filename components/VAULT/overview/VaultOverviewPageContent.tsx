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
    fetchGlobalVaultOverviewData,
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
import { useDashBoardStore } from '@/lib/store/dashboardStore';

/**
 * Vault Overview Component
 */
export default function VaultOverviewPageContent() {
   const { user, setHasActiveVaultShift, setIsVaultReconciled } = useUserStore();
   
   // Role Detection
   const isAdminOrDev = user?.roles?.some(r => ['admin', 'developer'].includes(r.toLowerCase()));
  
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
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftReviewLoading, setShiftReviewLoading] = useState(false);

  // Modal Visibility State
  const [modals, setModals] = useState({
    addCash: false,
    removeCash: false,
    recordExpense: false,
    reconcile: false,
    initialize: false,
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
    // If Admin/Dev, allow global fetch even without assigned location
    if (!isAdminOrDev && !user?.assignedLocations?.[0]) {
      setLoading(false);
      return;
    }
    
    // For normal users, require location
    const locationId = user?.assignedLocations?.[0];

    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      let data;
      if (isAdminOrDev) {
          // fetch global data with licensee filter
          data = await fetchGlobalVaultOverviewData(selectedLicencee);
      } else if (locationId) {
          data = await fetchVaultOverviewData(locationId, user?.username || '');
      } else {
          throw new Error("No location assigned");
      }

      setVaultBalance(data.vaultBalance);
      setMetrics(data.metrics);
      setTransactions(data.transactions);
      setPendingShifts(data.pendingShifts);
      setFloatRequests(data.floatRequests);
      setCashDesks(data.cashDesks);
      
      // Fetch machines for selection (Only for non-admin/dev users with a valid location)
      // Admins/devs are in read-only mode and don't need machine selection for vault modals
      if (!isAdminOrDev && locationId) {
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
      }
    } catch (error) {
      console.error('Failed to fetch vault data', error);
      toast.error('Failed to load vault data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.assignedLocations, user?.username, selectedLicencee]);

  /**
   * Refetch data when location or licensee changes
   */
  useEffect(() => {
    fetchData();
  }, [user?.assignedLocations, selectedLicencee, fetchData]);

  useEffect(() => {
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
        requestPayload.vaultShiftId = vaultBalance.activeShiftId || null;
        break;
      case 'initialize': endpoint = '/api/vault/initialize'; break;
      case 'closeShift': 
        endpoint = '/api/vault/shift/close'; 
        requestPayload.vaultShiftId = vaultBalance.activeShiftId || null;
        break;
    }

    if (type === 'collection' || type === 'softCount') {
      setModals(prev => ({ ...prev, [type]: false }));
      fetchData(true);
      return;
    }

    if (!endpoint) return;

    try {
      if (type === 'initialize' && data?.totalAmount !== undefined) {
         requestPayload.openingBalance = data.totalAmount;
      }

      const isExpense = type === 'recordExpense';
      const isCashMovement = type === 'addCash' || type === 'removeCash';
      
      let requestBody: any;
      const headers: Record<string, string> = {};

      if (isExpense) {
        const fd = new FormData();
        fd.append('category', data.category);
        fd.append('amount', data.amount.toString());
        fd.append('description', data.description || '');
        fd.append('date', data.date instanceof Date ? data.date.toISOString() : data.date);
        fd.append('denominations', JSON.stringify(data.denominations));
        fd.append('locationId', user?.assignedLocations?.[0] || '');
        if (data.file) fd.append('file', data.file);
        requestBody = fd;
        // browser sets content-type for FormData
      } else {
        headers['Content-Type'] = 'application/json';
        
        if (isCashMovement) {
          const { denominations, totalAmount, ...rest } = data;
          requestBody = JSON.stringify({
            ...rest,
            amount: totalAmount,
            denominations: denominations,
            locationId: user?.assignedLocations?.[0]
          });
        } else {
          requestBody = JSON.stringify(requestPayload);
        }
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: requestBody
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || 'Action completed');
        setModals(prev => ({ ...prev, [type]: false }));
        fetchData(true);
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Network error during modal confirmation:', error);
      toast.error('Network error - check your connection');
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

    // STEP: Special handling for Close Day sequence (Handled by Header)
    if (actionKey === 'closeShift') {
       toast.info('Closing Day...', {
         description: 'Please use the "Close Day" button in the header to start the end-of-day sequence.'
       });
       return;
    }

    setModals(prev => ({ ...prev, [actionKey]: true }));
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  // Check for critical missing user data (Skip check for Admin/Dev)
  if (!loading && !isAdminOrDev && !user?.assignedLocations?.[0]) {
    return (
      <PageLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          No location assigned. Please contact your administrator.
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <VaultOverviewSkeleton />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      headerProps={isAdminOrDev ? {
          selectedLicencee,
          setSelectedLicencee,
          disabled: false
      } : undefined}
    >
      <div className="space-y-6">
        {/* Header with Title & Notifications */}
        <VaultManagerHeader
          title={isAdminOrDev ? "Global Vault Overview" : "Vault Management"}
          showBack={false}
          onFloatActionComplete={() => fetchData(true)}
          vaultInventory={vaultBalance.denominations}
          description={
            <div className="flex items-center gap-2">
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {isAdminOrDev && <span className="ml-2 font-semibold text-orangeHighlight">(Read Only Mode)</span>}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="h-6 px-1.5 text-gray-400 hover:text-blue-600"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          }
        />
        
        {/* Helper for viewing denominations from desks */}
        {/* This bit is handled by the state and passed to VaultModals */}

        {/* Actionable Panels */}

        {!isAdminOrDev && (
            <VaultShiftPromotion 
                activeShiftId={vaultBalance.activeShiftId}
                onStartShift={() => setModals(m => ({ ...m, initialize: true }))}
            />
        )}
        
        <div className="flex justify-end">
          <Link href="/vault/management/reports/end-of-day">
            <Button variant="outline" className="gap-2 border-orangeHighlight text-orangeHighlight hover:bg-orangeHighlight/10">
              <FileText className="h-4 w-4" />
              View End-of-Day Report
            </Button>
          </Link>
        </div>

        {/* Balance Card Section */}
        <VaultBalanceCard
          balance={vaultBalance}
          onReconcile={isAdminOrDev ? undefined : () => setModals(m => ({ ...m, reconcile: true }))}
        />

        {/* Float Requests Panel */}
        {floatRequests.length > 0 && (
          <div id="float-requests-panel" className="scroll-mt-20">
            <VaultFloatRequestsPanel
              floatRequests={floatRequests}
              onApprove={handleFloatApprove}
              onDeny={handleFloatDeny}
              onEdit={handleFloatEdit}
              onConfirm={handleFloatConfirm}
              vaultInventory={vaultBalance.denominations}
              readOnly={isAdminOrDev}
            />
          </div>
        )}

        {/* Shift Review Panel */}
        {pendingShifts.length > 0 && (
          <div id="shift-review-panel" className="scroll-mt-20">
            <ShiftReviewPanel
              pendingShifts={pendingShifts}
              vaultInventory={vaultBalance.denominations}
              onResolve={handleResolveShift}
              onReject={handleShiftReject}
              onRefresh={() => fetchData(true)}
              loading={shiftReviewLoading}
              readOnly={isAdminOrDev}
            />
          </div>
        )}

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
        {/* Action Area & History */}
        {!isAdminOrDev && (
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
            onViewActivityLog={() => {
                window.location.href = '/vault/management/activity-log';
            }}
            />
        )}

        <VaultRecentActivitySection transactions={transactions} />

        {/* All Vault Modals */}
        <VaultModals 
          modals={modals}
          vaultBalance={vaultBalance.balance}
          currentDenominations={vaultBalance.denominations}
          isInitial={!!vaultBalance.isInitial}
          onClose={(key) => {
             setModals(m => ({ ...m, [key]: false }));
          }}
          onConfirm={handleModalConfirm}
          machines={machines}
          viewDenomsData={viewDenomsData}
          currentVaultShiftId={vaultBalance.activeShiftId || undefined}
          currentLocationId={user?.assignedLocations?.[0]}
        />
      </div>
    </PageLayout>
  );
}
