/**
 * Games Performance Revenue Chart Component
 * Bar chart component displaying games performance revenue metrics.
 *
 * Features:
 * - Games revenue data visualization
 * - Metrics: Total Drop %, Total Cancelled Credits %, Total Gross %
 * - Recharts bar chart
 * - Responsive design
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Separator } from '@/components/shared/ui/separator';
import { type MachineEvaluationData } from '@/lib/types';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import ChartItemBreakdownModal from '@/components/shared/ui/modals/ChartItemBreakdownModal';
import { ReportsGameMultiSelect } from './ReportsGameMultiSelect';
import { ReportsGamesRevenueTooltip } from './ReportsGamesRevenueTooltip';
import { useGamesRevenueData } from './useGamesRevenueData';

export type GamesPerformanceData = {
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

type ReportsGamesPerformanceRevenueChartProps = {
  data: GamesPerformanceData[];
  allMachines?: MachineEvaluationData[];
};

export default function ReportsGamesPerformanceRevenueChart({
  data: initialData,
  allMachines = [],
}: ReportsGamesPerformanceRevenueChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and aggregation state
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    'all-games',
  ]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  // Metric selection state - revenue charts only show 3 metrics by default
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Total Drop %',
    'Total Canc. Cr. %',
    'Total Gross %',
  ]);

  // Modal state for location breakdown
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedItemForBreakdown, setSelectedItemForBreakdown] = useState<{
    name: string;
    totalMetrics: {
      coinIn: number;
      netWin: number;
      drop: number;
      gross: number;
      cancelledCredits: number;
      gamesPlayed: number;
    };
    totalMachinesCount: number;
  } | null>(null);

  // Initialize selected games only on initial data load
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (
      initialData.length > 0 &&
      !hasInitialized.current &&
      selectedGames.length === 0
    ) {
      setSelectedGames(initialData.map(d => d.gameName));
      hasInitialized.current = true;
    }
  }, [initialData, selectedGames.length]);

  // Handle filter button toggles
  const handleFilterToggle = (filter: string) => {
    setSelectedFilters(prev => {
      if (filter === 'all-games') {
        return ['all-games'];
      }

      const newFilters = prev.filter(f => f !== 'all-games');
      if (newFilters.includes(filter)) {
        const filtered = newFilters.filter(f => f !== filter);
        return filtered.length === 0 ? ['all-games'] : filtered;
      } else {
        return [...newFilters, filter];
      }
    });
  };

  // Use custom hook for data processing
  const { aggregatedData, filteredData, chartData, minWidth } =
    useGamesRevenueData({
      initialData,
      allMachines,
      selectedFilters,
      selectedGames,
    });

  // Track previous filter state to detect filter changes
  const prevFiltersRef = useRef<string[]>(selectedFilters);

  // Sync selected games when filters change
  useEffect(() => {
    if (aggregatedData.length === 0) return;

    const availableGames = aggregatedData.map(d => d.gameName);
    const isAllSelected = selectedFilters.includes('all-games');

    // Check if filter actually changed (not just a re-render)
    const filterChanged =
      prevFiltersRef.current.join(',') !== selectedFilters.join(',');
    const switchedToAll = filterChanged && isAllSelected;
    const switchedToFilter = filterChanged && !isAllSelected;

    // Update previous filters
    prevFiltersRef.current = selectedFilters;

    // Only auto-select all games when switching TO "All" (not when already selected)
    // This allows users to manually uncheck items when "All" is selected
    if (switchedToAll) {
      setSelectedGames(availableGames);
      return;
    }

    // Remove selected items that are no longer in the filtered list
    const validSelections = selectedGames.filter(g =>
      availableGames.includes(g)
    );

    // If filter changed to a specific filter (Top 5, Bottom 5) and nothing is selected, auto-select
    // This handles: All → Top 5, All → Bottom 5, Top 5 → Bottom 5, etc.
    if (switchedToFilter && validSelections.length === 0) {
      setSelectedGames(availableGames);
    } else if (validSelections.length !== selectedGames.length) {
      // Update selections to only include valid ones (cleanup invalid selections)
      setSelectedGames(validSelections);
    }
  }, [aggregatedData, selectedFilters, selectedGames]);

  // Search suggestions - only from filtered data
  const gameSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase().trim();
    return filteredData
      .map((item, index) => ({
        gameName: item.gameName,
        index,
      }))
      .filter(item => item.gameName.toLowerCase().includes(searchLower))
      .slice(0, 10);
  }, [filteredData, searchTerm]);

  const handleSelectAll = () => {
    const allSelected =
      selectedGames.length === aggregatedData.length &&
      aggregatedData.length > 0;
    if (allSelected) {
      setSelectedGames([]);
    } else {
      setSelectedGames(aggregatedData.map(d => d.gameName));
    }
  };

  const handleGameToggle = (gameName: string) => {
    setSelectedGames(prev =>
      prev.includes(gameName)
        ? prev.filter(g => g !== gameName)
        : [...prev, gameName]
    );
  };

  // Handle focus - find game and scroll to it
  const handleFocus = () => {
    if (!searchTerm || !scrollRef.current || chartData.length === 0) return;

    const searchLower = searchTerm.toLowerCase().trim();
    const index = chartData.findIndex(item => {
      const fullName = item.fullGameName?.toLowerCase() || '';
      const displayName = item.gameName?.toLowerCase() || '';
      return (
        fullName.includes(searchLower) || displayName.includes(searchLower)
      );
    });

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

  if (!initialData || initialData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Games&apos; Performance Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No games performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

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
    { label: 'Total Drop %', color: colors[0] },
    { label: 'Total Canc. Cr. %', color: colors[1] },
    { label: 'Total Gross %', color: colors[2] },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Games&apos; Performance Revenue</CardTitle>
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
                        // Find index in chartData directly
                        const chartIndex = chartData.findIndex(
                          chartItem =>
                            chartItem.fullGameName?.toLowerCase() ===
                              item.gameName.toLowerCase() ||
                            chartItem.gameName?.toLowerCase() ===
                              item.gameName.toLowerCase()
                        );
                        if (chartIndex !== -1 && scrollRef.current) {
                          setFocusedIndex(chartIndex);
                          const containerWidth = scrollRef.current.clientWidth;
                          const slotWidth = minWidth / chartData.length;
                          const targetScroll =
                            (chartIndex + 0.5) * slotWidth - containerWidth / 2;
                          scrollRef.current.scrollTo({
                            left: Math.max(0, targetScroll),
                            behavior: 'smooth',
                          });
                        } else {
                          setTimeout(() => handleFocus(), 0);
                        }
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
      <CardContent className="p-6 pb-0 pt-0">
        {/* Metric selection checkboxes */}
        <div className="mb-4 overflow-x-auto border-b pb-3 md:mb-6 md:pb-4">
          <div className="flex min-w-max flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-x-6">
            {legendItems.map(item => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 md:gap-2"
              >
                <Checkbox
                  id={`metric-revenue-${item.label}`}
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
                  className="h-3.5 w-3.5 border-2 md:h-4 md:w-4"
                  style={{
                    borderColor: item.color,
                    backgroundColor: selectedMetrics.includes(item.label)
                      ? item.color
                      : 'transparent',
                  }}
                />
                <Label
                  htmlFor={`metric-revenue-${item.label}`}
                  className="cursor-pointer text-[10px] font-medium text-gray-700 md:text-xs"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Filters - Visible on mobile */}
        <div className="mb-4 space-y-3 lg:hidden">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Filter Options
            </Label>
            <Select
              value={
                selectedFilters.includes('all-games')
                  ? 'all-games'
                  : selectedFilters.includes('top-5-games')
                    ? 'top-5-games'
                    : selectedFilters.includes('bottom-5-games')
                      ? 'bottom-5-games'
                      : 'all-games'
              }
              onValueChange={value => {
                if (value === 'all-games') {
                  setSelectedFilters(['all-games']);
                } else {
                  setSelectedFilters([value]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-games">All Games</SelectItem>
                <SelectItem value="top-5-games">Top 5 Games</SelectItem>
                <SelectItem value="bottom-5-games">Bottom 5 Games</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Select Games
            </Label>
            <ReportsGameMultiSelect
              games={aggregatedData.map(d => ({
                id: d.gameName,
                name: d.gameName,
              }))}
              selectedGames={selectedGames}
              onSelectionChange={setSelectedGames}
              placeholder="Select games..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="hidden w-full shrink-0 space-y-4 lg:block lg:w-64 lg:space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">
                Game Filters
              </h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-games-revenue"
                    checked={selectedFilters.includes('all-games')}
                    onCheckedChange={() => handleFilterToggle('all-games')}
                  />
                  <Label
                    htmlFor="all-games-revenue"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    All Games
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="top-5-games-revenue"
                    checked={selectedFilters.includes('top-5-games')}
                    onCheckedChange={() => handleFilterToggle('top-5-games')}
                  />
                  <Label
                    htmlFor="top-5-games-revenue"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Top 5 Games
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bottom-5-games-revenue"
                    checked={selectedFilters.includes('bottom-5-games')}
                    onCheckedChange={() => handleFilterToggle('bottom-5-games')}
                  />
                  <Label
                    htmlFor="bottom-5-games-revenue"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Bottom 5 Games
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Games</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-revenue"
                    checked={
                      selectedGames.length === aggregatedData.length &&
                      aggregatedData.length > 0
                    }
                    onCheckedChange={() => handleSelectAll()}
                  />
                  <Label
                    htmlFor="select-all-revenue"
                    className="text-xs font-medium text-gray-500"
                  >
                    Select All
                  </Label>
                </div>
              </div>
              <div className="flex max-h-[450px] flex-col gap-3 overflow-y-auto pr-2 text-xs">
                {aggregatedData.map(item => (
                  <div
                    key={item.gameName}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`game-revenue-${item.gameName}`}
                      checked={selectedGames.includes(item.gameName)}
                      onCheckedChange={() => handleGameToggle(item.gameName)}
                    />
                    <Label
                      htmlFor={`game-revenue-${item.gameName}`}
                      className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {item.gameName}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div
              ref={scrollRef}
              className="relative touch-pan-x overflow-x-auto"
            >
              <div
                ref={containerRef}
                style={{ minWidth: `${minWidth}px`, width: '100%' }}
              >
                <ResponsiveContainer width="100%" height={600}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    onClick={(data: unknown) => {
                      // Recharts onClick receives an object with activeLabel and activePayload
                      const clickData = data as {
                        activeLabel?: string;
                        activePayload?: Array<{
                          payload: (typeof chartData)[0];
                        }>;
                      };
                      if (
                        clickData?.activePayload &&
                        clickData.activePayload[0]?.payload
                      ) {
                        const payload = clickData.activePayload[0].payload;
                        const itemData = chartData.find(
                          d => d.fullGameName === payload.fullGameName
                        );
                        if (itemData && itemData.totalMetrics) {
                          setSelectedItemForBreakdown({
                            name: itemData.fullGameName,
                            totalMetrics: itemData.totalMetrics,
                            totalMachinesCount:
                              itemData.totalMachinesCount || 0,
                          });
                          setBreakdownModalOpen(true);
                        }
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="gameName"
                      tick={{ fontSize: 11, fill: '#666' }}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickLine={{ stroke: '#e0e0e0' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#666' }}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickLine={{ stroke: '#e0e0e0' }}
                      width={40}
                      label={{
                        value: 'Percentage %',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 10,
                        style: {
                          textAnchor: 'middle',
                          fontSize: 11,
                          fill: '#666',
                        },
                      }}
                    />
                    <Tooltip
                      content={
                        <ReportsGamesRevenueTooltip
                          chartContainerRef={containerRef}
                        />
                      }
                      wrapperStyle={{ zIndex: 9999 }}
                      cursor={{ fill: '#f4f4f5', opacity: 0.4 }}
                    />
                    {focusedIndex !== null &&
                      focusedIndex >= 0 &&
                      focusedIndex < chartData.length &&
                      chartData[focusedIndex] && (
                        <ReferenceArea
                          x1={chartData[focusedIndex].gameName}
                          x2={chartData[focusedIndex].gameName}
                          fill="#FFA203"
                          fillOpacity={0.2}
                          stroke="#FFA203"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          strokeOpacity={0.8}
                        />
                      )}
                    <Bar
                      dataKey="Total Drop %"
                      fill={colors[0]}
                      name="Total Drop %"
                      hide={!selectedMetrics.includes('Total Drop %')}
                      style={{
                        transition: 'opacity 0.3s ease-in-out',
                        cursor: 'pointer',
                      }}
                    />
                    <Bar
                      dataKey="Total Canc. Cr. %"
                      fill={colors[1]}
                      name="Total Canc. Cr. %"
                      hide={!selectedMetrics.includes('Total Canc. Cr. %')}
                      style={{
                        transition: 'opacity 0.3s ease-in-out',
                        cursor: 'pointer',
                      }}
                    />
                    <Bar
                      dataKey="Total Gross %"
                      fill={colors[2]}
                      name="Total Gross %"
                      hide={!selectedMetrics.includes('Total Gross %')}
                      style={{
                        transition: 'opacity 0.3s ease-in-out',
                        cursor: 'pointer',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Location Breakdown Modal */}
      {selectedItemForBreakdown && (
        <ChartItemBreakdownModal
          open={breakdownModalOpen}
          onOpenChange={setBreakdownModalOpen}
          itemName={selectedItemForBreakdown.name}
          itemType="game"
          allMachines={allMachines}
          totalMetrics={selectedItemForBreakdown.totalMetrics}
          totalMachinesCount={selectedItemForBreakdown.totalMachinesCount}
        />
      )}
    </Card>
  );
}

