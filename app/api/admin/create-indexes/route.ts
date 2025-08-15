import { NextRequest, NextResponse } from "next/server";
import {
  createAggressiveIndexes,
  createIndexesForCollection,
} from "@/app/api/lib/utils/createIndexes";

export async function POST(request: NextRequest) {
  try {
    // console.log("Admin - Creating aggressive indexes...");

    const body = await request.json();
    const { collection } = body;

    let result;

    if (collection) {
      // console.log(`Creating indexes for specific collection: ${collection}`);
      result = await createIndexesForCollection(collection);
    } else {
      // console.log("Creating indexes for all collections");
      result = await createAggressiveIndexes();
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message:
          "message" in result ? result.message : "Indexes created successfully",
        collection: collection || "all",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "error" in result ? result.error : "Unknown error",
        },
        { status: 500 }
      );
    }
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
