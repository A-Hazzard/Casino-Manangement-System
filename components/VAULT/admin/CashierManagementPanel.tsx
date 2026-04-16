/**
 * Cashier Management Panel Component
 *
 * VM interface for creating and managing cashiers.
 * Includes creating new cashier accounts and resetting passwords with pagination.
 *
 * @module components/VAULT/admin/CashierManagementPanel
 */

'use client';

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import CashierManagementSkeleton from '@/components/ui/skeletons/CashierManagementSkeleton';

import {
  fetchCashiersData,
  handleCreateCashier,
  handleDeleteCashier,
  handleFloatAction,
  handleResetCashierPassword,
  handleUpdateCashierStatus,
} from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';

// Phase 2 Modals
import { fetchVaultBalance } from '@/lib/helpers/vaultHelpers';
import {
  getDenominationValues,
  getInitialDenominationRecord,
} from '@/lib/utils/vault/denominations';
import type {
  Cashier,
  Denomination,
  FloatRequest,
  UnbalancedShiftInfo,
} from '@/shared/types/vault';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Ban,
  Check,
  CheckCircle,
  Copy,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import Image from 'next/image';
import deleteIcon from '@/public/deleteIcon.svg';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import VaultOverviewShiftReviewModal from '../overview/modals/VaultOverviewShiftReviewModal';
import VaultAuthenticatorModal from '../shared/VaultAuthenticatorModal';
import CashierActionSelectionModal from './modals/CashierActionSelectionModal';
import CashierActivityLogModal from './modals/CashierActivityLogModal';
import CashierShiftHistoryModal from './modals/CashierShiftHistoryModal';

