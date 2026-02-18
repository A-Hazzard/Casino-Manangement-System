/**
 * Administration Feedback Management Component
 * Comprehensive component for managing user feedback and support tickets.
 *
 * @module components/administration/AdministrationFeedbackManagement
 */

'use client';

import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Checkbox } from '@/components/shared/ui/checkbox';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { Textarea } from '@/components/shared/ui/textarea';
import { format } from 'date-fns';
import { Edit2, Eye, MessageSquare, RefreshCw, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

type Feedback = {
  _id: string;
  email: string;
  category:
    | 'bug'
    | 'suggestion'
    | 'general-review'
    | 'feature-request'
    | 'performance'
    | 'ui-ux'
    | 'other';
  description: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  archived: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FeedbackResponse = {
  success: boolean;
  data: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug Report',
  suggestion: '💡 Suggestion',
  'general-review': '⭐ General Review',
  'feature-request': '✨ Feature Request',
  performance: '⚡ Performance',
  'ui-ux': '🎨 UI/UX',
  other: '📝 Other',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

/**
 * Administration Feedback Management
 */
export default function AdministrationFeedbackManagement() {
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editArchived, setEditArchived] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [feedbackToRestore, setFeedbackToRestore] = useState<Feedback | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // Calculate which batch corresponds to the current page
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / pagesPerBatch) + 1;
  }, [pagesPerBatch]);

  // Fetch feedback - initial batch and when filters change
  const fetchInitialBatch = useCallback(async () => {
    setLoading(true);
    setAllFeedback([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);

    try {
      const params = new URLSearchParams();
      if (emailFilter) params.append('email', emailFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', '1');
      params.append('limit', String(itemsPerBatch));

      const response = await fetch(`/api/feedback?${params.toString()}`);
      const data: FeedbackResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          (data as { error?: string }).error || 'Failed to fetch feedback'
        );
      }

      setAllFeedback(data.data || []);
      setLoadedBatches(new Set([1]));
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to fetch feedback. Please try again.'
      );
      setAllFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [emailFilter, categoryFilter, statusFilter, itemsPerBatch]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Build params for batch fetch
    const buildParams = (batch: number) => {
      const params = new URLSearchParams();
      if (emailFilter) params.append('email', emailFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(batch));
      params.append('limit', String(itemsPerBatch));
      return params;
    };

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      const params = buildParams(nextBatch);
      fetch(`/api/feedback?${params.toString()}`)
        .then(res => res.json())
        .then((data: FeedbackResponse) => {
          if (data.success) {
            setAllFeedback(prev => {
              const existingIds = new Set(prev.map(item => item._id));
              const newItems = (data.data || []).filter(
                item => !existingIds.has(item._id)
              );
              return [...prev, ...newItems];
            });
          }
        })
        .catch(error => {
          console.error('Error fetching next batch:', error);
        });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      const params = buildParams(currentBatch);
      fetch(`/api/feedback?${params.toString()}`)
        .then(res => res.json())
        .then((data: FeedbackResponse) => {
          if (data.success) {
            setAllFeedback(prev => {
              const existingIds = new Set(prev.map(item => item._id));
              const newItems = (data.data || []).filter(
                item => !existingIds.has(item._id)
              );
              return [...prev, ...newItems];
            });
          }
        })
        .catch(error => {
          console.error('Error fetching current batch:', error);
        });
    }
  }, [
    currentPage,
    loading,
    loadedBatches,
    emailFilter,
    categoryFilter,
    statusFilter,
    itemsPerBatch,
    pagesPerBatch,
    calculateBatchNumber,
  ]);

  // Fetch initial batch when filters change
  useEffect(() => {
    fetchInitialBatch();
  }, [fetchInitialBatch]);

  // Get items for current page from the current batch
  const feedback = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return allFeedback.slice(startIndex, endIndex);
  }, [allFeedback, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages based on all loaded batches
  const totalPages = useMemo(() => {
    const totalItems = allFeedback.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [allFeedback.length, itemsPerPage]);

  // Listen for refresh event from parent component
  useEffect(() => {
    const handleRefreshEvent = () => {
      fetchInitialBatch();
      toast.success('Feedback list refreshed');
    };

    window.addEventListener('refreshFeedback', handleRefreshEvent);
    return () => {
      window.removeEventListener('refreshFeedback', handleRefreshEvent);
    };
  }, [fetchInitialBatch]);

  const handleViewDetails = (item: Feedback) => {
    setSelectedFeedback(item);
    setEditStatus(item.status);
    setEditArchived(Boolean(item.archived));
    setEditNotes(item.notes || '');
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    // If there were unsaved changes, refresh the feedback list
    if (hasUnsavedChanges && !isEditing) {
      fetchInitialBatch();
    }
    setIsDetailModalOpen(false);
    setSelectedFeedback(null);
    setIsEditing(false);
    setEditStatus('');
    setEditArchived(false);
    setEditNotes('');
    setHasUnsavedChanges(false);
  };

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;

    setIsUpdating(true);
    try {
      const updateData: {
        _id: string;
        status?: string;
        archived?: boolean;
        notes?: string | null;
      } = {
        _id: selectedFeedback._id,
      };

      // Check if status changed
      if (editStatus !== selectedFeedback.status) {
        updateData.status = editStatus;
      }

      // Always include archived when editing - compare as booleans
      const currentArchived = Boolean(selectedFeedback.archived);
      
      if (editArchived !== currentArchived) {
        updateData.archived = editArchived;
      }

      // Check if notes changed
      const currentNotes = selectedFeedback.notes || '';
      if (editNotes.trim() !== currentNotes.trim()) {
        updateData.notes = editNotes.trim() || null;
      }

      // If no changes, don't send update
      if (Object.keys(updateData).length === 1) {
        toast.info('No changes to save');
        setIsUpdating(false);
        return;
      }

      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update feedback');
      }

      const updatedFeedback = { 
        ...selectedFeedback, 
        ...data.feedback,
        archived: data.feedback.archived ?? false,
      };
      setSelectedFeedback(updatedFeedback);
      setAllFeedback(prev => prev.map((f: Feedback) => f._id === updatedFeedback._id ? updatedFeedback : f));
      
      setIsEditing(false);
      setHasUnsavedChanges(true);
      toast.success('Feedback updated successfully');
      fetchInitialBatch();
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update feedback. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = () => {
    fetchInitialBatch();
    toast.success('Feedback list refreshed');
  };

  const handleDeleteClick = (item: Feedback) => {
    setFeedbackToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!feedbackToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: feedbackToDelete._id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete feedback');
      }

      toast.success('Feedback deleted successfully');
      setDeleteConfirmOpen(false);
      setFeedbackToDelete(null);
      
      if (selectedFeedback?._id === feedbackToDelete._id) {
        handleCloseModal();
      }
      
      fetchInitialBatch();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete feedback. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreClick = (item: Feedback) => {
    setFeedbackToRestore(item);
    setRestoreConfirmOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!feedbackToRestore) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: feedbackToRestore._id,
          archived: false,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore feedback');
      }

      toast.success('Feedback restored successfully');
      setRestoreConfirmOpen(false);
      setFeedbackToRestore(null);
      fetchInitialBatch();
      
      if (selectedFeedback?._id === feedbackToRestore._id) {
        setSelectedFeedback({ ...selectedFeedback, archived: false });
      }
    } catch (error) {
      console.error('Error restoring feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to restore feedback. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {/* Filters */}
      {allFeedback.length > 20 && (
        <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-end">
          <div className="flex-1">
            <Label
              htmlFor="email-search"
              className="mb-2 block text-sm font-medium"
            >
              Search by Email
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email-search"
                type="text"
                placeholder="Enter email address..."
                value={emailFilter}
                onChange={e => {
                  setEmailFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="md:w-48">
            <Label
              htmlFor="category-filter"
              className="mb-2 block text-sm font-medium"
            >
              Category
            </Label>
            <Select
              value={categoryFilter}
              onValueChange={value => {
                setCategoryFilter(value);
                setCurrentPage(0);
              }}
            >
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:w-48">
            <Label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-medium"
            >
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={value => {
                setStatusFilter(value);
                setCurrentPage(0);
              }}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Total Feedback
          </div>
          <div className="mt-1 text-2xl font-bold">{allFeedback.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">
            {feedback.filter(f => f.status === 'pending').length}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Reviewed</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {feedback.filter(f => f.status === 'reviewed').length}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Resolved</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {feedback.filter(f => f.status === 'resolved').length}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-600">Loading feedback...</p>
          </div>
        </div>
      ) : feedback.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-900">
            No feedback found
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {emailFilter || (categoryFilter && categoryFilter !== 'all') || (statusFilter && statusFilter !== 'all')
              ? 'Try adjusting your filters'
              : 'No feedback has been submitted yet'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block space-y-4 md:hidden">
            {feedback.map(item => (
              <div
                key={item._id}
                className="overflow-hidden rounded-lg border bg-white shadow-sm"
              >
                <div className="border-b bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {item.email}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {format(new Date(item.submittedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.archived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreClick(item)}
                          disabled={isUpdating}
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                          title="Restore feedback"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        className="h-8 w-8 p-0"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(item)}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Delete feedback"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[item.status] || ''}
                    >
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
                    </Badge>
                    {item.archived && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                        Archived
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-gray-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map(item => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[item.status] || ''}
                      >
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.submittedAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.archived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreClick(item)}
                            disabled={isUpdating}
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                            title="Restore feedback"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                          className="h-8 w-8 p-0"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          disabled={isDeleting}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Delete feedback"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {!loading && feedback.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Details
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Edit feedback status and notes' : 'View complete feedback information'}
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Email
                  </Label>
                  <p className="mt-1 text-sm">{selectedFeedback.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Category
                  </Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {CATEGORY_LABELS[selectedFeedback.category] ||
                        selectedFeedback.category}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  {isEditing ? (
                    <Select
                      value={editStatus}
                      onValueChange={setEditStatus}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[selectedFeedback.status] || ''}
                      >
                        {selectedFeedback.status.charAt(0).toUpperCase() +
                          selectedFeedback.status.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Archived
                  </Label>
                  {isEditing ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Checkbox
                        id="archived-checkbox"
                        checked={editArchived}
                        onCheckedChange={checked => setEditArchived(Boolean(checked))}
                      />
                      <Label
                        htmlFor="archived-checkbox"
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        Archive this feedback
                      </Label>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={selectedFeedback.archived ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-700'}
                      >
                        {selectedFeedback.archived ? 'Archived' : 'Active'}
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Submitted At
                  </Label>
                  <p className="mt-1 text-sm">
                    {format(
                      new Date(selectedFeedback.submittedAt),
                      'MMM dd, yyyy HH:mm:ss'
                    )}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <div className="mt-2 rounded-md border bg-gray-50 p-3">
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedFeedback.description}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Notes
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Add notes about this feedback..."
                    className="mt-2 min-h-[100px]"
                  />
                ) : (
                  <div className="mt-2 rounded-md border bg-blue-50 p-3">
                    <p className="whitespace-pre-wrap text-sm">
                      {selectedFeedback.notes || 'No notes added'}
                    </p>
                  </div>
                )}
              </div>
              {selectedFeedback.reviewedBy && selectedFeedback.reviewedAt && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Reviewed By
                    </Label>
                    <p className="mt-1 text-sm">{selectedFeedback.reviewedBy}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Reviewed At
                    </Label>
                    <p className="mt-1 text-sm">
                      {format(
                        new Date(selectedFeedback.reviewedAt),
                        'MMM dd, yyyy HH:mm:ss'
                      )}
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter>
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditStatus(selectedFeedback.status);
                        setEditArchived(Boolean(selectedFeedback.archived));
                        setEditNotes(selectedFeedback.notes || '');
                        setHasUnsavedChanges(false);
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateFeedback}
                      disabled={isUpdating}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-between">
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteClick(selectedFeedback)}
                      disabled={isDeleting}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {selectedFeedback.archived && (
                        <Button
                          variant="outline"
                          onClick={() => handleRestoreClick(selectedFeedback)}
                          disabled={isUpdating}
                          className="text-green-600 hover:bg-green-50 hover:text-green-700"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(true);
                          setHasUnsavedChanges(false);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </AlertDialogDescription>
            {feedbackToDelete && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">From: {feedbackToDelete.email}</div>
                <div className="text-gray-600 mt-1">
                  {feedbackToDelete.description.substring(0, 100)}
                  {feedbackToDelete.description.length > 100 ? '...' : ''}
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this feedback? It will be unarchived and remain in its current status.
            </AlertDialogDescription>
            {feedbackToRestore && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">From: {feedbackToRestore.email}</div>
                <div className="text-gray-600 mt-1">
                  {feedbackToRestore.description.substring(0, 100)}
                  {feedbackToRestore.description.length > 100 ? '...' : ''}
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

