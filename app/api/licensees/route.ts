import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import {
  getAllLicensees,
  formatLicenseesForResponse,
  createLicensee as createLicenseeHelper,
  updateLicensee as updateLicenseeHelper,
  deleteLicensee as deleteLicenseeHelper,
} from "@/app/api/lib/helpers/licensees";
import { apiLogger } from "@/app/api/lib/utils/logger";

export async function GET(request: NextRequest) {
  const context = apiLogger.createContext(request, "/api/licensees");
  apiLogger.startLogging();

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licenseeFilter = searchParams.get("licensee");

    // Get user authentication info
    const authResponse = await fetch(
      `${request.nextUrl.origin}/api/auth/token`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    let userRoles: string[] = [];
    let userLocations: string[] = [];

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.userId) {
        // Fetch user data to get roles and locations
        const userResponse = await fetch(
          `${request.nextUrl.origin}/api/users/${authData.userId}`,
          {
            headers: {
              cookie: request.headers.get("cookie") || "",
            },
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user) {
            userRoles = userData.user.roles || [];
            userLocations =
              userData.user.resourcePermissions?.["gaming-locations"]
                ?.resources || [];
          }
        }
      }
    }

    const licensees = await getAllLicensees();
    let formattedLicensees = formatLicenseesForResponse(licensees);

    // Apply location-based filtering for non-admin users
    if (
      userRoles.length > 0 &&
      !userRoles.includes("evolution admin") &&
      !userRoles.includes("admin")
    ) {
      // Get all locations to determine licensee relationships
      // We need full location data including licensee information
      const response = await fetch(`${request.nextUrl.origin}/api/locations`, {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      });

      let allLocations: Array<{ _id: string; "rel.licencee"?: string }> = [];
      if (response.ok) {
        const data = await response.json();
        allLocations = data.locations || [];
      }

      // Create a map of location ID to licensee ID
      const locationToLicenseeMap = new Map<string, string>();
      allLocations.forEach((location) => {
        if (location["rel.licencee"]) {
          locationToLicenseeMap.set(location._id, location["rel.licencee"]);
        }
      });

      // Filter licensees based on user's accessible locations
      const accessibleLicenseeIds = new Set<string>();
      userLocations.forEach((locationId) => {
        const licenseeId = locationToLicenseeMap.get(locationId);
        if (licenseeId) {
          accessibleLicenseeIds.add(licenseeId);
        }
      });

      formattedLicensees = formattedLicensees.filter((licensee) => {
        const licenseeId = (licensee as Record<string, unknown>)._id as string;
        return accessibleLicenseeIds.has(licenseeId);
      });
    }

    // Filter by licensee if provided
    if (licenseeFilter && licenseeFilter !== "all") {
      formattedLicensees = formattedLicensees.filter((licensee) => {
        const licenseeId = (licensee as Record<string, unknown>)._id as string;
        const licenseeName = (licensee as Record<string, unknown>)
          .name as string;
        return licenseeId === licenseeFilter || licenseeName === licenseeFilter;
      });
    }

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${formattedLicensees.length} licensees`
    );
    return new Response(JSON.stringify({ licensees: formattedLicensees }), {
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    apiLogger.logError(context, "Failed to fetch licensees", errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to fetch licensees" }),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { name, description, country, startDate, expiryDate } = body;

  if (!name || !country) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Name and country are required",
      }),
      { status: 400 }
    );
  }

  try {
    const licensee = await createLicenseeHelper(
      { name, description, country, startDate, expiryDate },
      request
    );

    return new Response(JSON.stringify({ success: true, licensee }), {
      status: 201,
    });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    console.error("Error creating licensee:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const {
    _id,
    name,
    description,
    country,
    startDate,
    expiryDate,
    isPaid,
    prevStartDate,
    prevExpiryDate,
  } = body;

  if (!_id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "ID is required",
      }),
      { status: 400 }
    );
  }

  try {
    const updatedLicensee = await updateLicenseeHelper(
      {
        _id,
        name,
        description,
        country,
        startDate,
        expiryDate,
        isPaid,
        prevStartDate,
        prevExpiryDate,
      },
      request
    );

    return new Response(
      JSON.stringify({ success: true, licensee: updatedLicensee }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { _id } = body;

  if (!_id) {
    return new Response(
      JSON.stringify({ success: false, message: "Licensee ID is required" }),
      { status: 400 }
    );
  }

  try {
    await deleteLicenseeHelper(_id, request);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
