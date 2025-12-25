/**
 * Manufacturer Performance Chart Component
 *
 * Displays manufacturer-based performance metrics using Recharts.
 * Features sidebar filters, search, and focus functionality.
 *
 * @module components/ui/ManufacturerPerformanceChart
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import ManufacturerPerformanceTooltip from './charts/ManufacturerPerformanceTooltip';
import { ManufacturerMultiSelect } from './ManufacturerPerformanceChart/ManufacturerMultiSelect';
import { useManufacturerPerformanceData } from './ManufacturerPerformanceChart/useManufacturerPerformanceData';

type ManufacturerPerformanceData = {
  manufacturer: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalGamesPlayed: number;
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

type ManufacturerPerformanceChartProps = {
  data: ManufacturerPerformanceData[];
  allMachines?: MachineEvaluationData[];
};

export default function ManufacturerPerformanceChart({
  data: initialData,
  allMachines = [],
}: ManufacturerPerformanceChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and aggregation state
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all-manufacturers']);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);

  // Metric selection state - performance charts show all metrics by default
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Floor Positions %',
    'Total Handle %',
    'Total Win %',
    'Total Drop %',
    'Total Canc. Cr. %',
    'Total Gross %',
    'Total Games Played %',
  ]);

  // Initialize selected manufacturers only on initial data load
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (initialData.length > 0 && !hasInitialized.current && selectedManufacturers.length === 0) {
      setSelectedManufacturers(initialData.map(d => d.manufacturer));
      hasInitialized.current = true;
    }
  }, [initialData, selectedManufacturers.length]);

  // Handle filter button toggles
  const handleFilterToggle = (filter: string) => {
    setSelectedFilters(prev => {
      if (filter === 'all-manufacturers') {
        return ['all-manufacturers'];
      }

      const newFilters = prev.filter(f => f !== 'all-manufacturers');
      if (newFilters.includes(filter)) {
        const filtered = newFilters.filter(f => f !== filter);
        return filtered.length === 0 ? ['all-manufacturers'] : filtered;
      } else {
        return [...newFilters, filter];
      }
    });
  };

  // Use custom hook for data processing
  const { aggregatedData, filteredData, chartData, minWidth } =
    useManufacturerPerformanceData({
      initialData,
      allMachines,
      selectedFilters,
      selectedManufacturers,
    });

  // Track previous filter state to detect filter changes
  const prevFiltersRef = useRef<string[]>(selectedFilters);
  
  // Sync selected manufacturers when filters change
  useEffect(() => {
    if (aggregatedData.length === 0) return;

    const availableManufacturers = aggregatedData.map(d => d.manufacturer);
    
    // Remove selected items that are no longer in the filtered list
    const validSelections = selectedManufacturers.filter(m => 
      availableManufacturers.includes(m)
    );

    // Check if filter actually changed (not just a re-render)
    const filterChanged = 
      prevFiltersRef.current.join(',') !== selectedFilters.join(',');
    const switchedToFilter = 
      filterChanged && 
      !selectedFilters.includes('all-manufacturers');
    
    // Update previous filters
    prevFiltersRef.current = selectedFilters;

    // If filter changed to a specific filter (Top 5, Bottom 5) and nothing is selected, auto-select
    // This handles: All → Top 5, All → Bottom 5, Top 5 → Bottom 5, etc.
    if (switchedToFilter && validSelections.length === 0) {
      setSelectedManufacturers(availableManufacturers);
    } else if (validSelections.length !== selectedManufacturers.length) {
      // Update selections to only include valid ones (cleanup invalid selections)
      setSelectedManufacturers(validSelections);
    }

  }, [aggregatedData, selectedFilters, selectedManufacturers]);

  // Search suggestions - only from filtered data
  const manufacturerSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase().trim();
    return filteredData
      .map((item, index) => ({
        manufacturer: item.manufacturer,
        index,
      }))
      .filter(item => item.manufacturer.toLowerCase().includes(searchLower))
      .slice(0, 10);
  }, [filteredData, searchTerm]);

  const handleSelectAll = () => {
    const allSelected =
      selectedManufacturers.length === aggregatedData.length &&
      aggregatedData.length > 0;
    if (allSelected) {
      setSelectedManufacturers([]);
    } else {
      setSelectedManufacturers(aggregatedData.map(d => d.manufacturer));
    }
  };

  const handleManufacturerToggle = (manufacturer: string) => {
    setSelectedManufacturers(prev =>
      prev.includes(manufacturer)
        ? prev.filter(m => m !== manufacturer)
        : [...prev, manufacturer]
    );
  };

  // Handle focus - find manufacturer and scroll to it
  const handleFocus = () => {
    if (!searchTerm || !scrollRef.current) return;

    const index = chartData.findIndex(item =>
      item.fullManufacturerName?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (!initialData || initialData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manufacturers&apos; Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No manufacturer performance data available
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
          <CardTitle>Manufacturers&apos; Performance</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <div className="relative w-full" ref={searchRef}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search manufacturer..."
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
              {showSuggestions && manufacturerSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
                  {manufacturerSuggestions.map(item => (
                    <button
                      key={item.index}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setSearchTerm(item.manufacturer);
                        setShowSuggestions(false);
                        setTimeout(() => handleFocus(), 0);
                      }}
                    >
                      {item.manufacturer}
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
      <CardContent className="p-6 pt-0 pb-0">
        {/* Metric selection checkboxes */}
        <div className="mb-4 overflow-x-auto border-b pb-3 md:mb-6 md:pb-4">
          <div className="flex min-w-max flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-x-6">
            {legendItems.map(item => (
              <div key={item.label} className="flex items-center gap-1.5 md:gap-2">
                <Checkbox
                  id={`metric-manufacturer-${item.label}`}
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
                  htmlFor={`metric-manufacturer-${item.label}`}
                  className="text-[10px] font-medium text-gray-700 cursor-pointer md:text-xs"
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
                selectedFilters.includes('all-manufacturers')
                  ? 'all-manufacturers'
                  : selectedFilters.includes('top-5-manufacturers')
                    ? 'top-5-manufacturers'
                    : selectedFilters.includes('bottom-5-manufacturers')
                      ? 'bottom-5-manufacturers'
                      : 'all-manufacturers'
              }
              onValueChange={value => {
                if (value === 'all-manufacturers') {
                  setSelectedFilters(['all-manufacturers']);
                } else {
                  setSelectedFilters([value]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-manufacturers">All Manufacturers</SelectItem>
                <SelectItem value="top-5-manufacturers">Top 5 Manufacturers</SelectItem>
                <SelectItem value="bottom-5-manufacturers">Bottom 5 Manufacturers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Select Manufacturers
            </Label>
            <ManufacturerMultiSelect
              manufacturers={aggregatedData.map(d => ({
                id: d.manufacturer,
                name: d.manufacturer,
              }))}
              selectedManufacturers={selectedManufacturers}
              onSelectionChange={setSelectedManufacturers}
              placeholder="Select manufacturers..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="hidden w-full shrink-0 space-y-4 lg:block lg:w-64 lg:space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Manufacturer Filters</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-manufacturers-performance"
                    checked={selectedFilters.includes('all-manufacturers')}
                    onCheckedChange={() => handleFilterToggle('all-manufacturers')}
                  />
                  <Label
                    htmlFor="all-manufacturers-performance"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    All Manufacturers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="top-5-manufacturers-performance"
                    checked={selectedFilters.includes('top-5-manufacturers')}
                    onCheckedChange={() => handleFilterToggle('top-5-manufacturers')}
                  />
                  <Label
                    htmlFor="top-5-manufacturers-performance"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Top 5 Manufacturers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bottom-5-manufacturers-performance"
                    checked={selectedFilters.includes('bottom-5-manufacturers')}
                    onCheckedChange={() => handleFilterToggle('bottom-5-manufacturers')}
                  />
                  <Label
                    htmlFor="bottom-5-manufacturers-performance"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Bottom 5 Manufacturers
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Manufacturers</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-manufacturers-performance"
                    checked={
                      selectedManufacturers.length === aggregatedData.length &&
                      aggregatedData.length > 0
                    }
                    onCheckedChange={() => handleSelectAll()}
                  />
                  <Label
                    htmlFor="select-all-manufacturers-performance"
                    className="text-xs font-medium text-gray-500"
                  >
                    Select All
                  </Label>
                </div>
              </div>
              <div className="flex max-h-[450px] flex-col gap-3 overflow-y-auto pr-2 text-xs">
                {aggregatedData.map(item => (
                  <div key={item.manufacturer} className="flex items-center space-x-2">
                    <Checkbox
                      id={`manufacturer-performance-${item.manufacturer}`}
                      checked={selectedManufacturers.includes(item.manufacturer)}
                      onCheckedChange={() => handleManufacturerToggle(item.manufacturer)}
                    />
                    <Label
                      htmlFor={`manufacturer-performance-${item.manufacturer}`}
                      className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {item.manufacturer}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div
              ref={scrollRef}
              className="relative touch-pan-x overflow-x-auto overflow-y-hidden"
            >
              <div
                ref={containerRef}
                style={{ minWidth: `${minWidth}px`, width: '100%' }}
              >
                <ResponsiveContainer width="100%" height={600}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="manufacturerName"
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
                        style: { textAnchor: 'middle', fontSize: 11, fill: '#666' },
                      }}
                    />
                    <Tooltip
                      content={
                        <ManufacturerPerformanceTooltip
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
                          x1={chartData[focusedIndex].manufacturerName}
                          x2={chartData[focusedIndex].manufacturerName}
                          fill="#FFA203"
                          fillOpacity={0.2}
                          stroke="#FFA203"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          strokeOpacity={0.8}
                        />
                      )}
                    <Bar
                      dataKey="Floor Positions %"
                      fill={colors[0]}
                      name="Floor Positions %"
                      hide={!selectedMetrics.includes('Floor Positions %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                    <Bar
                      dataKey="Total Handle %"
                      fill={colors[1]}
                      name="Total Handle %"
                      hide={!selectedMetrics.includes('Total Handle %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                    <Bar
                      dataKey="Total Win %"
                      fill={colors[2]}
                      name="Total Win %"
                      hide={!selectedMetrics.includes('Total Win %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                    <Bar
                      dataKey="Total Drop %"
                      fill={colors[3]}
                      name="Total Drop %"
                      hide={!selectedMetrics.includes('Total Drop %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                    <Bar
                      dataKey="Total Canc. Cr. %"
                      fill={colors[4]}
                      name="Total Canc. Cr. %"
                      hide={!selectedMetrics.includes('Total Canc. Cr. %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                    <Bar
                      dataKey="Total Gross %"
                      fill={colors[5]}
                      name="Total Gross %"
                      hide={!selectedMetrics.includes('Total Gross %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                    <Bar
                      dataKey="Total Games Played %"
                      fill={colors[6]}
                      name="Total Games Played %"
                      hide={!selectedMetrics.includes('Total Games Played %')}
                      style={{ transition: 'opacity 0.3s ease-in-out' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
