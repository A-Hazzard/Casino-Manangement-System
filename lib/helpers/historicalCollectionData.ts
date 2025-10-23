import axios from "axios";

/**
 * Get the previous collection meters for a machine at a specific point in time
 * This is used when adding machines to historical reports to get accurate prevIn/prevOut
 *
 * @param machineId - The machine ID to query
 * @param timestamp - The timestamp of the current collection (we need the previous one before this)
 * @returns Object with prevIn and prevOut values, or null if no previous collection found
 */
export async function getPreviousCollectionMetersAtTime(
  machineId: string,
  timestamp: Date
): Promise<{ prevIn: number; prevOut: number } | null> {
  try {
    // Query for the most recent collection for this machine BEFORE the given timestamp
    const response = await axios.get("/api/collections", {
      params: {
        machineId: machineId,
        beforeTimestamp: timestamp.toISOString(),
        limit: 1,
        sortBy: "timestamp",
        sortOrder: "desc",
      },
    });

    const collections = response.data;

    console.warn("Historical previous collection query:", {
      machineId,
      timestamp: timestamp.toISOString(),
      foundCollections: collections?.length || 0,
      collection: collections?.[0]
        ? {
            timestamp: collections[0].timestamp,
            metersIn: collections[0].metersIn,
            metersOut: collections[0].metersOut,
          }
        : null,
    });

    if (collections && collections.length > 0) {
      const previousCollection = collections[0];
      // Use the previous collection's metersIn/metersOut as the current collection's prevIn/prevOut
      return {
        prevIn: previousCollection.metersIn || 0,
        prevOut: previousCollection.metersOut || 0,
      };
    }

    // No previous collection found - this is the first collection for this machine
    console.warn(
      "No previous collection found for machine, using prevIn=0, prevOut=0"
    );
    return { prevIn: 0, prevOut: 0 };
  } catch (error) {
    console.error("Error fetching previous collection meters:", error);
    // On error, return null to indicate we should fall back to default behavior
    return null;
  }
}
