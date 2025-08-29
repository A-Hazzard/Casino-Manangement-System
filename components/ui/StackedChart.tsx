import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StackedChartProps } from "@/lib/types/components";

export function StackedChart({
  title,
  icon,
  data,
  dataKey,
  machines,
  colors,
  formatter,
  locationNames,
}: StackedChartProps) {
  // Transform data for stacked chart
  const chartData = data.map((item) => {
    const transformed: Record<string, string | number> = { hour: item.hour };
    machines.forEach((locationId) => {
      const locationData = item[locationId];
      if (typeof locationData === "object" && locationData !== null) {
        // Use location name if available, otherwise use location ID
        const displayName = locationNames?.[locationId] || locationId;
        transformed[displayName] = locationData[dataKey];
      } else {
        const displayName = locationNames?.[locationId] || locationId;
        transformed[displayName] = 0;
      }
    });
    return transformed;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [formatter(value), "Value"]}
              labelFormatter={(label) => `Hour: ${label}`}
            />
            <Legend />
            {machines.map((locationId, index) => {
              const displayName = locationNames?.[locationId] || locationId;
              return (
                <Bar
                  key={locationId}
                  dataKey={displayName}
                  stackId="a"
                  fill={colors[index % colors.length]}
                  name={displayName}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
