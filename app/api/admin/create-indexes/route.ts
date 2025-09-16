import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { MachineEvent } from "@/app/api/lib/models/machineEvents";
import { Meters } from "@/app/api/lib/models/meters";
import { Collections } from "@/app/api/lib/models/collections";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Member } from "@/app/api/lib/models/members";
import { MachineSession } from "@/app/api/lib/models/machineSessions";
import UserModel from "@/app/api/lib/models/user";

export async function POST(_request: NextRequest) {
  try {
    await connectDB();

    const results = [];

    // Machine indexes
    try {
      await Machine.collection.createIndex({ serialNumber: 1 });
      await Machine.collection.createIndex({ gamingLocation: 1 });
      await Machine.collection.createIndex({ assetStatus: 1 });
      await Machine.collection.createIndex({ cabinetType: 1 });
      await Machine.collection.createIndex({ relayId: 1 });
      await Machine.collection.createIndex({ deletedAt: 1 });
      results.push("Machine indexes created successfully");
    } catch (error) {
      results.push(`Machine indexes error: ${error}`);
    }

    // GamingLocations indexes
    try {
      await GamingLocations.collection.createIndex({ name: 1 });
      await GamingLocations.collection.createIndex({ address: 1 });
      await GamingLocations.collection.createIndex({ deletedAt: 1 });
      results.push("GamingLocations indexes created successfully");
    } catch (error) {
      results.push(`GamingLocations indexes error: ${error}`);
    }

    // MachineEvent indexes for improved performance
    try {
      await MachineEvent.collection.createIndex({ machine: 1, date: -1 });
      await MachineEvent.collection.createIndex({ machineId: 1, date: -1 });
      await MachineEvent.collection.createIndex({ relay: 1, date: -1 });
      await MachineEvent.collection.createIndex({ cabinetId: 1, date: -1 });
      await MachineEvent.collection.createIndex({ date: -1 });
      await MachineEvent.collection.createIndex({ eventType: 1 });
      await MachineEvent.collection.createIndex({ description: "text" });
      await MachineEvent.collection.createIndex({ gameName: 1 });
      results.push("MachineEvent indexes created successfully");
    } catch (error) {
      results.push(`MachineEvent indexes error: ${error}`);
    }

    // Meters indexes
    try {
      await Meters.collection.createIndex({ machineId: 1 });
      await Meters.collection.createIndex({ date: 1 });
      await Meters.collection.createIndex({ locationId: 1 });
      results.push("Meters indexes created successfully");
    } catch (error) {
      results.push(`Meters indexes error: ${error}`);
    }

    // Collections indexes
    try {
      await Collections.collection.createIndex({ machineId: 1 });
      await Collections.collection.createIndex({ locationId: 1 });
      await Collections.collection.createIndex({ date: 1 });
      results.push("Collections indexes created successfully");
    } catch (error) {
      results.push(`Collections indexes error: ${error}`);
    }

    // CollectionReport indexes
    try {
      await CollectionReport.collection.createIndex({ locationId: 1 });
      await CollectionReport.collection.createIndex({ date: 1 });
      await CollectionReport.collection.createIndex({ reportId: 1 });
      results.push("CollectionReport indexes created successfully");
    } catch (error) {
      results.push(`CollectionReport indexes error: ${error}`);
    }

    // Members indexes
    try {
      await Member.collection.createIndex({ memberId: 1 });
      await Member.collection.createIndex({ "profile.email": 1 });
      await Member.collection.createIndex({ phoneNumber: 1 });
      await Member.collection.createIndex({ deletedAt: 1 });
      results.push("Members indexes created successfully");
    } catch (error) {
      results.push(`Members indexes error: ${error}`);
    }

    // Sessions indexes
    try {
      await MachineSession.collection.createIndex({ memberId: 1 });
      await MachineSession.collection.createIndex({ machineId: 1 });
      await MachineSession.collection.createIndex({ startTime: 1 });
      await MachineSession.collection.createIndex({ endTime: 1 });
      results.push("Sessions indexes created successfully");
    } catch (error) {
      results.push(`Sessions indexes error: ${error}`);
    }

    // Users indexes
    try {
      await UserModel.collection.createIndex({ emailAddress: 1 });
      await UserModel.collection.createIndex({ roles: 1 });
      await UserModel.collection.createIndex({ isEnabled: 1 });
      results.push("Users indexes created successfully");
    } catch (error) {
      results.push(`Users indexes error: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: "Indexes created successfully",
      results,
    });
  } catch (error) {
    console.error("Error creating indexes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create indexes" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to create indexes",
    collections: ["members", "machinesessions", "machineevents"],
  });
}
