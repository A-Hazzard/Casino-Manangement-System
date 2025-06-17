import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Licencee } from "@/app/api/lib/models/licencee";
import { ObjectId } from "mongodb";
import {
  logActivity,
  calculateChanges,
} from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

// Helper function to generate a unique license key
function generateLicenseKey(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `LIC-${timestamp}-${randomStr}`.toUpperCase();
}

// Helper function to ensure unique license key
async function generateUniqueLicenseKey(): Promise<string> {
  let licenseKey: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    licenseKey = generateLicenseKey();
    const existing = await Licencee.findOne({ licenseKey });
    if (!existing) {
      isUnique = true;
      return licenseKey;
    }
    attempts++;
  }

  // Fallback with UUID-like structure if all attempts fail
  const fallbackKey = `LIC-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 15)}`.toUpperCase();
  return fallbackKey;
}

export async function GET() {
  await connectDB();

  try {
    // Get licensees, ensuring isPaid is included in the projection
    const licensees = await Licencee.find(
      { deletedAt: { $in: [null, new Date(-1)] } },
      {
        _id: 1,
        name: 1,
        description: 1,
        country: 1,
        startDate: 1,
        expiryDate: 1,
        createdAt: 1,
        updatedAt: 1,
        geoCoords: 1,
        isPaid: 1, // Ensure isPaid is included
        prevStartDate: 1,
        prevExpiryDate: 1,
      }
    )
      .sort({ name: 1 })
      .lean();

    // Ensure every licensee has a definite `isPaid` status for the frontend
    const formattedLicensees = licensees.map((licensee) => {
      let isPaid = licensee.isPaid;
      if (typeof isPaid === "undefined") {
        // Fallback to expiry date logic only if isPaid is missing
        if (licensee.expiryDate) {
          isPaid = new Date(licensee.expiryDate) > new Date();
        } else {
          isPaid = false;
        }
      }
      return {
        ...licensee,
        isPaid, // Return the definite true/false value
        countryName: licensee.country,
        lastEdited: licensee.updatedAt,
      };
    });

    return new Response(JSON.stringify({ licensees: formattedLicensees }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching licensees:", error);
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
    // Get current user for activity logging
    const currentUser = await getUserFromServer();

    // Generate a new ObjectId for the _id field
    const newId = new ObjectId().toString();

    // Generate a unique license key
    const licenseKey = await generateUniqueLicenseKey();

    // Set default start date to current date if not provided
    const finalStartDate = startDate ? new Date(startDate) : new Date();

    // Set default expiry date to 30 days from start date if not provided
    let finalExpiryDate = null;
    if (expiryDate) {
      finalExpiryDate = new Date(expiryDate);
    } else {
      finalExpiryDate = new Date(finalStartDate);
      finalExpiryDate.setDate(finalExpiryDate.getDate() + 30);
    }

    const licensee = await Licencee.create({
      _id: newId,
      name,
      description: description || "",
      country,
      startDate: finalStartDate,
      expiryDate: finalExpiryDate,
      licenseKey,
      lastEdited: new Date(),
    });

    // Log activity if user is authenticated
    if (currentUser && currentUser.emailAddress) {
      try {
        // Create detailed changes for CREATE operation showing all created fields
        const createChanges = [
          {
            field: "name",
            oldValue: null,
            newValue: name,
          },
          {
            field: "description",
            oldValue: null,
            newValue: description || "",
          },
          {
            field: "country",
            oldValue: null,
            newValue: country,
          },
          {
            field: "licenseKey",
            oldValue: null,
            newValue: licenseKey,
          },
          {
            field: "startDate",
            oldValue: null,
            newValue: finalStartDate,
          },
          {
            field: "expiryDate",
            oldValue: null,
            newValue: finalExpiryDate,
          },
          {
            field: "isPaid",
            oldValue: null,
            newValue: finalExpiryDate ? finalExpiryDate > new Date() : false,
          },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "CREATE",
          "Licensee",
          {
            id: newId,
            name: name,
          },
          createChanges,
          `Created new licensee "${name}" in ${country}`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }

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
    // Get current user for activity logging
    const currentUser = await getUserFromServer();

    // Get the original licensee for change tracking
    const originalLicensee = (await Licencee.findOne({ _id: _id }).lean()) as {
      name: string;
      description?: string;
      country: string;
      startDate?: Date;
      expiryDate?: Date;
      prevStartDate?: Date;
      prevExpiryDate?: Date;
      isPaid?: boolean;
    } | null;

    if (!originalLicensee) {
      return new Response(
        JSON.stringify({ success: false, message: "Licensee not found" }),
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: {
      name?: string;
      description?: string;
      country?: string;
      lastEdited: Date;
      startDate?: Date | null;
      expiryDate?: Date | null;
      prevStartDate?: Date | null;
      prevExpiryDate?: Date | null;
      isPaid?: boolean;
    } = {
      lastEdited: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (country !== undefined) updateData.country = country;
    if (startDate !== undefined) {
      // Store previous start date if it's changing
      if (
        originalLicensee.startDate &&
        startDate !== originalLicensee.startDate.toISOString()
      ) {
        updateData.prevStartDate = originalLicensee.startDate;
      }
      updateData.startDate = startDate ? new Date(startDate) : null;
    }
    if (expiryDate !== undefined) {
      // Store previous expiry date if it's changing
      if (
        originalLicensee.expiryDate &&
        expiryDate !== originalLicensee.expiryDate.toISOString()
      ) {
        updateData.prevExpiryDate = originalLicensee.expiryDate;
      }
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    if (prevStartDate !== undefined) {
      updateData.prevStartDate = prevStartDate ? new Date(prevStartDate) : null;
    }
    if (prevExpiryDate !== undefined) {
      updateData.prevExpiryDate = prevExpiryDate
        ? new Date(prevExpiryDate)
        : null;
    }
    if (isPaid !== undefined) {
      updateData.isPaid = isPaid;
    }

    const updated = await Licencee.findOneAndUpdate({ _id: _id }, updateData, {
      new: true,
    });

    if (!updated) {
      return new Response(
        JSON.stringify({ success: false, message: "Licensee not found" }),
        { status: 404 }
      );
    }

    // Ensure isPaid is always present in the returned object
    const updatedLicensee = updated.toObject();
    if (typeof updatedLicensee.isPaid === "undefined") {
      // Fallback to expiry date logic only if isPaid is missing
      if (updatedLicensee.expiryDate) {
        updatedLicensee.isPaid =
          new Date(updatedLicensee.expiryDate) > new Date();
      } else {
        updatedLicensee.isPaid = false;
      }
    }

    // Log activity if user is authenticated
    if (currentUser && currentUser.emailAddress) {
      try {
        // Calculate changes between original and updated data
        const oldIsPaid =
          typeof originalLicensee.isPaid === "undefined"
            ? false
            : originalLicensee.isPaid;
        const newIsPaid =
          typeof updateData.isPaid === "undefined"
            ? oldIsPaid
            : updateData.isPaid;

        const changes = calculateChanges(
          {
            name: originalLicensee.name,
            description: originalLicensee.description,
            country: originalLicensee.country,
            startDate: originalLicensee.startDate,
            expiryDate: originalLicensee.expiryDate,
            prevStartDate: originalLicensee.prevStartDate,
            prevExpiryDate: originalLicensee.prevExpiryDate,
            isPaid: oldIsPaid,
          },
          {
            name: updateData.name || originalLicensee.name,
            description:
              updateData.description !== undefined
                ? updateData.description
                : originalLicensee.description,
            country: updateData.country || originalLicensee.country,
            startDate:
              updateData.startDate !== undefined
                ? updateData.startDate
                : originalLicensee.startDate,
            expiryDate:
              updateData.expiryDate !== undefined
                ? updateData.expiryDate
                : originalLicensee.expiryDate,
            prevStartDate:
              updateData.prevStartDate !== undefined
                ? updateData.prevStartDate
                : originalLicensee.prevStartDate,
            prevExpiryDate:
              updateData.prevExpiryDate !== undefined
                ? updateData.prevExpiryDate
                : originalLicensee.prevExpiryDate,
            isPaid: newIsPaid,
          }
        );

        // Always log the update, even if there are no changes
        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "UPDATE",
          "Licensee",
          {
            id: _id,
            name: updateData.name || originalLicensee.name,
          },
          changes,
          // Let logActivity handle the description generation
          undefined,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, licensee: updatedLicensee }),
      {
        status: 200,
      }
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
    // Get current user for activity logging
    const currentUser = await getUserFromServer();

    // Get the licensee before deletion for logging
    const licenseeToDelete = await Licencee.findById(_id);
    if (!licenseeToDelete) {
      return new Response(
        JSON.stringify({ success: false, message: "Licensee not found" }),
        { status: 404 }
      );
    }

    const deleted = await Licencee.findByIdAndUpdate(
      _id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, message: "Licensee not found" }),
        { status: 404 }
      );
    }

    // Log activity if user is authenticated
    if (currentUser && currentUser.emailAddress) {
      try {
        // Create detailed changes for DELETE operation showing all deleted fields
        const deleteChanges = [
          {
            field: "name",
            oldValue: licenseeToDelete.name,
            newValue: null,
          },
          {
            field: "description",
            oldValue: licenseeToDelete.description || "",
            newValue: null,
          },
          {
            field: "country",
            oldValue: licenseeToDelete.country,
            newValue: null,
          },
          {
            field: "licenseKey",
            oldValue: licenseeToDelete.licenseKey,
            newValue: null,
          },
          {
            field: "startDate",
            oldValue: licenseeToDelete.startDate,
            newValue: null,
          },
          {
            field: "expiryDate",
            oldValue: licenseeToDelete.expiryDate,
            newValue: null,
          },
          {
            field: "isPaid",
            oldValue:
              licenseeToDelete.isPaid !== undefined
                ? licenseeToDelete.isPaid
                : licenseeToDelete.expiryDate
                ? new Date(licenseeToDelete.expiryDate) > new Date()
                : false,
            newValue: null,
          },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DELETE",
          "Licensee",
          {
            id: _id,
            name: licenseeToDelete.name,
          },
          deleteChanges,
          `Deleted licensee "${licenseeToDelete.name}"`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
