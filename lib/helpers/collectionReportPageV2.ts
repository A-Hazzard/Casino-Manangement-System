import type {
    CollectionReportRow,
} from '@/lib/types/componentProps';
import type { LocationSelectItem } from '@/lib/types/location';
import { parse } from 'date-fns';
import type { DateRange as RDPDateRange } from 'react-day-picker';

/**
 * Collection report page helper functions V2 - CSS-based animations instead of GSAP
 */

/**
 * Filters collection reports based on location, search, uncollected status, and date range.
 */
export function filterCollectionReports(
  reports: CollectionReportRow[],
  selectedLocation: string,
  search: string,
  showUncollectedOnly: boolean,
  locations: LocationSelectItem[],
  dateRange?: RDPDateRange
): CollectionReportRow[] {
  console.warn('[filterCollectionReports] Starting filter process');
  console.warn(
    `[filterCollectionReports] selectedLocation: "${selectedLocation}"`
  );
  console.warn(`[filterCollectionReports] search: "${search}"`);
  console.warn(
    `[filterCollectionReports] showUncollectedOnly: ${showUncollectedOnly}`
  );
  console.warn(
    `[filterCollectionReports] locations count: ${locations.length}`
  );
  console.warn(`[filterCollectionReports] reports count: ${reports.length}`);

  const filtered = reports.filter((r, index) => {
    // Location matching logic
    const isAllLocations = selectedLocation === 'all';
    const foundLocation = locations.find(l => l._id === selectedLocation);
    const locationName = foundLocation?.name;
    const matchesLocation = isAllLocations || r.location === locationName;

    // Log first few reports for debugging
    if (index < 3) {
      console.warn(`[filterCollectionReports] Report ${index + 1}:`);
      console.warn(`  - Report location: "${r.location}"`);
      console.warn(`  - Selected location: "${selectedLocation}"`);
      console.warn(`  - Is all locations: ${isAllLocations}`);
      console.warn(`  - Found location name: "${locationName}"`);
      console.warn(`  - Matches location: ${matchesLocation}`);
    }

    const matchesSearch =
      !search ||
      r.collector.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase()) ||
      r.locationReportId.toLowerCase().includes(search.toLowerCase()) ||
      r._id.toLowerCase().includes(search.toLowerCase());
    const uncollectedStr = String(r.uncollected).trim();
    const matchesUncollected =
      !showUncollectedOnly || Number(uncollectedStr) > 0;

    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      let reportDate: Date | null = null;
      try {
        reportDate = parse(r.time, 'dd LLL yyyy, hh:mm:ss a', new Date());
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
