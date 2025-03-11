import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

// Map incoming timePeriod values to stored keys
const timeframeKeyMap: Record<string, string> = {
    "7d": "last7Days",
    "30d": "last30Days",
    "Today": "Today",
    "Yesterday": "Yesterday"
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get("userId");
    const timePeriod = searchParams.get("timePeriod");
    if (!userIdStr || !timePeriod) {
        console.log("❌ Missing userId or timePeriod parameter");
        return NextResponse.json(
            { error: "Missing userId or timePeriod parameter" },
            { status: 400 }
        );
    }

    const timeframeKey = timeframeKeyMap[timePeriod];
    if (!timeframeKey) {
        console.error(`🚨 Invalid timePeriod parameter. Expected one of: ${Object.keys(timeframeKeyMap).join(", ")}`)
        return NextResponse.json(
            { error: `Invalid timePeriod parameter. Expected one of: ${Object.keys(timeframeKeyMap).join(", ")}` },
            { status: 400 }
        );
    }

    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/casinoDB";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        // Query the casinoMetrics collection for this user.
        const metricsForLocations = await db.collection("casinoMetrics").findOne(
            { userId: userIdStr },
            { projection: { _id: 0, userId: 0, lastUpdated: 0 } }
        );

        if (!metricsForLocations) {
            console.error("🔍 User metrics not found")
            return NextResponse.json(
                { error: "User metrics not found" },
                { status: 404 }
            );
        }

        // Prepare a debug log entry.
        const debugEntry = metricsForLocations;

        // Write debug log to file (append to file so we can see history).
        const logDir = path.join(process.cwd(), "logs");

        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        const debugFile = path.join(logDir, "casinoMetricsByUser_debug.json");
        fs.appendFileSync(debugFile, JSON.stringify(debugEntry, null, 2) + "\n");

        console.log("📝 Debug log written successfully");
        return NextResponse.json(metricsForLocations, { status: 200 });
    } catch (err) {
        console.error("🚨 Error fetching aggregated metrics:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    } finally {
        await client.close();
        console.log("🔌 MongoDB connection closed");
    }
}