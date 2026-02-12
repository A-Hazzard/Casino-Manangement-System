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
    handleUpdateCashierStatus
} from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { getDenominationValues, getInitialDenominationRecord } from '@/lib/utils/vault/denominations';
import type { Denomination, FloatRequest } from '@/shared/types/vault';
import {
    AlertTriangle,
    ArrowUpDown,
    Ban,
    Check,
    Copy,
    Eye,

    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Cashier {
  _id: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
  username: string;
  emailAddress: string;
  isEnabled: boolean;
  shiftStatus?: 'active' | 'pending_review' | 'pending_start' | 'closed' | 'inactive';
  currentBalance?: number;
  denominations?: Denomination[];
  lastLoginAt?: string;
  roles: string[];
  tempPassword?: string;
  tempPasswordChanged?: boolean;
}

export default function CashierManagementPanel() {
  const { user, hasActiveVaultShift, isVaultReconciled } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isTempPasswordModalOpen, setIsTempPasswordModalOpen] = useState(false);
  const [isViewPasswordModalOpen, setIsViewPasswordModalOpen] = useState(false);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const [isReviewRequestModalOpen, setIsReviewRequestModalOpen] = useState(false);
  const [currentFloatRequest, setCurrentFloatRequest] = useState<FloatRequest | null>(null);
  const [reviewDenominations, setReviewDenominations] = useState<Record<string, number>>({});
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordAction, setTempPasswordAction] = useState<
    'create' | 'reset' | 'view'
  >('create');

  // Search and Sort State
  const [searchValue, setSearchValue] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | undefined>(undefined);

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
  
  const [shiftDenominations, setShiftDenominations] = useState<Record<string, number>>({});
  const [shiftNotes, setShiftNotes] = useState('');

  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const shiftTotal = Object.entries(shiftDenominations).reduce(
    (sum, [val, qty]) => sum + (Number(val) * qty), 
    0
  );

  const checkVaultStatus = () => {
    if (!hasActiveVaultShift) {
      toast.error('Operation Blocked', {
        description: 'You must start a vault shift before managing cashiers.'
      });
      return false;
    }

    if (!isVaultReconciled) {
      toast.error('Reconciliation Required', {
        description: 'Please perform the mandatory opening reconciliation before continuing with other operations.'
      });
      return false;
    }
    return true;
  };

  /**
   * Open the create cashier modal
   */
  const openCreateModal = () => {
    if (!checkVaultStatus()) return;
    setIsCreateModalOpen(true);
  };

  /**
   * Open the reset password modal
   */
  const openResetModal = (cashier: Cashier) => {
    if (!checkVaultStatus()) return;
    setSelectedCashier(cashier);
    setIsResetModalOpen(true);
  };

  /**
   * Open the end shift modal
   */
  const openEndShiftModal = async (cashier: Cashier) => {
    if (!checkVaultStatus()) return;
    setSelectedCashier(cashier);
    setShiftDenominations(getInitialDenominationRecord(selectedLicencee));
    setShiftNotes('');
    

    
    setIsEndShiftModalOpen(true);
  };

  const handleReviewRequest = async (cashier: Cashier) => {
    if (!checkVaultStatus()) return;
    setLoading(true);
    try {
        // Fetch pending request for this cashier
        const res = await fetch(`/api/vault/float-request?locationId=${user?.assignedLocations?.[0]}&cashierId=${cashier._id}&status=pending`);
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
            toast.error("No pending request found for this cashier");
        }
    } catch (err) {
        console.error(err);
        toast.error("Failed to fetch request");
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
              toast.success("Request denied");
          } else {
              // Convert reviewDenominations to array
              const approvedDenoms: Denomination[] = Object.entries(reviewDenominations)
                  .filter(([_, qty]) => qty > 0)
                  .map(([val, qty]) => ({
                      denomination: Number(val) as Denomination['denomination'],
                      quantity: qty
                  }));
              
              await handleFloatAction(currentFloatRequest._id, 'edited', {
                  approvedDenominations: approvedDenoms
              });
              toast.success("Request approved");
          }
          setIsReviewRequestModalOpen(false);
          fetchCashiers(); // Refresh list
      } catch (_err) {
          toast.error("Failed to process request");
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
  }, [searchValue, sortConfig]);

  const fetchCashiers = async (page = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCashiersData(page, 20, searchValue, sortConfig);
      setCashiers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch cashiers:', error);
      setError('Failed to load cashiers');
      toast.error('Failed to load cashiers');
    } finally {
      setLoading(false);
    }
  };

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
      const result = await handleUpdateCashierStatus(actionCashier._id, newStatus);
      if (result.success) {
          toast.success(`Cashier ${newStatus ? 'enabled' : 'disabled'} successfully`);
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
        ...newCashier,
        assignedLicensees: user?.assignedLicensees,
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
        .filter(([_, qty]) => qty > 0)
        .map(([val, qty]) => ({
          denomination: Number(val) as 1 | 5 | 10 | 20 | 50 | 100,
          quantity: qty
        }));

      const res = await fetch('/api/vault/cashier-shift/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: selectedCashier._id,
          locationId: user.assignedLocations[0],
          denominations: denoms,
          physicalCount: shiftTotal,
          notes: shiftNotes
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Shift ended for ${selectedCashier.username}. Move to Pending Review.`);
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

  const openViewPasswordModal = (cashier: Cashier) => {
    if (!checkVaultStatus()) return;
    if (cashier.tempPassword) {
      setTempPassword(cashier.tempPassword);
      setTempPasswordAction('view');
      setIsViewPasswordModalOpen(true);
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
          <Button onClick={() => fetchCashiers(currentPage)} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
           <Input
             className="w-full pl-9"
             placeholder="Search cashiers..."
             value={searchValue}
             onChange={(e) => setSearchValue(e.target.value)}
           />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchCashiers(currentPage)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-gray-300"
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-button text-white hover:bg-button/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Cashier
          </Button>
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
                      colSpan={6}
                      className="py-8 text-center text-gray-500"
                    >
                      No cashiers found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  cashiers.map(cashier => (
                    <TableRow key={cashier._id}>
                      <TableCell className="font-medium">
                        {cashier.profile && cashier.profile.firstName
                          ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
                          : 'Unspecified'}
                      </TableCell>
                      <TableCell>{cashier.username}</TableCell>
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
                          <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800 animate-pulse">
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
                         {cashier.shiftStatus && cashier.shiftStatus !== 'inactive' && cashier.shiftStatus !== 'closed' 
                           ? formatAmount(cashier.currentBalance || 0) 
                           : '—'}
                       </TableCell>
                       <TableCell>
                        {cashier.lastLoginAt
                          ? new Date(cashier.lastLoginAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true,
                            })
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                           {/* Main Action Button */}
                            <div className="flex flex-col gap-2 w-full">
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
                                onClick={() => { setActionCashier(cashier); setIsDisableModalOpen(true); }}
                                className={cn("h-8 w-8 p-0", !cashier.isEnabled ? "text-red-600" : "text-gray-500 hover:text-red-600")}
                                title={!cashier.isEnabled ? "Enable Account" : "Disable Account"}
                              >
                                {cashier.isEnabled ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                              </Button>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setActionCashier(cashier); setIsDeleteModalOpen(true); }}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                                title="Delete Cashier"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {cashier.tempPassword && !cashier.tempPasswordChanged && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewPasswordModal(cashier)}
                                className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-1 h-auto py-1"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* End Shift Modal */}
      <Dialog open={isEndShiftModalOpen} onOpenChange={setIsEndShiftModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-600" />
              Force End Shift
            </DialogTitle>
            <DialogDescription>
              Collect the remaining float from <strong>{selectedCashier?.username}</strong> to end their shift.
              This will move the shift to <strong>Pending Review</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
             <div className="grid grid-cols-1 gap-y-4">
                {getDenominationValues(selectedLicencee).map(denom => {
                   return (
                    <div key={denom} className="flex items-center gap-4">
                       <div className="flex-1 space-y-1.5">
                          <Label htmlFor={`denom-${denom}`} className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                            ${denom} Notes (Count)
                          </Label>
                          <Input
                            id={`denom-${denom}`}
                            type="number"
                            min="0"
                            className="h-12 text-lg font-bold"
                            value={shiftDenominations[denom.toString()] || ''}
                            onChange={(e) => {
                               const val = Math.max(0, parseInt(e.target.value) || 0);
                               setShiftDenominations(prev => ({
                                  ...prev,
                                  [denom.toString()]: val
                                }));
                            }}
                            placeholder="0"
                          />
                       </div>
                    </div>
                   );
                })}
             </div>

             <div className="bg-red-50 p-4 rounded-lg flex items-center justify-between border border-red-200">
                <span className="font-semibold text-red-800">Total Collected:</span>
                <span className="text-2xl font-black text-red-600">TT${shiftTotal.toLocaleString()}</span>
             </div>

             <div className="space-y-1.5">
                <Label htmlFor="shift-notes">Notes / Reason</Label>
                <textarea
                  id="shift-notes"
                  className="w-full p-2 text-sm border rounded-md min-h-[80px]"
                  placeholder="Why are you force ending this shift?"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Processing...' : 'Confirm & End Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Review Float Request Modal */}
      <Dialog open={isReviewRequestModalOpen} onOpenChange={setIsReviewRequestModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
                          <Label htmlFor={`review-denom-${denom}`} className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                            ${denom} Notes (Count)
                          </Label>
                          <Input
                            id={`review-denom-${denom}`}
                            type="number"
                            min="0"
                            className="h-12 text-lg font-bold"
                            value={reviewDenominations[denom.toString()] || ''}
                            onChange={(e) => {
                               const val = Math.max(0, parseInt(e.target.value) || 0);
                               setReviewDenominations(prev => ({
                                  ...prev,
                                  [denom.toString()]: val
                                }));
                            }}
                            placeholder="0"
                          />
                       </div>
                    </div>
                   );
                })}
             </div>

             <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between border border-purple-200">
                <span className="font-semibold text-purple-800">Total Float:</span>
                <span className="text-2xl font-black text-purple-600">
                    TT${Object.entries(reviewDenominations).reduce(
                        (sum, [val, qty]) => sum + (Number(val) * qty), 
                        0
                    ).toLocaleString()}
                </span>
             </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleApproveRequest(true)} // Reject
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 mr-auto"
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
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Processing...' : 'Approve & Start Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Cashier Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
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
                    setNewCashier(prev => ({ ...prev, lastName: e.target.value }))
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
        <DialogContent>
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
        <DialogContent>
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
        <DialogContent>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Cashier
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the cashier{' '}
              <span className="font-semibold text-foreground">
                {actionCashier?.username}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              <p className="font-semibold">Warning</p>
              <p>
                Deleting a cashier will remove all their access. Ensure all their
                shifts are closed and reconciled before proceeding.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCashierSubmit}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Cashier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Confirmation Modal */}
      <Dialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
              className={actionCashier?.isEnabled ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
            >
              {loading ? 'Processing...' : (actionCashier?.isEnabled ? 'Disable Account' : 'Enable Account')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
