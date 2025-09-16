"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AcceptedBill,
  BillValidatorTimePeriod,
} from "@/shared/types/billValidator";

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

/**
 * Hook to fetch accepted bills data for a specific machine
 */
export const useAcceptedBills = ({
  machineId,
  timePeriod = "today",
  enabled = true,
}: UseAcceptedBillsProps): UseAcceptedBillsReturn => {
  const [acceptedBills, setAcceptedBills] = useState<AcceptedBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      console.error("Error fetching accepted bills:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch accepted bills"
      );
      setAcceptedBills([]);
    } finally {
      setIsLoading(false);
    }
  }, [machineId, timePeriod, enabled]);

  useEffect(() => {
    fetchAcceptedBills();
  }, [fetchAcceptedBills]);

  return {
    acceptedBills,
    isLoading,
    error,
    refetch: fetchAcceptedBills,
  };
};
