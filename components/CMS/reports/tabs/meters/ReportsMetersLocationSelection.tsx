/**
 * Reports Meters Location Selection Component
 *
 * Displays location selection controls and top performing machines pie chart
 *
 * Features:
 * - Location multi-select dropdown
 * - Top performing machines pie chart with legend
 * - Interactive hover states
 * - Navigation to machine details
 *
 * @module components/reports/tabs/meters/ReportsMetersLocationSelection
 */

'use client';

import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { ReportsMetersHourlyCharts } from './ReportsMetersHourlyCharts';
import type { TopPerformingItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { ExternalLink, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type ReportsMetersLocationSelectionProps = {
  locations: Array<{ id: string; name: string }>;
  selectedLocations: string[];
  onSelectionChange: (locations: string[]) => void;
  topMachinesData: TopPerformingItem[];
  topMachinesLoading: boolean;
  loading: boolean;
  hourlyChartData: Array<{
    day: string;
    hour: string;
    gamesPlayed: number;
    coinIn: number;
    coinOut: number;
  }>;
  hourlyChartLoading: boolean;
  chartGranularity: 'hourly' | 'minute';
  onGranularityChange: (granularity: 'hourly' | 'minute') => void;
};

/**
 * Top Performing Machines Skeleton
 */
function TopPerformingMachinesSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
      {/* Legend skeleton */}
      <div className="min-w-0 flex-1 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded px-2 py-1.5"
          >
            <Skeleton className="h-4 w-4 flex-shrink-0 rounded-full" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
            <Skeleton className="h-4 w-16 flex-shrink-0" />
          </div>
        ))}
      </div>
      {/* Pie chart skeleton */}
      <div className="flex-shrink-0">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </div>
    </div>
  );
}

/**
 * Main ReportsMetersLocationSelection Component
 */
export default function ReportsMetersLocationSelection({
  locations,
  selectedLocations,
  onSelectionChange,
  topMachinesData,
  topMachinesLoading,
  loading,
  hourlyChartData,
  hourlyChartLoading,
  chartGranularity,
  onGranularityChange,
}: ReportsMetersLocationSelectionProps) {
  const router = useRouter();
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  
  // Determine layout:
  // - If ALL locations are selected, keep pie chart below (not on right)
  // - Only if individual locations are selected (not "all") AND more than 10, show on right
  const allLocationsSelected = selectedLocations.length === locations.length && locations.length > 0;
  const individualLocationsSelected = !allLocationsSelected && selectedLocations.length > 0;
  const moreThan10Locations = selectedLocations.length > 10;
  const shouldShowChartOnRight = individualLocationsSelected && moreThan10Locations;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Location Selection & Controls
        </CardTitle>
        <CardDescription>
          Select specific locations to filter data or view all locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Selection and Top Machines - Conditionally in grid if chart on right */}
        <div className={`grid grid-cols-1 gap-4 ${shouldShowChartOnRight ? 'lg:grid-cols-2' : ''}`}>
          {/* Location Selection Controls */}
          <div className="space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Select Locations
                </label>
                {selectedLocations.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectionChange([])}
                    className="h-7 text-xs"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
              <LocationMultiSelect
                locations={locations.map(loc => ({
                  id: loc.id,
                  name: loc.name,
                }))}
                selectedLocations={selectedLocations}
                onSelectionChange={onSelectionChange}
                placeholder="Choose locations to filter..."
              />
            </div>
          </div>

          {/* Top Performing Machines Pie Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Top Performing Machines
              </label>
              <div className="text-xs text-gray-500">
                {topMachinesData.length > 0
                  ? `${topMachinesData.length} machines`
                  : 'No data'}
              </div>
            </div>
            <div className="rounded-md border border-gray-300 bg-white p-4">
              {loading || topMachinesLoading ? (
                <TopPerformingMachinesSkeleton />
              ) : topMachinesData.length > 0 ? (
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Legend */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {topMachinesData.map((item, index) => (
                      <div
                        key={item._id}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                          activePieIndex === index
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                        onMouseEnter={() => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        <div
                          className="h-4 w-4 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="flex-1 truncate font-medium text-gray-700">
                          {item.name}
                        </span>
                        {item._id && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (item._id) {
                                router.push(`/cabinets/${item._id}`);
                              }
                            }}
                            className="flex-shrink-0"
                            title="View machine details"
                          >
                            <ExternalLink className="h-3.5 w-3.5 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                          </button>
                        )}
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          {formatCurrency(item.totalDrop)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Pie Chart */}
                  <div className="flex-shrink-0">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={topMachinesData}
                          dataKey="totalDrop"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={30}
                          paddingAngle={2}
                          activeIndex={activePieIndex ?? undefined}
                          onMouseEnter={(_, index) =>
                            setActivePieIndex(index)
                          }
                          onMouseLeave={() => setActivePieIndex(null)}
                        >
                          {topMachinesData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={
                                activePieIndex === index ? '#3b82f6' : '#fff'
                              }
                              strokeWidth={activePieIndex === index ? 2 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0]
                                .payload as TopPerformingItem;
                              return (
                                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                                  <p className="font-semibold text-gray-900">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Total: {formatCurrency(data.totalDrop)}
                                  </p>
                                  {data.location && (
                                    <p className="text-xs text-gray-500">
                                      Location: {data.location}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
                  No top performing machines data available
                </div>
              )}
            </div>
          </div>
          
          {/* Hourly Charts - Show on right if more than 10 locations, otherwise below */}
          {shouldShowChartOnRight && selectedLocations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Performance Charts
                </label>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="chart-granularity-meters"
                    className="text-xs font-medium text-gray-600"
                  >
                    Granularity:
                  </label>
                  <select
                    id="chart-granularity-meters"
                    value={chartGranularity}
                    onChange={e =>
                      onGranularityChange(e.target.value as 'hourly' | 'minute')
                    }
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="minute">Minute</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
              <div className="rounded-md border border-gray-300 bg-white p-4">
                <ReportsMetersHourlyCharts
                  data={hourlyChartData}
                  loading={hourlyChartLoading}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Hourly Charts - Show below if 10 or fewer locations selected */}
        {!shouldShowChartOnRight && selectedLocations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Performance Charts
              </label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="chart-granularity-meters-below"
                  className="text-xs font-medium text-gray-600"
                >
                  Granularity:
                </label>
                <select
                  id="chart-granularity-meters-below"
                  value={chartGranularity}
                  onChange={e =>
                    onGranularityChange(e.target.value as 'hourly' | 'minute')
                  }
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="minute">Minute</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
            </div>
            <div className="rounded-md border border-gray-300 bg-white p-4">
              <ReportsMetersHourlyCharts
                data={hourlyChartData}
                loading={hourlyChartLoading}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


