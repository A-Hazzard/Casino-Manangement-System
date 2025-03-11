import { NextResponse } from "next/server";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import path from "path";
import fs from "fs";

export async function GET() {
    try {
        // Fetch locations, only include `geoCoords`, `name`, and `_id`
        const locations = await GamingLocations.find({}, "geoCoords name _id").lean();

        const missingGeoCoords: string[] = [];
        const zeroGeoCoords: string[] = [];

        // Filter valid locations
        const validLocations = locations.filter((location) => {
            if (!location.geoCoords && location._id) {
                // Case: Missing geoCoords
                missingGeoCoords.push(`${location._id.toString()} (${location.name})`);
                return false;
            }

            const { latitude, longitude } = location.geoCoords;

            if ((latitude === 0 || longitude === 0) && location._id) {
                // Case: Zero-valued geoCoords
                zeroGeoCoords.push(`${location._id.toString()} (${location.name})`);
                return false;
            }

            return true;
        });

        // Prepare log directory
        const logDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

        const logFile = path.join(logDir, "missing_geoCoords.log");
        const logData = [
            `[${new Date().toISOString()}] - Missing/Invalid GeoCoords Report`,
            `Missing geoCoords:\n ${missingGeoCoords.length ? missingGeoCoords.join(", \n") : "None"}`,
            `Zero-valued geoCoords:\n ${zeroGeoCoords.length ? zeroGeoCoords.join(", \n") : "None"}`,
            "---------------------------------------------\n",
        ].join("\n");

        // Append log entry
        fs.appendFileSync(logFile, logData);

        console.log("✅ Returning valid locations:");

        return NextResponse.json({ locations: validLocations }, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("❌ API Error:", errorMessage);
        return NextResponse.json({ success: false, message: errorMessage });
    }
}
