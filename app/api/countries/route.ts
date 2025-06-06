import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Countries } from "@/app/api/lib/models/countries";

export async function GET() {
  await connectDB();
  const countries = await Countries.find({});
  return new Response(JSON.stringify({ countries }), { status: 200 });
}

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { name, alpha2, alpha3, isoNumeric } = body;
  if (!name || !alpha2 || !alpha3 || !isoNumeric) {
    return new Response(
      JSON.stringify({ success: false, message: "All fields are required" }),
      { status: 400 }
    );
  }
  try {
    const country = await Countries.create({
      name,
      alpha2,
      alpha3,
      isoNumeric,
    });
    return new Response(JSON.stringify({ success: true, country }), {
      status: 201,
    });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { _id, name, alpha2, alpha3, isoNumeric } = body;
  if (!_id || !name || !alpha2 || !alpha3 || !isoNumeric) {
    return new Response(
      JSON.stringify({ success: false, message: "All fields are required" }),
      { status: 400 }
    );
  }
  try {
    const updated = await Countries.findByIdAndUpdate(
      _id,
      { name, alpha2, alpha3, isoNumeric },
      { new: true }
    );
    if (!updated) {
      return new Response(
        JSON.stringify({ success: false, message: "Country not found" }),
        { status: 404 }
      );
    }
    return new Response(JSON.stringify({ success: true, country: updated }), {
      status: 200,
    });
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
      JSON.stringify({ success: false, message: "Country ID is required" }),
      { status: 400 }
    );
  }
  try {
    const deleted = await Countries.findByIdAndDelete(_id);
    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, message: "Country not found" }),
        { status: 404 }
      );
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
