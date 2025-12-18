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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatTime12Hour } from '@/shared/utils/dateFormat';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
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
  const [gamesSearch, setGamesSearch] = useState('');
  const [coinInSearch, setCoinInSearch] = useState('');
  const [coinOutSearch, setCoinOutSearch] = useState('');
  const [gamesFocusedIndex, setGamesFocusedIndex] = useState<number | null>(null);
  const [coinInFocusedIndex, setCoinInFocusedIndex] = useState<number | null>(null);
  const [coinOutFocusedIndex, setCoinOutFocusedIndex] = useState<number | null>(null);

  const gamesScrollRef = useRef<HTMLDivElement>(null);
  const coinInScrollRef = useRef<HTMLDivElement>(null);
  const coinOutScrollRef = useRef<HTMLDivElement>(null);
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
    // For currency values (coinIn, coinOut), filter out $0 but keep cents (e.g., $0.30)
    // For gamesPlayed, filter out 0
    const filtered = sortedData.filter(item => {
      // Keep if games played > 0
      if (item.gamesPlayed > 0) return true;
      // Keep if coinIn >= 0.01 (filters out $0 but keeps cents)
      if (item.coinIn >= 0.01) return true;
      // Keep if coinOut >= 0.01 (filters out $0 but keeps cents)
      if (item.coinOut >= 0.01) return true;
      // Otherwise filter out
      return false;
    });

    const mapped = filtered.map(item => ({
      time: `${item.day} ${item.hour}`,
      day: item.day,
      hour: item.hour,
      gamesPlayed: item.gamesPlayed,
      coinIn: item.coinIn,
      coinOut: item.coinOut,
    }));

    // If there's only 1 data point after filtering, include the previous point before it (even if 0)
    if (mapped.length === 1 && sortedData.length > 1) {
      // Find the index of the filtered point in the original sortedData
      const filteredPoint = filtered[0];
      const filteredIndex = sortedData.findIndex(
        item =>
          item.day === filteredPoint.day && item.hour === filteredPoint.hour
      );

      if (filteredIndex > 0) {
        // Get the previous data point from sortedData
        const previousPoint = sortedData[filteredIndex - 1];
        // Create a point with all values set to 0
        const previousPointWithZeros = {
          time: `${previousPoint.day} ${previousPoint.hour}`,
          day: previousPoint.day,
          hour: previousPoint.hour,
          gamesPlayed: 0,
          coinIn: 0,
          coinOut: 0,
        };

        // Insert previous point at the beginning and sort to maintain chronological order
        const result = [previousPointWithZeros, ...mapped];
        // Sort by day and hour to ensure correct order
        return result.sort((a, b) => {
          const dateA = new Date(`${a.day}T${a.hour}:00Z`);
          const dateB = new Date(`${b.day}T${b.hour}:00Z`);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }

    return mapped;
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
  const chartWidthNumeric = useMemo(() => {
    if (chartData.length > 8) {
      return Math.max(700, chartData.length * 60);
    }
    return 700;
  }, [chartData.length]);

  const chartWidth = useMemo(() => {
    if (isMobile && chartData.length > 8) {
      // On mobile, make chart wider to enable horizontal scroll
      // Minimum 100% width, but expand based on data points
      return chartWidthNumeric;
    }
    return '100%';
  }, [isMobile, chartData.length, chartWidthNumeric]);

  const handleFocus = (
    searchTerm: string,
    scrollRef: React.RefObject<HTMLDivElement | null>,
    targetData: typeof chartData
  ) => {
    if (!searchTerm || !scrollRef.current) return;

    const index = targetData.findIndex(item =>
      String(item.time).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (index !== -1) {
      if (scrollRef === gamesScrollRef) setGamesFocusedIndex(index);
      else if (scrollRef === coinInScrollRef) setCoinInFocusedIndex(index);
      else if (scrollRef === coinOutScrollRef) setCoinOutFocusedIndex(index);

      const containerWidth = scrollRef.current.clientWidth;
      const width = typeof chartWidth === 'number' ? chartWidth : chartWidthNumeric;
      const slotWidth = width / targetData.length;
      const targetScroll = (index + 0.5) * slotWidth - (containerWidth / 2);
      
      scrollRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    } else {
      if (scrollRef === gamesScrollRef) setGamesFocusedIndex(null);
      else if (scrollRef === coinInScrollRef) setCoinInFocusedIndex(null);
      else if (scrollRef === coinOutScrollRef) setCoinOutFocusedIndex(null);
    }
  };

  // Format time for display - shorter on mobile, 12-hour format
  const formatTimeLabel = (timeStr: string) => {
    try {
      const [day, hour] = timeStr.split(' ');
      const date = new Date(day + 'T' + hour + ':00Z');

      // Convert hour to 12-hour format using formatTime12Hour utility
      const hour12 = formatTime12Hour(hour.includes(':') ? hour : `${hour}:00`);

      if (isMobile) {
        // Mobile: shorter format - "MM-DD HH:MM AM/PM"
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = date.getDate();
        return `${month}-${dayNum.toString().padStart(2, '0')} ${hour12}`;
      }

      // Desktop: full format - "MM-DD HH:MM AM/PM"
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = date.getDate();
      return `${month}-${dayNum.toString().padStart(2, '0')} ${hour12}`;
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

  // Chart container with horizontal scroll
  const ChartContainer = ({
    children,
    legendItem,
    scrollRef,
  }: {
    children: React.ReactNode;
    legendItem: { label: string; color: string };
    scrollRef: React.RefObject<HTMLDivElement | null>;
  }) => {
    return (
      <div className="flex flex-col">
        {/* Fixed Legend outside scroll container */}
        <div className="mb-4 flex items-center justify-center gap-2 border-b pb-2">
          <div
            className="h-0.5 w-4"
            style={{ backgroundColor: legendItem.color }}
          />
          <span className="text-xs font-medium text-gray-700">
            {legendItem.label}
          </span>
        </div>

        <div ref={scrollRef} className="touch-pan-x overflow-x-auto overflow-y-hidden">
          <div style={{ minWidth: typeof chartWidth === 'number' ? `${chartWidth}px` : chartWidth, width: '100%' }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Games Played Per Hour - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">
            Games Played Per Hour
          </CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search hour (MM-DD HH:00)..."
                className="pl-9"
                value={gamesSearch}
                onChange={(e) => {
                  setGamesSearch(e.target.value);
                  setGamesFocusedIndex(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFocus(gamesSearch, gamesScrollRef, chartData);
                }}
              />
            </div>
            <Button onClick={() => handleFocus(gamesSearch, gamesScrollRef, chartData)} variant="secondary">
              Focus
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
            <ChartContainer
              legendItem={{ label: 'Games Played', color: '#3b82f6' }}
              scrollRef={gamesScrollRef}
            >
              <ResponsiveContainer
                width="100%"
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
                  {gamesFocusedIndex !== null && chartData[gamesFocusedIndex] && (
                    <ReferenceArea
                      x1={chartData[gamesFocusedIndex].time}
                      x2={chartData[gamesFocusedIndex].time}
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      stroke="#3b82f6"
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                  )}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">
              Coin In Per Hour
            </CardTitle>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search hour..."
                  className="pl-9"
                  value={coinInSearch}
                  onChange={(e) => {
                    setCoinInSearch(e.target.value);
                    setCoinInFocusedIndex(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFocus(coinInSearch, coinInScrollRef, chartData);
                  }}
                />
              </div>
              <Button onClick={() => handleFocus(coinInSearch, coinInScrollRef, chartData)} variant="secondary">
                Focus
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
              <ChartContainer
                legendItem={{ label: 'Coin In', color: '#10b981' }}
                scrollRef={coinInScrollRef}
              >
                <ResponsiveContainer
                  width="100%"
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
                    {coinInFocusedIndex !== null && chartData[coinInFocusedIndex] && (
                      <ReferenceArea
                        x1={chartData[coinInFocusedIndex].time}
                        x2={chartData[coinInFocusedIndex].time}
                        fill="#10b981"
                        fillOpacity={0.15}
                        stroke="#10b981"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                      />
                    )}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">
              Coin Out Per Hour
            </CardTitle>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search hour..."
                  className="pl-9"
                  value={coinOutSearch}
                  onChange={(e) => {
                    setCoinOutSearch(e.target.value);
                    setCoinOutFocusedIndex(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFocus(coinOutSearch, coinOutScrollRef, chartData);
                  }}
                />
              </div>
              <Button onClick={() => handleFocus(coinOutSearch, coinOutScrollRef, chartData)} variant="secondary">
                Focus
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
              <ChartContainer
                legendItem={{ label: 'Coin Out', color: '#f59e0b' }}
                scrollRef={coinOutScrollRef}
              >
                <ResponsiveContainer
                  width="100%"
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
                    {coinOutFocusedIndex !== null && chartData[coinOutFocusedIndex] && (
                      <ReferenceArea
                        x1={chartData[coinOutFocusedIndex].time}
                        x2={chartData[coinOutFocusedIndex].time}
                        fill="#f59e0b"
                        fillOpacity={0.15}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                      />
                    )}
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
