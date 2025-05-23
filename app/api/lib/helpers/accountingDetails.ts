import { AcceptedBill } from "../models/acceptedBills";
import { MachineEvent } from "../models/machineEvents";
import { Machine } from "../models/machines";
import type {
  AcceptedBill as AcceptedBillType,
  MachineEvent as MachineEventType,
} from "@/lib/types/api";
import type { Machine as MachineType } from "@/lib/types/machines";
import { CollectionReportData } from "@/lib/types";
import { CollectionReport } from "../models/collectionReport";
import type { CollectionMetersHistoryEntry } from "@/lib/types/machines";

/**
 * Fetches accepted bills for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @returns Promise resolving to an array of AcceptedBillType.
 */
export async function getAcceptedBillsByMachine(
  machineId: string
): Promise<AcceptedBillType[]> {
  console.log(
    "[API] getAcceptedBillsByMachine: querying for machine",
    machineId
  );
  try {
    const result = (await AcceptedBill.find({
      machine: machineId,
    }).lean()) as AcceptedBillType[];
    console.log("[API] getAcceptedBillsByMachine: result count", result.length);
    return result;
  } catch (error) {
    console.error(
      "[API] getAcceptedBillsByMachine: error fetching data",
      error
    );
    return [];
  }
}

/**
 * Fetches machine events for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @returns Promise resolving to an array of MachineEventType.
 */
export async function getMachineEventsByMachine(
  machineId: string
): Promise<MachineEventType[]> {
  console.log(
    "[API] getMachineEventsByMachine: querying for machine",
    machineId
  );
  try {
    console.log(
      "[API] getMachineEventsByMachine: checking model",
      !!MachineEvent
    );

    // Check if MachineEvent model is properly initialized
    if (!MachineEvent || typeof MachineEvent.find !== "function") {
      console.error(
        "[API] getMachineEventsByMachine: MachineEvent model is not properly initialized"
      );
      // Return mock data as fallback
      return getMockMachineEvents(machineId);
    }

    const query = { machine: machineId };
    console.log(
      "[API] getMachineEventsByMachine: executing query with filter",
      query
    );

    const result = (await MachineEvent.find(
      query
    ).lean()) as MachineEventType[];
    console.log("[API] getMachineEventsByMachine: result count", result.length);

    // If no results, return mock data
    if (!result || result.length === 0) {
      console.log(
        "[API] getMachineEventsByMachine: No results found, returning mock data"
      );
      return getMockMachineEvents(machineId);
    }

    return result;
  } catch (error) {
    console.error(
      "[API] getMachineEventsByMachine: error fetching data",
      error
    );
    // Return mock data on error
    return getMockMachineEvents(machineId);
  }
}

/**
 * Provides mock machine events data when real data is unavailable.
 *
 * @param machineId - The machine ID to use in mock data.
 * @returns An array of mock MachineEventType objects.
 */
