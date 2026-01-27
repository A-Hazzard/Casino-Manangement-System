/**
 * Cashier Management Panel Component
 *
 * VM interface for creating and managing cashiers.
 * Includes creating new cashier accounts and resetting passwords with pagination.
 *
 * @module components/VAULT/admin/CashierManagementPanel
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Plus,
  RotateCcw,
  User,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCashiersData,
  handleCreateCashier,
  handleResetCashierPassword,
} from '@/lib/helpers/vaultHelpers';
import CashierManagementSkeleton from '@/components/ui/skeletons/CashierManagementSkeleton';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { cn } from '@/lib/utils';

interface Cashier {
  _id: string;
  name: string;
  email: string;
  enabled: boolean;
  lastLoginAt?: string;
  roles: string[];
}

export default function CashierManagementPanel() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isTempPasswordModalOpen, setIsTempPasswordModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordAction, setTempPasswordAction] = useState<
    'create' | 'reset'
  >('create');

  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [newCashier, setNewCashier] = useState({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch cashiers on mount and page change
  useEffect(() => {
    fetchCashiers();
  }, [currentPage]);

  const fetchCashiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCashiersData(currentPage, 20);
      setCashiers(data.users);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch cashiers:', error);
      setError('Failed to load cashiers');
      toast.error('Failed to load cashiers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCashierClick = async () => {
    if (!newCashier.name.trim() || !newCashier.email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await handleCreateCashier(newCashier);

      if (result.success) {
        toast.success(`Cashier ${newCashier.name} created successfully`);
        setNewCashier({ name: '', email: '' });
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
        toast.success(`Password reset for ${selectedCashier.name}`);
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

  const openResetModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsResetModalOpen(true);
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
                      colSpan={5}
                      className="py-8 text-center text-gray-500"
                    >
                      No cashiers found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  cashiers.map(cashier => (
                    <TableRow key={cashier._id}>
                      <TableCell className="font-medium">
                        {cashier.name}
                      </TableCell>
                      <TableCell>{cashier.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            cashier.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {cashier.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {cashier.lastLoginAt
                          ? new Date(cashier.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetModal(cashier)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Reset Password
                        </Button>
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newCashier.name}
                onChange={e =>
                  setNewCashier(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter full name"
              />
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
              {selectedCashier?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to reset the password for{' '}
              <strong>{selectedCashier?.name}</strong>?
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
    </div>
  );
}
