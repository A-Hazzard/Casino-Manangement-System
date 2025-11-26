/**
 * Use Accepted Bills Hook
 * Custom hook for fetching and managing accepted bills data for a specific gaming machine.
 *
 * Features:
 * - Fetches accepted bills data from the accounting details API
 * - Supports time period filtering (today, yesterday, 7 days, 30 days, custom)
 * - Provides loading state and error handling
 * - Includes refetch functionality for manual data refresh
 * - Can be conditionally enabled/disabled via the enabled prop
 *
 * @param props - Hook configuration options
 * @param props.machineId - ID of the machine to fetch bills for
 * @param props.timePeriod - Time period filter (defaults to 'today')
 * @param props.enabled - Whether the hook should fetch data (defaults to true)
 * @returns Object containing accepted bills data, loading state, error, and refetch function
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AcceptedBill,
  BillValidatorTimePeriod,
} from '@/shared/types/billValidator';

// ============================================================================
// Types
// ============================================================================

type UseAcceptedBillsProps = {
  machineId: string;
  timePeriod?: BillValidatorTimePeriod;
  enabled?: boolean;
};

type UseAcceptedBillsReturn = {
  acceptedBills: AcceptedBill[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

// ============================================================================
// Hook
// ============================================================================

export const useAcceptedBills = ({
  machineId,
  timePeriod = 'today',
  enabled = true,
}: UseAcceptedBillsProps): UseAcceptedBillsReturn => {
  // ============================================================================
  // State
  // ============================================================================
  const [acceptedBills, setAcceptedBills] = useState<AcceptedBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchAcceptedBills = useCallback(async () => {
    if (!enabled || !machineId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        machineId,
        timePeriod,
      });

      const response = await fetch(`/api/accounting-details?${params}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch accepted bills: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success && data.data?.acceptedBills) {
        setAcceptedBills(data.data.acceptedBills);
      } else {
        setAcceptedBills([]);
      }
    } catch (err) {
      console.error('Error fetching accepted bills:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch accepted bills'
      );
      setAcceptedBills([]);
    } finally {
      setIsLoading(false);
    }
  }, [machineId, timePeriod, enabled]);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchAcceptedBills();
  }, [fetchAcceptedBills]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    acceptedBills,
    isLoading,
    error,
    refetch: fetchAcceptedBills,
  };
};
