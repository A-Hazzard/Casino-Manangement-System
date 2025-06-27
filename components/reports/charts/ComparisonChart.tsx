"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { formatCurrency } from "@/lib/helpers/reports";

type ComparisonChartProps = {
  data: Record<string, string | number>[];
  keys: {
    name: string;
    bars: Array<{
      key: string;
      color: string;
      format?: "currency" | "percentage" | "number";
    }>;
  };
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <p className="font-bold text-gray-800">{label}</p>
        {payload.map((entry) => (
          <div
            key={entry.name}
            style={{ color: entry.color }}
            className="flex justify-between space-x-4"
          >
            <span>{entry.name}:</span>
            <span className="font-semibold">
              {formatCurrency(entry.value as number)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ComparisonChart({ data, keys }: ComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={keys.name} stroke="#888888" fontSize={12} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickFormatter={(value) =>
            typeof value === "number" ? formatCurrency(value) : value
          }
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
        {keys.bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            name={bar.key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