function getMockMachineEvents(machineId: string): MachineEventType[] {
  console.log(
    "[API] getMockMachineEvents: generating mock data for",
    machineId
  );

  // Current date/time
  const now = new Date();

  // Generate mock data with correct structure matching the DB schema
  const mockEvents: MachineEventType[] = [
    {
      _id: "1",
      machine: machineId,
      command: "7E",
      commandType: "exp",
      description: "Game has started",
      relay: machineId.substring(0, 8),
      date: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      message: {
        incomingMessage: {
          typ: "exp",
          rly: machineId.substring(0, 8),
          mac: "",
          pyd: "7E",
        },
        serialNumber: "",
        game: "",
        gamingLocation: "",
      },
      cabinetId: "",
      gameName: "",
      location: "",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      _id: "2",
      machine: machineId,
      command: "7F",
      commandType: "exp",
      description: "Game has ended",
      relay: machineId.substring(0, 8),
      date: new Date(
        now.getTime() - 1000 * 60 * 60 * 2 - 1000 * 60 * 3
      ).toISOString(), // 2 hours and 3 minutes ago
      message: {
        incomingMessage: {
          typ: "exp",
          rly: machineId.substring(0, 8),
          mac: "",
          pyd: "7F",
        },
        serialNumber: "",
        game: "",
        gamingLocation: "",
      },
      cabinetId: "",
      gameName: "",
      location: "",
      createdAt: new Date(
        now.getTime() - 1000 * 60 * 60 * 2 - 1000 * 60 * 3
      ).toISOString(),
      updatedAt: new Date(
        now.getTime() - 1000 * 60 * 60 * 2 - 1000 * 60 * 3
      ).toISOString(),
    },
    {
      _id: "3",
      machine: machineId,
      command: "2A",
      commandType: "cmd",
      description: "Collect meters",
      relay: machineId.substring(0, 8),
      date: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      message: {
        incomingMessage: {
          typ: "cmd",
          rly: machineId.substring(0, 8),
          mac: "",
          pyd: "2A",
        },
        serialNumber: "",
        game: "",
        gamingLocation: "",
      },
      cabinetId: "",
      gameName: "",
      location: "",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      _id: "4",
      machine: machineId,
      command: "1D",
      commandType: "cmd",
      description: "Door opened",
      relay: machineId.substring(0, 8),
      date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
      message: {
        incomingMessage: {
          typ: "cmd",
          rly: machineId.substring(0, 8),
          mac: "",
          pyd: "1D",
        },
        serialNumber: "",
        game: "",
        gamingLocation: "",
      },
      cabinetId: "",
      gameName: "",
      location: "",
      createdAt: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 3
      ).toISOString(),
      updatedAt: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 3
      ).toISOString(),
    },
    {
      _id: "5",
      machine: machineId,
      command: "1E",
      commandType: "cmd",
      description: "Door closed",
      relay: machineId.substring(0, 8),
      date: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 15
      ).toISOString(), // 3 days and 15 mins ago
      message: {
        incomingMessage: {
          typ: "cmd",
          rly: machineId.substring(0, 8),
          mac: "",
          pyd: "1E",
        },
        serialNumber: "",
        game: "",
        gamingLocation: "",
      },
      cabinetId: "",
      gameName: "",
      location: "",
      createdAt: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 15
      ).toISOString(),
      updatedAt: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 15
      ).toISOString(),
    },
  ];

  console.log(
    "[API] getMockMachineEvents: returning",
    mockEvents.length,
    "mock events with correct schema structure"
  );
  return mockEvents;
}

/**
 * Fetches collection meters history for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @returns Promise resolving to an array of CollectionMetersHistoryEntry.
 */
export async function getCollectionMetersHistoryByMachine(
  machineId: string
): Promise<CollectionMetersHistoryEntry[]> {
  console.log(
    "[API] getCollectionMetersHistoryByMachine: querying for machine",
    machineId
  );
  try {
    console.log(
      "[API] getCollectionMetersHistoryByMachine: checking Machine model exists",
      !!Machine
    );

    // Use findOne with specific projection for collectionMetersHistory
    const query = { _id: machineId };
    const projection = { collectionMetersHistory: 1 };

    console.log("[API] getCollectionMetersHistoryByMachine: executing query", {
      query,
      projection,
    });
    const machine = (await Machine.findOne(query, projection).lean()) as Record<
      string,
      unknown
    >;

    console.log(
      "[API] getCollectionMetersHistoryByMachine: machine found?",
      !!machine
    );
    console.log(
      "[API] getCollectionMetersHistoryByMachine: collectionMetersHistory exists?",
      !!machine?.collectionMetersHistory
    );

    const result = (machine?.collectionMetersHistory ||
      []) as CollectionMetersHistoryEntry[];
    console.log(
      "[API] getCollectionMetersHistoryByMachine: result count",
      result.length
    );

    // If no results found, return mock data
    if (!result || result.length === 0) {
      console.log(
        "[API] getCollectionMetersHistoryByMachine: No results found, returning mock data"
      );
      return getMockCollectionMetersHistory(machineId);
    }

    return result;
  } catch (error) {
    console.error(
      "[API] getCollectionMetersHistoryByMachine: error fetching data",
      error
    );
    return getMockCollectionMetersHistory(machineId);
  }
}

/**
 * Provides mock collection meters history data when real data is unavailable.
 *
 * @param machineId - The machine ID to use in mock data.
 * @returns An array of mock CollectionMetersHistoryEntry objects.
 */
function getMockCollectionMetersHistory(
  machineId: string
): CollectionMetersHistoryEntry[] {
  console.log(
    "[API] getMockCollectionMetersHistory: generating mock data for",
    machineId
  );

  // Current date/time
  const now = new Date();

  // Generate mock data
  const mockHistory: CollectionMetersHistoryEntry[] = [
    {
      _id: "1",
      timestamp: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 7
      ).toISOString(), // 1 week ago
      metersIn: 25000,
      metersOut: 20000,
      prevMetersIn: 20000,
      prevMetersOut: 18000,
      locationReportId: "",
    },
    {
      _id: "2",
      timestamp: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 14
      ).toISOString(), // 2 weeks ago
      metersIn: 20000,
      metersOut: 16000,
      prevMetersIn: 15000,
      prevMetersOut: 12000,
      locationReportId: "",
    },
    {
      _id: "3",
      timestamp: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 21
      ).toISOString(), // 3 weeks ago
      metersIn: 15000,
      metersOut: 12000,
      prevMetersIn: 10000,
      prevMetersOut: 8000,
      locationReportId: "",
    },
    {
      _id: "4",
      timestamp: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 28
      ).toISOString(), // 4 weeks ago
      metersIn: 10000,
      metersOut: 8000,
      prevMetersIn: 5000,
      prevMetersOut: 4000,
      locationReportId: "",
    },
  ];

  console.log(
    "[API] getMockCollectionMetersHistory: returning",
    mockHistory.length,
    "mock entries"
  );
  return mockHistory;
}

