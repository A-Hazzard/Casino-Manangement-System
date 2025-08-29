/**
 * Helper functions for location file logging operations
 */

import fs from "fs";
import path from "path";

type LocationGeoData = {
  _id: unknown;
  name?: string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number; // Legacy field
  };
  __v?: number;
};

/**
 * Analyzes location geoCoords and categorizes them
 * @param locations - Array of location objects
 * @returns Object containing categorized locations and issues
 */
export function analyzeLocationGeoCoords(locations: LocationGeoData[]) {
  const validLocations: LocationGeoData[] = [];
  const missingGeoCoords: string[] = [];
  const zeroGeoCoords: string[] = [];

  locations.forEach((location) => {
    const locationName = location.name || 'Unknown';
    if (!location.geoCoords) {
      // Case: Missing geoCoords
      missingGeoCoords.push(`${location._id?.toString()} (${locationName})`);
    } else if (location.geoCoords) {
      const { latitude, longitude, longtitude } = location.geoCoords;

      // Use longitude if available, otherwise fallback to longtitude
      const validLongitude = longitude !== undefined ? longitude : longtitude;

      if ((latitude === 0 || validLongitude === 0) && location._id) {
        // Case: Zero-valued geoCoords
        zeroGeoCoords.push(`${location._id?.toString()} (${locationName})`);
      } else {
        // Case: Valid coordinates
        validLocations.push(location);
      }
    }
  });

  return {
    validLocations,
    missingGeoCoords,
    zeroGeoCoords,
  };
}

/**
 * Logs missing/invalid geoCoords to file system
 * @param missingGeoCoords - Array of location IDs with missing coords
 * @param zeroGeoCoords - Array of location IDs with zero-valued coords
 */
export function logGeoCoordIssues(
  missingGeoCoords: string[],
  zeroGeoCoords: string[]
) {
  try {
    // Prepare log directory
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    const logFile = path.join(logDir, "missing_geoCoords.log");
    const logData = [
      `[${new Date().toISOString()}] - Missing/Invalid GeoCoords Report`,
      `Missing geoCoords:\n ${
        missingGeoCoords.length ? missingGeoCoords.join(", \n") : "None"
      }`,
      `Zero-valued geoCoords:\n ${
        zeroGeoCoords.length ? zeroGeoCoords.join(", \n") : "None"
      }`,
      "---------------------------------------------\n",
    ].join("\n");

    // Append log entry
    fs.appendFileSync(logFile, logData);
  } catch (error) {
    console.error("Failed to log geoCoord issues:", error);
  }
}
