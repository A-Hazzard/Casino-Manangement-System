import { ChartDataPoint } from "@/lib/types/reports";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/helpers/reports";

type PerformanceChartProps = {
  data: ChartDataPoint[];
  height?: number;
};

export default function PerformanceChart({
  data,
  height = 300,
}: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center text-grayHighlight">
          <div className="text-2xl mb-2">📈</div>
          <p>No performance data available</p>
        </div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((point) => ({
    date: point.label,
    value: point.value,
    formattedValue: formatCurrency(point.value),
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-buttonActive">
            Handle: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#666" }}
            axisLine={{ stroke: "#e0e0e0" }}
            tickLine={{ stroke: "#e0e0e0" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#666" }}
            axisLine={{ stroke: "#e0e0e0" }}
            tickLine={{ stroke: "#e0e0e0" }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#5119E9"
            strokeWidth={2}
            dot={{ fill: "#5119E9", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#5119E9" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
