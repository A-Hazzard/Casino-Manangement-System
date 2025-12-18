/**
 * Games Performance Chart Component
 * Bar chart component displaying games performance metrics.
 *
 * Features:
 * - Games performance data visualization
 * - Multiple metrics (Floor Positions %, Handle %, Win %, Drop %, Cancelled Credits %, Gross %)
 * - Recharts bar chart
 * - Responsive design
 * - Empty state handling
 *
 * @param data - Array of games performance data
 */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type GamesPerformanceData = {
  gameName: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalGamesPlayed: number;
  // Verification data
  rawTotals?: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  totalMetrics?: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  machineCount?: number;
  totalMachinesCount?: number;
};

type GamesPerformanceChartProps = {
  data: GamesPerformanceData[];
};

export function GamesPerformanceChart({ data }: GamesPerformanceChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate width based on data length to ensure bars have enough space
  // 60px per game gives enough room for labels and bars
  const minWidth = Math.max(600, data.length * 60);

  // Transform data for the chart - each game becomes a data point
  const chartData = data.map(item => {
    const maxLength = 15; // Maximum characters before truncation
    const displayName =
      item.gameName.length > maxLength
        ? `${item.gameName.substring(0, maxLength)}...`
        : item.gameName;

    return {
      gameName: displayName,
      fullGameName: item.gameName, // Keep full name for tooltip
      'Floor Positions %': item.floorPositions,
      'Total Handle %': item.totalHandle,
      'Total Win %': item.totalWin,
      'Total Drop %': item.totalDrop,
      'Total Canc. Cr. %': item.totalCancelledCredits,
      'Total Gross %': item.totalGross,
      'Total Games Played %': item.totalGamesPlayed,
      // Include verification data
      rawTotals: item.rawTotals,
      totalMetrics: item.totalMetrics,
      machineCount: item.machineCount,
      totalMachinesCount: item.totalMachinesCount,
    };
  });

  // Filter games based on search term
  const gameSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase().trim();
    return data
      .map((item, index) => ({
        gameName: item.gameName,
        index,
      }))
      .filter(item => item.gameName.toLowerCase().includes(searchLower))
      .slice(0, 10); // Limit to 10 suggestions
  }, [data, searchTerm]);

  // Handle focus - find game and scroll to it
  const handleFocus = () => {
    if (!searchTerm || !scrollRef.current) return;

    const index = chartData.findIndex(item =>
      item.fullGameName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (index !== -1) {
      setFocusedIndex(index);
      const containerWidth = scrollRef.current.clientWidth;
      const slotWidth = minWidth / chartData.length;
      const targetScroll = (index + 0.5) * slotWidth - containerWidth / 2;

      scrollRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    } else {
      setFocusedIndex(null);
    }
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Games Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No games performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
    coordinate,
  }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
      payload?: {
        fullGameName?: string;
        rawTotals?: GamesPerformanceData['rawTotals'];
        totalMetrics?: GamesPerformanceData['totalMetrics'];
        machineCount?: number;
        totalMachinesCount?: number;
      };
    }>;
    label?: string;
    coordinate?: { x?: number; y?: number };
  }) => {
    if (active && payload && payload.length) {
      // Get full game name and verification data from payload
      const fullGameName = payload[0]?.payload?.fullGameName || label;
      const rawTotals = payload[0]?.payload?.rawTotals;
      const totalMetrics = payload[0]?.payload?.totalMetrics;
      const machineCount = payload[0]?.payload?.machineCount;
      const totalMachinesCount = payload[0]?.payload?.totalMachinesCount;

      // Helper to format currency
      const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);

      // Helper to get raw value for a metric
      const getRawValue = (dataKey: string): number | null => {
        if (dataKey === 'Floor Positions %') {
          // For floor positions, return machine count
          return machineCount !== undefined ? machineCount : null;
        }

        if (!rawTotals) return null;

        const keyMap: Record<string, keyof typeof rawTotals> = {
          'Total Handle %': 'coinIn',
          'Total Win %': 'netWin',
          'Total Drop %': 'drop',
          'Total Canc. Cr. %': 'cancelledCredits',
          'Total Gross %': 'gross',
          'Total Games Played %': 'gamesPlayed',
        };

        const rawKey = keyMap[dataKey];
        return rawKey ? rawTotals[rawKey] : null;
      };

      // Helper to get total value for a metric
      const getTotalValue = (dataKey: string): number | null => {
        if (dataKey === 'Floor Positions %') {
          // For floor positions, return total machines count
          return totalMachinesCount !== undefined ? totalMachinesCount : null;
        }

        if (!totalMetrics) return null;

        const keyMap: Record<string, keyof typeof totalMetrics> = {
          'Total Handle %': 'coinIn',
          'Total Win %': 'netWin',
          'Total Drop %': 'drop',
          'Total Canc. Cr. %': 'cancelledCredits',
          'Total Gross %': 'gross',
          'Total Games Played %': 'gamesPlayed',
        };

        const totalKey = keyMap[dataKey];
        return totalKey ? totalMetrics[totalKey] : null;
      };

      // Helper to check if metric is currency-based
      const isCurrencyMetric = (dataKey: string) => {
        return (
          !dataKey.includes('Games Played') &&
          !dataKey.includes('Floor Positions')
        );
      };

      // Calculate tooltip position to stay within viewport
      const tooltipWidth = 384; // max-w-sm = 384px
      const tooltipHeight = 300; // approximate height
      const viewportWidth =
        typeof window !== 'undefined' ? window.innerWidth : 0;
      const viewportHeight =
        typeof window !== 'undefined' ? window.innerHeight : 0;

      const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'none',
      };

      if (coordinate?.x !== undefined && coordinate?.y !== undefined) {
        // Use the container ref for accurate positioning relative to the viewport
        const chartContainerRect =
          containerRef.current?.getBoundingClientRect();

        let x = coordinate.x;
        let y = coordinate.y;

        if (chartContainerRect) {
          x = chartContainerRect.left + coordinate.x;
          y = chartContainerRect.top + coordinate.y;
        }

        // Adjust x to prevent going off right edge
        if (x + tooltipWidth > viewportWidth) {
          x = viewportWidth - tooltipWidth - 10;
        }
        // Ensure it doesn't go off left edge
        if (x < 10) {
          x = 10;
        }

        // Smart vertical positioning: check if there's enough space below
        const spaceBelow = viewportHeight - y;
        const spaceAbove = y;

        // If there's not enough space below but enough space above, position tooltip above
        if (
          spaceBelow < tooltipHeight + 20 &&
          spaceAbove > tooltipHeight + 20
        ) {
          // Position tooltip above the coordinate point
          // Use transform: translateY(-100%) for accurate positioning regardless of content height
          y = y - 10;
          tooltipStyle.transform = 'translateY(-100%)';
        } else {
          // Default: position tooltip below (with some offset)
          y = y + 20;
        }

        // Final bounds checking to ensure tooltip stays within viewport
        if (y < 10) {
          y = 10;
          // If y is at top, we might need to remove the transform to prevent it going off top
          delete tooltipStyle.transform;
        }

        tooltipStyle.left = `${x}px`;
        tooltipStyle.top = `${y}px`;
      }

      return (
        <div
          className="z-[9999] w-80 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur-sm"
          style={tooltipStyle}
        >
          <p className="mb-4 truncate border-b pb-2 text-sm font-bold text-gray-900">
            {fullGameName}
          </p>
          <div className="space-y-2">
            {payload.map((entry, index) => {
              const rawValue = getRawValue(entry.dataKey);
              const totalValue = getTotalValue(entry.dataKey);
              const isCurrency = isCurrencyMetric(entry.dataKey);
              const isFloorPositions = entry.dataKey === 'Floor Positions %';

              return (
                <div
                  key={index}
                  className="border-b border-gray-100 pb-2 last:border-0"
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: entry.color }}
                  >
                    {entry.dataKey}: {entry.value.toFixed(2)}%
                  </p>
                  {rawValue !== null && totalValue !== null && (
                    <div className="ml-2 mt-1 space-y-1 text-xs text-gray-600">
                      {isFloorPositions ? (
                        <>
                          <p className="whitespace-nowrap">
                            • {machineCount || 0} machines of {totalValue} total
                          </p>
                          <p className="text-[10px] text-gray-400">
                            ({machineCount || 0} / {totalValue}) × 100
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="whitespace-nowrap">
                            •{' '}
                            {isCurrency
                              ? formatCurrency(rawValue)
                              : rawValue.toLocaleString()}{' '}
                            of{' '}
                            {isCurrency
                              ? formatCurrency(totalValue)
                              : totalValue.toLocaleString()}{' '}
                            total
                          </p>
                          {machineCount !== undefined && (
                            <p>
                              • {machineCount} machine
                              {machineCount !== 1 ? 's' : ''} contributing
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400">
                            (
                            {isCurrency
                              ? formatCurrency(rawValue)
                              : rawValue.toLocaleString()}{' '}
                            /{' '}
                            {isCurrency
                              ? formatCurrency(totalValue)
                              : totalValue.toLocaleString()}
                            ) × 100
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
  ];

  const legendItems = [
    { label: 'Floor Positions %', color: colors[0] },
    { label: 'Total Handle %', color: colors[1] },
    { label: 'Total Win %', color: colors[2] },
    { label: 'Total Drop %', color: colors[3] },
    { label: 'Total Canc. Cr. %', color: colors[4] },
    { label: 'Total Gross %', color: colors[5] },
    { label: 'Total Games Played %', color: colors[6] },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Games Performance</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <div className="relative w-full" ref={searchRef}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search game..."
                className="pl-9"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setFocusedIndex(null);
                  setShowSuggestions(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFocus();
                }}
              />
              {showSuggestions && gameSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
                  {gameSuggestions.map(item => (
                    <button
                      key={item.index}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setSearchTerm(item.gameName);
                        setShowSuggestions(false);
                        setTimeout(() => handleFocus(), 0);
                      }}
                    >
                      {item.gameName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleFocus} variant="secondary">
              Focus
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Fixed Legend outside scroll container */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b pb-4">
          {legendItems.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-gray-700">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable Container for both Mobile and Desktop */}
        <div
          ref={scrollRef}
          className="relative touch-pan-x overflow-x-auto overflow-y-hidden"
        >
          <div
            ref={containerRef}
            style={{ minWidth: `${minWidth}px`, width: '100%' }}
          >
            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="gameName"
                  tick={{ fontSize: 11, fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0} // Show all labels since we have scrolling
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  label={{
                    value: 'Percentage %',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 9999 }}
                />
                {focusedIndex !== null && chartData[focusedIndex] && (
                  <ReferenceArea
                    x1={chartData[focusedIndex].gameName}
                    x2={chartData[focusedIndex].gameName}
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                )}
                <Bar
                  dataKey="Floor Positions %"
                  fill={colors[0]}
                  name="Floor Positions %"
                />
                <Bar
                  dataKey="Total Handle %"
                  fill={colors[1]}
                  name="Total Handle %"
                />
                <Bar
                  dataKey="Total Win %"
                  fill={colors[2]}
                  name="Total Win %"
                />
                <Bar
                  dataKey="Total Drop %"
                  fill={colors[3]}
                  name="Total Drop %"
                />
                <Bar
                  dataKey="Total Canc. Cr. %"
                  fill={colors[4]}
                  name="Total Canc. Cr. %"
                />
                <Bar
                  dataKey="Total Gross %"
                  fill={colors[5]}
                  name="Total Gross %"
                />
                <Bar
                  dataKey="Total Games Played %"
                  fill={colors[6]}
                  name="Total Games Played %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
