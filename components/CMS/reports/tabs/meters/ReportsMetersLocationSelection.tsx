/**
 * Reports Meters Location Selection Component
 *
 * Location filters, top performing machines, and performance charts
 * for the Meters reports tab.
 *
 * @module components/reports/tabs/meters/ReportsMetersLocationSelection
 */

'use client';

import ReportsMetersTopPerformingMachines from '@/components/CMS/reports/tabs/meters/ReportsMetersTopPerformingMachines';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import type { TopPerformingItem } from '@/lib/types';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Monitor,
} from 'lucide-react';
import { ReportsMetersHourlyCharts } from './ReportsMetersHourlyCharts';

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
  onExportPdf: () => void;
  onExportExcel: () => void;
  exportDisabled?: boolean;
};

type PerformanceChartsSectionProps = {
  hourlyChartData: ReportsMetersLocationSelectionProps['hourlyChartData'];
  hourlyChartLoading: boolean;
  chartGranularity: 'hourly' | 'minute';
  onGranularityChange: (granularity: 'hourly' | 'minute') => void;
  variant: 'mobile' | 'desktop';
  selectId: string;
};

function PerformanceChartsSection({
  hourlyChartData,
  hourlyChartLoading,
  chartGranularity,
  onGranularityChange,
  variant,
  selectId,
}: PerformanceChartsSectionProps) {
  const isMobile = variant === 'mobile';

  return (
    <section className={isMobile ? 'space-y-3' : 'space-y-2'}>
      <div
        className={
          isMobile
            ? 'space-y-2'
            : 'flex items-center justify-between gap-4'
        }
      >
        <h2 className="text-sm font-semibold text-gray-800">
          Performance Charts
        </h2>
        <div className={isMobile ? 'w-full' : 'flex items-center gap-2'}>
          {!isMobile && (
            <label
              htmlFor={selectId}
              className="text-xs font-medium text-gray-600"
            >
              Granularity:
            </label>
          )}
          <select
            id={selectId}
            value={chartGranularity}
            onChange={event =>
              onGranularityChange(event.target.value as 'hourly' | 'minute')
            }
            className={
              isMobile
                ? 'h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive'
                : 'rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
            }
          >
            <option value="minute">Minute</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>
      </div>

      {isMobile ? (
        <ReportsMetersHourlyCharts
          data={hourlyChartData}
          loading={hourlyChartLoading}
          variant="embedded"
        />
      ) : (
        <div className="rounded-md border border-gray-300 bg-white p-4">
          <ReportsMetersHourlyCharts
            data={hourlyChartData}
            loading={hourlyChartLoading}
          />
        </div>
      )}
    </section>
  );
}

function LocationFilterControls({
  locations,
  selectedLocations,
  onSelectionChange,
}: Pick<
  ReportsMetersLocationSelectionProps,
  'locations' | 'selectedLocations' | 'onSelectionChange'
>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Locations
        </p>
        {selectedLocations.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
            className="h-7 border-white bg-white/20 text-xs text-white hover:bg-white/30"
          >
            Clear
          </Button>
        )}
      </div>
      <LocationMultiSelect
        locations={locations.map(location => ({
          id: location.id,
          name: location.name,
        }))}
        selectedLocations={selectedLocations}
        onSelectionChange={onSelectionChange}
        placeholder="All locations"
        className="w-full"
      />
    </div>
  );
}

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
  onExportPdf,
  onExportExcel,
  exportDisabled = false,
}: ReportsMetersLocationSelectionProps) {
  const allLocationsSelected =
    selectedLocations.length === locations.length && locations.length > 0;
  const individualLocationsSelected =
    !allLocationsSelected && selectedLocations.length > 0;
  const moreThan10Locations = selectedLocations.length > 10;
  const shouldShowChartOnRight =
    individualLocationsSelected && moreThan10Locations;
  const hasLocationsSelected = selectedLocations.length > 0;
  const selectedCountLabel =
    selectedLocations.length === 0
      ? 'no locations selected'
      : selectedLocations.length === locations.length
        ? `all ${locations.length} locations`
        : `${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''}`;

  return (
    <>
      {/* Mobile layout */}
      <div className="flex flex-col gap-4 md:hidden">
        <p className="px-1 text-xs font-medium text-gray-500">
          Showing meters for{' '}
          <span className="font-bold text-buttonActive">
            {selectedCountLabel}
          </span>
        </p>

        <div className="flex w-full flex-col gap-3 rounded-lg bg-buttonActive p-4">
          <LocationFilterControls
            locations={locations}
            selectedLocations={selectedLocations}
            onSelectionChange={onSelectionChange}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={exportDisabled || loading}
                className="h-11 w-full gap-2 rounded-md border-white/30 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export Report
                <ChevronDown className="ml-auto h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onExportPdf} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportExcel}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasLocationsSelected && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold text-gray-800">
                Top Performing Machines
              </h2>
              <span className="text-xs text-gray-500">
                {topMachinesData.length > 0
                  ? `${topMachinesData.length} machines`
                  : 'No data'}
              </span>
            </div>
            <ReportsMetersTopPerformingMachines
              data={topMachinesData}
              loading={loading || topMachinesLoading}
            />
          </section>
        )}

        {hasLocationsSelected && (
          <PerformanceChartsSection
            hourlyChartData={hourlyChartData}
            hourlyChartLoading={hourlyChartLoading}
            chartGranularity={chartGranularity}
            onGranularityChange={onGranularityChange}
            variant="mobile"
            selectId="chart-granularity-meters-mobile"
          />
        )}
      </div>

      {/* Desktop layout */}
      <Card className="hidden md:block">
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
          <div
            className={`grid grid-cols-1 gap-4 ${shouldShowChartOnRight ? 'lg:grid-cols-2' : ''}`}
          >
            <div className="space-y-3 rounded-lg bg-buttonActive p-4">
              <LocationFilterControls
                locations={locations}
                selectedLocations={selectedLocations}
                onSelectionChange={onSelectionChange}
              />
            </div>

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
                <ReportsMetersTopPerformingMachines
                  data={topMachinesData}
                  loading={loading || topMachinesLoading}
                />
              </div>
            </div>

            {shouldShowChartOnRight && hasLocationsSelected && (
              <PerformanceChartsSection
                hourlyChartData={hourlyChartData}
                hourlyChartLoading={hourlyChartLoading}
                chartGranularity={chartGranularity}
                onGranularityChange={onGranularityChange}
                variant="desktop"
                selectId="chart-granularity-meters"
              />
            )}
          </div>

          {!shouldShowChartOnRight && hasLocationsSelected && (
            <PerformanceChartsSection
              hourlyChartData={hourlyChartData}
              hourlyChartLoading={hourlyChartLoading}
              chartGranularity={chartGranularity}
              onGranularityChange={onGranularityChange}
              variant="desktop"
              selectId="chart-granularity-meters-below"
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
