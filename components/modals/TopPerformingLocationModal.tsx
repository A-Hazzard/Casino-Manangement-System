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
import Chart from '@/components/ui/dashboard/Chart';
import { DashboardChartSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getMetrics } from '@/lib/helpers/metrics';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { dashboardData } from '@/lib/types';
import { formatCurrencyWithCode } from '@/lib/utils/currency';
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
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'minute'
  );
  const router = useRouter();
  const { displayCurrency } = useCurrency();
  const { activePieChartFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();

  // Show granularity selector for Today/Yesterday/Custom
  const showGranularitySelector = useMemo(() => {
    const timePeriod = (activePieChartFilter || 'Today') as TimePeriod;
    return (
      timePeriod === 'Today' ||
      timePeriod === 'Yesterday' ||
      timePeriod === 'Custom'
    );
  }, [activePieChartFilter]);

  // Fetch location data and chart data
  useEffect(() => {
    if (!open || !locationId) return;

    const fetchData = async () => {
      setLoading(true);
      setLoadingChart(true);

      try {
        // Use activePieChartFilter (from top performing filter) instead of activeMetricsFilter
        const timePeriod = (activePieChartFilter || 'Today') as TimePeriod;

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

        // Get location name for filtering chart data
        const locationNameForFilter =
          locationInfo?.locationName || locationInfo?.name || locationName;

        // Fetch chart data for this location
        // Filter by location ID or name in the metrics
        const chart = await getMetrics(
          timePeriod,
          customDateRange.startDate,
          customDateRange.endDate,
          selectedLicencee && selectedLicencee !== 'all'
            ? selectedLicencee
            : undefined,
          displayCurrency,
          undefined,
          chartGranularity === 'minute' ? 'minute' : 'hourly'
        );

        // Filter chart data to only include this location
        // The location field in chart data can be either ID or name
        const filteredChart = chart.filter(item => {
          const itemLocation = item.location;
          return (
            itemLocation === locationId ||
            itemLocation === locationInfo?._id?.toString() ||
            itemLocation === locationInfo?.locationId?.toString() ||
            itemLocation === locationNameForFilter ||
            itemLocation === locationInfo?.name
          );
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
    activePieChartFilter,
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
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
                <Chart
                  loadingChartData={loadingChart}
                  chartData={chartData}
                  activeMetricsFilter={
                    (activePieChartFilter || 'Today') as TimePeriod
                  }
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
