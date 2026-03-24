/**
 * Administration Feedback Management Component
 * Comprehensive component for managing user feedback and support tickets.
 *
 * @module components/administration/AdministrationFeedbackManagement
 */

'use client';

import { ConfirmationDialog } from '@/components/shared/ui/ConfirmationDialog';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Extracted Components
import FeedbackDetailModal from './feedback/FeedbackDetailModal';
import FeedbackFilters from './feedback/FeedbackFilters';
import FeedbackMobileCards from './feedback/FeedbackMobileCards';
import FeedbackStats from './feedback/FeedbackStats';
import FeedbackTable from './feedback/FeedbackTable';
import { Feedback } from './feedback/FeedbackTypes';
import { useFeedbackData } from '@/lib/hooks/administration/useFeedbackData';

/**
 * Administration Feedback Management
 */
export default function AdministrationFeedbackManagement() {
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmailFilter, setDebouncedEmailFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [feedbackToRestore, setFeedbackToRestore] = useState<Feedback | null>(null);

  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  const {
    feedback,
    allFeedback,
    setAllFeedback,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    fetchInitialBatch,
  } = useFeedbackData({
    debouncedEmailFilter,
    categoryFilter,
    statusFilter,
    itemsPerPage,
    itemsPerBatch,
    pagesPerBatch,
  });

  // Handle debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailFilter(emailFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [emailFilter]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      fetchInitialBatch();
    };
    window.addEventListener('refreshFeedback', handleRefreshEvent);
    return () => window.removeEventListener('refreshFeedback', handleRefreshEvent);
  }, [fetchInitialBatch]);

  const handleUpdateLocal = (updated: Feedback) => {
    setAllFeedback(prev => prev.map(f => f._id === updated._id ? updated : f));
    setSelectedFeedback(updated);
    // Trigger a refresh after a short delay to ensure DB sync is reflected
    setTimeout(() => fetchInitialBatch(), 500);
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
        setIsDetailModalOpen(false);
        setSelectedFeedback(null);
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
      <FeedbackFilters
        emailFilter={emailFilter}
        setEmailFilter={setEmailFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading}
        onRefresh={fetchInitialBatch}
        setCurrentPage={setCurrentPage}
      />

      {/* Stats */}
      <FeedbackStats allFeedback={allFeedback} filteredFeedback={feedback} />

      {/* Table / Cards */}
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
          <FeedbackMobileCards
            feedback={feedback}
            onViewDetails={item => {
              setSelectedFeedback(item);
              setIsDetailModalOpen(true);
            }}
            onRestoreClick={item => {
              setFeedbackToRestore(item);
              setRestoreConfirmOpen(true);
            }}
            onDeleteClick={item => {
              setFeedbackToDelete(item);
              setDeleteConfirmOpen(true);
            }}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
          />

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
            <FeedbackTable
              feedback={feedback}
              onViewDetails={item => {
                setSelectedFeedback(item);
                setIsDetailModalOpen(true);
              }}
              onRestoreClick={item => {
                setFeedbackToRestore(item);
                setRestoreConfirmOpen(true);
              }}
              onDeleteClick={item => {
                setFeedbackToDelete(item);
                setDeleteConfirmOpen(true);
              }}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          </div>

          {/* Pagination Controls */}
          {!loading && feedback.length > 0 && (
            <div className="mt-8 flex justify-center pb-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <FeedbackDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedFeedback={selectedFeedback}
        onUpdate={handleUpdateLocal}
        onDeleteClick={item => {
          setFeedbackToDelete(item);
          setDeleteConfirmOpen(true);
        }}
        onRestoreClick={item => {
          setFeedbackToRestore(item);
          setRestoreConfirmOpen(true);
        }}
        isUpdating={isUpdating}
        isDeleting={isDeleting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Feedback"
        message={`Are you sure you want to delete feedback from ${feedbackToDelete?.email}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        isLoading={isDeleting}
      />

      {/* Restore Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        onConfirm={handleRestoreConfirm}
        title="Restore Feedback"
        message={`Are you sure you want to restore feedback from ${feedbackToRestore?.email}? It will be unarchived.`}
        confirmText="Yes, Restore"
        isLoading={isUpdating}
      />
    </div>
  );
}
