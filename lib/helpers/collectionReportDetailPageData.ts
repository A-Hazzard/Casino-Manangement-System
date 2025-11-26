import axios from 'axios';
import type { CollectionReportData } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import type { CollectionIssueDetails } from '@/shared/types/entities';

/**
 * Fetch collection report by ID
 */
export async function fetchCollectionReportById(
  reportId: string
): Promise<CollectionReportData> {
  try {
    const response = await axios.get(`/api/collection-report/${reportId}`);
    return response.data;
  } catch (error) {
    console.error(' Error fetching collection report:', error);
    throw error;
  }
}

// ============================================================================
// Collections Data Fetching
// ============================================================================

/**
 * Fetch collections by location report ID
 */
export async function fetchCollectionsByLocationReportId(
  reportId: string
): Promise<CollectionDocument[]> {
  try {
    const response = await axios.get(`/api/collections/by-report/${reportId}`);
    return response.data;
  } catch (error) {
    console.error(' Error fetching collections by report ID:', error);
    return [];
  }
}

// ============================================================================
// Meter Synchronization Operations
// ============================================================================

/**
 * Sync meters for a collection report
 * Triggers the complete sync flow:
 * 1. Find collection report by locationReportId
 * 2. Find all collections for this report
 * 3. For each collection: get machine data, determine SAS period, fetch meters, calculate movement, update collection
 * 4. Update collection report totals
 * 5. Return success with statistics
 */
export async function syncMetersForReport(reportId: string): Promise<void> {
  try {
    await axios.post(`/api/collection-report/${reportId}/sync-meters`);
  } catch (error) {
    console.error(' Error syncing meters:', error);
    throw error;
  }
}

// ============================================================================
// SAS Time Fixing Operations
// ============================================================================

/**
 * Fix SAS times and recalculate metrics for all collections in a report
 * Triggers the complete fix flow:
 * 1. Find collection report by locationReportId
 * 2. Find all collections for this report
 * 3. For each collection: recalculate SAS time range and metrics, update collection and machine history
 * 4. Return summary of fixes applied
 */
export async function fixSasTimesForReport(reportId: string): Promise<{
  success: boolean;
  totalCollections: number;
  fixedCount: number;
  skippedCount: number;
  historyFixedCount?: number;
  errorCount: number;
  errors: string[];
  message: string;
  reportsScanned?: number;
  futureReportsAffected?: number;
}> {
  try {
    const response = await axios.post(
      `/api/collection-report/${reportId}/fix-sas-times`
    );
    return response.data;
  } catch (error) {
    console.error(' Error fixing SAS times:', error);
    throw error;
  }
}

/**
 * Check for SAS time issues in a collection report
 * Returns detailed issue information per collection
 */
export async function checkSasTimeIssues(
  reportId: string
): Promise<CollectionIssueDetails> {
  try {
    const response = await axios.get(
      `/api/collection-report/${reportId}/check-sas-times`
    );
    return response.data;
  } catch (error) {
    console.error(' Error checking SAS time issues:', error);
    throw error;
  }
}

/**
 * Refresh collection report data
 */
export async function refreshCollectionReportData(reportId: string): Promise<{
  reportData: CollectionReportData;
  collections: CollectionDocument[];
}> {
  try {
    const [reportResponse, collectionsResponse] = await Promise.all([
      axios.get(`/api/collection-report/${reportId}`),
      axios.get(`/api/collections/by-report/${reportId}`),
    ]);

    return {
      reportData: reportResponse.data,
      collections: collectionsResponse.data,
    };
  } catch (error) {
    console.error(' Error refreshing collection report data:', error);
    throw error;
  }
}
