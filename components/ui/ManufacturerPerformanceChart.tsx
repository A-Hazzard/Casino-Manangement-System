/**
 * Manufacturer Performance Chart Component
 * Bar chart component displaying manufacturer performance metrics.
 *
 * Features:
 * - Manufacturer performance data visualization
 * - Multiple metrics (Floor Positions %, Handle %, Win %, Drop %, Cancelled Credits %, Gross %)
 * - Recharts bar chart
 * - Responsive design
 * - Empty state handling
 *
 * @param data - Array of manufacturer performance data
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ManufacturerPerformanceData = {
  manufacturer: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalGamesPlayed: number;
  // Verification data
  rawTotals?: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  totalMetrics?: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  machineCount?: number;
  totalMachinesCount?: number;
};

type ManufacturerPerformanceChartProps = {
  data: ManufacturerPerformanceData[];
};

export function ManufacturerPerformanceChart({
  data,
}: ManufacturerPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manufacturers Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No manufacturer performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for the chart - each manufacturer becomes a data point
  // Truncate long manufacturer names for display (keep full name in tooltip)
  const chartData = data.map(item => {
    const maxLength = 15; // Maximum characters before truncation
    const displayName =
      item.manufacturer.length > maxLength
        ? `${item.manufacturer.substring(0, maxLength)}...`
        : item.manufacturer;

    return {
      manufacturer: displayName,
      fullManufacturer: item.manufacturer, // Keep full name for tooltip
      'Floor Positions %': item.floorPositions,
      'Total Handle %': item.totalHandle,
      'Total Win %': item.totalWin,
      'Total Drop %': item.totalDrop,
      'Total Canc. Cr. %': item.totalCancelledCredits,
      'Total Gross %': item.totalGross,
      'Total Games Played %': item.totalGamesPlayed,
      // Include verification data
      rawTotals: item.rawTotals,
      totalMetrics: item.totalMetrics,
      machineCount: item.machineCount,
      totalMachinesCount: item.totalMachinesCount,
    };
  });

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
      payload?: {
        fullManufacturer?: string;
        rawTotals?: ManufacturerPerformanceData['rawTotals'];
        totalMetrics?: ManufacturerPerformanceData['totalMetrics'];
        machineCount?: number;
        totalMachinesCount?: number;
      };
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      // Get full manufacturer name and verification data from payload
      const fullName = payload[0]?.payload?.fullManufacturer || label;
      const rawTotals = payload[0]?.payload?.rawTotals;
      const totalMetrics = payload[0]?.payload?.totalMetrics;
      const machineCount = payload[0]?.payload?.machineCount;
      const totalMachinesCount = payload[0]?.payload?.totalMachinesCount;

      // Helper to format currency
      const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);

      // Helper to get raw value for a metric
      const getRawValue = (dataKey: string): number | null => {
        if (dataKey === 'Floor Positions %') {
          // For floor positions, return machine count
          return machineCount !== undefined ? machineCount : null;
        }

        if (!rawTotals) return null;

        const keyMap: Record<string, keyof typeof rawTotals> = {
          'Total Handle %': 'coinIn',
          'Total Win %': 'netWin',
          'Total Drop %': 'drop',
          'Total Canc. Cr. %': 'cancelledCredits',
          'Total Gross %': 'gross',
          'Total Games Played %': 'gamesPlayed',
        };

        const rawKey = keyMap[dataKey];
        return rawKey ? rawTotals[rawKey] : null;
      };

      // Helper to get total value for a metric
      const getTotalValue = (dataKey: string): number | null => {
        if (dataKey === 'Floor Positions %') {
          // For floor positions, return total machines count
          return totalMachinesCount !== undefined ? totalMachinesCount : null;
        }

        if (!totalMetrics) return null;

        const keyMap: Record<string, keyof typeof totalMetrics> = {
          'Total Handle %': 'coinIn',
          'Total Win %': 'netWin',
          'Total Drop %': 'drop',
          'Total Canc. Cr. %': 'cancelledCredits',
          'Total Gross %': 'gross',
          'Total Games Played %': 'gamesPlayed',
        };

        const totalKey = keyMap[dataKey];
        return totalKey ? totalMetrics[totalKey] : null;
      };

      // Helper to check if metric is currency-based
      const isCurrencyMetric = (dataKey: string) => {
        return !dataKey.includes('Games Played') && !dataKey.includes('Floor Positions');
      };

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg max-w-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">{fullName}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => {
              const rawValue = getRawValue(entry.dataKey);
              const totalValue = getTotalValue(entry.dataKey);
              const isCurrency = isCurrencyMetric(entry.dataKey);
              const isFloorPositions = entry.dataKey === 'Floor Positions %';

              return (
                <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="text-sm font-medium" style={{ color: entry.color }}>
                    {entry.dataKey}: {entry.value.toFixed(2)}%
                  </p>
                  {rawValue !== null && totalValue !== null && (
                    <div className="ml-2 mt-1 space-y-0.5 text-xs text-gray-600">
                      {isFloorPositions ? (
                        <>
                          <p>• {machineCount || 0} machines of {totalValue} total</p>
                          <p>• Calculation: ({machineCount || 0} / {totalValue}) × 100</p>
                        </>
                      ) : (
                        <>
                          <p>
                            • {isCurrency ? formatCurrency(rawValue) : rawValue.toLocaleString()} of{' '}
                            {isCurrency ? formatCurrency(totalValue) : totalValue.toLocaleString()} total
                          </p>
                          {machineCount !== undefined && (
                            <p>• {machineCount} machine{machineCount !== 1 ? 's' : ''} contributing</p>
                          )}
                          <p>
                            • Calculation: ({isCurrency ? formatCurrency(rawValue) : rawValue.toLocaleString()} /{' '}
                            {isCurrency ? formatCurrency(totalValue) : totalValue.toLocaleString()}) × 100
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manufacturers Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: Make chart horizontally scrollable */}
        <div className="touch-pan-x overflow-x-auto md:hidden">
          <div className="min-w-[600px]">
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="manufacturer"
                  tick={{ fontSize: 11, fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  label={{
                    value: 'Percentage %',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="Floor Positions %"
                  fill={colors[0]}
                  name="Floor Positions %"
                />
                <Bar
                  dataKey="Total Handle %"
                  fill={colors[1]}
                  name="Total Handle %"
                />
                <Bar
                  dataKey="Total Win %"
                  fill={colors[2]}
                  name="Total Win %"
                />
                <Bar
                  dataKey="Total Drop %"
                  fill={colors[3]}
                  name="Total Drop %"
                />
                <Bar
                  dataKey="Total Canc. Cr. %"
                  fill={colors[4]}
                  name="Total Canc. Cr. %"
                />
                <Bar
                  dataKey="Total Gross %"
                  fill={colors[5]}
                  name="Total Gross %"
                />
                <Bar
                  dataKey="Total Games Played %"
                  fill={colors[6]}
                  name="Total Games Played %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Desktop: Normal chart without horizontal scroll */}
        <div className="hidden md:block">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="manufacturer"
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={{ stroke: '#e0e0e0' }}
                angle={-45}
                textAnchor="end"
                height={120}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={{ stroke: '#e0e0e0' }}
                label={{
                  value: 'Percentage %',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="Floor Positions %"
                fill={colors[0]}
                name="Floor Positions %"
              />
              <Bar
                dataKey="Total Handle %"
                fill={colors[1]}
                name="Total Handle %"
              />
              <Bar dataKey="Total Win %" fill={colors[2]} name="Total Win %" />
              <Bar
                dataKey="Total Drop %"
                fill={colors[3]}
                name="Total Drop %"
              />
              <Bar
                dataKey="Total Canc. Cr. %"
                fill={colors[4]}
                name="Total Canc. Cr. %"
              />
              <Bar
                dataKey="Total Gross %"
                fill={colors[5]}
                name="Total Gross %"
              />
              <Bar
                dataKey="Total Games Played %"
                fill={colors[6]}
                name="Total Games Played %"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
