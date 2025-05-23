import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import type { CollectionDocument } from "@/lib/types/collections";

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const locationReportId = searchParams.get("locationReportId");
    const filter = locationReportId ? { locationReportId } : {};
    const collections = (await Collections.find(
      filter
    ).lean()) as CollectionDocument[];
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
