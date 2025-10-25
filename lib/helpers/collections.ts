import axios from 'axios';
import type { CollectionDocument } from '@/lib/types/collections';

/**
 * Fetches collections by locationReportId.
 * @param locationReportId - The location report ID to filter collections.
 * @returns Promise resolving to an array of CollectionDocument.
 */
export async function fetchCollectionsByLocationReportId(
  locationReportId: string
): Promise<CollectionDocument[]> {
  const { data } = await axios.get(
    `/api/collections?locationReportId=${locationReportId}`
  );
  return data as CollectionDocument[];
}

/**
 * Updates an existing collection document.
 * @param collectionId - The ID of the collection to update.
 * @param updateData - The data to update the collection with.
 * @returns Promise resolving to the updated CollectionDocument.
 */
export async function updateCollection(
  collectionId: string,
  updateData: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  try {
    console.warn('📡 updateCollection called with:', {
      collectionId,
      updateDataKeys: Object.keys(updateData),
    });

    const { data } = await axios.patch(
      `/api/collections/${collectionId}`,
      updateData
    );

    console.warn('📡 updateCollection response:', data);

    // The API returns { success: true, data: updatedCollection }
    // Extract the actual collection data from the response
    if (data.success && data.data) {
      return data.data as CollectionDocument;
    }

    // Fallback: if the response structure is different, return the data directly
    return data as CollectionDocument;
  } catch (error) {
    console.error(' updateCollection error:', error);
    throw error;
  }
}

/**
 * Deletes all collections and reverts machine collectionMeters by locationReportId.
 * This function:
 * 1. Reverts each machine's collectionMeters to their prevIn/prevOut values
 * 2. Removes collectionMetersHistory entries for the report
 * 3. Deletes all collections with the locationReportId
 * 4. Deletes the collection report itself
 *
 * @param locationReportId - The location report ID to delete collections for.
 * @returns Promise resolving to deletion results.
 */
export async function deleteCollectionsByReportId(
  locationReportId: string
): Promise<{
  success: boolean;
  deletedCollections: number;
  deletedReport: number;
  updatedMachines: number;
}> {
  try {
    console.warn(
      '🗑️ deleteCollectionsByReportId called with:',
      locationReportId
    );

    const { data } = await axios.delete('/api/collections/delete-by-report', {
      data: { locationReportId },
    });

    console.warn('🗑️ deleteCollectionsByReportId response:', data);

    return {
      success: data.success,
      deletedCollections: data.deletedCollections,
      deletedReport: data.deletedReport,
      updatedMachines: data.updatedMachines,
    };
  } catch (error) {
    console.error(' deleteCollectionsByReportId error:', error);
    throw error;
  }
}