export default function CashierManagementPanel({
  onLoadingChange,
  onRefresh,
}: {
  onLoadingChange?: (loading: boolean) => void;
  onRefresh?: (fn: () => void) => void;
}) {
  const { user, hasActiveVaultShift, isVaultReconciled, isStaleShift } =
    useUserStore();
  const isAdminOrDev = user?.roles?.some(r =>
    ['admin', 'developer'].includes(r.toLowerCase())
  );
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isTempPasswordModalOpen, setIsTempPasswordModalOpen] = useState(false);
  const [isViewPasswordModalOpen, setIsViewPasswordModalOpen] = useState(false);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const [isReviewRequestModalOpen, setIsReviewRequestModalOpen] =
    useState(false);
  const [currentFloatRequest, setCurrentFloatRequest] =
    useState<FloatRequest | null>(null);
  const [reviewDenominations, setReviewDenominations] = useState<
    Record<string, number>
  >({});
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordAction, setTempPasswordAction] = useState<
    'create' | 'reset' | 'view'
  >('create');

  // Search and Sort State
  const [searchValue, setSearchValue] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<
    'all' | 'variance' | 'no-variance'
  >('all');
  const [sortConfig, setSortConfig] = useState<
    | {
        key: string;
        direction: 'ascending' | 'descending';
      }
    | undefined
  >(undefined);

  // Action Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [actionCashier, setActionCashier] = useState<Cashier | null>(null);

  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [newCashier, setNewCashier] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
  });

  const [shiftDenominations, setShiftDenominations] = useState<
    Record<string, number>
  >({});
  const [shiftNotes, setShiftNotes] = useState('');

  const [loading, setLoading] = useState(true);

  // Notify parent of loading state changes
  const setLoadingState = (val: boolean) => {
    setLoading(val);
    onLoadingChange?.(val);
  };
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Phase 2 History Modals State
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [isShiftHistoryModalOpen, setIsShiftHistoryModalOpen] = useState(false);
  const [reviewShift, setReviewShift] = useState<UnbalancedShiftInfo | null>(
    null
  );
  const [vaultBalance, setVaultBalance] = useState<Denomination[]>([]);
  const [showAuthenticator, setShowAuthenticator] = useState(false);
  const [pendingCashier, setPendingCashier] = useState<Cashier | null>(null);

  const shiftTotal = Object.entries(shiftDenominations).reduce(
    (sum, [val, qty]) => sum + Number(val) * qty,
    0
  );

  const checkVaultStatus = (actionKey?: string) => {
    if (!hasActiveVaultShift && actionKey === 'create') {
      toast.error('Operation Blocked', {
        description: 'You must start a vault shift before creating cashiers.',
      });
      return false;
    }

    // BR-X: Allow viewing and certain management actions during stale shift
    // but block "creation" type financial actions if necessary.
    // In this specific component, we want to allow most navigation,
    // but we'll manually check isStaleShift for specific "Create" buttons.
    if (isStaleShift && actionKey === 'create') {
      toast.error('Stale Shift Detected', {
        description:
          'This shift is from a previous gaming day. You must close this shift first.',
      });
      return false;
    }

    if (
      hasActiveVaultShift &&
      !isVaultReconciled &&
      actionKey !== 'reconcile'
    ) {
      // Allow navigation/viewing even if not reconciled
      if (actionKey === 'view' || actionKey === 'navigation') return true;

      toast.error('Reconciliation Required', {
        description:
          'Please perform the mandatory opening reconciliation before continuing with other operations.',
      });
      return false;
    }
    return true;
  };

  /**
   * Open the create cashier modal
   */
  const openCreateModal = () => {
    if (!checkVaultStatus('create')) return;
    setIsCreateModalOpen(true);
  };

  /**
   * Open the reset password modal
   */
  const openResetModal = (cashier: Cashier) => {
    if (!checkVaultStatus('management')) return;
    setSelectedCashier(cashier);
    setIsResetModalOpen(true);
  };

  /**
   * Open the end shift modal
   */
  const openEndShiftModal = async (cashier: Cashier) => {
    if (!checkVaultStatus('management')) return;
    setSelectedCashier(cashier);
    setShiftDenominations(getInitialDenominationRecord(selectedLicencee));
    setShiftNotes('');

    setIsEndShiftModalOpen(true);
  };

  const handleReviewRequest = async (cashier: Cashier) => {
    if (!checkVaultStatus('management')) return;
    setLoading(true);
    try {
      // Fetch pending request for this cashier
      const res = await fetch(
        `/api/vault/float-request?locationId=${user?.assignedLocations?.[0]}&cashierId=${cashier._id}&status=pending`
      );
      const data = await res.json();

      if (data.success && data.requests && data.requests.length > 0) {
        const req = data.requests[0];
        setCurrentFloatRequest(req);

        // Init denominations
        const denoms = getInitialDenominationRecord(selectedLicencee);
        req.denominations.forEach((d: Denomination) => {
          if (denoms[d.denomination.toString()] !== undefined) {
            denoms[d.denomination.toString()] = d.quantity;
          }
        });
        setReviewDenominations(denoms);

        setIsReviewRequestModalOpen(true);
      } else {
        toast.error('No pending request found for this cashier');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (isRejection = false) => {
    if (!currentFloatRequest) return;
    setLoading(true);
    try {
      if (isRejection) {
        await handleFloatAction(currentFloatRequest._id, 'denied');
        toast.success('Request denied');
      } else {
        // Convert reviewDenominations to array
        const approvedDenoms: Denomination[] = Object.entries(
          reviewDenominations
        )
          .filter(([, qty]) => qty > 0)
          .map(([val, qty]) => ({
            denomination: Number(val) as Denomination['denomination'],
            quantity: qty,
          }));

        await handleFloatAction(currentFloatRequest._id, 'edited', {
          approvedDenominations: approvedDenoms,
        });
        toast.success('Request approved');
      }
      setIsReviewRequestModalOpen(false);
      fetchCashiers(); // Refresh list
    } catch (err) {
      console.error('Shift review error:', err);
      toast.error('Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cashiers on mount and page change
  useEffect(() => {
    fetchCashiers(currentPage);
  }, [currentPage]);

  // Trigger search/sort
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // This will trigger the above useEffect
      } else {
        fetchCashiers(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, sortConfig, varianceFilter]);

  const fetchCashiers = async (page = currentPage) => {
    setLoadingState(true);
    setError(null);
    try {
      const data = await fetchCashiersData(
        page,
        20,
        searchValue,
        sortConfig,
        varianceFilter
      );
      setCashiers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch cashiers:', error);
      setError('Failed to load cashiers');
      toast.error('Failed to load cashiers');
    } finally {
      setLoadingState(false);
    }
  };

  // Register refresh callback with parent
  useEffect(() => {
    onRefresh?.(() => fetchCashiers(currentPage));
  }, [currentPage]);

  const handleDeleteCashierSubmit = async () => {
    if (!actionCashier) return;
    setLoading(true);
    try {
      const result = await handleDeleteCashier(actionCashier._id);
      if (result.success) {
        toast.success(`Cashier deleted successfully`);
        setIsDeleteModalOpen(false);
        setActionCashier(null);
        fetchCashiers(1);
      } else {
        toast.error(result.error || 'Failed to delete cashier');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete cashier');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableCashierSubmit = async () => {
    if (!actionCashier) return;
    const newStatus = !actionCashier.isEnabled;
    setLoading(true);
    try {
      const result = await handleUpdateCashierStatus(
        actionCashier._id,
        newStatus
      );
      if (result.success) {
        toast.success(
          `Cashier ${newStatus ? 'enabled' : 'disabled'} successfully`
        );
        setIsDisableModalOpen(false);
        setActionCashier(null);
        fetchCashiers(currentPage);
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update cashier status');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction:
        current?.key === key && current.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  };

  const handleCreateCashierClick = async () => {
    if (
      !newCashier.username.trim() ||
      !newCashier.firstName.trim() ||
      !newCashier.lastName.trim() ||
      !newCashier.email.trim()
    ) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await handleCreateCashier({
        username: newCashier.username.trim(),
        firstName: newCashier.firstName.trim(),
        lastName: newCashier.lastName.trim(),
        email: newCashier.email.trim(),
        assignedLicencees: user?.assignedLicencees,
        assignedLocations: user?.assignedLocations,
      });

      if (result.success) {
        toast.success(
          `Cashier ${newCashier.firstName} ${newCashier.lastName} created successfully`
        );
        setNewCashier({ username: '', firstName: '', lastName: '', email: '' });
        setIsCreateModalOpen(false);
        fetchCashiers(); // Refresh list

        // Show temp password
        if (result.tempPassword) {
          setTempPassword(result.tempPassword);
          setTempPasswordAction('create');
          setIsTempPasswordModalOpen(true);

          // AUTO-COPY TO CLIPBOARD
          try {
            await navigator.clipboard.writeText(result.tempPassword);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success('Password auto-copied to clipboard');
          } catch (err) {
            console.error('Auto-copy failed:', err);
          }
        }
      } else {
        toast.error(result.error || 'Failed to create cashier');
      }
    } catch (error) {
      console.error('Error creating cashier:', error);
      toast.error('An error occurred while creating cashier');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedCashier) return;

    setLoading(true);
    try {
      const result = await handleResetCashierPassword(selectedCashier._id);

      if (result.success) {
        toast.success(
          `Password reset for ${
            selectedCashier.profile
              ? `${selectedCashier.profile.firstName} ${selectedCashier.profile.lastName}`
              : selectedCashier.username
          }`
        );
        setIsResetModalOpen(false);

        // Show temp password
        if (result.tempPassword) {
          setTempPassword(result.tempPassword);
          setTempPasswordAction('reset');
          setIsTempPasswordModalOpen(true);
        }
        fetchCashiers(); // Refresh the list to reflect tempPassword status
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('An error occurred while resetting password');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShiftSubmit = async () => {
    if (!selectedCashier || !user?.assignedLocations?.[0]) return;

    setLoading(true);
    try {
      const denoms = Object.entries(shiftDenominations)
        .filter(([, qty]) => qty > 0)
        .map(([val, qty]) => ({
          denomination: Number(val) as 1 | 5 | 10 | 20 | 50 | 100,
          quantity: qty,
        }));

      const res = await fetch('/api/vault/cashier-shift/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: selectedCashier._id,
          locationId: user.assignedLocations[0],
          denominations: denoms,
          physicalCount: shiftTotal,
          notes: shiftNotes.trim(),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `Shift ended for ${selectedCashier.username}. Move to Pending Review.`
        );
        setIsEndShiftModalOpen(false);
        setShiftDenominations(getInitialDenominationRecord(selectedLicencee));
        setShiftNotes('');
        fetchCashiers();
      } else {
        toast.error(result.error || 'Failed to end shift');
      }
    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch vault balance for resolution stock verification
   */
  const fetchVaultInventory = async () => {
    if (!user?.assignedLocations?.[0]) return;
    const balance = await fetchVaultBalance(user.assignedLocations[0]);
    if (balance?.denominations) {
      setVaultBalance(balance.denominations);
    }
  };

  const handleReviewShift = async (cashier: Cashier) => {
    if (!checkVaultStatus()) return;
    setLoading(true);
    try {
      // Fetch vault inventory for review stocks
      await fetchVaultInventory();

      // Fetch pending review shift for this cashier
      const res = await fetch(
        `/api/cashier/shifts?status=pending_review&locationId=${user?.assignedLocations?.[0]}&cashierId=${cashier._id}`
      );
      const data = await res.json();

      if (data.success && data.shifts && data.shifts.length > 0) {
        const shift = data.shifts[0];
        setReviewShift({
          shiftId: shift._id,
          cashierId: shift.cashierId,
          cashierName: cashier.profile
            ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
            : cashier.username,
          expectedBalance: shift.expectedClosingBalance || 0,
          enteredBalance: shift.cashierEnteredBalance || 0,
          enteredDenominations: shift.cashierEnteredDenominations || [],
          discrepancy: shift.discrepancy || 0,
          closedAt: shift.closedAt ? new Date(shift.closedAt) : new Date(),
        });
      } else {
        toast.error('No pending review shift found for this cashier');
      }
    } catch (err) {
      console.error('Shift review error:', err);
      toast.error('Failed to fetch shift details');
    } finally {
      setLoading(false);
    }
  };

  const openViewPasswordModal = (cashier: Cashier) => {
    if (!checkVaultStatus()) return;
    if (cashier.tempPassword) {
      setPendingCashier(cashier);
      setShowAuthenticator(true);
    }
  };

  const handleAuthVerified = () => {
    if (pendingCashier?.tempPassword) {
      setTempPassword(pendingCashier.tempPassword);
      setTempPasswordAction('view');
      setIsViewPasswordModalOpen(true);
      setPendingCashier(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success('Password copied to clipboard');
  };

  if (loading && cashiers.length === 0) {
    return <CashierManagementSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-sm font-medium text-red-600">{error}</div>
          <Button
            onClick={() => fetchCashiers(currentPage)}
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Container - Improved responsiveness for multiple controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search and Filters Group */}
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-[280px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="h-10 w-full rounded-xl border-gray-200 pl-9 focus:ring-orangeHighlight/20"
              placeholder="Search cashiers..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </div>

          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-100 p-1 shadow-inner">
            {[
              { value: 'all', label: 'All', icon: Filter },
              { value: 'variance', label: 'Variance', icon: AlertTriangle },
              { value: 'no-variance', label: 'Perfect', icon: CheckCircle },
            ].map(item => {
              const isSelected = varianceFilter === item.value;
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  onClick={() =>
                    setVarianceFilter(item.value as typeof varianceFilter)
                  }
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all md:text-xs',
                    isSelected
                      ? 'border border-gray-200 bg-white text-orangeHighlight shadow-sm'
                      : 'text-gray-400 hover:bg-white/50 hover:text-gray-600'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      isSelected ? 'text-orangeHighlight' : 'text-gray-400'
                    )}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => fetchCashiers(currentPage)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-gray-200 bg-white px-4 font-bold transition-colors hover:bg-gray-50"
          >
            <RefreshCw
              className={cn(
                'mr-2 h-4 w-4 text-gray-500',
                loading && 'animate-spin'
              )}
            />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Reload</span>
          </Button>

          {user?.roles?.includes('vault-manager') && !isAdminOrDev && (
            <Button
              onClick={() => {
                if (!hasActiveVaultShift) {
                  toast.error('Operation Blocked', {
                    description:
                      'You must start a vault shift before creating cashiers.',
                  });
                  return;
                }
                openCreateModal();
              }}
              disabled={loading || isStaleShift}
              className={cn(
                'h-10 rounded-xl bg-button px-4 font-bold text-white shadow-md shadow-button/20 transition-all hover:bg-button/90 active:scale-[0.98]',
                (isStaleShift || !hasActiveVaultShift) &&
                  'cursor-not-allowed opacity-40'
              )}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Cashier</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cashiers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Active Cashiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={loading ? 'pointer-events-none opacity-50' : ''}>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      Name <ArrowUpDown className="ml-2 inline h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('username')}
                    >
                      Username <ArrowUpDown className="ml-2 inline h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('email')}
                    >
                      Email <ArrowUpDown className="ml-2 inline h-4 w-4" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Float</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashiers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-gray-500"
                      >
                        No cashiers found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cashiers
                      .filter(c => c._id !== user?._id)
                      .map(cashier => (
                        <TableRow key={cashier._id}>
                          <TableCell
                            className="cursor-pointer font-medium text-purple-600 hover:text-purple-800 hover:underline"
                            onClick={() => {
                              setSelectedCashier(cashier);
                              setIsSelectionModalOpen(true);
                            }}
                          >
                            {cashier.profile && cashier.profile.firstName
                              ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
                              : 'Unspecified'}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer hover:text-purple-600"
                            onClick={() => {
                              setSelectedCashier(cashier);
                              setIsSelectionModalOpen(true);
                            }}
                          >
                            {cashier.username}
                          </TableCell>
                          <TableCell>{cashier.emailAddress}</TableCell>
                          <TableCell>
                            {!cashier.isEnabled ? (
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                                Disabled
                              </span>
                            ) : cashier.shiftStatus === 'active' ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></span>
                                On-Shift
                              </span>
                            ) : cashier.shiftStatus === 'pending_start' ? (
                              <span className="inline-flex animate-pulse rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                                Pending Approval
                              </span>
                            ) : cashier.shiftStatus === 'pending_review' ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                                Review Required
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                                Off-Shift
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {cashier.shiftStatus &&
                            cashier.shiftStatus !== 'inactive' &&
                            cashier.shiftStatus !== 'closed'
                              ? formatAmount(cashier.currentBalance || 0)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {cashier.lastLoginAt
                              ? new Date(cashier.lastLoginAt).toLocaleString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: true,
                                  }
                                )
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              {/* Main Action Button */}
                              <div className="flex w-full flex-col gap-2">
                                {cashier.shiftStatus === 'active' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEndShiftModal(cashier)}
                                    className="h-8 w-full gap-2 border-red-200 text-red-700 hover:bg-red-50"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    End Shift
                                  </Button>
                                )}
                                {cashier.shiftStatus === 'pending_start' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReviewRequest(cashier)}
                                    className="h-8 w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                  >
                                    <Check className="h-4 w-4" />
                                    Review Request
                                  </Button>
                                )}
                                {cashier.shiftStatus === 'pending_review' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReviewShift(cashier)}
                                    className="h-8 w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                    Review Shift
                                  </Button>
                                )}
                              </div>

                              {/* Secondary Actions Row */}
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openResetModal(cashier)}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-orange-600"
                                  title="Reset Password"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>

                                {/* Disable/Enable Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setActionCashier(cashier);
                                    setIsDisableModalOpen(true);
                                  }}
                                  className={cn(
                                    'h-8 w-8 p-0',
                                    !cashier.isEnabled
                                      ? 'text-red-600'
                                      : 'text-gray-500 hover:text-red-600'
                                  )}
                                  title={
                                    !cashier.isEnabled
                                      ? 'Enable Account'
                                      : 'Disable Account'
                                  }
                                >
                                  {cashier.isEnabled ? (
                                    <Ban className="h-4 w-4" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>

                                {/* Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setActionCashier(cashier);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                                  title="Delete Cashier"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {cashier.tempPassword &&
                                !cashier.tempPasswordChanged && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      openViewPasswordModal(cashier)
                                    }
                                    className="mt-1 h-auto w-full py-1 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    View Password
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
              {cashiers.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-gray-500">
                  No cashiers found. Create one to get started.
                </div>
              ) : (
                cashiers
                  .filter(c => c._id !== user?._id)
                  .map(cashier => {
                    const cashierName = cashier.profile?.firstName
                      ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
                      : 'Unspecified';
                    const isActive = cashier.shiftStatus === 'active';
                    const isPendingStart =
                      cashier.shiftStatus === 'pending_start';
                    const isPendingReview =
                      cashier.shiftStatus === 'pending_review';

                    return (
                      <Card
                        key={cashier._id}
                        className="overflow-hidden border-l-4 border-l-button shadow-sm"
                      >
                        <CardContent className="space-y-3 p-4">
                          {/* Header: name + status */}
                          <div className="flex items-start justify-between">
                            <div
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedCashier(cashier);
                                setIsSelectionModalOpen(true);
                              }}
                            >
                              <p className="text-sm font-bold text-purple-700 hover:underline">
                                {cashierName}
                              </p>
                              <p className="text-xs text-gray-500">
                                @{cashier.username}
                              </p>
                              <p className="max-w-[140px] truncate text-[11px] text-gray-400">
                                {cashier.emailAddress}
                              </p>
                            </div>
                            <div>
                              {!cashier.isEnabled ? (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                                  Disabled
                                </span>
                              ) : isActive ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                                  <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                                  On-Shift
                                </span>
                              ) : isPendingStart ? (
                                <span className="inline-flex animate-pulse rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                                  Pending Approval
                                </span>
                              ) : isPendingReview ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                                  Review Required
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                                  Off-Shift
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Float + Last Login */}
                          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-2 text-xs">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                Float
                              </p>
                              <p className="font-mono font-semibold text-gray-800">
                                {cashier.shiftStatus &&
                                cashier.shiftStatus !== 'inactive' &&
                                cashier.shiftStatus !== 'closed'
                                  ? formatAmount(cashier.currentBalance || 0)
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                Last Login
                              </p>
                              <p className="text-[11px] text-gray-600">
                                {cashier.lastLoginAt
                                  ? new Date(
                                      cashier.lastLoginAt
                                    ).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: 'numeric',
                                      hour12: true,
                                    })
                                  : 'Never'}
                              </p>
                            </div>
                          </div>

                          {/* Primary Actions */}
                          <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
                            {isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEndShiftModal(cashier)}
                                className="h-8 w-full gap-2 border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> End Shift
                              </Button>
                            )}
                            {isPendingStart && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewRequest(cashier)}
                                className="h-8 w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                              >
                                <Check className="h-3.5 w-3.5" /> Review Request
                              </Button>
                            )}
                            {isPendingReview && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewShift(cashier)}
                                className="h-8 w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                              >
                                <ArrowRight className="h-3.5 w-3.5" /> Review
                                Shift
                              </Button>
                            )}

                            {/* Icon Actions */}
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openResetModal(cashier)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-orange-600"
                                title="Reset Password"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionCashier(cashier);
                                  setIsDisableModalOpen(true);
                                }}
                                className={cn(
                                  'h-8 w-8 p-0',
                                  !cashier.isEnabled
                                    ? 'text-red-600'
                                    : 'text-gray-500 hover:text-red-600'
                                )}
                                title={
                                  !cashier.isEnabled
                                    ? 'Enable Account'
                                    : 'Disable Account'
                                }
                              >
                                {cashier.isEnabled ? (
                                  <Ban className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionCashier(cashier);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                                title="Delete Cashier"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {cashier.tempPassword &&
                              !cashier.tempPasswordChanged && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openViewPasswordModal(cashier)}
                                  className="h-auto w-full py-1 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  View Password
                                </Button>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalCount={totalCount}
            setCurrentPage={(page) => setCurrentPage(page + 1)}
            showTotalCount
          />
        </CardContent>
      </Card>

      {/* End Shift Modal */}
      <Dialog open={isEndShiftModalOpen} onOpenChange={setIsEndShiftModalOpen}>
        <DialogContent
          className="!z-[200] sm:max-w-[500px]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-600" />
              Force End Shift
            </DialogTitle>
            <DialogDescription>
              Collect the remaining float from{' '}
              <strong>{selectedCashier?.username}</strong> to end their shift.
              This will move the shift to <strong>Pending Review</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-y-4">
              {getDenominationValues(selectedLicencee).map(denom => {
                return (
                  <div key={denom} className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                      <Label
                        htmlFor={`denom-${denom}`}
                        className="text-xs font-bold uppercase tracking-wider text-gray-400"
                      >
                        ${denom} Notes (Count)
                      </Label>
                      <Input
                        id={`denom-${denom}`}
                        type="number"
                        min="0"
                        className="h-12 text-lg font-bold"
                        value={shiftDenominations[denom.toString()] || ''}
                        onChange={e => {
                          const val = Math.max(
                            0,
                            parseInt(e.target.value) || 0
                          );
                          setShiftDenominations(prev => ({
                            ...prev,
                            [denom.toString()]: val,
                          }));
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
              <span className="font-semibold text-red-800">
                Total Collected:
              </span>
              <span className="text-2xl font-black text-red-600">
                TT${shiftTotal.toLocaleString()}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-notes">Notes / Reason</Label>
              <textarea
                id="shift-notes"
                className="min-h-[80px] w-full rounded-md border p-2 text-sm"
                placeholder="Why are you force ending this shift?"
                value={shiftNotes}
                onChange={e => setShiftNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEndShiftModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEndShiftSubmit}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? 'Processing...' : 'Confirm & End Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Float Request Modal */}
      <Dialog
        open={isReviewRequestModalOpen}
        onOpenChange={setIsReviewRequestModalOpen}
      >
        <DialogContent
          className="!z-[200] sm:max-w-[500px]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-purple-600" />
              Review Float Request
            </DialogTitle>
            <DialogDescription>
              Review and optionally edit the float requested by Cashier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-y-4">
              {[100, 50, 20, 10, 5, 1].map(denom => {
                return (
                  <div key={denom} className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                      <Label
                        htmlFor={`review-denom-${denom}`}
                        className="text-xs font-bold uppercase tracking-wider text-gray-400"
                      >
                        ${denom} Notes (Count)
                      </Label>
                      <Input
                        id={`review-denom-${denom}`}
                        type="number"
                        min="0"
                        className="h-12 text-lg font-bold"
                        value={reviewDenominations[denom.toString()] || ''}
                        onChange={e => {
                          const val = Math.max(
                            0,
                            parseInt(e.target.value) || 0
                          );
                          setReviewDenominations(prev => ({
                            ...prev,
                            [denom.toString()]: val,
                          }));
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-4">
              <span className="font-semibold text-purple-800">
                Total Float:
              </span>
              <span className="text-2xl font-black text-purple-600">
                TT$
                {Object.entries(reviewDenominations)
                  .reduce((sum, [val, qty]) => sum + Number(val) * qty, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleApproveRequest(true)} // Reject
              className="mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Reject Request
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsReviewRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleApproveRequest(false)} // Approve
              disabled={loading}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {loading ? 'Processing...' : 'Approve & Start Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Cashier Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent
          className="!z-[200]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle>Create New Cashier</DialogTitle>
            <DialogDescription>
              Add a new cashier account to the system. A temporary password will
              be generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newCashier.username}
                onChange={e =>
                  setNewCashier(prev => ({ ...prev, username: e.target.value }))
                }
                placeholder="Enter username"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newCashier.firstName}
                  onChange={e =>
                    setNewCashier(prev => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newCashier.lastName}
                  onChange={e =>
                    setNewCashier(prev => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newCashier.email}
                onChange={e =>
                  setNewCashier(prev => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter email address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCashierClick} disabled={loading}>
              {loading ? 'Creating...' : 'Create Cashier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent
          className="!z-[200]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              This will generate a new temporary password for{' '}
              {selectedCashier?.emailAddress}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to reset the password for{' '}
              <strong>
                {selectedCashier?.profile
                  ? `${selectedCashier.profile.firstName} ${selectedCashier.profile.lastName}`
                  : selectedCashier?.username}
              </strong>
              ?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Display Modal */}
      <Dialog
        open={isTempPasswordModalOpen}
        onOpenChange={setIsTempPasswordModalOpen}
      >
        <DialogContent
          className="!z-[200]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              {tempPasswordAction === 'create'
                ? 'Cashier Created'
                : 'Password Reset'}
            </DialogTitle>
            <DialogDescription>
              Please copy the temporary password below and share it with the
              cashier securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-100 p-4">
              <code className="font-mono text-lg font-bold tracking-wide text-gray-800">
                {tempPassword}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyToClipboard}
                className={isCopied ? 'text-green-600' : 'text-gray-600'}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copy</span>
              </Button>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600">
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3 w-3" />
                Important
              </p>
              <p>
                The cashier will be required to change this password immediately
                upon their first login. This password will not be shown again.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsTempPasswordModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Password Modal */}
      <Dialog
        open={isViewPasswordModalOpen}
        onOpenChange={setIsViewPasswordModalOpen}
      >
        <DialogContent
          className="!z-[200]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Eye className="h-5 w-5" />
              View Temporary Password
            </DialogTitle>
            <DialogDescription>
              This is the temporary password assigned to the cashier. They will
              be required to change it on first login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-100 p-4">
              <code className="font-mono text-lg font-bold tracking-wide text-gray-800">
                {tempPassword}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyToClipboard}
                className={isCopied ? 'text-green-600' : 'text-gray-600'}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copy</span>
              </Button>
            </div>

            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3 w-3" />
                Note
              </p>
              <p>
                This password will be automatically deleted once the cashier
                changes it on their first login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsViewPasswordModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-container p-0">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-buttonActive">
                Delete Cashier
              </DialogTitle>
              <Button
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Image src={deleteIcon} alt="Delete" width={64} height={64} />
              </div>
              <p className="mb-4 text-lg font-semibold text-grayHighlight">
                Are you sure you want to delete cashier
                <span className="font-bold text-buttonActive">
                  {' '}
                  {actionCashier?.username}{' '}
                </span>
                ?
              </p>

              <div className="mb-4 rounded-md bg-red-50 p-3 text-left text-sm text-red-600">
                <p className="font-semibold">Warning</p>
                <p>
                  Deleting a cashier will remove all their access. Ensure all
                  their shifts are closed and reconciled before proceeding.
                </p>
              </div>

              <p className="text-sm text-grayHighlight">
                This action cannot be undone. The cashier will be permanently
                removed from the system.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-border p-4 sm:justify-center">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleDeleteCashierSubmit}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Confirmation Modal */}
      <Dialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
        <DialogContent
          className="!z-[200] sm:max-w-[425px]"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionCashier?.isEnabled ? (
                <>
                  <Ban className="h-5 w-5 text-amber-500" />
                  Disable Cashier
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Enable Cashier
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionCashier?.isEnabled
                ? `Are you sure you want to disable ${actionCashier?.username}? They will no longer be able to log in.`
                : `Are you sure you want to enable ${actionCashier?.username}? They will regain access to the system.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDisableModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisableCashierSubmit}
              disabled={loading}
              className={
                actionCashier?.isEnabled
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              {loading
                ? 'Processing...'
                : actionCashier?.isEnabled
                  ? 'Disable Account'
                  : 'Enable Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 2 History Modals */}
      <CashierActionSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onSelectActivityLog={() => {
          setIsSelectionModalOpen(false);
          setIsActivityLogModalOpen(true);
        }}
        onSelectShiftHistory={() => {
          setIsSelectionModalOpen(false);
          setIsShiftHistoryModalOpen(true);
        }}
        cashier={selectedCashier}
      />

      <CashierActivityLogModal
        isOpen={isActivityLogModalOpen}
        onClose={() => setIsActivityLogModalOpen(false)}
        onBack={() => {
          setIsActivityLogModalOpen(false);
          setIsSelectionModalOpen(true);
        }}
        cashier={selectedCashier}
      />

      <CashierShiftHistoryModal
        isOpen={isShiftHistoryModalOpen}
        onClose={() => setIsShiftHistoryModalOpen(false)}
        onBack={() => {
          setIsShiftHistoryModalOpen(false);
          setIsSelectionModalOpen(true);
        }}
        cashier={selectedCashier}
      />

      <VaultOverviewShiftReviewModal
        open={!!reviewShift}
        onClose={() => setReviewShift(null)}
        shift={reviewShift}
        vaultInventory={vaultBalance}
        onSuccess={() => {
          fetchCashiers(currentPage);
        }}
      />

      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => {
          setShowAuthenticator(false);
          setPendingCashier(null);
        }}
        onVerified={handleAuthVerified}
        actionName="View Cashier Password"
      />
    </div>
  );
}
