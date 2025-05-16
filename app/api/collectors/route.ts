import { NextRequest, NextResponse } from "next/server";
import { getCollectorsPaginated } from "@/lib/helpers/collectionReport";
import { connectDB } from "@/app/api/lib/middleware/db";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  // Get licencee parameter for filtering
  const licencee = searchParams.get("licencee") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10); // Set default limit to 10
  const collectors = await getCollectorsPaginated(page, limit, licencee);
  return NextResponse.json(collectors);
}
