'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ManufacturerPerformanceData = {
  manufacturer: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
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
  const chartData = data.map(item => ({
    manufacturer: item.manufacturer,
    'Floor Positions %': item.floorPositions,
    'Total Handle %': item.totalHandle,
    'Total Win %': item.totalWin,
    'Total Drop %': item.totalDrop,
    'Total Canc. Cr. %': item.totalCancelledCredits,
    'Total Gross %': item.totalGross,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
          <p className="mb-2 text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value.toFixed(2)}%
            </p>
          ))}
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
        <ResponsiveContainer width="100%" height={450}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="manufacturer"
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickLine={{ stroke: '#e0e0e0' }}
              angle={-45}
              textAnchor="end"
              height={80}
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
            <Bar dataKey="Total Drop %" fill={colors[3]} name="Total Drop %" />
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
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
