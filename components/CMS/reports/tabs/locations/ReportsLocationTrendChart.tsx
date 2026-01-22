/**
 * Location Trend Chart Component
 * Line chart component displaying location trend data over time.
 *
 * Features:
 * - Location trend data visualization
 * - Multiple location support
 * - Configurable data keys (handle, winLoss, jackpot, plays, drop, gross)
 * - Hourly or daily time series
 * - Recharts line chart
 * - Responsive design
 * - Custom formatters
 *
 * @param title - Chart title
 * @param icon - Icon element
 * @param data - Array of location trend data
 * @param dataKey - Data key to display
 * @param locations - Array of location IDs
 * @param locationNames - Mapping of location IDs to names
 * @param colors - Array of colors for locations
 * @param formatter - Value formatter function
 * @param isHourly - Whether data is hourly
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { formatTrinidadTime } from '@/lib/utils/timezone';
import { TimePeriod, type ChartGranularity } from '@/shared/types/common';
import {
    formatDate,
    formatDisplayDate,
    formatTime12Hour,
} from '@/shared/utils/dateFormat';
import React, { useMemo } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

type ReportsLocationTrendChartProps = {
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
  timePeriod?: TimePeriod;
  granularity?: ChartGranularity;
};

export function ReportsLocationTrendChart({
  title,
  icon,
  data,
  dataKey,
  locations,
  locationNames,
  colors,
  formatter,
  isHourly = false,
  timePeriod,
  granularity,
}: ReportsLocationTrendChartProps) {


  // Debug: Log raw data for jackpot to investigate missing data points
  React.useEffect(() => {
    if (dataKey === 'jackpot' && data.length > 0) {
      const jackpotDataPoints = data.filter(item =>
        locations.some(locId => {
          const locData = item[locId];
          return (
            typeof locData === 'object' &&
            locData !== null &&
            (locData.jackpot || 0) > 0
          );
        })
      );
      console.log(`[LocationTrendChart] ${title} - Raw Data Analysis`, {
        dataKey,
        totalDataPoints: data.length,
        jackpotDataPoints: jackpotDataPoints.length,
        sampleRawData: data.slice(0, 3).map(item => ({
          day: item.day,
          time: item.time,
          locations: locations.map(locId => ({
            id: locId,
            name: locationNames?.[locId],
            data: item[locId],
          })),
        })),
        sampleJackpotPoints: jackpotDataPoints.slice(0, 5).map(item => ({
          day: item.day,
          time: item.time,
          locations: locations.map(locId => ({
            name: locationNames?.[locId],
            jackpot: (item[locId] as { jackpot?: number })?.jackpot || 0,
          })),
        })),
      });
    }
  }, [data, dataKey, locations, locationNames, title]);
  // Determine formatting based on time period (matching dashboard chart logic)
  const shouldShowTimes = useMemo(() => {
    // Explicitly check for 7d and 30d - always use daily format
    if (
      timePeriod === '7d' ||
      timePeriod === '30d' ||
      timePeriod === 'last7days' ||
      timePeriod === 'last30days'
    ) {
      return false;
    }

    if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
      // Show times if granularity is set (minute or hourly) OR if isHourly
      return granularity === 'minute' || granularity === 'hourly' || isHourly;
    }

    if (timePeriod === 'Custom') {
      // Check if custom range spans only one day by examining the data
      const uniqueDays = new Set(data.map(d => d.day).filter(Boolean));
      if (uniqueDays.size === 1) {
        // Show times if granularity is set OR if we have time data
        return (
          granularity === 'minute' ||
          granularity === 'hourly' ||
          isHourly ||
          data.some(d => d.time)
        );
      }
      return false;
    }

    return false; // Show dates for Quarterly, All Time
  }, [timePeriod, data, granularity, isHourly]);

  // Detect monthly data by checking if day field matches "YYYY-MM" pattern
  const hasMonthlyData = useMemo(() => {
    return data.some(d => {
      const day = d.day;
      if (!day || typeof day !== 'string') return false;
      // Check if day matches monthly format "YYYY-MM"
      return /^\d{4}-\d{2}$/.test(day);
    });
  }, [data]);

  const shouldShowMonths =
    timePeriod === 'Quarterly' || hasMonthlyData || granularity === 'monthly';

  // Detect if chart data has minute-level detail (HH:MM format with non-zero minutes)
  const hasMinuteLevelData = useMemo(() => {
    return data.some(d => {
      const time = d.time;
      if (!time) return false;
      const timeParts = time.split(':');
      if (timeParts.length !== 2) return false;
      const minutes = parseInt(timeParts[1], 10);
      return !isNaN(minutes) && minutes !== 0; // Has non-zero minutes (not HH:00)
    });
  }, [data]);

  // Transform data for the chart
  // If granularity is 'hourly' but data has minute-level detail, aggregate by hour
  const chartData = useMemo(() => {
    // If granularity is hourly and we have minute-level data, aggregate by hour
    if (granularity === 'hourly' && hasMinuteLevelData && shouldShowTimes) {
      const hourlyData: Record<string, Record<string, string | number>> = {};

      data.forEach(item => {
        if (!item.time) return;

        // Extract hour from time (e.g., "14:30" -> "14:00", "09:58" -> "09:00")
        const timeParts = item.time.split(':');
        const hours = timeParts[0] || '00';
        const hour = `${hours}:00`;
        const key = `${item.day}_${hour}`;

        if (!hourlyData[key]) {
          hourlyData[key] = {
            xValue: hour,
            day: item.day,
            time: hour,
          };

          // Initialize all location values to 0
          locations.forEach(locationId => {
            const displayName = locationNames?.[locationId] || locationId;
            hourlyData[key][displayName] = 0;
          });
        }

        // Sum values for each location
        locations.forEach(locationId => {
          const displayName = locationNames?.[locationId] || locationId;
          const locationData = item[locationId];
          if (typeof locationData === 'object' && locationData !== null) {
            const value = locationData[dataKey] || 0;
            hourlyData[key][displayName] =
              (hourlyData[key][displayName] as number) + value;
          }
        });
      });

      // Convert to array and sort by day and time
      return Object.values(hourlyData).sort((a, b) => {
        const dayA = new Date(a.day as string).getTime();
        const dayB = new Date(b.day as string).getTime();
        if (dayA !== dayB) return dayA - dayB;
        const timeA = (a.time as string).split(':').map(Number);
        const timeB = (b.time as string).split(':').map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });
    }

    // Otherwise, use data as-is
    // For minute granularity, always use time (even if isHourly is false)
    // For hourly granularity, use time if isHourly is true
    // Otherwise, use day
    const shouldUseTime =
      granularity === 'minute' ||
      (granularity === 'hourly' && isHourly) ||
      (!granularity && isHourly);
    return data.map(item => {
      const transformed: Record<string, string | number> = {
        xValue: shouldUseTime ? item.time || '' : item.day,
        day: item.day,
        time: item.time || '',
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
  }, [
    data,
    locations,
    locationNames,
    dataKey,
    isHourly,
    granularity,
    hasMinuteLevelData,
    shouldShowTimes,
  ]);

  // Filter data to exclude $0 values (but keep cents like $0.30)
  // For financial metrics (drop, gross, jackpot, handle, winLoss), filter out $0 but keep cents
  // For non-financial metrics (plays), filter out 0
  // If there's only 1 data point after filtering, include the previous point (even if 0)
  const filteredData = useMemo(() => {
    const isFinancialMetric = [
      'drop',
      'gross',
      'jackpot',
      'handle',
      'winLoss',
    ].includes(dataKey);
    const threshold = isFinancialMetric ? 0.01 : 0; // For financial metrics, filter out < $0.01

    const filtered = chartData.filter(item => {
      // Check if at least one location has a value above the threshold
      return locations.some(locationId => {
        const displayName = locationNames?.[locationId] || locationId;
        const value = item[displayName];
        if (typeof value !== 'number') return false;
        // For financial metrics, keep if >= 0.01 (filters out $0 but keeps cents)
        // For non-financial metrics (plays), keep if > 0
        return value >= threshold;
      });
    });

    // If there's only 1 data point after filtering, include the previous point before it (even if 0)
    if (filtered.length === 1 && chartData.length > 1) {
      // Find the index of the filtered point in the original chartData
      const filteredPoint = filtered[0];
      const filteredIndex = chartData.findIndex(
        item =>
          item.day === filteredPoint.day && item.time === filteredPoint.time
      );

      if (filteredIndex > 0) {
        // Get the previous data point from chartData
        const previousPoint = chartData[filteredIndex - 1];
        // Create a copy with all location values set to 0
        const previousPointWithZeros: Record<string, string | number> = {
          xValue:
            previousPoint.xValue ||
            (shouldShowTimes ? previousPoint.time || '' : previousPoint.day),
          day: previousPoint.day,
          time: previousPoint.time || '',
        };

        // Set all location values to 0 for the previous point
        locations.forEach(locationId => {
          const displayName = locationNames?.[locationId] || locationId;
          previousPointWithZeros[displayName] = 0;
        });

        // Insert previous point at the beginning and sort to maintain chronological order
        const result = [previousPointWithZeros, ...filtered];
        // Sort by day and time to ensure correct order
        return result.sort((a, b) => {
          const dayA = new Date(a.day as string).getTime();
          const dayB = new Date(b.day as string).getTime();
          if (dayA !== dayB) return dayA - dayB;
          const timeA = ((a.time as string) || '').split(':').map(Number);
          const timeB = ((b.time as string) || '').split(':').map(Number);
          return (
            (timeA[0] || 0) * 60 +
            (timeA[1] || 0) -
            ((timeB[0] || 0) * 60 + (timeB[1] || 0))
          );
        });
      }
    }

    return filtered;
  }, [chartData, locations, locationNames, shouldShowTimes, dataKey]);

  // Calculate Y-axis domain from all location values to ensure all lines are visible
  // Similar to dashboard chart logic
  const yAxisDomain = useMemo(() => {
    const allValues: number[] = [];
    filteredData.forEach(item => {
      locations.forEach(locationId => {
        const displayName = locationNames?.[locationId] || locationId;
        const value = item[displayName];
        if (typeof value === 'number') {
          allValues.push(value);
        }
      });
    });

    if (allValues.length > 0) {
      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);

      // Calculate domain: only go negative if data actually goes negative
      // Add 10% padding to the top, but don't go below 0 unless data actually goes negative
      return [
        minValue < 0 ? minValue * 1.1 : 0,
        maxValue > 0 ? maxValue * 1.1 : 0,
      ] as [number, number];
    }

    return undefined;
  }, [filteredData, locations, locationNames]);

  // Calculate width based on data length to ensure points have enough space
  // 60px per data point gives enough room for labels
  const minWidth = Math.max(700, filteredData.length * 60);



  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {icon}
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="w-full pb-6">
          {/* Fixed Legend outside scroll container */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b pb-4">
            {locations.map((locationId, index) => {
              const displayName = locationNames?.[locationId] || locationId;
              const color = colors[index % colors.length];
              return (
                <div key={locationId} className="flex items-center gap-2">
                  <div
                    className="h-0.5 w-4"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scrollable Container for both Mobile and Desktop */}
          <div
            className="touch-pan-x overflow-x-auto overflow-y-hidden"
          >
            <div style={{ minWidth: `${minWidth}px`, width: '100%' }}>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={filteredData}
                  margin={{ top: 5, right: 30, bottom: 80, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={shouldShowTimes ? 'time' : 'day'}
                    tickFormatter={(val, index) => {
                      if (shouldShowTimes) {
                        // For Today/Yesterday/Custom single day: show times ONLY (no date, no seconds)
                        const day = filteredData[index]?.day;
                        if (day && val) {
                          // Handle both hourly (HH:00) and minute-level (HH:MM) formats
                          // API returns times in UTC format
                          const timeParts = (val as string).split(':');
                          const hours = timeParts[0] || '00';
                          const minutes = timeParts[1] || '00';
                          const utcDateString = `${day}T${hours}:${minutes}:00Z`;
                          const utcDate = new Date(utcDateString);
                          // Convert UTC to Trinidad time (UTC-4) for display
                          // Force time only format: "8:00 AM"
                          return formatTrinidadTime(utcDate, {
                            year: undefined,
                            month: undefined,
                            day: undefined,
                            hour: 'numeric',
                            minute: '2-digit',
                            second: undefined,
                            hour12: true,
                          });
                        }
                        return formatTime12Hour(val as string);
                      } else if (shouldShowMonths) {
                        // For Quarterly or monthly granularity: show months
                        const dayValue = String(
                          filteredData[index]?.day || (val as string)
                        );

                        // Check if this is monthly data (format: "YYYY-MM")
                        if (/^\d{4}-\d{2}$/.test(dayValue)) {
                          // Format as "Oct 2025" for monthly granularity
                          const date = new Date(dayValue + '-01'); // Add day to make valid date
                          if (!isNaN(date.getTime())) {
                            return formatDate(date, {
                              month: 'short',
                              year: 'numeric',
                            });
                          }
                        }

                        // Fallback: try to parse as date
                        const date = new Date(val as string);
                        if (!isNaN(date.getTime())) {
                          return formatDate(date, {
                            month: 'short',
                            year: 'numeric',
                          });
                        }
                        return String(val);
                      } else {
                        // For 7d, 30d, All Time: show dates
                        return formatDisplayDate(val);
                      }
                    }}
                    interval={
                      shouldShowTimes && hasMinuteLevelData
                        ? undefined
                        : shouldShowTimes
                          ? undefined
                          : 'preserveStartEnd'
                    }
                    minTickGap={
                      shouldShowTimes &&
                      hasMinuteLevelData &&
                      granularity === 'minute'
                        ? 30
                        : shouldShowTimes && hasMinuteLevelData
                          ? 30
                          : shouldShowTimes && granularity === 'hourly'
                            ? 60
                            : shouldShowTimes
                              ? 60
                              : undefined
                    }
                    angle={
                      shouldShowTimes && filteredData.length > 15
                        ? -45
                        : undefined
                    }
                    textAnchor={
                      shouldShowTimes && filteredData.length > 15
                        ? 'end'
                        : undefined
                    }
                  />
                  <YAxis
                    domain={yAxisDomain || ['auto', 'auto']}
                    tickFormatter={value => {
                      // Format large numbers compactly for Y-axis to prevent overflow (like dashboard chart)
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
                    formatter={(value: number) => [formatter(value), '']}
                    labelFormatter={(label, payload) => {
                      if (shouldShowTimes && payload && payload[0]) {
                        const day = payload[0].payload?.day;
                        if (day && label) {
                          const timeParts = String(label).split(':');
                          const hours = timeParts[0] || '00';
                          const minutes = timeParts[1] || '00';
                          const utcDateString = `${day}T${hours}:${minutes}:00Z`;
                          const utcDate = new Date(utcDateString);
                          return formatTrinidadTime(utcDate, {
                            year: undefined,
                            month: undefined,
                            day: undefined,
                            hour: 'numeric',
                            minute: '2-digit',
                            second: undefined,
                            hour12: true,
                          });
                        }
                        return formatTime12Hour(label as string);
                      } else if (shouldShowMonths) {
                        const payloadDay = payload?.[0]?.payload?.day;
                        const dayValue = payloadDay || (label as string);
                        if (/^\d{4}-\d{2}$/.test(dayValue)) {
                          const date = new Date(dayValue + '-01');
                          if (!isNaN(date.getTime())) {
                            return formatDate(date, {
                              month: 'short',
                              year: 'numeric',
                            });
                          }
                        }
                        const date = new Date(label as string);
                        if (!isNaN(date.getTime())) {
                          return formatDate(date, {
                            month: 'short',
                            year: 'numeric',
                          });
                        }
                        return String(label);
                      } else {
                        const date = new Date(label as string);
                        if (!isNaN(date.getTime())) {
                          return formatDisplayDate(label as string);
                        }
                        return label as string;
                      }
                    }}
                  />
                  {locations.map((locationId, index) => {
                    const displayName =
                      locationNames?.[locationId] || locationId;
                    return (
                      <Line
                        key={locationId}
                        type="monotone"
                        dataKey={displayName}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name={displayName}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

