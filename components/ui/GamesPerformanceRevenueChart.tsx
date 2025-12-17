/**
 * Games Performance Revenue Chart Component
 * Bar chart component displaying games performance revenue metrics.
 *
 * Features:
 * - Games revenue data visualization
 * - Multiple metrics (Floor Positions %, Handle %, Win %, Drop %, Cancelled Credits %, Gross %)
 * - Recharts bar chart
 * - Responsive design
 * - Empty state handling
 *
 * @param data - Array of games performance data
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

type GamesPerformanceData = {
  gameName: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
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

type GamesPerformanceRevenueChartProps = {
  data: GamesPerformanceData[];
};

export function GamesPerformanceRevenueChart({
  data,
}: GamesPerformanceRevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Games Performance Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No games revenue data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for the chart - each game becomes a data point
  const chartData = data.map(item => {
    const maxLength = 15; // Maximum characters before truncation
    const displayName =
      item.gameName.length > maxLength
        ? `${item.gameName.substring(0, maxLength)}...`
        : item.gameName;

    return {
      gameName: displayName,
      fullGameName: item.gameName, // Keep full name for tooltip
      'Total Drop %': item.totalDrop,
      'Total Canc. Cr. %': item.totalCancelledCredits,
      'Total Gross %': item.totalGross,
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
        fullGameName?: string;
        rawTotals?: GamesPerformanceData['rawTotals'];
        totalMetrics?: GamesPerformanceData['totalMetrics'];
        machineCount?: number;
        totalMachinesCount?: number;
      };
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      // Get full game name and verification data from payload
      const fullGameName = payload[0]?.payload?.fullGameName || label;
      const rawTotals = payload[0]?.payload?.rawTotals;
      const totalMetrics = payload[0]?.payload?.totalMetrics;
      const machineCount = payload[0]?.payload?.machineCount;

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
        if (!rawTotals) return null;

        const keyMap: Record<string, keyof typeof rawTotals> = {
          'Total Drop %': 'drop',
          'Total Canc. Cr. %': 'cancelledCredits',
          'Total Gross %': 'gross',
        };

        const rawKey = keyMap[dataKey];
        return rawKey ? rawTotals[rawKey] : null;
      };

      // Helper to get total value for a metric
      const getTotalValue = (dataKey: string): number | null => {
        if (!totalMetrics) return null;

        const keyMap: Record<string, keyof typeof totalMetrics> = {
          'Total Drop %': 'drop',
          'Total Canc. Cr. %': 'cancelledCredits',
          'Total Gross %': 'gross',
        };

        const totalKey = keyMap[dataKey];
        return totalKey ? totalMetrics[totalKey] : null;
      };

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg max-w-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">{fullGameName}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => {
              const rawValue = getRawValue(entry.dataKey);
              const totalValue = getTotalValue(entry.dataKey);

              return (
                <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="text-sm font-medium" style={{ color: entry.color }}>
                    {entry.dataKey}: {entry.value.toFixed(2)}%
                  </p>
                  {rawValue !== null && totalValue !== null && (
                    <div className="ml-2 mt-1 space-y-0.5 text-xs text-gray-600">
                      <p>
                        • {formatCurrency(rawValue)} of {formatCurrency(totalValue)} total
                      </p>
                      {machineCount !== undefined && (
                        <p>• {machineCount} machine{machineCount !== 1 ? 's' : ''} contributing</p>
                      )}
                      <p>
                        • Calculation: ({formatCurrency(rawValue)} / {formatCurrency(totalValue)}) × 100
                      </p>
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
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Games Performance Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: Make chart horizontally scrollable */}
        <div className="touch-pan-x overflow-x-auto md:hidden">
          <div className="min-w-[600px]">
            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="gameName"
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
                  dataKey="Total Drop %"
                  fill={colors[0]}
                  name="Total Drop %"
                />
                <Bar
                  dataKey="Total Canc. Cr. %"
                  fill={colors[1]}
                  name="Total Canc. Cr. %"
                />
                <Bar
                  dataKey="Total Gross %"
                  fill={colors[2]}
                  name="Total Gross %"
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
                dataKey="gameName"
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
                dataKey="Total Drop %"
                fill={colors[0]}
                name="Total Drop %"
              />
              <Bar
                dataKey="Total Canc. Cr. %"
                fill={colors[1]}
                name="Total Canc. Cr. %"
              />
              <Bar
                dataKey="Total Gross %"
                fill={colors[2]}
                name="Total Gross %"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
