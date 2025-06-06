import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import type { CollectionDocument } from "@/lib/types/collections";

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const locationReportId = searchParams.get("locationReportId");
    const collector = searchParams.get("collector");
    const isCompleted = searchParams.get("isCompleted");
    const filter: Record<string, unknown> = {};
    if (locationReportId) filter.locationReportId = locationReportId;
    if (collector) filter.collector = collector;
    if (isCompleted !== null && isCompleted !== undefined)
      filter.isCompleted = isCompleted === "true";
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

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const data = await req.json();
    const created = await Collections.create(data);
    return NextResponse.json(created);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create collection", details: (e as Error)?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const deleted = await Collections.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to delete collection", details: (e as Error)?.message },
      { status: 500 }
    );
  }
}
