'use client';

import { TimePeriod } from '@/app/api/lib/types';
import { Button } from '@/components/shared/ui/button';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { useUserStore } from '@/lib/store/userStore';
import { useSearchParams } from 'next/navigation';

/**
 * Reports Date Filters Component
 * Handles date range filtering for reports with both predefined and custom ranges
 * Syncs with both dashboard and reports stores
 *
 * @module components/reports/ReportsDateFilters
 */
export default function ReportsDateFilters() {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    customDateRange,
  } = useDashBoardStore();

  const { setDateRange, activeView } = useReportsStore();
  const user = useUserStore(state => state.user);
  const isDeveloper = (user?.roles || []).includes('developer');
  const searchParams = useSearchParams();

  // Check if we're in location-evaluation or location-revenue sub-tabs
  const activeLocationSubTab = searchParams?.get('ltab') || '';
  const isLocationEvaluationOrRevenue =
    activeView === 'locations' &&
    (activeLocationSubTab === 'location-evaluation' ||
      activeLocationSubTab === 'location-revenue');

  // Conditional filter buttons based on active tab
  const getTimeFilterButtons = () => {
    const baseButtons = [
      { label: 'Today', value: 'Today' as TimePeriod },
      { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
    ];

    // Only show 7/30 day filters for non-meters tabs
    if (activeView !== 'meters') {
      baseButtons.push({ label: 'Last 7 Days', value: '7d' as TimePeriod });
      // Only show "Last 30 Days" to developers
      if (isDeveloper) {
        baseButtons.push({ label: 'Last 30 Days', value: '30d' as TimePeriod });
      }
      // Show "Quarterly" only for location-evaluation and location-revenue tabs
      if (isLocationEvaluationOrRevenue) {
        baseButtons.push({
          label: 'Quarterly',
          value: 'Quarterly' as TimePeriod,
        });
      }
    }

    baseButtons.push({ label: 'Custom', value: 'Custom' as TimePeriod });

    // Show "All Time" for non-meters tabs only
    if (activeView !== 'meters') {
      baseButtons.push({ label: 'All Time', value: 'All Time' as TimePeriod });
    }

    return baseButtons;
  };

  const timeFilterButtons = getTimeFilterButtons();

  /**
   * Handle custom date selection from ModernCalendar
   */
  const handleCustomDateSelect = (
    date: { from?: Date; to?: Date } | undefined
  ) => {
    if (!date?.from) return;

    // For meters tab (single mode), use the same date for start and end
    if (activeView === 'meters') {
      const startDate = new Date(date.from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date.from);
      endDate.setHours(23, 59, 59, 999);

      setCustomDateRange({
        startDate: startDate,
        endDate: endDate,
      });
      setDateRange(startDate, endDate);
      setActiveMetricsFilter('Custom');
    } else if (date.from && date.to) {
      // For range mode (other tabs), use the provided range
      setCustomDateRange({
        startDate: date.from,
        endDate: date.to,
      });
      setDateRange(date.from, date.to);
      setActiveMetricsFilter('Custom');
    }
  };

  /**
   * Handle filter button clicks for predefined periods
   */
  const handleFilterClick = (filter: TimePeriod) => {
    // Update reports store based on filter
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (filter) {
      case 'Today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'Yesterday':
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
      case 'last7days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case '30d':
      case 'last30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        endDate = new Date();
        break;
      case 'Quarterly':
        // Quarterly: last 90 days (3 months)
        startDate = new Date(now.setDate(now.getDate() - 89));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'All Time':
        // For "All Time", set a very wide range
        startDate = new Date(0); // Epoch start
        endDate = new Date();
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    if (filter !== 'Custom') {
      setDateRange(startDate, endDate);
    }
    setActiveMetricsFilter(filter);
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* Mobile: Select dropdown */}
      <div className="w-full md:hidden">
        <select
          value={activeMetricsFilter}
          onChange={e => handleFilterClick(e.target.value as TimePeriod)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
        >
          {timeFilterButtons.map(filter => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        {/* ModernCalendar for mobile - shown when Custom is selected */}
        {activeMetricsFilter === 'Custom' && (
          <div className="mt-2 w-full">
            <ModernCalendar
              date={
                customDateRange
                  ? {
                      from: customDateRange.startDate,
                      to: customDateRange.endDate,
                    }
                  : undefined
              }
              onSelect={handleCustomDateSelect}
              mode={activeView === 'meters' ? 'single' : 'range'}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* md and above: Filter buttons */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {timeFilterButtons
          .filter(filter => filter.value !== 'Custom')
          .map(filter => (
            <Button
              key={filter.value}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                activeMetricsFilter === filter.value
                  ? 'bg-buttonActive text-white'
                  : 'bg-button text-white hover:bg-button/90'
              }`}
              onClick={() => handleFilterClick(filter.value)}
            >
              {filter.label}
            </Button>
          ))}

        {/* ModernCalendar for desktop - shown as a button that opens the calendar */}
        <ModernCalendar
          date={
            activeMetricsFilter === 'Custom' && customDateRange
              ? {
                  from: customDateRange.startDate,
                  to: customDateRange.endDate,
                }
              : undefined
          }
          onSelect={handleCustomDateSelect}
          mode={activeView === 'meters' ? 'single' : 'range'}
          className="w-auto"
        />
      </div>
    </div>
  );
}

