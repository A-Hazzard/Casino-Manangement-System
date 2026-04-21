/**
 * useCabinetAccountingData Hook
 * 
 * Manages accounting-related data and state for a specific cabinet.
 * Handles collection history transformation, activity log fetching, and filter states.
 */

'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCabinetUIStore } from '@/lib/store/cabinetUIStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { GamingMachine as Cabinet, MachineDocument } from '@/shared/types/entities';
import type { CollectionData } from '@/lib/types/cabinet/details';
import type { TimePeriod as ApiTimePeriod } from '@/shared/types/common';

type UseCabinetAccountingDataProps = {
  cabinet: Cabinet;
  activeMetricsTabContent: string;
};

export function useCabinetAccountingData({
  cabinet,
  activeMetricsTabContent,
}: UseCabinetAccountingDataProps) {
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();

  const [collectionHistory, setCollectionHistory] = useState<CollectionData[]>([]);
  const [activityLog, setActivityLog] = useState<Record<string, unknown>[]>([]);
  const [machine, setMachine] = useState<MachineDocument | null>(null);

  // Loading and Error states
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [collectionHistoryError, setCollectionHistoryError] = useState<string | null>(null);
  const [activityLogError, setActivityLogError] = useState<string | null>(null);

  // Filter states
  const [activityLogDateRange, setActivityLogDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [activityLogTimePeriod, setActivityLogTimePeriod] = useState<ApiTimePeriod>('7d');

  // Zustand store for Bill Validator state
  const { getBillValidatorState, setBillValidatorTimePeriod } = useCabinetUIStore();
  const billValidatorState = getBillValidatorState(cabinet._id);
  const billValidatorTimePeriod = billValidatorState.timePeriod;
  const billValidatorDateRange = billValidatorState.customDateRange;

  useEffect(() => {
    async function loadData() {
      try {
        if (cabinet) {
          setMachine(cabinet as MachineDocument);

          // Extract collection history
          if (cabinet.collectionMetersHistory && Array.isArray(cabinet.collectionMetersHistory)) {
            const transformedHistory = cabinet.collectionMetersHistory
              .map((entry: Record<string, unknown>) => {
                const id = entry._id;
                const timestamp = entry.timestamp;

                let entryId: string;
                if (id && typeof id === 'object' && '$oid' in id) {
                  entryId = (id as { $oid: string }).$oid;
                } else {
                  entryId = String(id || '');
                }

                let entryTimestamp: string | Date;
                if (timestamp && typeof timestamp === 'object' && '$date' in timestamp) {
                  entryTimestamp = (timestamp as { $date: string }).$date;
                } else {
                  entryTimestamp = timestamp as string | Date;
                }

                return {
                  _id: entryId,
                  timestamp: entryTimestamp,
                  metersIn: (entry.metersIn as number) || 0,
                  metersOut: (entry.metersOut as number) || 0,
                  prevIn: (entry.prevMetersIn as number) || 0,
                  prevOut: (entry.prevMetersOut as number) || 0,
                  locationReportId: (entry.locationReportId as string) || '',
                  machineId: cabinet._id,
                };
              })
              .sort((a, b) => {
                const timestampA = new Date(a.timestamp).getTime();
                const timestampB = new Date(b.timestamp).getTime();
                return timestampB - timestampA;
              });

            setCollectionHistory(transformedHistory);
            setCollectionHistoryError(null);
          } else {
            setCollectionHistory([]);
            setCollectionHistoryError(null);
          }

          // Fetch activity log
          if (activeMetricsTabContent === 'Activity Log') {
            setActivityLogLoading(true);
            setActivityLogError(null);
            try {
              const params = new URLSearchParams();
              params.append('id', cabinet._id);

              if (activityLogTimePeriod === 'Custom' && activityLogDateRange) {
                params.append('startDate', activityLogDateRange.from.toISOString());
                params.append('endDate', activityLogDateRange.to.toISOString());
              } else if (activityLogTimePeriod && activityLogTimePeriod !== 'All Time') {
                params.append('timePeriod', activityLogTimePeriod);
              }

              const eventsRes = await axios.get(`/api/cabinets/by-id/events?${params.toString()}`);
              setActivityLog(eventsRes.data.events || []);
            } catch (error) {
              console.error('Failed to fetch machine events:', error);
              setActivityLog([]);
              setActivityLogError(error instanceof Error ? error.message : 'Failed to fetch activity log');
            } finally {
              setActivityLogLoading(false);
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setActivityLog([]);
        setMachine(null);
        setCollectionHistoryError('Failed to load collection history');
        setActivityLogError('Failed to load activity log');
      }
    }
    loadData();
  }, [cabinet, activeMetricsTabContent, activityLogTimePeriod, activityLogDateRange]);

  return {
    collectionHistory,
    activityLog,
    machine,
    activityLogLoading,
    collectionHistoryError,
    activityLogError,
    activityLogDateRange,
    activityLogTimePeriod,
    billValidatorTimePeriod,
    billValidatorDateRange,
    activeMetricsFilter,
    customDateRange,
    setActivityLogDateRange,
    setActivityLogTimePeriod,
    setBillValidatorTimePeriod: (period: ApiTimePeriod) => setBillValidatorTimePeriod(cabinet._id, period),
    setMachine,
  };
}
