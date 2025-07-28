import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import type { ComparisonData } from "@/lib/types/reports";
import type {
  DatabaseConnection,
  MachineDocument,
  CollectionDocument,
  LocationDocument,
} from "@/shared/types/comparison";

/**
 * Fetches comparison data from the database for the specified locations and date range
 */
async function fetchComparisonData(
  db: DatabaseConnection,
  locationIds: string[],
  startDate: Date,
  endDate: Date
): Promise<ComparisonData> {
  console.log("🔄 Starting data fetch for comparison...");

  const overviewData = await fetchOverviewData(
    db,
    locationIds,
    startDate,
    endDate
  );
  const machinePerformance = await fetchMachinePerformance(
    db,
    locationIds,
    startDate,
    endDate
  );
  const machineDrop = await fetchMachineDrop(
    db,
    locationIds,
    startDate,
    endDate
  );
  const topPerformers = await fetchTopPerformers(
    db,
    locationIds,
    startDate,
    endDate
  );

  return {
    overview: overviewData,
    machinePerformance,
    machineDrop,
    topPerformers,
  };
}

/**
 * Fetches overview data including chart data, drop comparison, jackpot comparison, and holds metric
 */
async function fetchOverviewData(
  db: DatabaseConnection,
  locationIds: string[],
  startDate: Date,
  endDate: Date
) {
  console.log("📊 Fetching overview data...");

  // Get available locations for debugging
  const allLocations = await db
    .collection("gaminglocations")
    .find({})
    .project({ _id: 1, name: 1 })
    .toArray();
  console.log("🏢 Available locations:", allLocations);

  // Fetch machines data with flexible location matching
  const machinesData = await fetchMachinesData(db, locationIds);

  // Fetch collections data for the date range
  const collectionsData = await fetchCollectionsData(
    db,
    locationIds,
    startDate,
    endDate
  );

  // Calculate metrics from collections data
  const { chartLabels, chartData, totalDrop, totalJackpot, actualHold } =
    calculateOverviewMetrics(collectionsData);

  return {
    title: "Big Shot Overview",
    cards: [
      {
        title: "Net Win/Revenue",
        type: "chart" as const,
        data: {
          chartData: {
            labels: chartLabels.length > 0 ? chartLabels : ["No Data"],
            datasets: [
              {
                label: "Net Win/Revenue",
                data: chartData.length > 0 ? chartData : [0],
                backgroundColor: "#f97316", // orange-500
              },
            ],
          },
        },
      },
      {
        title: "Drop Comparison",
        type: "table" as const,
        data: {
          tableData: {
            headers: ["", "Reported", "Collected", "Variance"],
            rows: [
              {
                label: "Drop",
                reported: `$${totalDrop.toLocaleString()}`,
                collected: `$${totalDrop.toLocaleString()}`,
                variance: "0%",
              },
            ],
          },
        },
      },
      {
        title: "Jackpot Comparison",
        type: "table" as const,
        data: {
          tableData: {
            headers: ["", "Metered", "Actual", "Variance"],
            rows: [
              {
                label: "Jackpot",
                reported: `$${totalJackpot.toLocaleString()}`,
                collected: `$${totalJackpot.toLocaleString()}`,
                variance: "0%",
              },
            ],
          },
        },
      },
      {
        title: "Holds",
        type: "metric" as const,
        data: {
          metricValue: `${(actualHold - 8.5).toFixed(1)}%`,
          metricSubtitle: "Theoretical vs Actual",
        },
      },
    ],
  };
}

/**
 * Fetches machines data for the specified locations
 */
async function fetchMachinesData(
  db: DatabaseConnection,
  locationIds: string[]
) {
  const machinesQuery = {
    deletedAt: { $in: [null, new Date(-1)] },
    $or: [
      { gamingLocation: { $in: locationIds } },
      { location: { $in: locationIds } },
    ],
  };
  console.log("🔍 Machines query:", JSON.stringify(machinesQuery, null, 2));

  const machinesData = await db
    .collection("machines")
    .find(machinesQuery)
    .project({
      _id: 1,
      machineId: 1,
      sasMeters: 1,
      gameConfig: 1,
      collectionMeters: 1,
      lastActivity: 1,
    })
    .toArray();

  console.log("🎰 Found machines:", machinesData.length);
  if (machinesData.length > 0) {
    console.log("🎰 Sample machine:", {
      _id: machinesData[0]._id,
      machineId: machinesData[0].machineId,
      hasSasMeters: !!machinesData[0].sasMeters,
      sasMeters: machinesData[0].sasMeters,
    });
  }

  return machinesData;
}

/**
 * Fetches collections data for the specified locations and date range
 */
