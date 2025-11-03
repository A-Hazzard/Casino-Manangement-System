import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/shared/utils/dateFormat';

type LocationTrendChartProps = {
  title: string;
  icon: React.ReactNode;
  data: Array<{
    day: string;
    time?: string;
    [locationId: string]:
      | {
          handle: number;
          winLoss: number;
          jackpot: number;
          plays: number;
          drop: number;
          gross: number;
        }
      | string
      | undefined;
  }>;
  dataKey: 'handle' | 'winLoss' | 'jackpot' | 'plays' | 'drop' | 'gross';
  locations: string[];
  locationNames?: Record<string, string>;
  colors: string[];
  formatter: (value: number) => string;
  isHourly?: boolean;
};

export function LocationTrendChart({
  title,
  icon,
  data,
  dataKey,
  locations,
  locationNames,
  colors,
  formatter,
  isHourly = false,
}: LocationTrendChartProps) {
  // Transform data for the chart
  const chartData = data.map(item => {
    const transformed: Record<string, string | number> = {
      xValue: isHourly ? (item.time || '') : item.day,
      day: item.day,
    };

    locations.forEach(locationId => {
      const displayName = locationNames?.[locationId] || locationId;
      const locationData = item[locationId];
      // Extract the specific metric from the nested data
      if (typeof locationData === 'object' && locationData !== null) {
        transformed[displayName] = locationData[dataKey] || 0;
      } else {
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
            <XAxis
              dataKey="xValue"
              tickFormatter={val => {
                if (isHourly) {
                  return val; // Already formatted as "HH:00"
                } else {
                  return formatDisplayDate(val);
                }
              }}
            />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [formatter(value), '']}
              labelFormatter={label => {
                if (isHourly) {
                  return `Hour: ${label}`;
                } else {
                  return formatDisplayDate(label as string);
                }
              }}
            />
            <Legend />
            {locations.map((locationId, index) => {
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

