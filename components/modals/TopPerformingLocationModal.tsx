/**
 * Top Performing Location Preview Modal
 *
 * Displays a preview of a top performing location with:
 * - Location information (name, address)
 * - Performance metrics overview
 * - Chart visualization
 * - Navigation button to view location details
 *
 * Features:
 * - Modal overlay with backdrop
 * - Location details display
 * - Performance metrics cards
 * - Chart visualization (similar to dashboard)
 * - Navigation to location details
 * - Uses gaming day offset logic for date calculations
 */

'use client';

import { Button } from '@/components/ui/button';
import DashboardChart from '@/components/dashboard/DashboardChart';
import { DashboardChartSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { dashboardData } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { formatCurrencyWithCode } from '@/lib/utils/currency';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';
import { TimePeriod } from '@/shared/types/common';
import axios from 'axios';
import gsap from 'gsap';
import { ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type TopPerformingLocationModalProps = {
  open: boolean;
  locationId: string;
  locationName: string;
  onClose: () => void;
  onNavigate: () => void;
};

type LocationMetricsData = {
  _id: string;
  name: string;
  address?: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines?: number;
  onlineMachines?: number;
};

export default function TopPerformingLocationModal({
  open,
  locationId,
  locationName,
  onClose,
  onNavigate,
}: TopPerformingLocationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [locationData, setLocationData] = useState<LocationMetricsData | null>(
    null
  );
  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const router = useRouter();
  const { displayCurrency } = useCurrency();
  const {
    activePieChartFilter,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
  } = useDashBoardStore();

  // Use activeMetricsFilter if available (from location detail page), otherwise fall back to activePieChartFilter (from dashboard)
  const effectiveTimePeriod =
    activeMetricsFilter || activePieChartFilter || 'Today';

  // Chart granularity state - initialize after store values are available
  const [chartGranularity, setChartGranularity] = useState<
    'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  >('hourly');

  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
  // Never show for 7d and 30d - they always use daily format
  const showGranularitySelector = useMemo(() => {
    const timePeriod = effectiveTimePeriod as TimePeriod;
    
    // Never show granularity selector for 7d and 30d
    if (timePeriod === '7d' || timePeriod === '30d') {
      return false;
    }
    
    if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
      return true;
    }
    if (
      timePeriod === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      // Check if spans more than 1 gaming day
      try {
        const range = getGamingDayRangeForPeriod(
          'Custom',
          8, // Default gaming day start hour
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate),
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate)
        );
        const hoursDiff =
          (range.rangeEnd.getTime() - range.rangeStart.getTime()) /
          (1000 * 60 * 60);
        return hoursDiff <= 24; // Show toggle only if ≤ 24 hours
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [effectiveTimePeriod, customDateRange]);

  // Recalculate default granularity when date filters change
  // For "Today", also recalculate periodically as time passes
  // For 7d and 30d, always use 'hourly' (which displays as daily format in Chart component)
  useEffect(() => {
    const timePeriod = effectiveTimePeriod as TimePeriod;
    
    // Force 'hourly' for 7d and 30d (Chart component will display as daily format)
    if (
      timePeriod === '7d' ||
      timePeriod === '30d' ||
      timePeriod === 'last7days' ||
      timePeriod === 'last30days'
    ) {
      setChartGranularity('hourly');
      return;
    }
    
    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        timePeriod,
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    // Update immediately
    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
    // This ensures granularity switches from 'minute' to 'hourly' when 5 hours pass
    if (timePeriod === 'Today') {
      const interval = setInterval(updateGranularity, 60000); // Every minute
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    effectiveTimePeriod,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // Fetch location data and chart data
  useEffect(() => {
    if (!open || !locationId) return;

    const fetchData = async () => {
      setLoading(true);
      setLoadingChart(true);

      try {
        // Use effectiveTimePeriod which prioritizes activeMetricsFilter (from location detail page) over activePieChartFilter (from dashboard)
        const timePeriod = effectiveTimePeriod as TimePeriod;

        // Fetch location details and metrics
        let url = `/api/locations/${locationId}`;
        if (timePeriod) {
          url += `?timePeriod=${timePeriod}`;
        }
        if (
          timePeriod === 'Custom' &&
          customDateRange.startDate &&
          customDateRange.endDate
        ) {
          const sd =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate);
          const ed =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate);
          url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
        }
        if (displayCurrency) {
          url += `&currency=${displayCurrency}`;
        }

        // Fetch location details for basic info
        const locationResponse = await axios.get(url);
        const locationResponseData = locationResponse.data?.data;
        const locationInfo = Array.isArray(locationResponseData)
          ? locationResponseData[0]
          : locationResponseData;

        // Fetch location-level totals from the reports/locations API (same as locations page)
        // This ensures we get the same calculation logic as the locations page
        let locationTotalsUrl = `/api/reports/locations?timePeriod=${timePeriod}&search=${locationId}&showAllLocations=true&limit=1`;
        if (
          timePeriod === 'Custom' &&
          customDateRange.startDate &&
          customDateRange.endDate
        ) {
          const sd =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate);
          const ed =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate);
          locationTotalsUrl += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
        }
        if (selectedLicencee && selectedLicencee !== 'all') {
          locationTotalsUrl += `&licencee=${selectedLicencee}`;
        }
        if (displayCurrency) {
          locationTotalsUrl += `&currency=${displayCurrency}`;
        }

        const locationTotalsResponse = await axios.get(locationTotalsUrl);
        const locationTotalsData = locationTotalsResponse.data?.data || [];
        const locationTotals =
          Array.isArray(locationTotalsData) && locationTotalsData.length > 0
            ? locationTotalsData[0]
            : null;

        // Fetch chart data using the same endpoint as location details page
        // This ensures consistency between preview modal and details page
        // For 7d and 30d, don't pass granularity (API will return daily data)
        // For other periods, use the selected granularity
        const shouldPassGranularity =
          timePeriod !== '7d' &&
          timePeriod !== '30d' &&
          timePeriod !== 'last7days' &&
          timePeriod !== 'last30days';
        const granularity = shouldPassGranularity
          ? chartGranularity
          : undefined;

        // Use location-trends API (same as location details page) for consistency
        let chartUrl = `/api/analytics/location-trends?locationIds=${locationId}&timePeriod=${timePeriod}`;

        if (
          timePeriod === 'Custom' &&
          customDateRange.startDate &&
          customDateRange.endDate
        ) {
          const sd =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate);
          const ed =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate);

          // Check if dates have time components (not midnight)
          const hasTime =
            sd.getHours() !== 0 ||
            sd.getMinutes() !== 0 ||
            sd.getSeconds() !== 0 ||
            ed.getHours() !== 0 ||
            ed.getMinutes() !== 0 ||
            ed.getSeconds() !== 0;

          if (hasTime) {
            // Send local time with timezone offset to preserve user's time selection
            chartUrl += `&startDate=${formatLocalDateTimeString(sd, -4)}&endDate=${formatLocalDateTimeString(ed, -4)}`;
          } else {
            // Date-only: send ISO date format for gaming day offset to apply
            chartUrl += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
          }
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          chartUrl += `&licencee=${encodeURIComponent(selectedLicencee)}`;
        }

        if (displayCurrency) {
          chartUrl += `&currency=${displayCurrency}`;
        }

        if (granularity) {
          chartUrl += `&granularity=${granularity}`;
        }

        const chartResponse = await axios.get<{
          trends: Array<{
            day: string;
            time?: string;
            [key: string]:
              | {
                  drop: number;
                  gross: number;
                  totalCancelledCredits?: number;
                }
              | string
              | undefined;
          }>;
          isHourly: boolean;
        }>(chartUrl, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        const { trends, isHourly } = chartResponse.data;

        // Check if API response contains minute-level data
        const hasMinuteLevelData = trends.some(trend => {
          if (!trend.time) return false;
          const timeParts = trend.time.split(':');
          if (timeParts.length !== 2) return false;
          const minutes = parseInt(timeParts[1], 10);
          return !isNaN(minutes) && minutes !== 0;
        });

        // Determine if we should use minute or hourly based on API response and granularity
        let useMinute = false;
        let useHourly = false;

        if (granularity) {
          if (granularity === 'minute') {
            useMinute = true;
            useHourly = false;
          } else if (granularity === 'hourly') {
            useMinute = false;
            useHourly = true;
          }
        } else {
          // Auto-detect based on API response
          useMinute = hasMinuteLevelData;
          useHourly = isHourly && !hasMinuteLevelData;
        }

        // Transform trends to dashboardData format (same as location details page)
        const filteredChart: dashboardData[] = trends.map(trend => {
          // Find location data - try exact match first, then try string comparison
          // This handles ObjectId vs string differences
          let locationData:
            | {
                drop: number;
                gross: number;
                totalCancelledCredits?: number;
              }
            | undefined;

          // First try direct access
          if (trend[locationId]) {
            locationData = trend[locationId] as {
              drop: number;
              gross: number;
              totalCancelledCredits?: number;
            };
          } else {
            // Try to find by string comparison (handles ObjectId vs string differences)
            const locationKey = Object.keys(trend).find(
              key =>
                key !== 'day' &&
                key !== 'time' &&
                String(key) === String(locationId)
            );
            if (locationKey) {
              locationData = trend[locationKey] as {
                drop: number;
                gross: number;
                totalCancelledCredits?: number;
              };
            }
          }

          if (!locationData) {
            // Return empty data point if location not found in trend
            return {
              xValue: useHourly || useMinute ? (trend.time || '') : trend.day,
              day: trend.day,
              time: trend.time || '',
              moneyIn: 0,
              moneyOut: 0,
              gross: 0,
              location: locationId,
            };
          }

          const day = trend.day;
          let time = '';

          if (trend.time) {
            if (useHourly) {
              const [hh] = trend.time.split(':');
              time = `${hh.padStart(2, '0')}:00`;
            } else if (useMinute) {
              time = trend.time;
            } else {
              time = trend.time || '';
            }
          }

          const xValue = useHourly || useMinute ? time : day;

          return {
            xValue,
            day,
            time,
            moneyIn: locationData.drop || 0,
            moneyOut: locationData.totalCancelledCredits || 0,
            gross: locationData.gross || 0,
            location: locationId,
          };
        });

        // Use location totals from reports API if available, otherwise calculate from chart data
        const moneyIn =
          locationTotals?.moneyIn ??
          filteredChart.reduce((sum, item) => sum + (item.moneyIn || 0), 0);
        const moneyOut =
          locationTotals?.moneyOut ??
          filteredChart.reduce((sum, item) => sum + (item.moneyOut || 0), 0);
        const gross =
          locationTotals?.gross ??
          filteredChart.reduce((sum, item) => sum + (item.gross || 0), 0);

        // Get location info from first cabinet if available, or use basic info
        const cabinets = Array.isArray(locationResponseData)
          ? locationResponseData
          : [];
        const totalMachines = locationTotals?.totalMachines ?? cabinets.length;
        const onlineMachines =
          locationTotals?.onlineMachines ??
          cabinets.filter((cab: { online?: boolean }) => cab.online).length;

        setLocationData({
          _id: locationInfo?._id || locationInfo?.locationId || locationId,
          name:
            locationInfo?.locationName || locationInfo?.name || locationName,
          address: locationInfo?.address,
          moneyIn,
          moneyOut,
          gross,
          totalMachines,
          onlineMachines,
        });

        // Use filtered data
        setChartData(filteredChart);
      } catch (error) {
        console.error('Error fetching location data:', error);
      } finally {
        setLoading(false);
        setLoadingChart(false);
      }
    };

    fetchData();
  }, [
    open,
    locationId,
    effectiveTimePeriod,
    customDateRange.startDate,
    customDateRange.endDate,
    displayCurrency,
    selectedLicencee,
    locationName,
    chartGranularity,
  ]);

  // Animate modal on open/close
  useEffect(() => {
    if (!open) return;

    const modal = modalRef.current;
    const backdrop = backdropRef.current;

    if (modal && backdrop) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }

    return () => {
      if (modal && backdrop) {
        gsap.to(backdrop, { opacity: 0, duration: 0.2 });
        gsap.to(modal, {
          opacity: 0,
          scale: 0.9,
          y: 20,
          duration: 0.2,
          onComplete: () => {
            setLocationData(null);
            setChartData([]);
          },
        });
      }
    };
  }, [open, modalRef, backdropRef]);

  if (!open) return null;

  const handleNavigate = () => {
    // Navigate to location details page
    if (locationId) {
      router.push(`/locations/${locationId}`);
    }
    onNavigate();
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Location Preview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {locationData?.name || locationName}
            </p>
            {locationData?.address && (
              <p className="mt-1 text-sm text-gray-500">
                Address: {locationData.address}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Performance Metrics */}
          {loading ? (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : locationData ? (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Money In</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(
                    locationData.moneyIn,
                    displayCurrency
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Money Out</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(
                    locationData.moneyOut,
                    displayCurrency
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Gross</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(locationData.gross, displayCurrency)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Chart */}
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Performance Chart
            </h3>
            {loadingChart ? (
              <DashboardChartSkeleton />
            ) : (
              <>
                {/* Granularity Selector - Only show for Today/Yesterday/Custom */}
                {showGranularitySelector && (
                  <div className="mb-3 flex items-center justify-end gap-2">
                    <label
                      htmlFor="chart-granularity-location-modal"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Granularity:
                    </label>
                    <select
                      id="chart-granularity-location-modal"
                      value={chartGranularity}
                      onChange={e =>
                        setChartGranularity(
                          e.target.value as 'hourly' | 'minute'
                        )
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="minute">Minute</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                )}
                <DashboardChart
                  loadingChartData={loadingChart}
                  chartData={chartData}
                  activeMetricsFilter={effectiveTimePeriod as TimePeriod}
                />
              </>
            )}
          </div>

          {/* Additional Metrics */}
          {loading ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : locationData ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-2">
              {locationData.totalMachines !== undefined && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Total Machines
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {locationData.totalMachines}
                  </p>
                </div>
              )}
              {locationData.onlineMachines !== undefined && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Online Machines
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {locationData.onlineMachines}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Navigation Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleNavigate}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