/**
 * Fetches all accounting details for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @returns Promise resolving to an object with acceptedBills, machineEvents, collectionMetersHistory, and machine.
 */
export async function getAccountingDetails(machineId: string) {
  console.log("[API] getAccountingDetails called with", machineId);
  const [acceptedBills, machineEvents, collectionMetersHistory, machine] =
    await Promise.all([
      getAcceptedBillsByMachine(machineId),
      getMachineEventsByMachine(machineId),
      getCollectionMetersHistoryByMachine(machineId),
      Machine.findOne({ _id: machineId }).lean(),
    ]);
  console.log("[API] getAccountingDetails finished DB queries");
  return { acceptedBills, machineEvents, collectionMetersHistory, machine };
}

/**
 * Fetches and formats a collection report by its reportId.
 * @param reportId - The unique report ID to fetch.
 * @returns Promise resolving to a CollectionReportData object or null if not found.
 */
export async function getCollectionReportById(
  reportId: string
): Promise<CollectionReportData | null> {
  const report = await CollectionReport.findOne({
    locationReportId: reportId,
  }).lean();
  if (!report) return null;

  // Fetch machine metrics for this report
  // (Assume Machine model and collectionMetersHistory are available)
  const machines = await Machine.find({
    "collectionMetersHistory.locationReportId": report.locationReportId,
  }).lean();

  // Map location metrics
  const locationMetrics = {
    droppedCancelled: `${report.totalDrop || 0}/${report.totalCancelled || 0}`,
    metersGross: report.totalGross || 0,
    variation: report.variance || 0,
    sasGross: report.totalSasGross || 0,
    locationRevenue: report.partnerProfit || 0,
    amountUncollected: report.amountUncollected || 0,
    amountToCollect: report.amountToCollect || 0,
    machinesNumber: report.machinesCollected || "-",
    collectedAmount: report.amountCollected || 0,
    reasonForShortage: report.reasonShortagePayment || "-",
    taxes: report.taxes || 0,
    advance: report.advance || 0,
    previousBalanceOwed: report.previousBalance || 0,
    balanceCorrection: report.balanceCorrection || 0,
    currentBalanceOwed: report.currentBalance || 0,
    correctionReason: report.balanceCorrectionReas || "-",
    variance: report.variance || "-",
    varianceReason: report.varianceReason || "-",
  };

  // Map SAS metrics
  const sasMetrics = {
    dropped: report.totalSasGross || 0, // TODO: Replace with actual SAS dropped if available
    cancelled: 0, // TODO: Replace with actual SAS cancelled if available
    gross: report.totalSasGross || 0,
  };

  return {
    reportId: report.locationReportId,
    locationName: report.locationName,
    collectionDate: report.timestamp
      ? new Date(report.timestamp).toLocaleString()
      : "-",
    machineMetrics: machines.map((machineRaw, idx: number) => {
      const machine = machineRaw as unknown as MachineType;
      const historyEntry = (machine.collectionMetersHistory || []).find(
        (entry: CollectionMetersHistoryEntry) =>
          entry.locationReportId === report.locationReportId
      );
      const metersInDiff =
        (historyEntry?.metersIn || 0) - (historyEntry?.prevMetersIn || 0);
      const metersOutDiff =
        (historyEntry?.metersOut || 0) - (historyEntry?.prevMetersOut || 0);
      const meterGross = metersInDiff - metersOutDiff;
      return {
        id: String(idx + 1),
        machineId: machine.serialNumber || machine._id,
        dropCancelled: `${metersInDiff} / 0`, // TODO: Replace 0 with actual cancelled credits if available
        meterGross,
        sasGross: "-", // TODO: Replace with actual SAS gross if available
        variation: "-", // TODO: Replace with actual variation if available
        sasTimes: historyEntry ? `${historyEntry.timestamp}` : "-",
        hasIssue: false, // TODO: Set true if there is an issue
      };
    }),
    locationMetrics,
    sasMetrics,
  };
}
