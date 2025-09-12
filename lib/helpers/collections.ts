import axios from "axios";
import type { CollectionDocument } from "@/lib/types/collections";

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
  const { data } = await axios.patch(`/api/collections/${collectionId}`, updateData);
  return data as CollectionDocument;
}
