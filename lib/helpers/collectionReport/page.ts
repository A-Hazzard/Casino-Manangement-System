import type {
    CollectionReportRow,
} from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import { parse } from 'date-fns';
import type { DateRange as RDPDateRange } from 'react-day-picker';

/**
 * Collection report page helper functions
 *
 * Provides filtering utilities for collection reports.
 */

/**
 * Filters collection reports based on location, search, uncollected status, and date range.
 */
export function filterCollectionReports(
  reports: CollectionReportRow[],
  selectedLocation: string | string[],
  search: string,
  showUncollectedOnly: boolean,
  locations: LocationSelectItem[],
  dateRange?: RDPDateRange
): CollectionReportRow[] {
  console.warn('[filterCollectionReports] Starting filter process');
  console.warn(
    `[filterCollectionReports] selectedLocation:`, selectedLocation
  );
  console.warn(`[filterCollectionReports] search: "${search}"`);
  console.warn(
    `[filterCollectionReports] showUncollectedOnly: ${showUncollectedOnly}`
  );
  console.warn(
    `[filterCollectionReports] locations count: ${locations.length}`
  );
  console.warn(`[filterCollectionReports] reports count: ${reports.length}`);

  const filtered = reports.filter((report, index) => {
    // Location matching logic
    const isAllLocations = selectedLocation === 'all';
    let matchesLocation = false;
    let locationNameForLog = '';

    if (isAllLocations) {
      matchesLocation = true;
      locationNameForLog = 'all';
    } else if (Array.isArray(selectedLocation)) {
      if (selectedLocation.length === 0 || selectedLocation.includes('all')) {
        matchesLocation = true;
        locationNameForLog = 'all';
      } else {
        const selectedNames = locations
          .filter(location => selectedLocation.includes(location._id))
          .map(location => location.name);
        matchesLocation = selectedNames.includes(report.location);
        locationNameForLog = selectedNames.join(', ');
      }
    } else {
      const foundLocation = locations.find(location => location._id === selectedLocation);
      const locationName = foundLocation?.name;
      matchesLocation = report.location === locationName;
      locationNameForLog = locationName || '';
    }

    // Log first few reports for debugging
    if (index < 3) {
      console.warn(`[filterCollectionReports] Report ${index + 1}:`);
      console.warn(`  - Report location: "${report.location}"`);
      console.warn(`  - Selected location: "${selectedLocation}"`);
      console.warn(`  - Is all locations: ${isAllLocations}`);
      console.warn(`  - Found location name: "${locationNameForLog}"`);
      console.warn(`  - Matches location: ${matchesLocation}`);
    }

    const matchesSearch =
      !search ||
      report.collector.toLowerCase().includes(search.toLowerCase()) ||
      report.location.toLowerCase().includes(search.toLowerCase()) ||
      report.locationReportId.toLowerCase().includes(search.toLowerCase()) ||
      report._id.toLowerCase().includes(search.toLowerCase());
    const uncollectedStr = String(report.uncollected).trim();
    const matchesUncollected =
      !showUncollectedOnly || Number(uncollectedStr) > 0;

    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      let reportDate: Date | null = null;
      try {
        reportDate = parse(report.time, 'dd LLL yyyy, hh:mm:ss a', new Date());
        if (isNaN(reportDate.getTime())) reportDate = null;
      } catch {
        reportDate = null;
      }
      if (reportDate) {
        matchesDate =
          reportDate >= dateRange.from && reportDate <= dateRange.to;
      } else {
        matchesDate = true;
      }
    }

  const finalMatch =
      matchesLocation && matchesSearch && matchesUncollected && matchesDate;

    if (index < 3) {
      console.warn(
        `  - Final match: ${finalMatch} (location: ${matchesLocation}, search: ${matchesSearch}, uncollected: ${matchesUncollected}, date: ${matchesDate})`
      );
    }

    return finalMatch;
  });

  console.warn(
    `[filterCollectionReports] Filtered ${filtered.length} reports from ${reports.length} total`
  );
  return filtered;
}

