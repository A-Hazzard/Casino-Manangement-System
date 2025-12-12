/**
 * Meters Hourly Charts Component
 * Line chart component displaying hourly meter data (games played, coin in, coin out).
 *
 * Features:
 * - Multiple line charts for different metrics
 * - Hourly data visualization
 * - Responsive design
 * - Mobile viewport detection
 * - Loading states
 * - Empty state handling
 *
 * @param data - Array of hourly chart data
 * @param loading - Whether data is loading
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  // All hooks must be called before any early returns
  // Detect mobile viewport (client-side only)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Format data for charts - combine day and hour for x-axis
  // Sort by day and hour to ensure proper ordering
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => {
      const dateA = new Date(`${a.day}T${a.hour}:00Z`);
      const dateB = new Date(`${b.day}T${b.hour}:00Z`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data]);

  const chartData = useMemo(() => {
    // Filter data to only show times with actual data (no zero-value periods)
    // This matches the behavior of location details and cabinet details pages
    // Include entries where at least one metric has data
    const filtered = sortedData.filter(
      item => item.gamesPlayed > 0 || item.coinIn > 0 || item.coinOut > 0
    );

    return filtered.map(item => ({
      time: `${item.day} ${item.hour}`,
      day: item.day,
      hour: item.hour,
      gamesPlayed: item.gamesPlayed,
      coinIn: item.coinIn,
      coinOut: item.coinOut,
    }));
  }, [sortedData]);

  // Calculate interval for X-axis labels - fewer labels on mobile
  const xAxisInterval = useMemo(() => {
    if (isMobile) {
      // On mobile, show fewer labels (every 3rd-4th label depending on data length)
      return chartData.length <= 12 ? 1 : Math.floor(chartData.length / 6);
    }
    return chartData.length <= 24 ? 1 : Math.floor(chartData.length / 12);
  }, [chartData.length, isMobile]);

  // Calculate chart width for mobile (wider for horizontal scroll)
  const chartWidth = useMemo(() => {
    if (isMobile && chartData.length > 8) {
      // On mobile, make chart wider to enable horizontal scroll
      // Minimum 100% width, but expand based on data points
      return Math.max(100, chartData.length * 60); // ~60px per data point
    }
    return '100%';
  }, [isMobile, chartData.length]);

  // Format time for display - shorter on mobile
  const formatTimeLabel = (timeStr: string) => {
    try {
      const [day, hour] = timeStr.split(' ');
      const date = new Date(day + 'T' + hour + ':00Z');

      if (isMobile) {
        // Mobile: shorter format - just "MM-DD HH:MM" or even just "HH:MM" if same day
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = date.getDate();
        // Extract just hour:minute from hour string (e.g., "14:00" from "14:00")
        const timeOnly = hour.includes(':') ? hour : `${hour}:00`;
        return `${month}-${dayNum.toString().padStart(2, '0')} ${timeOnly}`;
      }

      // Desktop: full format
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = date.getDate();
      return `${month}-${dayNum.toString().padStart(2, '0')} ${hour}`;
    } catch {
      return timeStr;
    }
  };

  // Check if each metric has data
  const hasGamesPlayedData = useMemo(() => {
    return chartData.some(item => item.gamesPlayed > 0);
  }, [chartData]);

  const hasCoinInData = useMemo(() => {
    return chartData.some(item => item.coinIn > 0);
  }, [chartData]);

  const hasCoinOutData = useMemo(() => {
    return chartData.some(item => item.coinOut > 0);
  }, [chartData]);

  // Early returns after all hooks
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

  // Chart container with horizontal scroll on mobile
  const ChartContainer = ({ children }: { children: React.ReactNode }) => {
    if (isMobile && chartData.length > 8) {
      return (
        <div className="-mx-4 overflow-x-auto px-4">
          <div style={{ minWidth: `${chartWidth}px` }}>{children}</div>
        </div>
      );
    }
    return <>{children}</>;
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
        <CardContent className={isMobile && chartData.length > 8 ? 'p-0' : ''}>
          {!hasGamesPlayedData || chartData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <div className="mb-2 text-lg text-gray-500">
                No Data to Display
              </div>
              <div className="text-center text-sm text-gray-400">
                No games played data available for the selected time period
              </div>
            </div>
          ) : (
            <ChartContainer>
              <ResponsiveContainer
                width={chartWidth}
                height={isMobile ? 250 : 300}
              >
                <LineChart
                  data={chartData}
                  margin={
                    isMobile
                      ? { top: 5, right: 10, left: 0, bottom: 5 }
                      : { top: 5, right: 30, left: 20, bottom: 60 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatTimeLabel}
                    angle={isMobile ? 0 : -45}
                    textAnchor={isMobile ? 'middle' : 'end'}
                    height={isMobile ? 40 : 80}
                    interval={xAxisInterval}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip
                    labelFormatter={formatTimeLabel}
                    formatter={(value: number) => value.toLocaleString()}
                    contentStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gamesPlayed"
                    stroke="#3b82f6"
                    strokeWidth={isMobile ? 2.5 : 2}
                    name="Games Played"
                    dot={false}
                    activeDot={{ r: isMobile ? 5 : 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
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
          <CardContent
            className={isMobile && chartData.length > 8 ? 'p-0' : ''}
          >
            {!hasCoinInData || chartData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <div className="mb-2 text-lg text-gray-500">
                  No Data to Display
                </div>
                <div className="text-center text-sm text-gray-400">
                  No coin in data available for the selected time period
                </div>
              </div>
            ) : (
              <ChartContainer>
                <ResponsiveContainer
                  width={chartWidth}
                  height={isMobile ? 250 : 300}
                >
                  <LineChart
                    data={chartData}
                    margin={
                      isMobile
                        ? { top: 5, right: 10, left: 0, bottom: 5 }
                        : { top: 5, right: 30, left: 20, bottom: 60 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatTimeLabel}
                      angle={isMobile ? 0 : -45}
                      textAnchor={isMobile ? 'middle' : 'end'}
                      height={isMobile ? 40 : 80}
                      interval={isMobile ? xAxisInterval : 'preserveStartEnd'}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip
                      labelFormatter={formatTimeLabel}
                      formatter={(value: number) =>
                        value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                      contentStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="coinIn"
                      stroke="#10b981"
                      strokeWidth={isMobile ? 2.5 : 2}
                      name="Coin In"
                      dot={false}
                      activeDot={{ r: isMobile ? 5 : 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Coin Out (Money Won) Per Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Coin Out Per Hour
            </CardTitle>
          </CardHeader>
          <CardContent
            className={isMobile && chartData.length > 8 ? 'p-0' : ''}
          >
            {!hasCoinOutData || chartData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <div className="mb-2 text-lg text-gray-500">
                  No Data to Display
                </div>
                <div className="text-center text-sm text-gray-400">
                  No coin out data available for the selected time period
                </div>
              </div>
            ) : (
              <ChartContainer>
                <ResponsiveContainer
                  width={chartWidth}
                  height={isMobile ? 250 : 300}
                >
                  <LineChart
                    data={chartData}
                    margin={
                      isMobile
                        ? { top: 5, right: 10, left: 0, bottom: 5 }
                        : { top: 5, right: 30, left: 20, bottom: 60 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatTimeLabel}
                      angle={isMobile ? 0 : -45}
                      textAnchor={isMobile ? 'middle' : 'end'}
                      height={isMobile ? 40 : 80}
                      interval={isMobile ? xAxisInterval : 'preserveStartEnd'}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip
                      labelFormatter={formatTimeLabel}
                      formatter={(value: number) =>
                        value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                      contentStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="coinOut"
                      stroke="#f59e0b"
                      strokeWidth={isMobile ? 2.5 : 2}
                      name="Coin Out"
                      dot={false}
                      activeDot={{ r: isMobile ? 5 : 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
