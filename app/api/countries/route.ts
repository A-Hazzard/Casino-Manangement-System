import { NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { Countries } from "../lib/models/countries";

export async function GET() {
  try {
    await connectDB();

    const countries = await Countries.find({}).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      countries: countries,
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
