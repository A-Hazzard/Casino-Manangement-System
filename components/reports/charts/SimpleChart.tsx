'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ChartDataPoint = {
  [key: string]: string | number | null | undefined;
};

type SimpleChartProps = {
  type: 'line' | 'bar' | 'area';
  title: string;
  icon: React.ReactNode;
  data: ChartDataPoint[];
  dataKey: string;
  color?: string;
  formatter?: (value: unknown) => string;
};

export default function SimpleChart({
  type,
  title,
  icon,
  data,
  dataKey,
  color = '#8884d8',
  formatter = value => (value as number)?.toLocaleString() ?? '0',
}: SimpleChartProps) {
  // Format large numbers for Y-axis
  const formatYAxis = (tickItem: number) => {
    if (tickItem >= 1000000) {
      return `${(tickItem / 1000000).toFixed(1)}M`;
    } else if (tickItem >= 1000) {
      return `${(tickItem / 1000).toFixed(1)}K`;
    }
    return tickItem.toString();
  };
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={formatter} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={formatter} />
            <Bar dataKey={dataKey} fill={color} />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={formatter} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.6}
            />
          </AreaChart>
        );
      default:
        return (
          <div className="flex h-full items-center justify-center text-gray-500">
            Invalid chart type
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
