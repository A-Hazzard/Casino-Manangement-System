"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils/currency";

type SimpleBarChartProps = {
  data: { name: string; value: number }[];
};

export default function SimpleBarChart({ data }: SimpleBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(value) => formatCurrency(value as number)}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => formatCurrency(value as number)}
          cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
        />
        <Bar dataKey="value" fill="#3b82f6" barSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
