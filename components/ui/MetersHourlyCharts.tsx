'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type HourlyChartData = {
  day: string;
  hour: string;
  gamesPlayed: number;
  coinIn: number;
  coinOut: number;
};

type MetersHourlyChartsProps = {
  data: HourlyChartData[];
  loading?: boolean;
};

export function MetersHourlyCharts({
  data,
  loading = false,
}: MetersHourlyChartsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Games Played - Full Width Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full animate-pulse rounded bg-gray-100"></div>
          </CardContent>
        </Card>
        {/* Coin In and Coin Out - Side by Side Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full animate-pulse rounded bg-gray-100"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Format data for charts - combine day and hour for x-axis
  // Sort by day and hour to ensure proper ordering
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(`${a.day}T${a.hour}:00Z`);
    const dateB = new Date(`${b.day}T${b.hour}:00Z`);
    return dateA.getTime() - dateB.getTime();
  });

  const chartData = sortedData.map(item => ({
    time: `${item.day} ${item.hour}`,
    day: item.day,
    hour: item.hour,
    gamesPlayed: item.gamesPlayed,
    coinIn: item.coinIn,
    coinOut: item.coinOut,
  }));

  // Calculate interval for X-axis labels - show more labels for 24 hours
  const xAxisInterval = chartData.length <= 24 ? 1 : Math.floor(chartData.length / 12);

  // Format time for display (e.g., "Mar-03 10:00")
  const formatTimeLabel = (timeStr: string) => {
    try {
      const [day, hour] = timeStr.split(' ');
      const date = new Date(day + 'T' + hour + ':00Z');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = date.getDate();
      return `${month}-${dayNum.toString().padStart(2, '0')} ${hour}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Games Played Per Hour - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Games Played Per Hour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimeLabel}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={xAxisInterval}
              />
              <YAxis />
              <Tooltip
                labelFormatter={formatTimeLabel}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gamesPlayed"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Games Played"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Coin In and Coin Out - Side by Side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Coin In (Meters In) Per Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Coin In Per Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeLabel}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip
                  labelFormatter={formatTimeLabel}
                  formatter={(value: number) =>
                    value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="coinIn"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Coin In"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coin Out (Money Won) Per Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Coin Out Per Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeLabel}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip
                  labelFormatter={formatTimeLabel}
                  formatter={(value: number) =>
                    value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="coinOut"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Coin Out"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

