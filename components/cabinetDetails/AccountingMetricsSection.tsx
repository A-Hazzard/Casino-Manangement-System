/**
 * Accounting Metrics Section Component
 * Section component for displaying financial metrics with time period filtering.
 *
 * Features:
 * - Financial metrics display (money in, money out, gross, jackpot, cancelled credits)
 * - Time period filtering (Today, Yesterday, 7d, 30d, All Time, Custom)
 * - Custom date range picker
 * - Currency formatting
 * - Loading skeleton states
 * - Framer Motion animations
 * - Responsive grid layout
 *
 * @param cabinetDetails - Cabinet object with financial data
 * @param loading - Whether data is loading
 * @param onTimePeriodChange - Callback when time period changes
 * @param onCustomDateRangeChange - Callback when custom date range changes
 */
'use client';

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
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { formatCurrency } from '@/lib/utils';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'All Time' | 'Custom';

type AccountingMetricsSectionProps = {
  cabinetDetails: Cabinet | null;
  loading: boolean;
  onTimePeriodChange: (period: TimePeriod) => void;
  onCustomDateRangeChange: (startDate: string, endDate: string) => void;
};

// Skeleton loader for metrics
const MetricsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded-lg border bg-white p-4">
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
          <div className="h-8 w-1/2 rounded bg-gray-200"></div>
        </div>
      </div>
    ))}
  </div>
);

export const AccountingMetricsSection = ({
  cabinetDetails,
  loading,
  onTimePeriodChange,
  onCustomDateRangeChange,
}: AccountingMetricsSectionProps) => {
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();
  const user = useUserStore(state => state.user);
  const isDeveloper = (user?.roles || []).includes('developer');

  // State management
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<TimePeriod>('Today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);

  // Handle time period change
  const handleTimePeriodChange = (period: TimePeriod) => {
    setSelectedTimePeriod(period);

    if (period === 'Custom') {
      setShowCustomDateInputs(true);
    } else {
      setShowCustomDateInputs(false);
      onTimePeriodChange(period);
    }
  };

  // Handle custom date range submission
  const handleCustomDateSubmit = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    onCustomDateRangeChange(customStartDate, customEndDate);
    setShowCustomDateInputs(false);
    toast.success('Custom date range applied');
  };

  // Calculate financial metrics
  const calculateFinancialMetrics = () => {
    if (!cabinetDetails) return null;

    const moneyIn = cabinetDetails.moneyIn || 0;
    const moneyOut = cabinetDetails.moneyOut || 0;
    const jackpot = cabinetDetails.jackpot || 0;
    const cancelledCredits = cabinetDetails.cancelledCredits || 0;
    const gross = cabinetDetails.gross || 0;
    const handle = cabinetDetails.handle || 0;

    return {
      moneyIn,
      moneyOut,
      jackpot,
      cancelledCredits,
      gross,
      handle,
      netWin: gross - jackpot,
      winPercentage: handle > 0 ? ((gross - jackpot) / handle) * 100 : 0,
    };
  };

  const financialMetrics = calculateFinancialMetrics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Financial Metrics
          </h2>
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200"></div>
        </div>
        <MetricsSkeleton />
      </div>
    );
  }

  if (!financialMetrics) {
    return (
      <div className="py-8 text-center">
        <div className="text-lg text-gray-500">No financial data available</div>
        <div className="text-sm text-gray-400">
          Unable to load financial metrics for this cabinet
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Header with Time Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Financial Metrics
        </h2>

        <div className="flex items-center gap-4">
          <Select
            value={selectedTimePeriod}
            onValueChange={handleTimePeriodChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              {isDeveloper && <SelectItem value="30d">Last 30 days</SelectItem>}
              <SelectItem value="All Time">All Time</SelectItem>
              <SelectItem value="Custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {showCustomDateInputs && (
        <motion.div
          className="space-y-4 rounded-lg bg-gray-50 p-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={customStartDate}
                onChange={event => {
                  setCustomStartDate(event.target.value);
                }}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={customEndDate}
                onChange={event => {
                  setCustomEndDate(event.target.value);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCustomDateSubmit} size="sm">
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomDateInputs(false);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Money In Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Money In</p>
              <p
                className={`text-2xl font-bold ${getMoneyInColorClass(financialMetrics.moneyIn)}`}
              >
                {shouldShowCurrency()
                  ? formatAmount(financialMetrics.moneyIn)
                  : formatCurrency(financialMetrics.moneyIn)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <span className="font-bold text-green-600">$</span>
            </div>
          </div>
        </div>

        {/* Money Out Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Money Out</p>
              <p
                className={`text-2xl font-bold ${getMoneyOutColorClass(financialMetrics.moneyOut, financialMetrics.moneyIn)}`}
              >
                {shouldShowCurrency()
                  ? formatAmount(financialMetrics.moneyOut)
                  : formatCurrency(financialMetrics.moneyOut)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <span className="font-bold text-red-600">$</span>
            </div>
          </div>
        </div>

        {/* Net Win Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Win</p>
              <p
                className={`text-2xl font-bold ${getGrossColorClass(financialMetrics.netWin)}`}
              >
                {shouldShowCurrency()
                  ? formatAmount(financialMetrics.netWin)
                  : formatCurrency(financialMetrics.netWin)}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                financialMetrics.netWin >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <span
                className={`font-bold ${
                  financialMetrics.netWin >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {financialMetrics.netWin >= 0 ? '+' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Handle Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Handle</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(financialMetrics.handle)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <span className="font-bold text-blue-600">H</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Jackpot Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Jackpot</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(financialMetrics.jackpot)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <span className="font-bold text-purple-600">J</span>
            </div>
          </div>
        </div>

        {/* Cancelled Credits Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Cancelled Credits
              </p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(financialMetrics.cancelledCredits)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <span className="font-bold text-orange-600">C</span>
            </div>
          </div>
        </div>

        {/* Win Percentage Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Win Percentage
              </p>
              <p className="text-xl font-bold text-indigo-600">
                {financialMetrics.winPercentage.toFixed(2)}%
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <span className="font-bold text-indigo-600">%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
