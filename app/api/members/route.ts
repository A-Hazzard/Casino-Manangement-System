import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Member } from "@/app/api/lib/models/members";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const licencee = searchParams.get("licencee") || "";

    // Build optimized query
    let query: any = {};

    if (search) {
      query.$or = [
        { "profile.firstName": { $regex: search, $options: "i" } },
        { "profile.lastName": { $regex: search, $options: "i" } },
        { _id: { $regex: search, $options: "i" } },
      ];
    }

    // Build optimized sort options with indexing considerations
    let sort: any = {};
    if (sortBy === "name") {
      sort["profile.firstName"] = sortOrder === "asc" ? 1 : -1;
      sort["profile.lastName"] = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "playerId") {
      sort["_id"] = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "lastSession") {
      sort["createdAt"] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    // Use aggregation pipeline to get members with location names and win/loss data
    let pipeline: any[] = [];

    // Match stage
    pipeline.push({ $match: query });

    // Lookup gaming location to get location name
    pipeline.push({
      $lookup: {
        from: "gaminglocations",
        localField: "gamingLocation",
        foreignField: "_id",
        as: "locationInfo",
      },
    });

    // Lookup machine sessions to calculate win/loss
    pipeline.push({
      $lookup: {
        from: "machinesessions",
        localField: "_id",
        foreignField: "memberId",
        as: "sessions",
      },
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        locationName: { $arrayElemAt: ["$locationInfo.name", 0] },
        // Calculate win/loss from sessions
        totalMoneyIn: {
          $reduce: {
            input: "$sessions",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $ifNull: [{ $toDouble: "$$this.endMeters.movement.drop" }, 0],
                },
              ],
            },
          },
        },
        totalMoneyOut: {
          $reduce: {
            input: "$sessions",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $ifNull: [
                    {
                      $toDouble:
                        "$$this.endMeters.movement.totalCancelledCredits",
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
      },
    });

    // Add win/loss calculation
    pipeline.push({
      $addFields: {
        winLoss: { $subtract: ["$totalMoneyIn", "$totalMoneyOut"] },
      },
    });

    // Filter by licencee if specified
    if (licencee && licencee !== "All Licensees" && licencee !== "all") {
      pipeline.push({
        $match: {
          "locationInfo.rel.licencee": licencee,
          "locationInfo.deletedAt": { $exists: false },
        },
      });
    }

    // Project only needed fields
    pipeline.push({
      $project: {
        _id: 1,
        profile: 1,
        username: 1,
        phoneNumber: 1,
        points: 1,
        uaccount: 1,
        createdAt: 1,
        updatedAt: 1,
        gamingLocation: 1,
        locationName: 1,
        loggedIn: 1,
        accountLocked: 1,
        lastLogin: 1,
        winLoss: 1,
        totalMoneyIn: 1,
        totalMoneyOut: 1,
      },
    });

    // Sort
    pipeline.push({ $sort: sort });

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Member.aggregate(countPipeline);
    const totalMembers = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const members = await Member.aggregate(pipeline);

    const response = {
      success: true,
      data: {
        members,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMembers / limit),
          totalMembers,
          hasNextPage: page * limit < totalMembers,
          hasPrevPage: page > 1,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.profile?.firstName || !body.profile?.lastName || !body.username) {
      return NextResponse.json(
        { error: "First name, last name, and username are required" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingMember = await Member.findOne({ username: body.username });
    if (existingMember) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Create new member
    const newMember = new Member({
      _id: body.username, // Use username as ID
      profile: {
        firstName: body.profile.firstName,
        lastName: body.profile.lastName,
        email: body.profile.email || "",
        occupation: body.profile.occupation || "",
        address: body.profile.address || "",
        gender: "",
        dob: "",
        indentification: {
          number: "",
          type: "",
        },
      },
      username: body.username,
      phoneNumber: body.phoneNumber || "",
      points: body.points || 0,
      uaccount: body.uaccount || 0,
      pin: body.pin || "0000",
      gamingLocation: body.gamingLocation || "default", // Allow specifying gaming location
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newMember.save();

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
