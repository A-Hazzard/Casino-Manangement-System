import axios from 'axios';
import type { CollectionReportRow } from '@/lib/types/componentProps';
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from '@/lib/types/componentProps';
import type { SchedulerTableRow } from '@/lib/types/componentProps';
import type { CollectorSchedule } from '@/lib/types/components';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';

import { DateRange as RDPDateRange } from 'react-day-picker';

/**
 * Maps frontend time period values to backend API time period values
 */
export const mapTimePeriodForAPI = (frontendTimePeriod: string): string => {
  switch (frontendTimePeriod) {
    case 'last7days':
      return '7d';
    case 'last30days':
      return '30d';
    case 'Today':
    case 'Yesterday':
    case 'All Time':
    case 'Custom':
    default:
      return frontendTimePeriod;
  }
};

/**
 * Fetch collection reports data by licencee
 */
export async function fetchCollectionReportsData(
  selectedLicencee: string,
  activeMetricsFilter: string,
  customDateRange?: { startDate: Date; endDate: Date }
): Promise<CollectionReportRow[]> {
  try {
    // Determine parameters for fetch based on activeMetricsFilter
    let dateRangeForFetch = undefined;
    let timePeriodForFetch = undefined;

    if (activeMetricsFilter === 'Custom') {
      // For custom filter, check if both dates are set
      if (customDateRange?.startDate && customDateRange?.endDate) {
        dateRangeForFetch = {
          from: customDateRange.startDate,
          to: customDateRange.endDate,
        };
        timePeriodForFetch = 'Custom';
      } else {
        // Custom selected but no range: return empty array
        return [];
      }
    } else {
      // For predefined periods (Today, Yesterday, last7days, last30days), pass the time period
      timePeriodForFetch = mapTimePeriodForAPI(activeMetricsFilter);
    }

    const params = new URLSearchParams();
    if (selectedLicencee) {
      params.append('licencee', selectedLicencee);
    }
    if (timePeriodForFetch) {
      params.append('timePeriod', timePeriodForFetch);
    }
    if (dateRangeForFetch) {
      params.append('startDate', dateRangeForFetch.from.toISOString());
      params.append('endDate', dateRangeForFetch.to.toISOString());
    }

    const response = await axios.get(
      `/api/collection-report?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    // Handle different types of errors gracefully
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.warn(
          '⏰ Collection reports request timed out - returning empty array'
        );
      } else if (error.response?.status === 500) {
        console.warn(
          '🔧 Server error fetching collection reports - database may be unavailable'
        );
      } else if (error.response?.status === 404) {
        console.warn('📭 Collection reports endpoint not found');
      } else {
        console.warn(
          '⚠️ Network error fetching collection reports:',
          error.message
        );
      }
    } else {
      console.warn('⚠️ Unexpected error fetching collection reports:', error);
    }
    return [];
  }
}

/**
 * Fetch monthly report data
 */
export async function fetchMonthlyReportData(
  dateRange: RDPDateRange,
  location: string
): Promise<{
  summary: MonthlyReportSummary;
  details: MonthlyReportDetailsRow[];
}> {
  try {
    if (!dateRange.from || !dateRange.to) {
      return {
        summary: {
          drop: '-',
          cancelledCredits: '-',
          gross: '-',
          sasGross: '-',
        },
        details: [],
      };
    }

    const params = new URLSearchParams();
    params.append('startDate', dateRange.from.toISOString());
    params.append('endDate', dateRange.to.toISOString());
    if (location !== 'all') {
      params.append('locationName', location);
    }

    const response = await axios.get(
      `/api/reports/monthly?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error(' Error fetching monthly report data:', error);
    return {
      summary: { drop: '-', cancelledCredits: '-', gross: '-', sasGross: '-' },
      details: [],
    };
  }
}

/**
 * Fetch manager schedule data
 */
export async function fetchManagerScheduleData(
  selectedSchedulerLocation: string,
  selectedCollector: string,
  selectedStatus: string
): Promise<{ schedulers: SchedulerTableRow[]; collectors: string[] }> {
  try {
    const params = new URLSearchParams();
    if (selectedSchedulerLocation !== 'all') {
      params.append('location', selectedSchedulerLocation);
    }
    if (selectedCollector !== 'all') {
      params.append('collector', selectedCollector);
    }
    if (selectedStatus !== 'all') {
      params.append('status', selectedStatus);
    }

    const response = await axios.get(`/api/schedulers?${params.toString()}`);
    const data = response.data;

    // Extract unique collectors from schedulers
    const collectors = [
      ...new Set(
        data.schedulers.map((s: { collector: string }) => s.collector)
      ),
    ] as string[];

    return {
      schedulers: data.schedulers,
      collectors,
    };
  } catch (error) {
    console.error(' Error fetching manager schedule data:', error);
    return { schedulers: [], collectors: [] };
  }
}

/**
 * Fetch collector schedule data
 */
export async function fetchCollectorScheduleData(
  selectedLicencee: string,
  selectedCollectorLocation: string,
  selectedCollectorFilter: string,
  selectedCollectorStatus: string
): Promise<{ collectorSchedules: CollectorSchedule[]; collectors: string[] }> {
  try {
    const params = new URLSearchParams();
    if (selectedLicencee) {
      params.append('licencee', selectedLicencee);
    }
    if (selectedCollectorLocation !== 'all') {
      params.append('location', selectedCollectorLocation);
    }
    if (selectedCollectorFilter !== 'all') {
      params.append('collector', selectedCollectorFilter);
    }
    if (selectedCollectorStatus !== 'all') {
      params.append('status', selectedCollectorStatus);
    }

    const response = await axios.get(
      `/api/collectors/schedules?${params.toString()}`
    );
    const data = response.data;

    // Extract unique collectors from schedules
    const collectors = [
      ...new Set(
        data.collectorSchedules.map((s: { collector: string }) => s.collector)
      ),
    ] as string[];

    return {
      collectorSchedules: data.collectorSchedules,
      collectors,
    };
  } catch (error) {
    console.error(' Error fetching collector schedule data:', error);
    return { collectorSchedules: [], collectors: [] };
  }
}

/**
 * Fetch all location names for monthly report
 */
export async function fetchAllLocationNames(): Promise<string[]> {
  try {
    const response = await axios.get('/api/locations/names');
    return response.data;
  } catch (error) {
    console.error(' Error fetching location names:', error);
    return [];
  }
}

/**
 * Fetch locations with machines
 */
export async function fetchLocationsWithMachines(): Promise<
  CollectionReportLocationWithMachines[]
> {
  try {
    const response = await axios.get('/api/collectionReport/locations', {});
    return response.data;
  } catch (error) {
    // Handle different types of errors gracefully
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.warn(
          '⏰ Locations with machines request timed out - returning empty array'
        );
      } else if (error.response?.status === 500) {
        console.warn(
          '🔧 Server error fetching locations with machines - database may be unavailable'
        );
      } else if (error.response?.status === 404) {
        console.warn('📭 Locations with machines endpoint not found');
      } else {
        console.warn(
          '⚠️ Network error fetching locations with machines:',
          error.message
        );
      }
    } else {
      console.warn(
        '⚠️ Unexpected error fetching locations with machines:',
        error
      );
    }
    return [];
  }
}

/**
 * Fetch all gaming locations for filter dropdown
 */
export async function fetchAllGamingLocations(): Promise<
  { id: string; name: string }[]
> {
  try {
    const response = await axios.get('/api/gaming-locations', {});
    return response.data;
  } catch (error) {
    // Handle different types of errors gracefully
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.warn(
          '⏰ Gaming locations request timed out - returning empty array'
        );
      } else if (error.response?.status === 500) {
        console.warn(
          '🔧 Server error fetching gaming locations - database may be unavailable'
        );
      } else if (error.response?.status === 404) {
        console.warn('📭 Gaming locations endpoint not found');
      } else {
        console.warn(
          '⚠️ Network error fetching gaming locations:',
          error.message
        );
      }
    } else {
      console.warn('⚠️ Unexpected error fetching gaming locations:', error);
    }
    return [];
  }
}
