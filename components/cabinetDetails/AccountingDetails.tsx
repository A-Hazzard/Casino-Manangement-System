
import {
  containerVariants,
  itemVariants,
} from '@/lib/constants/animationVariants';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { AccountingDetailsProps } from '@/lib/types/cabinetDetails';
import { formatCurrency } from '@/lib/utils';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { UnifiedBillValidator } from './UnifiedBillValidator';

import ActivityLogDateFilter from '@/components/ui/ActivityLogDateFilter';
import { useCabinetUIStore } from '@/lib/store/cabinetUIStore';
import type {
  GamingMachine as Cabinet,
  MachineDocument,
} from '@/shared/types/entities';
import ActivityLogSkeleton from './ActivityLogSkeleton';
import type { MachineEvent } from './ActivityLogTable';
import { ActivityLogTable } from './ActivityLogTable';
import CollectionHistorySkeleton from './CollectionHistorySkeleton';
import { CollectionHistoryTable } from './CollectionHistoryTable';

import type { TimePeriod as ApiTimePeriod } from '@/shared/types/common';

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'All Time' | 'Custom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Type for collection data from machine's embedded collectionMetersHistory
type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number; // This maps to prevMetersIn from the embedded data
  prevOut: number; // This maps to prevMetersOut from the embedded data
  locationReportId: string;
};

// Skeleton loaders for individual tabs
const MetricsSkeleton = () => (
  <div
    className="flex w-full max-w-full flex-wrap gap-3 md:gap-4"
    style={{ rowGap: '1rem' }}
  >
    {[1, 2, 3, 4].map(i => (
      <div
        key={i}
        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
      >
        <div className="mb-2 h-4 animate-pulse rounded bg-gray-200 md:mb-4"></div>
        <div className="mb-4 h-1 w-full bg-gray-300 md:mb-6"></div>
        <div className="flex h-6 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent md:h-5 md:w-5"></div>
        </div>
      </div>
    ))}
  </div>
);

const LiveMetricsSkeleton = () => (
  <div className="grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="rounded-lg bg-container p-4 shadow md:p-6">
        <div className="mb-2 h-4 animate-pulse rounded bg-gray-200 md:mb-4"></div>
        <div className="mb-4 h-1 w-full bg-gray-300 md:mb-6"></div>
        <div className="flex h-6 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent md:h-5 md:w-5"></div>
        </div>
      </div>
    ))}
  </div>
);

// BillValidatorSkeleton removed - now handled by UnifiedBillValidator component

