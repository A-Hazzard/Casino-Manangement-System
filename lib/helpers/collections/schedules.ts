import { CollectorSchedule } from '@/lib/types/components';
import axios from 'axios';

/**
 * Fetches collector schedules with filtering options
 */
async function fetchCollectorSchedulesWithFilters(
  options: {
    licencee?: string;
    location?: string;
    collector?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<CollectorSchedule[]> {
  try {
    const { licencee, location, collector, status, startDate, endDate } =
      options;

    const baseUrl = '/api/schedulers';
    const params = new URLSearchParams();

    if (licencee && licencee !== 'all') params.append('licencee', licencee);
    if (location && location !== 'all') params.append('location', location);
    if (collector && collector !== 'all') params.append('collector', collector);
    if (status && status !== 'all') params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const url = `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axios.get(url);
    const data = response.data;
    return data;
  } catch (error) {
    console.error('Error fetching collector schedules with filters:', error);
    return [];
  }
}

/**
 * Fetches and formats collector schedules with collectors list
 */
export async function fetchAndFormatCollectorSchedules(
  licencee?: string,
  location?: string,
  collector?: string,
  status?: string
): Promise<{
  collectorSchedules: CollectorSchedule[];
  collectors: string[];
}> {
  try {
    const data = await fetchCollectorSchedulesWithFilters({
      licencee,
      location,
      collector,
      status,
    });

    // Extract unique collectors from the data, filtering out undefined values
    const uniqueCollectors = Array.from(
      new Set(
        data
          .map(schedule => schedule.collectorName || schedule.collector)
          .filter((collector): collector is string => collector !== undefined)
      )
    ).sort();

    return {
      collectorSchedules: data,
      collectors: uniqueCollectors,
    };
  } catch (error) {
    console.error('Error fetching and formatting collector schedules:', error);
    return {
      collectorSchedules: [],
      collectors: [],
    };
  }
}

