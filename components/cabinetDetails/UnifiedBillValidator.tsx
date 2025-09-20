import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker, type DateRange } from "@/components/ui/dateRangePicker";
import { Banknote, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

type BillValidatorData = {
  version: "v1" | "v2" | "none";
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
  // V2 specific fields
  totalKnownAmount?: number;
  totalUnknownAmount?: number;
};

type TimePeriod = "Today" | "Yesterday" | "7d" | "30d" | "All Time" | "Custom";

type UnifiedBillValidatorProps = {
  machineId: string;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
};

export const UnifiedBillValidator: React.FC<UnifiedBillValidatorProps> = ({
  machineId,
  timePeriod,
  onTimePeriodChange,
}) => {
  
  const [data, setData] = useState<BillValidatorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [pendingCustomDateRange, setPendingCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Debug: Log when timePeriod prop changes
  useEffect(() => {
    console.warn("[DEBUG] UnifiedBillValidator timePeriod prop changed to:", timePeriod);
  }, [timePeriod]);

  const timeFrames = [
    { time: "Today", value: "Today" as TimePeriod },
    { time: "Yesterday", value: "Yesterday" as TimePeriod },
    { time: "7d", value: "7d" as TimePeriod },
    { time: "30d", value: "30d" as TimePeriod },
    { time: "All Time", value: "All Time" as TimePeriod },
    { time: "Custom", value: "Custom" as TimePeriod },
  ];

  const fetchBillValidatorData = useCallback(async () => {
    if (!machineId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("timePeriod", timePeriod);
      
      if (timePeriod === "Custom" && customDateRange?.from && customDateRange?.to) {
        // Format dates as YYYY-MM-DD for the API
        const startDate = customDateRange.from.toISOString().split('T')[0];
        const endDate = customDateRange.to.toISOString().split('T')[0];
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const response = await axios.get(
        `/api/bill-validator/${machineId}?${params.toString()}`
      );

      if (response.data.success) {
        setData(response.data.data);
      } else {
        throw new Error("Failed to fetch bill validator data");
      }
    } catch (error) {
      console.error("Error fetching bill validator data:", error);
      toast.error("Failed to load bill validator data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [machineId, timePeriod, customDateRange]);

  useEffect(() => {
    fetchBillValidatorData();
  }, [machineId, timePeriod, customDateRange, fetchBillValidatorData]);

  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.from && pendingCustomDateRange?.to) {
      console.warn("[DEBUG] Applying custom date range:", pendingCustomDateRange);
      setCustomDateRange(pendingCustomDateRange);
      console.warn("[DEBUG] Calling onTimePeriodChange('Custom')");
      onTimePeriodChange("Custom"); // Update the parent component's time period state
      setShowCustomPicker(false);
      console.warn("[DEBUG] Custom date range applied, picker hidden");
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
    if (value === "Custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setCustomDateRange(undefined);
      onTimePeriodChange(value as TimePeriod);
    }
  };

  const handleRefresh = () => {
    fetchBillValidatorData();
  };

  if (loading && !data) {
    return <BillValidatorSkeleton />;
  }

  if (!data || data.version === "none") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Bill Validator</h3>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        
        {/* Filter Buttons - Always visible */}
        <div className="flex flex-wrap gap-2 mb-6">
          {timeFrames.map((frame) => (
            <Button
              key={frame.value}
              variant={timePeriod === frame.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimePeriodChange(frame.value)}
            >
              {frame.time}
            </Button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <div className="mt-4 w-full">
            <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-b-lg bg-gray-50">
              <button
                className="bg-button text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                onClick={handleSetLastMonth}
              >
                Last Month
              </button>
              <div style={{ width: "fit-content" }}>
                <DateRangePicker
                  value={pendingCustomDateRange}
                  onChange={setPendingCustomDateRange}
                  maxDate={new Date()}
                  numberOfMonths={2}
                />
              </div>
              <button
                className="bg-lighterBlueHighlight text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                onClick={handleApplyCustomRange}
                disabled={!pendingCustomDateRange?.from || !pendingCustomDateRange?.to}
              >
                Go
              </button>
              <button
                className="bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-600"
                onClick={handleCancelCustomRange}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Bill Data Found</h3>
          <p className="text-muted-foreground">
            No bill validator data was found for the selected time period. Try selecting a different date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header with filters */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Bill Validator</h3>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {data.version.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {timeFrames.map((frame) => (
          <Button
            key={frame.value}
            variant={timePeriod === frame.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleTimePeriodChange(frame.value)}
            style={{ 
              backgroundColor: timePeriod === frame.value ? '#3b82f6' : undefined,
              color: timePeriod === frame.value ? 'white' : undefined 
            }}
          >
            {frame.time}
          </Button>
        ))}
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <div className="mt-4 w-full">
          <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-b-lg bg-gray-50">
            <button
              className="bg-button text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
              onClick={handleSetLastMonth}
            >
              Last Month
            </button>
            <div style={{ width: "fit-content" }}>
              <DateRangePicker
                value={pendingCustomDateRange}
                onChange={setPendingCustomDateRange}
                maxDate={new Date()}
                numberOfMonths={2}
              />
            </div>
            <button
              className="bg-lighterBlueHighlight text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
              onClick={handleApplyCustomRange}
              disabled={!pendingCustomDateRange?.from || !pendingCustomDateRange?.to}
            >
              Go
            </button>
            <button
              className="bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-600"
              onClick={handleCancelCustomRange}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Display */}
      {!loading && data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <p className="text-sm text-blue-600 mb-1">Current Balance</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(data.currentBalance)}
                </p>
              </div>
            </motion.div>

            {/* Show unknown bills for V1 data */}
            {data.unknownBills > 0 && (
              <motion.div
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="text-center">
                  <p className="text-sm text-yellow-600 mb-1">Unknown Bills</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {formatCurrency(data.unknownBills)}
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bill Validator Table */}
          <motion.div
            className="bg-white rounded-lg border border-gray-200 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">
                      Denomination
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700">
                      Quantity
                    </th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-700">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {data.denominations.map((item, index) => (
                      <motion.tr
                        key={item.denomination}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="py-3 px-4 font-medium">{item.label}</td>
                        <td className="py-3 px-4 text-center">{item.quantity.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  
                  {/* Total Row */}
                  <motion.tr
                    className="bg-gray-50 font-semibold border-t-2 border-gray-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-center">{data.totalQuantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(data.totalAmount)}
                    </td>
                  </motion.tr>

                  {/* V2 Additional Rows */}
                  {data.version === "v2" && (data.totalKnownAmount !== undefined || data.totalUnknownAmount !== undefined) && (
                    <>
                      {data.totalKnownAmount !== undefined && (
                        <motion.tr
                          className="bg-green-50 font-semibold border-t border-green-200"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.6 }}
                        >
                          <td className="py-3 px-4 text-green-700">Total Known</td>
                          <td className="py-3 px-4 text-center text-green-700">-</td>
                          <td className="py-3 px-4 text-right text-green-700 font-bold">
                            {formatCurrency(data.totalKnownAmount)}
                          </td>
                        </motion.tr>
                      )}
                      
                      {data.totalUnknownAmount !== undefined && data.totalUnknownAmount > 0 && (
                        <motion.tr
                          className="bg-yellow-50 font-semibold border-t border-yellow-200"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.7 }}
                        >
                          <td className="py-3 px-4 text-yellow-700">Total Unknown</td>
                          <td className="py-3 px-4 text-center text-yellow-700">-</td>
                          <td className="py-3 px-4 text-right text-yellow-700 font-bold">
                            {formatCurrency(data.totalUnknownAmount)}
                          </td>
                        </motion.tr>
                      )}

                      {/* Grand Total Row */}
                      <motion.tr
                        className="bg-blue-100 font-bold border-t-2 border-blue-300"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.8 }}
                      >
                        <td className="py-3 px-4 text-blue-800">Grand Total</td>
                        <td className="py-3 px-4 text-center text-blue-800">{data.totalQuantity.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-blue-800">
                          {formatCurrency(
                            data.totalAmount + 
                            (data.totalKnownAmount || 0) + 
                            (data.totalUnknownAmount || 0)
                          )}
                        </td>
                      </motion.tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block lg:hidden p-4 space-y-3">
              {data.denominations.map((item, index) => (
                <motion.div
                  key={item.denomination}
                  className="bg-gray-50 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.label} Bills</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Total Summary */}
              <motion.div
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold">Total</p>
                  <div className="text-right">
                    <p className="font-semibold">{data.totalQuantity.toLocaleString()} bills</p>
                    <p className="font-bold text-gray-700">
                      {formatCurrency(data.totalAmount)}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* V2 Additional Totals for Mobile */}
              {data.version === "v2" && (data.totalKnownAmount !== undefined || data.totalUnknownAmount !== undefined) && (
                <div className="space-y-3">
                  {data.totalKnownAmount !== undefined && (
                    <motion.div
                      className="bg-green-50 border border-green-200 rounded-lg p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-green-700">Total Known</p>
                        <p className="font-bold text-green-800">
                          {formatCurrency(data.totalKnownAmount)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  {data.totalUnknownAmount !== undefined && data.totalUnknownAmount > 0 && (
                    <motion.div
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.7 }}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-yellow-700">Total Unknown</p>
                        <p className="font-bold text-yellow-800">
                          {formatCurrency(data.totalUnknownAmount)}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Grand Total for Mobile */}
                  <motion.div
                    className="bg-blue-100 border border-blue-300 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.8 }}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-blue-800">Grand Total</p>
                      <div className="text-right">
                        <p className="font-semibold text-blue-700">{data.totalQuantity.toLocaleString()} bills</p>
                        <p className="font-bold text-blue-800">
                          {formatCurrency(
                            data.totalAmount + 
                            (data.totalKnownAmount || 0) + 
                            (data.totalUnknownAmount || 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const BillValidatorSkeleton = () => (
  <div className="w-full max-w-4xl mx-auto">
    <div className="mb-6 flex justify-between items-center">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
    </div>
    
    <div className="flex flex-wrap gap-2 mb-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4">
          <div className="h-4 w-20 bg-gray-200 rounded mb-2 animate-pulse"></div>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
    
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default UnifiedBillValidator;