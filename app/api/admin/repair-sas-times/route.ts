import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import { Machine } from "@/app/api/lib/models/machines";
import { calculateSasMetrics } from "@/lib/helpers/collectionCreation";

type RepairMode = "dry-run" | "commit";

/**
 * Normalize timestamp to 8AM Trinidad time (12:00 UTC)
 * Trinidad is UTC-4, so 8AM Trinidad = 12:00 UTC
 */
function normalizeTo8AMTrinidad(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(12, 0, 0, 0); // 12:00 UTC = 8:00 AM Trinidad
  return normalized;
}

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") as RepairMode) || "dry-run";
    const locationReportId = searchParams.get("locationReportId") || undefined;
    const machineId = searchParams.get("machineId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const filter: Record<string, unknown> = {};
    if (locationReportId) filter.locationReportId = locationReportId;
    if (machineId) filter.machineId = machineId;

    if (startDateParam || endDateParam) {
      const ts: Record<string, Date> = {};
      if (startDateParam) ts.$gte = new Date(startDateParam);
      if (endDateParam) ts.$lte = new Date(endDateParam);
      filter.timestamp = ts;
    }

    // Fetch target collections and sort chronologically (oldest first)
    const collections = await Collections.find(filter)
      .sort({ timestamp: 1 })
      .lean();

    const results: Array<{
      _id: string;
      machineId: string;
      oldStart?: string;
      oldEnd?: string;
      newStart: string;
      newEnd: string;
      changed: boolean;
    }> = [];

    for (const c of collections) {
      // Normalize current collection timestamp to 8AM Trinidad (12:00 UTC)
      const normalizedTimestamp = normalizeTo8AMTrinidad(
        new Date(c.timestamp as Date)
      );
      const currentEnd = normalizedTimestamp;

      // Find previous collection for this machine strictly before current timestamp
      const previous = await Collections.findOne({
        machineId: c.machineId,
        timestamp: { $lt: currentEnd },
      })
        .sort({ timestamp: -1 })
        .lean();

      // Previous collection also normalized to 8AM Trinidad
      let newStart = previous
        ? normalizeTo8AMTrinidad(new Date(previous.timestamp as Date))
        : new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);

      // Guard inversion
      if (newStart > currentEnd) {
        console.warn(`⚠️ Inversion detected for ${c._id}, swapping times`);
        const tmp = newStart;
        newStart = new Date(currentEnd.getTime());
        currentEnd.setTime(tmp.getTime());
      }

      // Calculate SAS metrics for the corrected window
      const sas = await calculateSasMetrics(
        c.machineId as string,
        newStart,
        currentEnd
      );

      const oldStart = (c as { sasMeters?: { sasStartTime?: string } })
        .sasMeters?.sasStartTime;
      const oldEnd = (c as { sasMeters?: { sasEndTime?: string } }).sasMeters
        ?.sasEndTime;

      const changed =
        !oldStart ||
        !oldEnd ||
        oldStart !== sas.sasStartTime ||
        oldEnd !== sas.sasEndTime;

      results.push({
        _id: String(c._id),
        machineId: String(c.machineId),
        oldStart,
        oldEnd,
        newStart: sas.sasStartTime,
        newEnd: sas.sasEndTime,
        changed,
      });

      if (mode === "commit" && changed) {
        await Collections.updateOne(
          { _id: c._id },
          {
            $set: {
              timestamp: normalizedTimestamp, // Normalize collection timestamp to 8AM Trinidad
              "sasMeters.drop": sas.drop,
              "sasMeters.totalCancelledCredits": sas.totalCancelledCredits,
              "sasMeters.gross": sas.gross,
              "sasMeters.gamesPlayed": sas.gamesPlayed,
              "sasMeters.jackpot": sas.jackpot,
              "sasMeters.sasStartTime": sas.sasStartTime,
              "sasMeters.sasEndTime": sas.sasEndTime,
            },
          }
        );

        // Update machine.previousCollectionTime and collectionTime if this collection is newer
        const machine = await Machine.findById(c.machineId).lean<{
          previousCollectionTime?: Date;
          collectionTime?: Date;
        }>();
        if (machine) {
          const prev = machine.previousCollectionTime
            ? new Date(machine.previousCollectionTime)
            : undefined;
          if (!prev || prev < normalizedTimestamp) {
            await Machine.updateOne(
              { _id: c.machineId },
              {
                $set: {
                  previousCollectionTime: normalizedTimestamp,
                  collectionTime: normalizedTimestamp,
                },
              }
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      count: results.length,
      changed: results.filter((r) => r.changed).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