async function fetchCollectionsData(
  db: DatabaseConnection,
  locationIds: string[],
  startDate: Date,
  endDate: Date
) {
  const collectionsQuery = {
    $or: [
      { location: { $in: locationIds } },
      { gamingLocation: { $in: locationIds } },
    ],
    timestamp: { $gte: startDate, $lte: endDate },
  };
  console.log(
    "📦 Collections query:",
    JSON.stringify(collectionsQuery, null, 2)
  );

  const collectionsData = await db
    .collection("collections")
    .find(collectionsQuery)
    .project({
      _id: 1,
      metersIn: 1,
      metersOut: 1,
      sasMeters: 1,
      machineId: 1,
      timestamp: 1,
    })
    .toArray();

  console.log("📦 Found collections:", collectionsData.length);
  if (collectionsData.length > 0) {
    console.log("📦 Sample collection:", {
      _id: collectionsData[0]._id,
      machineId: collectionsData[0].machineId,
      metersIn: collectionsData[0].metersIn,
      metersOut: collectionsData[0].metersOut,
      hasSasMeters: !!collectionsData[0].sasMeters,
      sasMeters: collectionsData[0].sasMeters,
    });
  }

  // Debug: If no collections found, show sample data
  if (collectionsData.length === 0) {
    console.log(
      "⚠️ No collections found for date range, trying broader search..."
    );
    const allCollections = await db
      .collection("collections")
      .find({})
      .limit(5)
      .toArray();
    console.log(
      "📦 All collections sample:",
      allCollections.map((c: any) => ({
        _id: c._id,
        location: c.location,
        gamingLocation: c.gamingLocation,
        timestamp: c.timestamp,
        machineId: c.machineId,
      }))
    );
  }

  return collectionsData;
}

/**
 * Calculates overview metrics from collections data
 */
function calculateOverviewMetrics(collectionsData: CollectionDocument[]) {
  // Calculate net win/revenue for chart
  const netWinData = collectionsData.reduce(
    (acc: Record<string, number>, collection: CollectionDocument) => {
      const date = new Date(
        collection.timestamp || new Date()
      ).toLocaleDateString();
      const netWin = (collection.metersOut || 0) - (collection.metersIn || 0);

      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += netWin;
      return acc;
    },
    {}
  );

  const chartLabels = Object.keys(netWinData).slice(-3);
  const chartData = chartLabels.map((label) => netWinData[label]);

  console.log("📈 Chart data:", { chartLabels, chartData });

  // Calculate drop comparison
  const totalDrop = collectionsData.reduce(
    (sum: number, collection: CollectionDocument) => {
      return sum + (collection.sasMeters?.drop || 0);
    },
    0
  );

  // Calculate jackpot comparison
  const totalJackpot = collectionsData.reduce(
    (sum: number, collection: CollectionDocument) => {
      return sum + (collection.sasMeters?.jackpot || 0);
    },
    0
  );

  // Calculate holds (theoretical vs actual)
  const totalGamesPlayed = collectionsData.reduce(
    (sum: number, collection: CollectionDocument) => {
      return sum + (collection.sasMeters?.gamesPlayed || 0);
    },
    0
  );

  const totalCoinIn = collectionsData.reduce(
    (sum: number, collection: CollectionDocument) => {
      return sum + (collection.sasMeters?.drop || 0);
    },
    0
  );

  const actualHold =
    totalGamesPlayed > 0
      ? ((totalCoinIn - totalGamesPlayed) / totalCoinIn) * 100
      : 0;

  console.log("💰 Calculated values:", {
    totalDrop,
    totalJackpot,
    totalGamesPlayed,
    totalCoinIn,
    actualHold,
    theoreticalHold: 8.5,
  });

  return {
    chartLabels,
    chartData,
    totalDrop,
    totalJackpot,
    actualHold,
  };
}

/**
 * Fetches machine performance data for the specified locations
 */
async function fetchMachinePerformance(
  db: DatabaseConnection,
  locationIds: string[],
  startDate: Date,
  endDate: Date
) {
  console.log("🎯 Fetching machine performance data...");

  const machinesQuery = {
    deletedAt: { $in: [null, new Date(-1)] },
    $or: [
      { gamingLocation: { $in: locationIds } },
      { location: { $in: locationIds } },
    ],
  };
  console.log(
    "🔍 Machine performance query:",
    JSON.stringify(machinesQuery, null, 2)
  );

  const machinesData = await db
    .collection("machines")
    .find(machinesQuery)
    .project({
      _id: 1,
      machineId: 1,
      sasMeters: 1,
      gameConfig: 1,
    })
    .limit(10) // Limit to top 10 machines
    .toArray();

  console.log("🎰 Found machines for performance:", machinesData.length);

  return machinesData.map((machine: MachineDocument) => {
    const sasMeters = machine.sasMeters || {};
    const theoreticalHold = machine.gameConfig?.theoreticalRtp || 8.5;

    // Calculate actual hold more accurately
    const drop = sasMeters.drop || 0;
    const gamesPlayed = sasMeters.gamesPlayed || 0;
    const actualHold = drop > 0 ? ((drop - gamesPlayed) / drop) * 100 : 0;

    console.log("🎰 Machine performance:", {
      machineId: machine.machineId || machine._id,
      drop,
      gamesPlayed,
      theoreticalHold,
      actualHold,
      jackpot: sasMeters.jackpot || 0,
      moneyOut: sasMeters.moneyOut || 0,
    });

    return {
      machineId: machine.machineId || machine._id,
      holdComparison: {
        theoretical: `${theoreticalHold.toFixed(1)}%`,
        actual: `${actualHold.toFixed(1)}%`,
        variance: `${(actualHold - theoreticalHold).toFixed(1)}%`,
      },
      jackpot: {
        metered: `$${(sasMeters.jackpot || 0).toLocaleString()}`,
        actual: `$${(sasMeters.jackpot || 0).toLocaleString()}`,
        variance: "0%",
      },
      netWinRevenue: {
        value: `$${(sasMeters.moneyOut || 0).toLocaleString()}`,
        range: "$0 - $100K",
      },
    };
  });
}

