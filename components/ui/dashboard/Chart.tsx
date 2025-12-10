import { DashboardChartSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import { ChartProps } from '@/lib/types/componentProps';
import { formatDisplayDate, formatTime } from '@/shared/utils/dateFormat';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { dashboardData } from '@/lib/types';

export default function Chart({
  loadingChartData,
  chartData,
  activeMetricsFilter,
  totals,
}: ChartProps) {
  // Chart data received for rendering

  // Debug: Log the chart data to see what values we're getting
  if (
    process.env.NODE_ENV === 'development' &&
    chartData &&
    chartData.length > 0
  ) {
    console.warn('Chart data received:', chartData);
  }

  // Always show skeleton when loading
  if (loadingChartData) {
    return <DashboardChartSkeleton />;
  }

  // Check if chartData is valid and has data
  const hasValidData =
    chartData && Array.isArray(chartData) && chartData.length > 0;

  // If we have no valid data, check if we're in initial state
  // Show skeleton if totals is null (initial state) OR if we're loading
  // This prevents showing "No Metrics Data" before the first fetch completes
  if (!hasValidData) {
    // If totals is null/undefined, we're in initial state before any fetch completes
    // OR if loadingChartData was just set to false but data hasn't propagated yet
    // Show skeleton to indicate we're still loading
    if (!totals) {
      return <DashboardChartSkeleton />;
    }

    // We have totals but no chart data - this means we loaded but got no chart data
    // Only show "no data" message if we've actually completed a fetch (have totals)
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md">
        <div className="mb-2 text-lg text-gray-500">No Metrics Data</div>
        <div className="text-center text-sm text-gray-400">
          No metrics data available for the selected time period
        </div>
      </div>
    );
  }

  // --- Robust sorting for both string and date types ---
  const parseTime = (val?: string, day?: string) => {
    if (!val || !day) return 0;
    try {
      const date = new Date(`${day}T${val}:00Z`);
      return date.getHours() * 60 + date.getMinutes();
    } catch {
      return 0;
    }
  };

  const parseDay = (val?: string) => {
    if (!val) return 0;
    try {
      return new Date(val).getTime();
    } catch {
      return 0;
    }
  };

  // Determine if we should use hourly or daily formatting
  const shouldUseHourlyFormat = () => {
    // Explicitly check for 7d and 30d - always use daily format
    if (activeMetricsFilter === '7d' || activeMetricsFilter === '30d') {
      return false;
    }

    if (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday'
    ) {
      return true;
    }

    if (activeMetricsFilter === 'Custom') {
      // Check if custom range spans only one day
      const uniqueDays = new Set(chartData.map(d => d.day).filter(Boolean));
      if (uniqueDays.size === 1) {
        // Return true for hourly format if we have time data (hourly or minute)
        // The aggregation logic below will detect minute data and skip hourly aggregation
        return true;
      }
      return false;
    }

    return false;
  };

  // Detect if chart data has minute-level detail (for custom time ranges, Today, or Yesterday)
  const hasMinuteLevelData = () => {
    // Check for minute-level data in any time period
    return chartData.some(d => {
      const time = d.time;
      if (!time) return false;
      const timeParts = time.split(':');
      if (timeParts.length !== 2) return false;
      const minutes = parseInt(timeParts[1], 10);
      return !isNaN(minutes) && minutes !== 0; // Has non-zero minutes
    });
  };

  const isHourlyChart = shouldUseHourlyFormat();

  // For hourly charts, filter to only the most common day
  let filteredChartData = chartData;
  if (isHourlyChart) {
    const dayCounts: Record<string, number> = {};
    chartData.forEach(d => {
      if (d.day) dayCounts[d.day] = (dayCounts[d.day] || 0) + 1;
    });
    const [mostCommonDay] =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || [];
    if (mostCommonDay) {
      filteredChartData = chartData.filter(d => d.day === mostCommonDay);
    }
  }

  const sortedChartData = filteredChartData.slice().sort((a, b) => {
    // If using hourly format, sort by day then time
    if (isHourlyChart) {
      const dayDiff = parseDay(a.day) - parseDay(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTime(a.time, a.day) - parseTime(b.time, b.day);
    }
    // Otherwise, sort by day (could be string or date)
    return parseDay(a.day) - parseDay(b.day);
  });

  // For hourly charts, we need to aggregate the data by hour to avoid showing individual meter readings
  // BUT: Don't aggregate if data already contains minute-level detail (for custom time ranges)
  let finalChartData = sortedChartData;
  const isMinuteLevel = hasMinuteLevelData();

  if (isHourlyChart && !isMinuteLevel) {
    // Group by hour and sum the values (only for hourly data, not minute-level)
    const hourlyData: Record<string, dashboardData> = {};

    sortedChartData.forEach(item => {
      if (!item.time) return;

      // Extract hour from time (e.g., "22:40" -> "22:00", "00:50" -> "00:00")
      const hour = item.time.split(':')[0] + ':00';
      const key = `${item.day}_${hour}`;

      if (!hourlyData[key]) {
        hourlyData[key] = {
          xValue: `${item.day}_${hour}`,
          day: item.day,
          time: hour,
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
          location: item.location,
          geoCoords: item.geoCoords,
        };
      }

      // Debug: Log what we're aggregating
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Aggregating ${item.day} ${item.time} -> ${hour}:`, {
          moneyIn: item.moneyIn,
          moneyOut: item.moneyOut,
          gross: item.gross,
        });
      }

      hourlyData[key].moneyIn += item.moneyIn || 0;
      hourlyData[key].moneyOut += item.moneyOut || 0;
      hourlyData[key].gross += item.gross || 0;
    });

    // Convert back to array and sort
    finalChartData = Object.values(hourlyData).sort((a, b) => {
      const dayDiff = parseDay(a.day) - parseDay(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTime(a.time, a.day) - parseTime(b.time, b.day);
    });

    // Debug: Log the final aggregated data
    if (process.env.NODE_ENV === 'development') {
      console.warn('Hourly aggregation result:', finalChartData);
    }
  } else if (isMinuteLevel) {
    // For minute-level data, use data as-is (already processed in helper)
    // Just ensure proper sorting
    finalChartData = sortedChartData;

    // Debug: Log that we're preserving minute-level data
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Preserving minute-level data (no hourly aggregation):',
        finalChartData
      );
    }
  }

  // Debug: Log the final aggregated data
  if (
    process.env.NODE_ENV === 'development' &&
    finalChartData &&
    finalChartData.length > 0
  ) {
    console.warn('Final chart data (aggregated):', finalChartData);
  }

  // Filter out leading and trailing zero-value entries to show only actual data range
  // This removes empty lines before data starts and after data ends
  let trimmedChartData = finalChartData;
  if (finalChartData.length > 0) {
    // Find first non-zero entry
    let firstNonZeroIndex = 0;
    for (let i = 0; i < finalChartData.length; i++) {
      const item = finalChartData[i];
      const jackpot = (item as { jackpot?: number }).jackpot || 0;
      const hasData =
        (item.moneyIn || 0) > 0 ||
        (item.moneyOut || 0) > 0 ||
        (item.gross || 0) > 0 ||
        jackpot > 0;
      if (hasData) {
        firstNonZeroIndex = i;
        break;
      }
    }

    // Find last non-zero entry
    let lastNonZeroIndex = finalChartData.length - 1;
    for (let i = finalChartData.length - 1; i >= 0; i--) {
      const item = finalChartData[i];
      const jackpot = (item as { jackpot?: number }).jackpot || 0;
      const hasData =
        (item.moneyIn || 0) > 0 ||
        (item.moneyOut || 0) > 0 ||
        (item.gross || 0) > 0 ||
        jackpot > 0;
      if (hasData) {
        lastNonZeroIndex = i;
        break;
      }
    }

    // Trim the data to only include the range with actual data
    trimmedChartData = finalChartData.slice(
      firstNonZeroIndex,
      lastNonZeroIndex + 1
    );
  }

  // Filter out intermediate blank periods (where all metrics are zero or unchanged)
  // This creates a continuous line that skips over inactive time periods
  let gapFilteredChartData = trimmedChartData;
  if (trimmedChartData.length > 2) {
    gapFilteredChartData = [];

    for (let i = 0; i < trimmedChartData.length; i++) {
      const current = trimmedChartData[i];
      const previous = i > 0 ? trimmedChartData[i - 1] : null;
      const next =
        i < trimmedChartData.length - 1 ? trimmedChartData[i + 1] : null;

      // Safely access jackpot property (may not be in type but exists at runtime)
      const currentJackpot = (current as { jackpot?: number }).jackpot || 0;
      const previousJackpot = previous
        ? (previous as { jackpot?: number }).jackpot || 0
        : 0;
      const nextJackpot = next
        ? (next as { jackpot?: number }).jackpot || 0
        : 0;

      // Check if current point has any activity
      const hasActivity =
        (current.moneyIn || 0) !== 0 ||
        (current.moneyOut || 0) !== 0 ||
        (current.gross || 0) !== 0 ||
        currentJackpot !== 0;

      // Check if previous point has activity
      const previousHasActivity = previous
        ? (previous.moneyIn || 0) !== 0 ||
          (previous.moneyOut || 0) !== 0 ||
          (previous.gross || 0) !== 0 ||
          previousJackpot !== 0
        : false;

      // Check if next point has activity
      const nextHasActivity = next
        ? (next.moneyIn || 0) !== 0 ||
          (next.moneyOut || 0) !== 0 ||
          (next.gross || 0) !== 0 ||
          nextJackpot !== 0
        : false;

      // Check if current point values differ from previous (indicates a change)
      const valuesChanged = previous
        ? (current.moneyIn || 0) !== (previous.moneyIn || 0) ||
          (current.moneyOut || 0) !== (previous.moneyOut || 0) ||
          (current.gross || 0) !== (previous.gross || 0) ||
          currentJackpot !== previousJackpot
        : true;

      // Keep the point if:
      // 1. It's the first or last point (always keep boundaries), OR
      // 2. It has activity, OR
      // 3. It's a transition point (activity state changes), OR
      // 4. Values changed (even if both are zero, indicates a transition)
      const isFirstOrLast = i === 0 || i === trimmedChartData.length - 1;
      const isTransition =
        previousHasActivity !== hasActivity || nextHasActivity !== hasActivity;

      if (isFirstOrLast || hasActivity || isTransition || valuesChanged) {
        gapFilteredChartData.push(current);
      }
    }
  }

  // Calculate Y-axis domain from actual data to avoid showing negative values when data doesn't go negative
  const allValues: number[] = [];
  gapFilteredChartData.forEach(item => {
    allValues.push(item.moneyIn || 0);
    allValues.push(item.moneyOut || 0);
    allValues.push(item.gross || 0);
    const jackpot = (item as { jackpot?: number }).jackpot || 0;
    allValues.push(jackpot);
  });

  let yAxisDomain: [number, number] | undefined = undefined;

  if (allValues.length > 0) {
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // Calculate domain: only go negative if data actually goes negative
    // Add 10% padding to the top, but don't go below 0 unless data actually goes negative
    yAxisDomain = [
      minValue < 0 ? minValue * 1.1 : 0,
      maxValue > 0 ? maxValue * 1.1 : 0,
    ];
  }

  // Shared chart component JSX
  const chartJSX = (
    <AreaChart data={gapFilteredChartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey={isHourlyChart ? 'time' : 'day'}
        tickFormatter={(val, index) => {
          if (isHourlyChart) {
            const day = gapFilteredChartData[index]?.day;
            if (day && val) {
              // API returns time in UTC format (HH:00 or HH:MM), combine with day to create UTC date
              // Then convert to local time for display
              // Handle both hourly (HH:00) and minute-level (HH:MM) formats
              const timeParts = val.split(':');
              const hours = timeParts[0] || '00';
              const minutes = timeParts[1] || '00';
              const utcDateString = `${day}T${hours}:${minutes}:00Z`;
              const utcDate = new Date(utcDateString);
              // formatTime will convert to local time automatically
              return formatTime(utcDate);
            }
            return val;
          } else {
            return formatDisplayDate(val);
          }
        }}
      />
      <YAxis
        domain={yAxisDomain || ['auto', 'auto']}
        tickFormatter={value => {
          // Format large numbers compactly for Y-axis to prevent overflow
          const numValue =
            typeof value === 'number' ? value : parseFloat(String(value)) || 0;
          if (numValue === 0) return '0';
          if (numValue < 1000) return numValue.toFixed(0);
          if (numValue < 1000000) return `${(numValue / 1000).toFixed(1)}K`;
          if (numValue < 1000000000)
            return `${(numValue / 1000000).toFixed(1)}M`;
          if (numValue < 1000000000000)
            return `${(numValue / 1000000000).toFixed(1)}B`;
          return `${(numValue / 1000000000000).toFixed(1)}T`;
        }}
      />
      <Tooltip
        formatter={(value, name) => {
          // Format value with full number (not abbreviated) in tooltip
          const numValue =
            typeof value === 'number' ? value : parseFloat(String(value)) || 0;
          const formattedValue = numValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return [formattedValue, name];
        }}
        labelFormatter={(label, payload) => {
          if (isHourlyChart && payload && payload[0]) {
            const day = payload[0].payload?.day;
            if (day && label) {
              // API returns time in UTC format (HH:00 or HH:MM), combine with day to create UTC date
              // Then convert to local time for display
              // Handle both hourly (HH:00) and minute-level (HH:MM) formats
              const timeParts = String(label).split(':');
              const hours = timeParts[0] || '00';
              const minutes = timeParts[1] || '00';
              const utcDateString = `${day}T${hours}:${minutes}:00Z`;
              const utcDate = new Date(utcDateString);
              // formatTime will convert to local time automatically
              return formatTime(utcDate);
            }
          }
          return formatDisplayDate(label);
        }}
      />
      <Legend />
      <defs>
        <linearGradient id="colorMoneyIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorMoneyOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorWager" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8A7FFF" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#8A7FFF" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="moneyIn"
        stroke="#a855f7"
        strokeWidth={3}
        fill="url(#colorMoneyIn)"
        stackId="1"
      />
      <Area
        type="monotone"
        dataKey="moneyOut"
        stroke="#3b82f6"
        strokeWidth={3}
        fill="url(#colorMoneyOut)"
        stackId="2"
      />
      <Area
        type="monotone"
        dataKey="jackpot"
        stroke="#8A7FFF"
        strokeWidth={3}
        fill="url(#colorWager)"
        stackId="3"
      />
      <Area
        type="monotone"
        dataKey="gross"
        stroke="#f97316"
        strokeWidth={3}
        fill="url(#colorGross)"
        stackId="1"
      />
    </AreaChart>
  );

  return (
    <div className="rounded-lg bg-container p-0 shadow-md">
      {/* Mobile: Make chart horizontally scrollable without padding */}
      <div className="touch-pan-x overflow-x-auto md:hidden">
        <div className="min-w-[600px]">
          <ResponsiveContainer width="100%" height={320}>
            {chartJSX}
          </ResponsiveContainer>
        </div>
      </div>
      {/* Desktop: Normal chart without horizontal scroll */}
      <div className="hidden md:block">
        <ResponsiveContainer width="100%" height={320}>
          {chartJSX}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
