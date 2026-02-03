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
import ViewDenominationsModal from '@/components/VAULT/overview/modals/ViewDenominationsModal';
import {
    fetchCashiersData,
    handleCreateCashier,
    handleDirectOpenShift,
    handleResetCashierPassword,
} from '@/lib/helpers/vaultHelpers';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';
import {
    AlertTriangle,
    Check,
    Copy,
    Eye,
    Landmark,
    Plus,
    RefreshCw,
    RotateCcw,
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
  const { user } = useUserStore();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isTempPasswordModalOpen, setIsTempPasswordModalOpen] = useState(false);
  const [isViewPasswordModalOpen, setIsViewPasswordModalOpen] = useState(false);
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);
  const [isViewDenomsModalOpen, setIsViewDenomsModalOpen] = useState(false);
  
  const [viewDenomsData, setViewDenomsData] = useState<{
    title: string;
    denominations: Denomination[];
    total: number;
  } | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordAction, setTempPasswordAction] = useState<
    'create' | 'reset' | 'view'
  >('create');

  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [newCashier, setNewCashier] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  
  const [shiftDenominations, setShiftDenominations] = useState<Record<string, number>>({
    '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0
  });
  const [shiftNotes, setShiftNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const shiftTotal = Object.entries(shiftDenominations).reduce(
    (sum, [val, qty]) => sum + (Number(val) * qty), 
    0
  );

  // Fetch cashiers on mount and page change
  useEffect(() => {
    fetchCashiers();
  }, [currentPage]);

  const fetchCashiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCashiersData(currentPage, 20);
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

  const handleStartShiftSubmit = async () => {
    if (!selectedCashier || !user?.assignedLocations?.[0]) return;
    
    if (shiftTotal <= 0) {
      toast.error('Starting float must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const denoms = Object.entries(shiftDenominations)
        .filter(([_, qty]) => qty > 0)
        .map(([val, qty]) => ({
          denomination: Number(val) as 1 | 5 | 10 | 20 | 50 | 100,
          quantity: qty
        }));

      const result = await handleDirectOpenShift({
        locationId: user.assignedLocations[0],
        cashierId: selectedCashier._id,
        amount: shiftTotal,
        denominations: denoms,
        notes: shiftNotes
      });

      if (result.success) {
        toast.success(`Shift started for ${selectedCashier.username}`);
        setIsStartShiftModalOpen(false);
        setShiftDenominations({'100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0});
        setShiftNotes('');
        fetchCashiers();
      } else {
        toast.error(result.error || 'Failed to start shift');
      }
    } catch (error) {
      console.error('Error starting shift:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsResetModalOpen(true);
  };

  const openStartShiftModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsStartShiftModalOpen(true);
  };

  const openViewPasswordModal = (cashier: Cashier) => {
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
          <Button onClick={fetchCashiers} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Cashier Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage cashier accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchCashiers}
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
            onClick={() => setIsCreateModalOpen(true)}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
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
                        <div className="flex gap-2">
                           {cashier.isEnabled && (!cashier.shiftStatus || cashier.shiftStatus === 'closed' || cashier.shiftStatus === 'inactive') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openStartShiftModal(cashier)}
                              className="text-green-600 hover:text-green-700 bg-green-50"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Start Shift
                            </Button>
                          )}
                          {cashier.tempPasswordChanged === false &&
                            cashier.tempPassword && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openViewPasswordModal(cashier)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View Password
                              </Button>
                            )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openResetModal(cashier)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Reset Password
                          </Button>
                          
                          {cashier.shiftStatus === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => {
                                setViewDenomsData({
                                  title: `Denominations - ${cashier.username}`,
                                  denominations: cashier.denominations || [],
                                  total: cashier.currentBalance || 0
                                });
                                setIsViewDenomsModalOpen(true);
                              }}
                              title="View Denominations"
                            >
                              <Eye className="h-4 w-4" />
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

      {/* Start Shift Modal */}
      <Dialog open={isStartShiftModalOpen} onOpenChange={setIsStartShiftModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-green-600" />
              Direct Shift Open
            </DialogTitle>
            <DialogDescription>
              Provide an opening float to start the shift for <strong>{selectedCashier?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
             <div className="grid grid-cols-2 gap-4">
                {[100, 50, 20, 10, 5, 1].map(denom => (
                   <div key={denom} className="space-y-1.5">
                      <Label htmlFor={`denom-${denom}`}>${denom} Notes</Label>
                      <Input
                        id={`denom-${denom}`}
                        type="number"
                        min="0"
                        value={shiftDenominations[denom.toString()] || 0}
                        onChange={(e) => {
                           const val = Math.max(0, parseInt(e.target.value) || 0);
                           setShiftDenominations(prev => ({
                              ...prev,
                              [denom.toString()]: val
                           }));
                        }}
                      />
                   </div>
                ))}
             </div>

             <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between border border-green-200">
                <span className="font-semibold text-green-800">Total Opening Float:</span>
                <span className="text-2xl font-black text-green-600">TT${shiftTotal.toLocaleString()}</span>
             </div>

             <div className="space-y-1.5">
                <Label htmlFor="shift-notes">Notes (Optional)</Label>
                <textarea
                  id="shift-notes"
                  className="w-full p-2 text-sm border rounded-md min-h-[80px]"
                  placeholder="Reason or instructions..."
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                />
             </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStartShiftModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStartShiftSubmit} 
              disabled={loading || shiftTotal <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Processing...' : 'Start Shift Now'}
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
      
      <ViewDenominationsModal
        open={isViewDenomsModalOpen}
        onClose={() => setIsViewDenomsModalOpen(false)}
        title={viewDenomsData?.title || 'Cashier Denominations'}
        denominations={viewDenomsData?.denominations || []}
        totalAmount={viewDenomsData?.total || 0}
      />
    </div>
  );
}
