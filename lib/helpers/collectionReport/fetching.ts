/**
 * Collection Report Frontend Helpers
 *
 * This module provides helper functions for fetching collection report data from the API.
 */

import { CollectionReportLocationWithMachines } from '@/lib/types/api';
import axios from 'axios';

/**
 * Fetches collection reports with filtering and pagination
 */
export async function fetchCollectionReportsByLicencee(
  licensee?: string,
  dateRange?: { from?: Date; to?: Date },
  timePeriod?: string,
  page: number = 1,
  limit: number = 50,
  skip: number = 0,
  locationName?: string,
  search?: string
) {
  const params = new URLSearchParams();
  if (licensee && licensee !== 'all') params.append('licensee', licensee);
  if (timePeriod) params.append('timePeriod', timePeriod);
  if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
  if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
  if (page) params.append('page', String(page));
  if (limit) params.append('limit', String(limit));
  if (skip) params.append('skip', String(skip));
  if (locationName) params.append('locationName', locationName);
  if (search) params.append('search', search);

  const response = await axios.get(
    `/api/collectionReport?${params.toString()}`
  );
  return response.data;
}

/**
 * Fetches locations with their machines for creating new reports
 */
export async function getLocationsWithMachines(
  licensee?: string
): Promise<CollectionReportLocationWithMachines[]> {
  const params = new URLSearchParams();
  params.append('locationsWithMachines', 'true');
  if (licensee && licensee !== 'all') params.append('licensee', licensee);

  const response = await axios.get(
    `/api/collectionReport?${params.toString()}`
  );
  return response.data.locations || [];
}

/**
 * Fetches a single collection report by ID
 */
export async function fetchCollectionReportById(reportId: string) {
  const response = await axios.get(`/api/collection-report/${reportId}`);
  return response.data || null;
}

/**
 * Updates a collection report's financial data
 */
export async function updateCollectionReport(reportId: string, data: any) {
  const response = await axios.patch(
    `/api/collection-reports/${reportId}`,
    data
  );
  return response.data;
}

/**
 * Creates a new collection report
 */
export async function createCollectionReport(payload: any) {
  const response = await axios.post('/api/collectionReport', payload);
  return response.data;
}

/**
 * Fetches locations for monthly reports
 */
export async function fetchMonthlyReportLocations(licensee?: string) {
  const params = new URLSearchParams();
  params.append('locationsWithMachines', 'true'); // Or a simpler endpoint if available
  if (licensee && licensee !== 'all') params.append('licensee', licensee);

  const response = await axios.get(
    `/api/collectionReport?${params.toString()}`
  );
  return (response.data.locations || []).map((loc: any) => ({
    id: loc._id,
    name: loc.name,
  }));
}

/**
 * Fetches monthly report summary and details in one call (matching API route)
 */
export async function fetchMonthlyReportSummaryAndDetails(params: {
  startDate: Date;
  endDate: Date;
  locationName?: string;
  locationId?: string;
  locationIds?: string[];
  licencee?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.append('startDate', params.startDate.toISOString());
  searchParams.append('endDate', params.endDate.toISOString());
  
  if (params.locationName && params.locationName !== 'all') {
    searchParams.append('locationName', params.locationName);
  }
  if (params.locationId) {
    searchParams.append('locationId', params.locationId);
  }
  if (params.locationIds && params.locationIds.length > 0) {
    searchParams.append('locationIds', params.locationIds.join(','));
  }
  
  if (params.licencee && params.licencee !== 'all') {
    searchParams.append('licensee', params.licencee);
  }

  const response = await axios.get(
    `/api/collectionReport?${searchParams.toString()}`
  );
  return response.data;
}

