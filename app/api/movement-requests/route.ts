import { NextRequest, NextResponse } from "next/server";
import { MovementRequest } from "@/app/api/lib/models/movementrequests";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

export async function GET() {
  try {
    const requests = await MovementRequest.find()
      .sort({ createdAt: -1 })
      .lean();
    // Fetch all locations for lookup, sorted alphabetically by name
    const locations = await GamingLocations.find({}, { _id: 1, name: 1 })
      .sort({ name: 1 })
      .lean();
    const idToName = Object.fromEntries(
      locations.map((l) => [String(l._id), l.name])
    );
    // Transform requests: replace locationFrom/locationTo with name if it's an ID
    const transformed = requests.map((req) => ({
      ...req,
      locationFrom: idToName[req.locationFrom] || req.locationFrom,
      locationTo: idToName[req.locationTo] || req.locationTo,
    }));
    return NextResponse.json(transformed);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch movement requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const created = await MovementRequest.create({ ...data });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create movement request" },
      { status: 400 }
    );
  }
}
