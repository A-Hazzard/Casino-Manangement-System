import { NextRequest, NextResponse } from "next/server";
import {
  getAccountingDetails,
  getAcceptedBillsByMachine,
  getMachineEventsByMachine,
  getCollectionMetersHistoryByMachine,
} from "@/app/api/lib/helpers/accountingDetails";

export async function GET(request: NextRequest) {
  console.log("[API] /api/machines/[id] GET called");
  try {
    // Extract id from the URL
    const url = new URL(request.url);
    const urlParts = url.pathname.split("/");
    const id = urlParts[urlParts.length - 1];
    console.log("[API] Params:", { id });

    if (!id) {
      console.error("[API] Missing machine id");
      return NextResponse.json(
        { error: "Missing machine id" },
        { status: 400 }
      );
    }

    // Get query parameters
    const dataType = url.searchParams.get("dataType");

    // Based on dataType, fetch and return specific data
    if (dataType === "acceptedBills") {
      console.log("[API] Fetching accepted bills data only");
      const acceptedBills = await getAcceptedBillsByMachine(id);
      console.log("[API] Success, returning accepted bills data");
      return NextResponse.json({ data: acceptedBills });
    } else if (dataType === "machineEvents") {
      console.log("[API] Fetching machine events data only");
      const machineEvents = await getMachineEventsByMachine(id);
      console.log("[API] Success, returning machine events data");
      return NextResponse.json({ data: machineEvents });
    } else if (dataType === "collectionMetersHistory") {
      console.log("[API] Fetching collection meters history data only");
      const collectionMetersHistory = await getCollectionMetersHistoryByMachine(
        id
      );
      console.log("[API] Success, returning collection meters history data");
      return NextResponse.json({ data: collectionMetersHistory });
    }

    // Default: Return all accounting details
    else {
      console.log("[API] Fetching all accounting details");
      const data = await getAccountingDetails(id);
      console.log("[API] Success, returning all data");
      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