const ConfigurationsSkeleton = () => (
  <div className="flex w-full flex-col flex-wrap items-center gap-4 sm:flex-row sm:items-stretch sm:justify-start">
    {[1, 2].map(i => (
      <div
        key={i}
        className="flex w-64 max-w-full flex-col overflow-hidden rounded-lg shadow"
      >
        <div className="flex items-center justify-center bg-gray-400 p-3">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-300"></div>
        </div>
        <div className="flex items-center justify-center bg-white p-4">
          <div className="h-6 w-20 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    ))}
  </div>
);

// Collection Settings Content Component
const CollectionSettingsContent: React.FC<{ cabinet: Cabinet }> = ({
  cabinet,
}) => {
  const [isEditCollection, setIsEditCollection] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [collectionMetersIn, setCollectionMetersIn] = useState<string>('0');
  const [collectionMetersOut, setCollectionMetersOut] = useState<string>('0');
  const [collectionDate, setCollectionDate] = useState<Date | null>(null);
  const [collectionHour, setCollectionHour] = useState<number>(0);
  const [collectorDenomination, setCollectorDenomination] =
    useState<string>('1');

  // Hour options for collection time
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    text: `${i.toString().padStart(2, '0')}:00`,
    value: i,
  }));

  // Initialize collection settings from cabinet data
  React.useEffect(() => {
    if (cabinet.collectionMeters) {
      setCollectionMetersIn(String(cabinet.collectionMeters.metersIn || 0));
      setCollectionMetersOut(String(cabinet.collectionMeters.metersOut || 0));
    }
    if (cabinet.collectionTime) {
      const lastColTime = new Date(cabinet.collectionTime as string | Date);
      setCollectionDate(lastColTime);
      setCollectionHour(lastColTime.getHours());
    }
    if (cabinet.collectorDenomination) {
      setCollectorDenomination(String(cabinet.collectorDenomination));
    }
  }, [cabinet]);

  // Handle collection settings save
  const handleSaveCollectionSettings = async () => {
    if (!isEditCollection) {
      setIsEditCollection(true);
      return;
    }

    if (!collectionDate) {
      toast.error('Please select last collection time and save again.');
      return;
    }

    setIsUpdatingCollection(true);
    try {
      // Create the collection time with the selected hour
      const prevCollectionTime = new Date(collectionDate);
      prevCollectionTime.setHours(collectionHour, 0, 0, 0);

      // Update cabinet data
      const updateData = {
        collectionMeters: {
          metersIn: parseInt(collectionMetersIn) || 0,
          metersOut: parseInt(collectionMetersOut) || 0,
        },
        collectionTime: prevCollectionTime.toISOString(),
        collectorDenomination: parseFloat(collectorDenomination) || 1,
      };

      // Make API call to update cabinet
      const response = await fetch(`/api/cabinets/${cabinet._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection settings');
      }

      setIsEditCollection(false);
      toast.success('Collection settings updated successfully!');
    } catch (error) {
      console.error('Error saving collection settings:', error);
      toast.error('Failed to save collection settings');
    } finally {
      setIsUpdatingCollection(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-800">
          Collection Settings
        </h3>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Last Meters In */}
          <div className="space-y-2">
            <Label
              htmlFor="metersIn"
              className="text-sm font-medium text-gray-700"
            >
              Last Meters In
            </Label>
            <Input
              id="metersIn"
              type="number"
              value={collectionMetersIn}
              onChange={e => setCollectionMetersIn(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Last Meters Out */}
          <div className="space-y-2">
            <Label
              htmlFor="metersOut"
              className="text-sm font-medium text-gray-700"
            >
              Last Meters Out
            </Label>
            <Input
              id="metersOut"
              type="number"
              value={collectionMetersOut}
              onChange={e => setCollectionMetersOut(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Collection Date */}
          <div className="space-y-2">
            <Label
              htmlFor="collectionDate"
              className="text-sm font-medium text-gray-700"
            >
              Last Collection Date
            </Label>
            <Input
              id="collectionDate"
              type="date"
              value={
                collectionDate ? collectionDate.toISOString().split('T')[0] : ''
              }
              onChange={e =>
                setCollectionDate(
                  e.target.value ? new Date(e.target.value) : null
                )
              }
              disabled={!isEditCollection}
              className="w-full"
            />
          </div>

          {/* Collection Hour */}
          <div className="space-y-2">
            <Label
              htmlFor="collectionHour"
              className="text-sm font-medium text-gray-700"
            >
              Collection Hour
            </Label>
            <Select
              value={collectionHour.toString()}
              onValueChange={value => setCollectionHour(parseInt(value))}
              disabled={!isEditCollection}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select hour" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collector Denomination */}
          <div className="space-y-2">
            <Label
              htmlFor="denomination"
              className="text-sm font-medium text-gray-700"
            >
              Collector Denomination
            </Label>
            <Input
              id="denomination"
              type="number"
              step="0.01"
              value={collectorDenomination}
              onChange={e => setCollectorDenomination(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="1.00"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveCollectionSettings}
            disabled={isUpdatingCollection}
            className="bg-buttonActive px-6 py-2 text-white hover:bg-buttonActive/90"
          >
            {isUpdatingCollection ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </div>
            ) : isEditCollection ? (
              'Save'
            ) : (
              'Edit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Export the component as both default and named export
export const AccountingDetails: React.FC<AccountingDetailsProps> = ({
  cabinet,
  loading,
  activeMetricsTabContent,
  setActiveMetricsTabContent,
  disableCurrencyConversion = false,
  onDataRefresh,
}) => {
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();

  // On specific cabinet pages, don't apply currency conversion
  const shouldApplyCurrency =
    !disableCurrencyConversion && shouldShowCurrency();

  const [collectionHistory, setCollectionHistory] = useState<CollectionData[]>(
    []
  );
  const [activityLog, setActivityLog] = useState<Record<string, unknown>[]>([]);

  const [machine, setMachine] = useState<MachineDocument | null>(null);
  // Loading states for individual tabs
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  // Error states for individual tabs
  const [collectionHistoryError, setCollectionHistoryError] = useState<
    string | null
  >(null);
  const [activityLogError, setActivityLogError] = useState<string | null>(null);

  // Collection history fix functionality
  const [isFixingCollectionHistory, setIsFixingCollectionHistory] =
    useState(false);
  const [hasCollectionHistoryIssues, setHasCollectionHistoryIssues] =
    useState(false);
  const [isCheckingIssues, setIsCheckingIssues] = useState(false);
  const [collectionHistoryIssues, setCollectionHistoryIssues] = useState<
    Record<string, string>
  >({});

  // Track if auto-fix has been attempted to prevent infinite loops
  const autoFixAttemptedRef = React.useRef(false);

  // Function to check for collection history issues (defined first as it's used by handleFix)
  const checkForCollectionHistoryIssues = React.useCallback(async () => {
    if (!cabinet?._id) return;

    setIsCheckingIssues(true);
    try {
      const checkResponse = await fetch(
        `/api/collection-reports/check-all-issues?machineId=${cabinet._id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(60000), // 60 second timeout
        }
      );

      if (!checkResponse.ok) {
        throw new Error(
          `Check API failed: ${checkResponse.status} ${checkResponse.statusText}`
        );
      }

      const checkData = await checkResponse.json();
      console.warn('🔍 Check API response:', checkData);

      // Extract detailed issue information per collection
      const issuesMap: Record<string, string> = {};
      if (
        checkData.success &&
        checkData.machines &&
        checkData.machines.length > 0
      ) {
        const machineData = checkData.machines[0];
        console.warn('🔍 Machine data:', machineData);

        if (machineData.issues && Array.isArray(machineData.issues)) {
          machineData.issues.forEach(
            (issue: {
              type: string;
              locationReportId?: string;
              message?: string;
              details?: Record<string, unknown>;
            }) => {
              if (issue.locationReportId) {
                // Use the message from the API directly, which now includes all details
                const issueDescription =
                  issue.message || `Issue: ${issue.type}`;
                issuesMap[issue.locationReportId] = issueDescription;
              }
            }
          );
        }
      }

      setCollectionHistoryIssues(issuesMap);
      setHasCollectionHistoryIssues(Object.keys(issuesMap).length > 0);

      if (Object.keys(issuesMap).length > 0) {
        console.warn(
          `⚠️ Found ${Object.keys(issuesMap).length} collection history issues:`,
          issuesMap
        );
      } else {
        console.warn('✅ No collection history issues found');
      }
    } catch (error) {
      console.error('Error checking collection history issues:', error);
      setHasCollectionHistoryIssues(false);
      setCollectionHistoryIssues({});
    } finally {
      setIsCheckingIssues(false);
    }
  }, [cabinet._id]);

  // Function to handle fixing collection history issues
  const handleFixCollectionHistory = React.useCallback(
    async (isAutomatic: boolean = false) => {
      if (!cabinet?._id) return;

      setIsFixingCollectionHistory(true);
      try {
        // Fix the issues using the existing fix-report endpoint
        const fixResponse = await fetch('/api/collection-reports/fix-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            machineId: cabinet._id,
            reportId: null, // Fix for specific machine, not a report
          }),
          // Add timeout
          signal: AbortSignal.timeout(60000), // 60 second timeout for fix operation
        });

        if (!fixResponse.ok) {
          throw new Error(
            `Fix API failed: ${fixResponse.status} ${fixResponse.statusText}`
          );
        }

        const fixData = await fixResponse.json();
        console.warn('🔧 Fix API response:', fixData);

        if (fixData.success) {
          if (!isAutomatic) {
            toast.success(
              `Fixed ${fixData.results.issuesFixed.machineHistoryFixed} collection history issues`
            );
            // Reload the page to get updated data
            window.location.reload();
          } else {
            console.warn(
              `✅ Automatically fixed ${fixData.results.issuesFixed.machineHistoryFixed} collection history issues`
            );

            // AUTO-REQUERY: After auto-fix, recheck for issues to update UI state
            // This ensures the warning banner and buttons hide if all issues are resolved
            console.warn(
              '🔄 Auto-requering collection history to verify fix...'
            );
            await checkForCollectionHistoryIssues();

            // Refresh parent cabinet data if callback provided
            if (onDataRefresh) {
              console.warn('🔄 Refreshing parent cabinet data...');
              await onDataRefresh();
            }

            toast.success('Collection history automatically synchronized', {
              description: `${fixData.results.issuesFixed.machineHistoryFixed} issues resolved`,
              duration: 4000,
            });
          }
        } else {
          if (!isAutomatic) {
            toast.error(
              fixData.message || 'Failed to fix collection history issues'
            );
          } else {
            console.error(
              'Failed to automatically fix collection history issues:',
              fixData.message
            );
          }
        }
      } catch (error) {
        console.error('Error fixing collection history:', error);
        if (!isAutomatic) {
          toast.error('Failed to fix collection history issues');
        }
      } finally {
        setIsFixingCollectionHistory(false);
      }
    },
    [cabinet._id, checkForCollectionHistoryIssues, onDataRefresh]
  );

  // Check for issues when component loads, cabinet changes, or after refresh
  // AUTO-FIX: Automatically fixes issues when detected (can be disabled if needed)
  React.useEffect(() => {
    if (
      cabinet?._id &&
      !loading &&
      activeMetricsTabContent === 'Collection History'
    ) {
      checkForCollectionHistoryIssues();
    }
  }, [
    cabinet?._id,
    loading,
    activeMetricsTabContent,
    checkForCollectionHistoryIssues,
  ]);

  // AUTO-FIX: Automatically call fix when issues are detected
  // PRINCIPLE: Collections are always right, history might be wrong
  // This ensures history is automatically synced to match collection documents
  // Note: handleFixCollectionHistory intentionally omitted from deps to prevent infinite loop
  // Auto-fix runs ONCE per page session and never again (prevents infinite loops)
  React.useEffect(() => {
    if (
      hasCollectionHistoryIssues &&
      !isFixingCollectionHistory &&
      !isCheckingIssues &&
      !autoFixAttemptedRef.current // Only run if never attempted
    ) {
      console.warn(
        '🔧 Auto-fix: Collection history issues detected, automatically fixing (ONE TIME ONLY)...'
      );
      console.warn(
        '   PRINCIPLE: Collection documents are source of truth, syncing history to match'
      );

      // Mark auto-fix attempted - NEVER reset during page session
      autoFixAttemptedRef.current = true;
      handleFixCollectionHistory(true); // true = automatic/silent fix
    }
    // NOTE: autoFixAttemptedRef is NEVER reset during page session to prevent infinite loops
    // If user needs to re-run auto-fix, they must refresh the page or use manual "Fix History" button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCollectionHistoryIssues, isFixingCollectionHistory, isCheckingIssues]);

  // Separate date filter states for Activity Log and Bill Validator

  const [activityLogDateRange, setActivityLogDateRange] = useState<
    { from: Date; to: Date } | undefined
  >();
  const [activityLogTimePeriod, setActivityLogTimePeriod] =
    useState<ApiTimePeriod>('7d');

  // Use Zustand store for Bill Validator state (persists across page navigation)
  const { getBillValidatorState, setBillValidatorTimePeriod } =
    useCabinetUIStore();
  const billValidatorState = getBillValidatorState(cabinet._id);
  const billValidatorTimePeriod = billValidatorState.timePeriod;
  const billValidatorDateRange = billValidatorState.customDateRange;

  // Note: convertBillMetersToBills function removed - now using UnifiedBillValidator with acceptedBills API

  // Debug logging for filter states
  console.warn('Activity Log Filters:', {
    activityLogDateRange,
    activityLogTimePeriod,
  });
  console.warn('Bill Validator Filters:', {
    billValidatorDateRange,
    billValidatorTimePeriod,
  });

  // Debug: Log when billValidatorTimePeriod changes
  useEffect(() => {
    console.warn(
      '[DEBUG] billValidatorTimePeriod changed to:',
      billValidatorTimePeriod
    );
  }, [billValidatorTimePeriod]);

  useEffect(() => {
    async function loadData() {
      try {
        // Use the shared cabinet data - no duplicate API calls needed
        if (cabinet) {
          // Set the machine data - the cabinet itself is the machine data
          setMachine(cabinet as MachineDocument);

          // Extract collection history directly from cabinet data
          if (
            cabinet.collectionMetersHistory &&
            Array.isArray(cabinet.collectionMetersHistory)
          ) {
            // Collection history should show ALL historical data, not filtered by current time periods
            const collectionHistoryData = cabinet.collectionMetersHistory;

            // Transform the data to match the expected format and sort by timestamp
            const transformedHistory = collectionHistoryData
              .map((entry: Record<string, unknown>) => {
                const id = entry._id;
                const timestamp = entry.timestamp;

                // Handle MongoDB ObjectId format: { $oid: "STRING" }
                let entryId: string;
                if (id && typeof id === 'object' && '$oid' in id) {
                  entryId = (id as { $oid: string }).$oid;
                } else {
                  entryId = String(id || '');
                }

                let entryTimestamp: string | Date;
                if (
                  timestamp &&
                  typeof timestamp === 'object' &&
                  '$date' in timestamp
                ) {
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
                };
              })
              .sort((a, b) => {
                // Sort by timestamp in descending order (most recent first)
                const timestampA = new Date(a.timestamp).getTime();
                const timestampB = new Date(b.timestamp).getTime();
                return timestampB - timestampA;
              });

            setCollectionHistory(transformedHistory);

            // Don't automatically check for issues on every load - only when user requests it
            // This prevents performance issues when loading collection history
            setCollectionHistoryError(null);
          } else {
            setCollectionHistory([]);
            setCollectionHistoryError(null);
          }

          // Only fetch activity log data when Activity Log tab is active
          if (activeMetricsTabContent === 'Activity Log') {
            setActivityLogLoading(true);
            setActivityLogError(null);
            try {
              // Build query parameters for date filtering
              const params = new URLSearchParams();
              params.append('id', cabinet._id);

              // Add date range parameters if custom date range is selected
              if (activityLogTimePeriod === 'Custom' && activityLogDateRange) {
                params.append(
                  'startDate',
                  activityLogDateRange.from.toISOString()
                );
                params.append('endDate', activityLogDateRange.to.toISOString());
              } else if (
                activityLogTimePeriod &&
                activityLogTimePeriod !== 'All Time'
              ) {
                // Add time period parameter for predefined periods
                params.append('timePeriod', activityLogTimePeriod);
              }

              const eventsRes = await axios.get(
                `/api/machines/by-id/events?${params.toString()}`
              );
              const eventsData = eventsRes.data;
              setActivityLog(eventsData.events || []);
              setActivityLogError(null);
            } catch (error) {
              console.error('Failed to fetch machine events:', error);
              setActivityLog([]);
              setActivityLogError(
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch activity log'
              );
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
  }, [
    cabinet,
    activeMetricsTabContent,
    activityLogTimePeriod,
    activityLogDateRange,
  ]); // Depend on cabinet, activeMetricsTabContent, and filter states

  return (
    <motion.div
      className="mt-2 rounded-lg bg-container p-4 shadow-md shadow-purple-200 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="mb-4 text-xl font-semibold">Accounting Details</h2>

      <div className="mt-4 flex flex-col md:flex-row">
        <motion.aside
          className="mb-4 hidden w-48 flex-shrink-0 lg:mb-0 lg:mr-6 lg:block"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            'Metrics',
            'Live Metrics',
            'Bill Validator',
            'Activity Log',
            'Collection History',
            'Collection Settings',
            'Configurations',
          ].map((menuItem, idx) => (
            <motion.button
              key={menuItem}
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className={`block w-full px-4 py-2.5 text-left text-sm ${
                activeMetricsTabContent ===
                (menuItem === 'Metrics' ? 'Range Metrics' : menuItem)
                  ? 'bg-accent font-semibold text-buttonActive'
                  : 'text-grayHighlight hover:bg-muted'
              } ${
                idx === 4
                  ? 'md:rounded-b-md'
                  : 'border-b border-border md:border-b-0'
              }`}
              onClick={() =>
                setActiveMetricsTabContent(
                  menuItem === 'Metrics' ? 'Range Metrics' : menuItem
                )
              }
            >
              {menuItem}
            </motion.button>
          ))}
        </motion.aside>

        <div className="w-full flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
              key="meters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h3 className="mb-4 hidden text-center font-medium md:block md:text-left">
                {activeMetricsTabContent === 'Range Metrics'
                  ? 'Metrics'
                  : activeMetricsTabContent}
              </h3>
              <AnimatePresence mode="wait">
                {activeMetricsTabContent === 'Range Metrics' ? (
                  loading ? (
                    <MetricsSkeleton />
                  ) : (
                    <motion.div
                      key="range-metrics"
                      className="flex w-full max-w-full flex-wrap gap-3 md:gap-4"
                      style={{ rowGap: '1rem' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Money In */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">
                          Money In
                        </h4>
                        <div className="mb-4 h-1 w-full bg-orangeHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="max-w-full truncate break-words text-center text-base font-bold md:text-xl">
                            {shouldApplyCurrency
                              ? formatAmount(
                                  Number(
                                    cabinet?.moneyIn ??
                                      cabinet?.sasMeters?.drop ??
                                      0
                                  )
                                )
                              : formatCurrency(
                                  Number(
                                    cabinet?.moneyIn ??
                                      cabinet?.sasMeters?.drop ??
                                      0
                                  )
                                )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Total Cancelled Credits */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">
                          Total Cancelled Credits
                        </h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="max-w-full truncate break-words text-center text-base font-bold md:text-xl">
                            {shouldApplyCurrency
                              ? formatAmount(
                                  Number(
                                    cabinet?.moneyOut ??
                                      cabinet?.sasMeters
                                        ?.totalCancelledCredits ??
                                      0
                                  )
                                )
                              : formatCurrency(
                                  Number(
                                    cabinet?.moneyOut ??
                                      cabinet?.sasMeters
                                        ?.totalCancelledCredits ??
                                      0
                                  )
                                )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Gross */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">
                          Gross
                        </h4>
                        <div className="mb-4 h-1 w-full bg-pinkHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="max-w-full truncate break-words text-center text-base font-bold md:text-xl">
                            {shouldApplyCurrency
                              ? formatAmount(
                                  Number(
                                    cabinet?.gross ??
                                      Number(cabinet?.moneyIn ?? 0) -
                                        Number(cabinet?.moneyOut ?? 0)
                                  )
                                )
                              : formatCurrency(
                                  Number(
                                    cabinet?.gross ??
                                      Number(cabinet?.moneyIn ?? 0) -
                                        Number(cabinet?.moneyOut ?? 0)
                                  )
                                )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Jackpot */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">
                          Jackpot
                        </h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="max-w-full truncate break-words text-center text-base font-bold md:text-xl">
                            {formatCurrency(
                              Number(
                                cabinet?.jackpot ??
                                  cabinet?.sasMeters?.jackpot ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === 'Live Metrics' ? (
                  loading ? (
                    <LiveMetricsSkeleton />
                  ) : (
                    <motion.div
                      key="live-metrics"
                      className="grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Coin In */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">
                          Coin In
                        </h4>
                        <div className="mb-4 h-1 w-full bg-greenHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(
                              Number(
                                cabinet?.coinIn ??
                                  cabinet?.handle ??
                                  cabinet?.sasMeters?.coinIn ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Coin Out */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">
                          Coin Out
                        </h4>
                        <div className="mb-4 h-1 w-full bg-pinkHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(
                              Number(
                                cabinet?.coinOut ??
                                  cabinet?.sasMeters?.coinOut ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Total Hand Paid Cancelled Credits */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">
                          Total Hand Paid Cancelled Credits
                        </h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(
                              Number(
                                cabinet?.sasMeters
                                  ?.totalHandPaidCancelledCredits ??
                                  cabinet?.meterData?.movement
                                    ?.totalHandPaidCancelledCredits ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Current Credits */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">
                          Current Credits
                        </h4>
                        <div className="mb-4 h-1 w-full bg-orangeHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(
                              Number(
                                cabinet?.sasMeters?.currentCredits ??
                                  cabinet?.meterData?.movement
                                    ?.currentCredits ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Games Played */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">
                          Games Played
                        </h4>
                        <div className="mb-4 h-1 w-full bg-orangeHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {cabinet?.gamesPlayed ??
                              cabinet?.sasMeters?.gamesPlayed ??
                              0}
                          </p>
                        </div>
                      </motion.div>

                      {/* Games Won */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">
                          Games Won
                        </h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {cabinet?.gamesWon ??
                              cabinet?.sasMeters?.gamesWon ??
                              0}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === 'Bill Validator' ? (
                  <motion.div
                    key="bill-validator"
                    className="w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <UnifiedBillValidator
                      machineId={cabinet._id}
                      timePeriod={billValidatorTimePeriod}
                      onTimePeriodChange={(timePeriod: TimePeriod) => {
                        console.warn(
                          '[DEBUG] onTimePeriodChange called with:',
                          timePeriod
                        );
                        console.warn(
                          '[DEBUG] Current billValidatorTimePeriod:',
                          billValidatorTimePeriod
                        );
                        setBillValidatorTimePeriod(cabinet._id, timePeriod);
                        console.warn(
                          '[DEBUG] setBillValidatorTimePeriod called'
                        );
                      }}
                      gameDayOffset={cabinet.gameDayOffset}
                    />
                  </motion.div>
                ) : activeMetricsTabContent === 'Activity Log' ? (
                  <motion.div
                    key="activity-log"
                    className="w-full rounded-lg bg-container p-6 shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Activity Log Date Filter - Always show */}
                    <div className="mb-6">
                      <ActivityLogDateFilter
                        onDateRangeChange={setActivityLogDateRange}
                        onTimePeriodChange={(timePeriod: ApiTimePeriod) =>
                          setActivityLogTimePeriod(timePeriod)
                        }
                        disabled={activityLogLoading}
                      />
                    </div>

                    {/* Activity Log Content */}
                    {activityLogLoading ? (
                      <ActivityLogSkeleton />
                    ) : activityLogError ? (
                      <div className="flex h-48 w-full flex-col items-center justify-center">
                        <p className="mb-2 text-center text-red-500">
                          Failed to load activity log
                        </p>
                        <p className="text-center text-sm text-grayHighlight">
                          {activityLogError}
                        </p>
                      </div>
                    ) : activityLog.length > 0 ? (
                      <ActivityLogTable data={activityLog as MachineEvent[]} />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center">
                        <p className="text-center text-grayHighlight">
                          No activity log data found for this machine.
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : activeMetricsTabContent === 'Collection History' ? (
                  loading ? (
                    <CollectionHistorySkeleton />
                  ) : collectionHistoryError ? (
                    <motion.div
                      key="collection-history-error"
                      className="flex h-48 w-full flex-col items-center justify-center rounded-lg bg-container p-6 shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="mb-2 text-center text-red-500">
                        Failed to load collection history
                      </p>
                      <p className="text-center text-sm text-grayHighlight">
                        {collectionHistoryError}
                      </p>
                    </motion.div>
                  ) : collectionHistory.length > 0 ? (
                    <motion.div
                      key="collection-history"
                      className="w-full rounded-lg bg-container p-6 shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <CollectionHistoryTable
                        data={collectionHistory}
                        machineId={cabinet._id}
                        onFixHistory={() => handleFixCollectionHistory(false)}
                        isFixing={isFixingCollectionHistory}
                        hasIssues={hasCollectionHistoryIssues}
                        isCheckingIssues={isCheckingIssues}
                        issuesMap={collectionHistoryIssues}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="collection-history-empty"
                      className="flex h-48 w-full items-center justify-center rounded-lg bg-container p-6 shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="text-center text-grayHighlight">
                        No collection history data found for this machine.
                      </p>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === 'Collection Settings' ? (
                  <motion.div
                    key="collection-settings"
                    className="w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <CollectionSettingsContent cabinet={cabinet} />
                  </motion.div>
                ) : activeMetricsTabContent === 'Configurations' ? (
                  loading ? (
                    <ConfigurationsSkeleton />
                  ) : (
                    <motion.div
                      key="configurations"
                      className="flex w-full flex-col flex-wrap items-center gap-4 sm:flex-row sm:items-stretch sm:justify-start"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Accounting Denomination */}
                      {machine?.gameConfig?.accountingDenomination !==
                        undefined && (
                        <div className="flex w-64 max-w-full flex-col overflow-hidden rounded-lg shadow">
                          <div className="flex items-center justify-center bg-blue-500 p-3">
                            <span className="w-full text-center text-base font-semibold text-white">
                              Accounting Denomination
                            </span>
                          </div>
                          <div className="flex items-center justify-center bg-white p-4">
                            <span className="text-base font-medium text-gray-800">
                              $
                              {machine.gameConfig.accountingDenomination?.toFixed(
                                2
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Theoretical RTP */}
                      {machine?.gameConfig?.accountingDenomination !==
                        undefined &&
                        machine?.gameConfig?.theoreticalRtp !== undefined && (
                          <div className="flex w-64 max-w-full flex-col overflow-hidden rounded-lg shadow">
                            <div className="flex items-center justify-center bg-green-400 p-3">
                              <span className="w-full text-center text-base font-semibold text-white">
                                Theoretical RTP
                              </span>
                            </div>
                            <div className="flex items-center justify-center bg-white p-4">
                              <span className="text-base font-medium text-gray-800">
                                {machine.gameConfig.theoreticalRtp}%
                              </span>
                            </div>
                          </div>
                        )}
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key={activeMetricsTabContent}
                    className="flex h-48 items-center justify-center rounded-lg bg-container p-6 shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-grayHighlight">
                      No content available for {activeMetricsTabContent}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AccountingDetails;
