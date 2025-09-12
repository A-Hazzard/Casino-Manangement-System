"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GamesPerformanceData = {
  gameName: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
};

type GamesPerformanceChartProps = {
  data: GamesPerformanceData[];
};

export function GamesPerformanceChart({ data }: GamesPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Games Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No games performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for the chart - each game becomes a data point
  const chartData = data.map((item) => ({
    gameName: item.gameName.length > 10 ? item.gameName.substring(0, 10) + "..." : item.gameName,
    fullGameName: item.gameName,
    "Floor Positions %": item.floorPositions,
    "Total Handle %": item.totalHandle,
    "Total Win %": item.totalWin,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string; payload?: { fullGameName?: string } }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const fullGameName = payload[0]?.payload?.fullGameName || label;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="text-sm font-medium text-gray-900 mb-2">{fullGameName}</p>
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
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Games Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="gameName"
              tick={{ fontSize: 12, fill: "#666" }}
              axisLine={{ stroke: "#e0e0e0" }}
              tickLine={{ stroke: "#e0e0e0" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#666" }}
              axisLine={{ stroke: "#e0e0e0" }}
              tickLine={{ stroke: "#e0e0e0" }}
              label={{ value: "Percentage %", angle: -90, position: "insideLeft" }}
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
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}