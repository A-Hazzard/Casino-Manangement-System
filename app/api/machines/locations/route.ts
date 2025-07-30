import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get licencee from query params
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get("licencee");
    const licensee = searchParams.get("licensee"); // Also check for "licensee" parameter

    // Define the type for matchStage
    type MatchStage = Record<string, unknown>;

    // Initialize matchStage with type
    const matchStage: MatchStage = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Add licencee filter if provided (check both parameter names)
    const finalLicencee = licencee || licensee;
    if (finalLicencee) {
      matchStage["rel.licencee"] = finalLicencee; // Use bracket notation for nested field
    }

    // Aggregate locations with their country names
    const locations = await GamingLocations.aggregate([
      // Only include non-deleted locations and match licencee if provided
      { $match: matchStage },
      // Lookup country details
      {
        $lookup: {
          from: "countries",
          localField: "country",
          foreignField: "_id",
          as: "countryDetails",
        },
      },
      // Unwind the countryDetails array
      {
        $unwind: {
          path: "$countryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          name: 1,
          countryName: "$countryDetails.name",
        },
      },
      // Sort by name
      {
        $sort: { name: 1 },
      },
    ]);

    return NextResponse.json({ locations }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/machines/locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
