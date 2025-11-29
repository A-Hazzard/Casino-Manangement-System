/**
 * Top Performing Machine Preview Modal
 *
 * Displays a preview of a top performing machine with:
 * - Machine information (name, game, location)
 * - Performance metrics overview
 * - Chart visualization
 * - Navigation button to view machine details
 *
 * Features:
 * - Modal overlay with backdrop
 * - Machine details display
 * - Performance metrics cards
 * - Chart visualization (similar to dashboard)
 * - Navigation to machine location
 */

'use client';

import { Button } from '@/components/ui/button';
import Chart from '@/components/ui/dashboard/Chart';
import { DashboardChartSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getMachineChartData, getMachineMetrics, type MachineMetricsData } from '@/lib/helpers/machineChart';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { dashboardData } from '@/lib/types';
import { formatCurrencyWithCode } from '@/lib/utils/currency';
import { formatMachineDisplayName } from '@/lib/utils/machineDisplay';
import { TimePeriod } from '@/shared/types/common';
import gsap from 'gsap';
import { ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type TopPerformingMachineModalProps = {
  open: boolean;
  machineId: string;
  machineName: string;
  game?: string;
  locationName?: string;
  locationId?: string;
  onClose: () => void;
  onNavigate: () => void;
};

export default function TopPerformingMachineModal({
  open,
  machineId,
  machineName,
  game,
  locationName,
  onClose,
  onNavigate,
}: TopPerformingMachineModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [machineData, setMachineData] = useState<MachineMetricsData | null>(null);
  const [chartData, setChartData] = useState<dashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const router = useRouter();
  const { displayCurrency } = useCurrency();
  const { activePieChartFilter, customDateRange } = useDashBoardStore();

  // Fetch machine data and chart data
  useEffect(() => {
    if (!open || !machineId) return;

    const startDate = customDateRange?.startDate;
    const endDate = customDateRange?.endDate;

    const fetchData = async () => {
      setLoading(true);
      setLoadingChart(true);

      try {
        // Use activePieChartFilter (from top performing filter) instead of activeMetricsFilter
        const timePeriod = (activePieChartFilter || 'Today') as TimePeriod;
        
        // Fetch machine metrics and chart data in parallel
        const [metrics, chart] = await Promise.all([
          getMachineMetrics(
            machineId,
            timePeriod,
            startDate,
            endDate,
            displayCurrency
          ),
          getMachineChartData(
            machineId,
            timePeriod,
            startDate,
            endDate,
            displayCurrency
          ),
        ]);

        setMachineData(metrics);
        setChartData(chart);
      } catch (error) {
        console.error('Error fetching machine data:', error);
      } finally {
        setLoading(false);
        setLoadingChart(false);
      }
    };

    fetchData();
  }, [open, machineId, activePieChartFilter, customDateRange, displayCurrency]);

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
            setMachineData(null);
            setChartData([]);
          },
        });
      }
    };
  }, [open, modalRef, backdropRef]);

  if (!open) return null;

  const formattedMachineName = formatMachineDisplayName({
    serialNumber: machineName,
    game: game || machineData?.game,
    custom: { name: machineName },
  });

  const handleNavigate = () => {
    // Navigate to machine details page
    if (machineId) {
      router.push(`/cabinets/${machineId}`);
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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl"
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Machine Preview</h2>
            <p className="mt-1 text-sm text-gray-500">
              {formattedMachineName}
            </p>
            {locationName && (
              <p className="mt-1 text-sm text-gray-500">Location: {locationName}</p>
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
          ) : machineData ? (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Money In</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(machineData.moneyIn, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Money Out</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(machineData.moneyOut, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600">Gross</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrencyWithCode(machineData.gross, displayCurrency)}
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
              <Chart
                loadingChartData={loadingChart}
                chartData={chartData}
                activeMetricsFilter={(activePieChartFilter || 'Today') as TimePeriod}
              />
            )}
          </div>

          {/* Additional Metrics */}
          {loading ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : machineData ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Games Played</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {machineData.gamesPlayed.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Jackpot</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrencyWithCode(machineData.jackpot, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Coin In</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrencyWithCode(machineData.coinIn, displayCurrency)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-600">Coin Out</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrencyWithCode(machineData.coinOut, displayCurrency)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Navigation Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleNavigate} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View Machine
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