/**
 * Fetches machine drop data for the specified locations and date range
 */
async function fetchMachineDrop(
  db: DatabaseConnection,
  locationIds: string[],
  startDate: Date,
  endDate: Date
) {
  console.log("💰 Fetching machine drop data...");

  const collectionsData = await db
    .collection("collections")
    .find({
      $or: [
        { location: { $in: locationIds } },
        { gamingLocation: { $in: locationIds } },
      ],
      timestamp: { $gte: startDate, $lte: endDate },
    })
    .project({
      machineId: 1,
      sasMeters: 1,
      timestamp: 1,
    })
    .toArray();

  // Group by machine and calculate bill denominations
  const machineDropMap = new Map<
    string,
    {
      machineId: string;
      bills: Array<{
        denomination: string;
        count: number;
        total: string;
      }>;
    }
  >();

  collectionsData.forEach((collection: CollectionDocument) => {
    const machineId = collection.machineId || "";
    if (!machineDropMap.has(machineId)) {
      machineDropMap.set(machineId, {
        machineId,
        bills: [
          { denomination: "$1", count: 0, total: "$0" },
          { denomination: "$5", count: 0, total: "$0" },
          { denomination: "$10", count: 0, total: "$0" },
          { denomination: "$20", count: 0, total: "$0" },
        ],
      });
    }

    const drop = collection.sasMeters?.drop || 0;
    // Simulate bill distribution based on drop amount
    const machine = machineDropMap.get(machineId)!;
    machine.bills[0].count += Math.floor(drop * 0.3); // $1 bills
    machine.bills[1].count += Math.floor(drop * 0.4); // $5 bills
    machine.bills[2].count += Math.floor(drop * 0.2); // $10 bills
    machine.bills[3].count += Math.floor(drop * 0.1); // $20 bills
  });

  // Calculate totals and format
  return Array.from(machineDropMap.values()).map((machine) => ({
    machineId: machine.machineId,
    bills: machine.bills.map((bill) => ({
      denomination: bill.denomination,
      count: bill.count,
      total: `$${bill.count.toLocaleString()}`,
    })),
  }));
}

/**
 * Fetches top performers data for the specified locations and date range
 */
async function fetchTopPerformers(
  db: DatabaseConnection,
  locationIds: string[],
  startDate: Date,
  endDate: Date
) {
  console.log("🏆 Fetching top performers data...");

  const collectionsData = await db
    .collection("collections")
    .find({
      $or: [
        { location: { $in: locationIds } },
        { gamingLocation: { $in: locationIds } },
      ],
      timestamp: { $gte: startDate, $lte: endDate },
    })
    .project({
      machineId: 1,
      machineName: 1,
      location: 1,
      sasMeters: 1,
      timestamp: 1,
    })
    .sort({ "sasMeters.moneyOut": -1 })
    .limit(5)
    .toArray();

  return collectionsData.map(
    (collection: CollectionDocument, index: number) => {
      const sasMeters = collection.sasMeters || {};
      const performance = sasMeters.moneyOut || 0;

      return {
        machineId: collection.machineId || "",
        machineName:
          (collection as any).machineName || `Machine ${collection.machineId}`,
        locationName: (collection as any).location || "Unknown Location",
        performance: {
          today: performance,
          yesterday: performance * 0.9, // Simulate yesterday's performance
          lastWeek: performance * 6, // Simulate weekly performance
        },
        trend: index === 0 ? "up" : index === 1 ? "up" : "down",
      };
    }
  );
}

/**
 * Main API handler for comparison reports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationIds = searchParams.get("locationIds");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log("🔍 Comparison API Debug:", {
      locationIds,
      startDate,
      endDate,
    });

    if (!locationIds || !startDate || !endDate) {
      return NextResponse.json(
        {
          error: "Missing required parameters: locationIds, startDate, endDate",
        },
        { status: 400 }
      );
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Parse location IDs and dates
    const locationList = locationIds.split(",").map((id) => id.trim());
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log("📅 Date Range:", { start, end });
    console.log("📍 Location IDs:", locationList);

    // Fetch real data from database
    const comparisonData = await fetchComparisonData(
      db,
      locationList,
      start,
      end
    );

    return NextResponse.json({
      success: true,
      data: comparisonData,
    });
  } catch (error) {
    console.error("Comparison reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
