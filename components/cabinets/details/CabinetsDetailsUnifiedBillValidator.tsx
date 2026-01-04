/**
 * Cabinets Details Unified Bill Validator Component
 * Component for displaying bill validator data with time period filtering.
 *
 * Features:
 * - Bill validator data display (v1 and v2 support)
 * - Denomination breakdown
 * - Time period filtering (Today, Yesterday, 7d, 30d, All Time, Custom)
 * - Custom date range picker
 * - Currency formatting
 */

import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import { Button } from '@/components/ui/button';
import { type DateRange } from '@/components/ui/dateRangePicker';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useCabinetUIStore } from '@/lib/store/cabinetUIStore';
import { formatCurrency } from '@/lib/utils';
import { isAbortError } from '@/lib/utils/errorHandling';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

type BillValidatorData = {
  version: 'v1' | 'v2' | 'none';
  denominations: Array<{
    denomination: number;
    label: string;
    quantity: number;
    subtotal: number;
  }>;
  totalAmount: number;
  totalQuantity: number;
  unknownBills: number;
  currentBalance: number;
  totalKnownAmount?: number;
  totalUnknownAmount?: number;
};

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'All Time' | 'Custom';

type CabinetsDetailsUnifiedBillValidatorProps = {
  machineId: string;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  gameDayOffset?: number;
};

const CabinetsDetailsUnifiedBillValidator: React.FC<
  CabinetsDetailsUnifiedBillValidatorProps
