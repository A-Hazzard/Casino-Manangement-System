import axios from "axios";
import type { CollectionReportData } from "@/lib/types/index";
import type { CollectionDocument } from "@/lib/types/collections";

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
    console.error("❌ Error fetching collection report:", error);
    throw error;
  }
}

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
    console.error("❌ Error fetching collections by report ID:", error);
    return [];
  }
}

/**
 * Sync meters for a collection report
 */
export async function syncMetersForReport(reportId: string): Promise<void> {
  try {
    await axios.post(`/api/collection-report/${reportId}/sync-meters`);
  } catch (error) {
    console.error("❌ Error syncing meters:", error);
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
    console.error("❌ Error refreshing collection report data:", error);
    throw error;
  }
}


