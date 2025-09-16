import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getAllLocationNames } from "@/lib/helpers/collectionReport";

export async function GET() {
  await connectDB();
  try {
    const locationNames = await getAllLocationNames();
    return NextResponse.json({ locations: locationNames });
  } catch (error) {
    console.error("Error in locations API:", error);
    return NextResponse.json({ locations: [] }, { status: 500 });
  }
}