> = ({ machineId, timePeriod, onTimePeriodChange, gameDayOffset = 0 }) => {
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();

  const { getBillValidatorState, setBillValidatorDateRange } =
    useCabinetUIStore();
  const billValidatorState = getBillValidatorState(machineId);

  const [data, setData] = useState<BillValidatorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customDateRange, setCustomDateRangeLocal] = useState<
    DateRange | undefined
  >(billValidatorState.customDateRange);
  const [pendingCustomDateRange, setPendingCustomDateRange] = useState<
    DateRange | undefined
  >(undefined);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const makeBillValidatorRequest = useAbortableRequest();
  const customDateRangeRef = useRef(customDateRange);

  useEffect(() => {
    customDateRangeRef.current = customDateRange;
  }, [customDateRange]);

  const setCustomDateRange = useCallback(
    (dateRange: DateRange | undefined) => {
      setCustomDateRangeLocal(dateRange);
      if (dateRange?.from && dateRange?.to) {
        setBillValidatorDateRange(machineId, {
          from: dateRange.from,
          to: dateRange.to,
        });
      } else {
        setBillValidatorDateRange(machineId, undefined);
      }
    },
    [machineId, setBillValidatorDateRange]
  );

  const timeFrames = [
    { time: 'Today', value: 'Today' as TimePeriod },
    { time: 'Yesterday', value: 'Yesterday' as TimePeriod },
    { time: '7d', value: '7d' as TimePeriod },
    { time: '30d', value: '30d' as TimePeriod },
    { time: 'All Time', value: 'All Time' as TimePeriod },
    { time: 'Custom', value: 'Custom' as TimePeriod },
  ];

  const fetchBillValidatorData = useCallback(async () => {
    if (!machineId) return;

    setLoading(true);
    const result = await makeBillValidatorRequest(async signal => {
      const params = new URLSearchParams();
      params.append('timePeriod', timePeriod);

      const currentDateRange = customDateRangeRef.current;
      if (
        timePeriod === 'Custom' &&
        currentDateRange?.from &&
        currentDateRange?.to
      ) {
        params.append('startDate', currentDateRange.from.toISOString());
        params.append('endDate', currentDateRange.to.toISOString());
      }

      try {
        const response = await axios.get(
          `/api/bill-validator/${machineId}?${params.toString()}`,
          { signal }
        );
        if (response.data.success) {
          setData(response.data.data);
          return response.data.data;
        } else {
          throw new Error('Failed to fetch bill validator data');
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
        console.error('Error fetching bill validator data:', error);
        toast.error('Failed to load bill validator data');
        setData(null);
        throw error;
      }
    }, 'bill-validator');

    if (result !== null) setLoading(false);
  }, [machineId, timePeriod, makeBillValidatorRequest]);

  useEffect(() => {
    fetchBillValidatorData();
  }, [fetchBillValidatorData]);

  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.from && pendingCustomDateRange?.to) {
      setCustomDateRange(pendingCustomDateRange);
      onTimePeriodChange('Custom');
      setShowCustomPicker(false);
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomPicker(false);
    setPendingCustomDateRange(undefined);
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingCustomDateRange({ from: firstDay, to: lastDay });
  };

  const handleTimePeriodChange = (value: string) => {
    if (value === 'Custom') {
      if (!customDateRange?.from || !customDateRange?.to) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startDate = new Date(today);
        startDate.setHours(gameDayOffset, 0, 0, 0);
        const endDate = new Date(tomorrow);
        endDate.setHours(gameDayOffset, 0, 0, 0);
        setPendingCustomDateRange({ from: startDate, to: endDate });
      } else {
        setPendingCustomDateRange(customDateRange);
      }
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setCustomDateRange(undefined);
      onTimePeriodChange(value as TimePeriod);
    }
  };

  const handleRefresh = () => fetchBillValidatorData();

  const isInitialLoad = loading && !data;
  if (isInitialLoad) return <BillValidatorSkeleton />;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Bill Validator</h3>
          {data && data.version !== 'none' && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {data.version.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {timeFrames.map(frame => (
          <Button
            key={frame.value}
            variant={timePeriod === frame.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimePeriodChange(frame.value)}
            style={{
              backgroundColor:
                timePeriod === frame.value ? '#3b82f6' : undefined,
              color: timePeriod === frame.value ? 'white' : undefined,
            }}
          >
            {frame.time}
          </Button>
        ))}
      </div>

      {showCustomPicker && (
        <div className="mb-4 w-full">
          <ModernDateRangePicker
            value={pendingCustomDateRange}
            onChange={setPendingCustomDateRange}
            onGo={handleApplyCustomRange}
            onCancel={handleCancelCustomRange}
            onSetLastMonth={handleSetLastMonth}
            enableTimeInputs={true}
          />
        </div>
      )}

      {!data || data.version === 'none' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Banknote className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No Bill Data Found</h3>
          <p className="text-muted-foreground">
            No bill validator data was found for the selected time period.
          </p>
        </div>
      ) : loading ? (
        <BillValidatorSkeleton />
      ) : (
        <div className="space-y-6">
          {data.unknownBills > 0 && (
            <motion.div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="text-center">
                <p className="mb-1 text-sm text-yellow-600">Unknown Bills</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {formatCurrency(data.unknownBills)}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Denomination
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {data.denominations.map(item => (
                      <motion.tr
                        key={item.denomination}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-medium">{item.label}</td>
                        <td className="px-4 py-3 text-center">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shouldShowCurrency()
                            ? formatAmount(item.subtotal)
                            : formatCurrency(item.subtotal)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  <motion.tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-center">
                      {data.totalQuantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {shouldShowCurrency()
                        ? formatAmount(data.totalAmount)
                        : formatCurrency(data.totalAmount)}
                    </td>
                  </motion.tr>
                </tbody>
              </table>
            </div>

            <div className="block space-y-3 p-4 lg:hidden">
              {data.denominations.map(item => (
                <motion.div
                  key={item.denomination}
                  className="rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label} Bills</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {shouldShowCurrency()
                          ? formatAmount(item.subtotal)
                          : formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <motion.div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Total</p>
                  <div className="text-right">
                    <p className="font-semibold">
                      {data.totalQuantity.toLocaleString()} bills
                    </p>
                    <p className="font-bold text-gray-700">
                      {shouldShowCurrency()
                        ? formatAmount(data.totalAmount)
                        : formatCurrency(data.totalAmount)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const BillValidatorSkeleton = () => (
  <div className="mx-auto w-full max-w-4xl">
    <div className="mb-6 flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="mb-6 flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Skeleton key={i} className="h-8 w-16" />
      ))}
    </div>
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {[1, 2].map(i => (
        <div key={i} className="rounded-lg bg-gray-100 p-4">
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CabinetsDetailsUnifiedBillValidator;
