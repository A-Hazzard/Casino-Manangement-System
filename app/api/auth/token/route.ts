import { NextResponse } from "next/server";
import { getUserIdFromServer } from "../../lib/helpers/users";

export async function GET() {
  try {
    const userId = await getUserIdFromServer();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ userId });
  } catch (error) {
    console.error("Error in token API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
