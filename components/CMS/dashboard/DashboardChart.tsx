'use client';

import { Checkbox } from '@/components/shared/ui/checkbox';
import { Label } from '@/components/shared/ui/label';
import { DashboardChartSkeleton } from '@/components/shared/ui/skeletons/DashboardSkeletons';
import type { dashboardData } from '@/lib/types';
import { ChartProps } from '@/lib/types/components';
import {
    formatDate,
    formatDisplayDate,
    formatTime,
} from '@/shared/utils/dateFormat';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export default function Chart({
  loadingChartData,
  chartData,
  activeMetricsFilter,
  granularity,
}: ChartProps) {
  // State for selected metrics (all selected by default)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Money In',
    'Money Out',
    'Gross',
  ]);
  // Chart data received for rendering

  // Always show skeleton when loading or if we have no data state yet
  if (loadingChartData || chartData === null) {
    return <DashboardChartSkeleton />;
  }

  // Check if chartData is valid and has data
  const hasValidData =
    chartData && Array.isArray(chartData) && chartData.length > 0;

  // If we have no valid data after loading is complete, show no data message
  if (!hasValidData) {
    // Show no data message only if we're not in initial loading state
    // If totals is explicitly null or undefined AND we're not loading, show the message
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
      if (!isNaN(date.getTime())) {
        return date.getHours() * 60 + date.getMinutes();
      }
      // Fallback for independent time parsing
      const [h, m] = val.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    } catch {
      return 0;
    }
  };

  const parseDay = (val?: string) => {
    if (!val) return 0;
    try {
      // Explicitly handle YYYY-MM format for monthly data
      if (/^\d{4}-\d{2}$/.test(val)) {
        return new Date(`${val}-01`).getTime();
      }
      return new Date(val).getTime();
    } catch {
      return 0;
    }
  };

  // Determine if we should use hourly or daily formatting
  // Respects the granularity prop - if daily/weekly/monthly is set, use that instead of hourly
  const shouldUseHourlyFormat = () => {
    // If granularity is explicitly set to daily, weekly, or monthly, don't use hourly format
    if (
      granularity === 'daily' ||
      granularity === 'weekly' ||
      granularity === 'monthly'
    ) {
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

    // All other values (7d, 30d, last7days, last30days, etc.) use daily format
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
  const isMinuteLevel = hasMinuteLevelData();

  // For hourly charts, filter to only the most common day
  // BUT: For minute-level data, don't filter by day - show all data points
  // This ensures minute data for Today shows all waves, even if gaming day spans calendar days
  let dayFilteredChartData = chartData;
  if (isHourlyChart && !isMinuteLevel) {
    const dayCounts: Record<string, number> = {};
    chartData.forEach(d => {
      if (d.day) dayCounts[d.day] = (dayCounts[d.day] || 0) + 1;
    });
    const [mostCommonDay] =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || [];
    if (mostCommonDay) {
      dayFilteredChartData = chartData.filter(d => d.day === mostCommonDay);
    }
  }

  const sortedChartData = dayFilteredChartData.slice().sort((a, b) => {
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
  } else if (isMinuteLevel) {
    // For minute-level data, use data as-is (already processed in helper)
    // Just ensure proper sorting
    finalChartData = sortedChartData;
  }

  // Filter out $0 values for both minute and hourly views
  // For minute-level data: show ALL non-zero values (even if < $0.01) to show every minute with activity
  // For hourly/daily data: use $0.01 threshold to filter out noise
  const isMinuteLevelData = finalChartData.some(item => {
    if (!item.time) return false;
    const timeParts = item.time.split(':');
    if (timeParts.length !== 2) return false;
    const minutes = parseInt(timeParts[1], 10);
    return !isNaN(minutes) && minutes !== 0; // Has non-zero minutes
  });

  const filteredChartData = finalChartData.filter(item => {
    const moneyIn = item.moneyIn || 0;
    const moneyOut = item.moneyOut || 0;
    const gross = item.gross || 0;

    // For minute-level data: show any non-zero value (even tiny amounts)
    // For hourly/daily: use $0.01 threshold
    const threshold = isMinuteLevelData ? 0 : 0.01;

    const hasMoneyIn =
      selectedMetrics.includes('Money In') && moneyIn > threshold;
    const hasMoneyOut =
      selectedMetrics.includes('Money Out') && moneyOut > threshold;
    const hasGross = selectedMetrics.includes('Gross') && gross > threshold;

    return hasMoneyIn || hasMoneyOut || hasGross;
  });

  // Filter out leading and trailing zero-value entries to show only actual data range
  let trimmedChartData = filteredChartData;
  if (filteredChartData.length > 0) {
    // Find first non-zero entry based on selected metrics
    let firstNonZeroIndex = 0;
    for (let i = 0; i < filteredChartData.length; i++) {
      const item = filteredChartData[i];
      const hasData =
        (selectedMetrics.includes('Money In') && (item.moneyIn || 0) >= 0.01) ||
        (selectedMetrics.includes('Money Out') &&
          (item.moneyOut || 0) >= 0.01) ||
        (selectedMetrics.includes('Gross') && (item.gross || 0) >= 0.01);
      if (hasData) {
        firstNonZeroIndex = i;
        break;
      }
    }

    // Find last non-zero entry based on selected metrics
    let lastNonZeroIndex = filteredChartData.length - 1;
    for (let i = filteredChartData.length - 1; i >= 0; i--) {
      const item = filteredChartData[i];
      const hasData =
        (selectedMetrics.includes('Money In') && (item.moneyIn || 0) >= 0.01) ||
        (selectedMetrics.includes('Money Out') &&
          (item.moneyOut || 0) >= 0.01) ||
        (selectedMetrics.includes('Gross') && (item.gross || 0) >= 0.01);
      if (hasData) {
        lastNonZeroIndex = i;
        break;
      }
    }

    // Trim the data to only include the range with actual data
    trimmedChartData = filteredChartData.slice(
      firstNonZeroIndex,
      lastNonZeroIndex + 1
    );
  }

  // Filter out intermediate blank periods (where all selected metrics are zero)
  let gapFilteredChartData = trimmedChartData;
  if (trimmedChartData.length > 2) {
    gapFilteredChartData = [];

    for (let i = 0; i < trimmedChartData.length; i++) {
      const current = trimmedChartData[i];
      const previous = i > 0 ? trimmedChartData[i - 1] : null;
      const next =
        i < trimmedChartData.length - 1 ? trimmedChartData[i + 1] : null;

      // Check if current point has any activity for selected metrics
      const hasActivity =
        (selectedMetrics.includes('Money In') &&
          (current.moneyIn || 0) >= 0.01) ||
        (selectedMetrics.includes('Money Out') &&
          (current.moneyOut || 0) >= 0.01) ||
        (selectedMetrics.includes('Gross') && (current.gross || 0) >= 0.01);

      // Check if previous point has activity
      const previousHasActivity = previous
        ? (selectedMetrics.includes('Money In') &&
            (previous.moneyIn || 0) >= 0.01) ||
          (selectedMetrics.includes('Money Out') &&
            (previous.moneyOut || 0) >= 0.01) ||
          (selectedMetrics.includes('Gross') && (previous.gross || 0) >= 0.01)
        : false;

      // Check if next point has activity
      const nextHasActivity = next
        ? (selectedMetrics.includes('Money In') &&
            (next.moneyIn || 0) >= 0.01) ||
          (selectedMetrics.includes('Money Out') &&
            (next.moneyOut || 0) >= 0.01) ||
          (selectedMetrics.includes('Gross') && (next.gross || 0) >= 0.01)
        : false;

      // Check if current point values differ from previous
      const valuesChanged = previous
        ? (current.moneyIn || 0) !== (previous.moneyIn || 0) ||
          (current.moneyOut || 0) !== (previous.moneyOut || 0) ||
          (current.gross || 0) !== (previous.gross || 0)
        : true;

      // Keep the point if it's first/last, has activity, is a transition, or values changed
      const isFirstOrLast = i === 0 || i === trimmedChartData.length - 1;
      const isTransition =
        previousHasActivity !== hasActivity || nextHasActivity !== hasActivity;

      if (isFirstOrLast || hasActivity || isTransition || valuesChanged) {
        gapFilteredChartData.push(current);
      }
    }
  }

  // Calculate Y-axis domain from actual data based on selected metrics
  const allValues: number[] = [];
  gapFilteredChartData.forEach(item => {
    if (selectedMetrics.includes('Money In')) {
      allValues.push(item.moneyIn || 0);
    }
    if (selectedMetrics.includes('Money Out')) {
      allValues.push(item.moneyOut || 0);
    }
    if (selectedMetrics.includes('Gross')) {
      allValues.push(item.gross || 0);
    }
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

  // Calculate responsive minWidth - smaller on mobile to prevent horizontal overflow
  const minWidth = Math.max(600, gapFilteredChartData.length * 50);

  const legendItems = [
    { label: 'Money In', color: '#a855f7' },
    { label: 'Money Out', color: '#3b82f6' },
    { label: 'Gross', color: '#f97316' },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden rounded-lg bg-container p-4 shadow-md">
      {/* Metric selection checkboxes */}
      <div className="mb-6 overflow-x-auto border-b pb-4">
        <div className="flex min-w-max flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {legendItems.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <Checkbox
                id={`metric-${item.label}`}
                checked={selectedMetrics.includes(item.label)}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedMetrics(prev => [...prev, item.label]);
                  } else {
                    setSelectedMetrics(prev =>
                      prev.filter(m => m !== item.label)
                    );
                  }
                }}
                className="h-4 w-4 border-2"
                style={{
                  borderColor: item.color,
                  backgroundColor: selectedMetrics.includes(item.label)
                    ? item.color
                    : 'transparent',
                }}
              />
              <Label
                htmlFor={`metric-${item.label}`}
                className="cursor-pointer text-xs font-medium text-gray-700"
              >
                {item.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Container - Desktop only, Mobile fits viewport */}
      <div className="w-full max-w-full overflow-x-hidden lg:touch-pan-x lg:overflow-x-auto">
        <div
          className="w-full"
          style={{
            // On mobile: fit viewport, on desktop: use calculated minWidth
            minWidth: `clamp(100%, ${minWidth}px, 100%)`,
          }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={gapFilteredChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={
                  isHourlyChart
                    ? 'time'
                    : granularity === 'weekly' || granularity === 'monthly'
                      ? 'day'
                      : 'day'
                }
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
                    // For daily charts (7d, 30d, etc.), format the day value
                    // val should be the day string (e.g., "2025-11-16" or "2025-10" for monthly)
                    if (val) {
                      // Try to get the day from the data point if val is not a valid date string
                      const dataPoint = gapFilteredChartData[index];
                      const dayValue = dataPoint?.day || val;

                      // Check granularity first to determine data format
                      // Order matters: monthly comes before weekly since monthly is "YYYY-MM" and weekly is "YYYY-MM-DD"

                      // Check if this is monthly data (format: "YYYY-MM")
                      if (granularity === 'monthly') {
                        // Monthly data comes as "YYYY-MM" format from the API
                        const monthlyPattern = /^\d{4}-\d{2}$/;
                        if (monthlyPattern.test(dayValue)) {
                          // Format as "Oct 2025" for monthly granularity
                          const date = new Date(dayValue + '-01'); // Add day to make valid date
                          if (!isNaN(date.getTime())) {
                            return formatDate(date, {
                              month: 'short',
                              year: 'numeric',
                            });
                          }
                        }
                      }

                      // Check if this is weekly data
                      // Weekly data comes as the Monday of the week (format: "YYYY-MM-DD")
                      // We detect it by checking if granularity is 'weekly'
                      if (granularity === 'weekly') {
                        const date = new Date(dayValue);
                        if (!isNaN(date.getTime())) {
                          // Calculate week number within the month (1-5)
                          const weekStart = date;
                          const monthStart = new Date(
                            weekStart.getFullYear(),
                            weekStart.getMonth(),
                            1
                          );
                          const daysDiff =
                            Math.floor(
                              (weekStart.getTime() - monthStart.getTime()) /
                                (1000 * 60 * 60 * 24)
                            ) + 1;
                          const weekNumber = Math.ceil(daysDiff / 7);

                          // Format as "Week d of m" (e.g., "Week 1 of Oct")
                          return `Week ${weekNumber} of ${formatDate(
                            weekStart,
                            {
                              month: 'short',
                            }
                          )}`;
                        }
                      }

                      // Validate and format the date for daily charts
                      const date = new Date(dayValue);
                      if (!isNaN(date.getTime())) {
                        return formatDisplayDate(date);
                      }
                      // If val is already a formatted string, return it
                      return String(val);
                    }
                    return '';
                  }
                }}
              />
              <YAxis
                domain={yAxisDomain || ['auto', 'auto']}
                tickFormatter={value => {
                  // Format large numbers compactly for Y-axis to prevent overflow
                  const numValue =
                    typeof value === 'number'
                      ? value
                      : parseFloat(String(value)) || 0;
                  if (numValue === 0) return '0';
                  if (numValue < 1000) return numValue.toFixed(0);
                  if (numValue < 1000000)
                    return `${(numValue / 1000).toFixed(1)}K`;
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
                    typeof value === 'number'
                      ? value
                      : parseFloat(String(value)) || 0;
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
                      // Check if date is valid before formatting
                      if (isNaN(utcDate.getTime())) {
                        return String(label);
                      }
                      // formatTime will convert to local time automatically
                      return formatTime(utcDate);
                    }
                  }
                  // Validate label before formatting
                  if (!label) {
                    return '';
                  }
                  // Try to get day from payload if available (for daily charts)
                  if (payload && payload[0] && payload[0].payload?.day) {
                    const day = payload[0].payload.day;
                    const testDate = new Date(day);
                    if (!isNaN(testDate.getTime())) {
                      return formatDisplayDate(day);
                    }
                  }
                  // Try to parse and validate the label as a date
                  const testDate = new Date(String(label));
                  if (!isNaN(testDate.getTime())) {
                    return formatDisplayDate(label);
                  }
                  // Fallback to string representation if label is not a valid date
                  return String(label);
                }}
              />
              <defs>
                <linearGradient id="colorMoneyIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMoneyOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              {selectedMetrics.includes('Money In') && (
                <Area
                  type="monotone"
                  dataKey="moneyIn"
                  stroke="#a855f7"
                  strokeWidth={3}
                  fill="url(#colorMoneyIn)"
                />
              )}
              {selectedMetrics.includes('Money Out') && (
                <Area
                  type="monotone"
                  dataKey="moneyOut"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#colorMoneyOut)"
                />
              )}
              {selectedMetrics.includes('Gross') && (
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="#f97316"
                  strokeWidth={3}
                  fill="url(#colorGross)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
