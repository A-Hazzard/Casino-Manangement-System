import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import {
  getAllLicensees,
  formatLicenseesForResponse,
  createLicensee as createLicenseeHelper,
  updateLicensee as updateLicenseeHelper,
  deleteLicensee as deleteLicenseeHelper,
} from "@/app/api/lib/helpers/licensees";

export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const { searchParams } = new URL(request.url);
    const licenseeFilter = searchParams.get("licensee");

    const licensees = await getAllLicensees();
    let formattedLicensees = formatLicenseesForResponse(licensees);

    // Filter by licensee if provided
    if (licenseeFilter && licenseeFilter !== "all") {
      formattedLicensees = formattedLicensees.filter((licensee) => {
        const licenseeId = (licensee as any)._id;
        const licenseeName = (licensee as any).name;
        return licenseeId === licenseeFilter || licenseeName === licenseeFilter;
      });
    }

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
