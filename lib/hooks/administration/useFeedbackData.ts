/**
 * Hook for managing feedback data fetching with batching and filtering.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Feedback, FeedbackResponse } from '@/components/CMS/administration/feedback/FeedbackTypes';

type UseFeedbackDataProps = {
  debouncedEmailFilter: string;
  categoryFilter: string;
  statusFilter: string;
  itemsPerPage: number;
  itemsPerBatch: number;
  pagesPerBatch: number;
};

export function useFeedbackData({
  debouncedEmailFilter,
  categoryFilter,
  statusFilter,
  itemsPerPage,
  itemsPerBatch,
  pagesPerBatch,
}: UseFeedbackDataProps) {
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [serverTotalCount, setServerTotalCount] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

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
      if (debouncedEmailFilter) params.append('email', debouncedEmailFilter);
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

      if (data.pagination) {
        setServerTotalCount(data.pagination.totalCount || 0);
        setServerTotalPages(data.pagination.totalPages || 1);
      }
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
  }, [debouncedEmailFilter, categoryFilter, statusFilter, itemsPerBatch]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    const buildParams = (batch: number) => {
      const params = new URLSearchParams();
      if (debouncedEmailFilter) params.append('email', debouncedEmailFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(batch));
      params.append('limit', String(itemsPerBatch));
      return params;
    };

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
                (item: Feedback) => !existingIds.has(item._id)
              );
              return [...prev, ...newItems];
            });
          }
        })
        .catch(error => {
          console.error('Error fetching next batch:', error);
        });
    }

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
                (item: Feedback) => !existingIds.has(item._id)
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
    debouncedEmailFilter,
    categoryFilter,
    statusFilter,
    itemsPerBatch,
    pagesPerBatch,
    calculateBatchNumber,
  ]);

  // Update initial batch on filter change
  useEffect(() => {
    fetchInitialBatch();
  }, [fetchInitialBatch]);

  // Memoized current page of feedback
  const feedback = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return allFeedback.slice(startIndex, endIndex);
  }, [allFeedback, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages based on server data
  const totalPages = useMemo(() => {
    return serverTotalPages > 0 ? serverTotalPages : 1;
  }, [serverTotalPages]);

  return {
    feedback,
    allFeedback,
    setAllFeedback,
    loading,
    setLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    serverTotalCount,
    fetchInitialBatch,
  };
}
