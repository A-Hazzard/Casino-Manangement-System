/**
 * Time Filter Buttons Component
 * Filter buttons for selecting time periods with loading states and throttling.
 *
 * Features:
 * - Time period filter buttons (Today, Yesterday, Last 7 days, 30 days, Custom)
 * - Active filter highlighting
 * - Loading states with spinner
 * - Throttling to prevent rapid filter changes
 * - Disabled state during loading
 * - Framer Motion animations
 *
 * @param activeMetricsFilter - Currently active time period filter
 * @param metricsLoading - Whether metrics data is loading
 * @param isFilterChangeInProgress - Whether filter change is in progress
 * @param lastFilterChangeTimeRef - Ref to track last filter change time
 * @param setIsFilterChangeInProgress - Callback to set filter change progress state
 * @param setActiveMetricsFilter - Callback to change active filter
 */
'use client';

import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store/userStore';
import { TimePeriod } from '@/lib/types/api';
import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

// ============================================================================
// Types & Constants
// ============================================================================

type ExtendedTimeFilterButtonsProps = {
  activeMetricsFilter: TimePeriod;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  lastFilterChangeTimeRef: React.RefObject<number>;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: TimePeriod) => void;
};

const BASE_FILTER_OPTIONS = [
  { label: 'Today', value: 'Today' as TimePeriod },
  { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
  { label: 'Last 7 days', value: '7d' as TimePeriod },
  { label: '30 days', value: '30d' as TimePeriod },
  { label: 'Custom', value: 'Custom' as TimePeriod },
];

export default function TimeFilterButtons({
  activeMetricsFilter,
  metricsLoading,
  isFilterChangeInProgress,
  lastFilterChangeTimeRef,
  setIsFilterChangeInProgress,
  setActiveMetricsFilter,
}: ExtendedTimeFilterButtonsProps) {
  // Check if any loading state is active
  const isLoading = metricsLoading || isFilterChangeInProgress;
  const user = useUserStore(state => state.user);
  const isDeveloper = (user?.roles || []).includes('developer');

  // Filter out "30 days" if user is not a developer
  const filterOptions = useMemo(() => {
    if (!isDeveloper) {
      return BASE_FILTER_OPTIONS.filter(option => option.value !== '30d');
    }
    return BASE_FILTER_OPTIONS;
  }, [isDeveloper]);

  return (
    <motion.div
      className="no-scrollbar mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex space-x-3">
        {filterOptions.map(filter => (
          <motion.div
            key={filter.label}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
          >
            <Button
              className={`whitespace-nowrap rounded-full px-4 py-2 ${
                activeMetricsFilter === filter.value
                  ? 'bg-buttonActive text-white'
                  : 'bg-button text-white hover:bg-buttonActive'
              } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => {
                // Prevent changing filter if already loading
                if (isLoading) {
                  return;
                }

                // Prevent clicking on already active filter
                if (activeMetricsFilter === filter.value) {
                  return;
                }

                // Throttle filter changes
                const now = Date.now();
                if (now - lastFilterChangeTimeRef.current < 1000) {
                  return;
                }

                lastFilterChangeTimeRef.current = now;
                setIsFilterChangeInProgress(true);
                setActiveMetricsFilter(filter.value);
              }}
              disabled={isLoading}
            >
              {metricsLoading && activeMetricsFilter === filter.value ? (
                <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              ) : null}
              {filter.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
