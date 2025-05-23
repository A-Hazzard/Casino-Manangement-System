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
