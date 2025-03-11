import {NextResponse} from "next/server";
import {getUserIdFromServer} from "@/lib/utils/user";

export async function GET() {
    const userId = await getUserIdFromServer();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ userId });
}
