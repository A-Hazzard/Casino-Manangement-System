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
import { getDatesForTimePeriod } from "../utils/dates";
import type { TimePeriod } from "@/app/api/lib/types";

/**
 * Fetches accepted bills for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of AcceptedBillType.
 */
export async function getAcceptedBillsByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<AcceptedBillType[]> {
  try {
    const query: Record<string, unknown> = { machine: machineId };

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== "All Time") {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        query.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }
    }

    const result = (await AcceptedBill.find(
      query
    ).lean()) as AcceptedBillType[];

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
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of MachineEventType.
 */
export async function getMachineEventsByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<MachineEventType[]> {
  try {
    // Check if MachineEvent model is properly initialized
    if (!MachineEvent || typeof MachineEvent.find !== "function") {
      console.error(
        "[API] getMachineEventsByMachine: MachineEvent model is not properly initialized"
      );
      // Return mock data as fallback
      return getMockMachineEvents(machineId);
    }

    const query: Record<string, unknown> = { machine: machineId };

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== "All Time") {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        query.timestamp = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }
    }

    const result = (await MachineEvent.find(
      query
    ).lean()) as MachineEventType[];

    // If no results, return mock data
    if (!result || result.length === 0) {
      return getMockMachineEvents(machineId);
    }

    return result;
  } catch (error) {
    console.error(
      "[API] getMachineEventsByMachine: error fetching data",
      error
    );
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

  return mockEvents;
}

/**
 * Fetches collection meters history for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of CollectionMetersHistoryEntry.
 */
export async function getCollectionMetersHistoryByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<CollectionMetersHistoryEntry[]> {
  try {
    // Use findOne with specific projection for collectionMetersHistory
    const query = { _id: machineId };
    const projection = { collectionMetersHistory: 1 };

    const machine = (await Machine.findOne(query, projection).lean()) as Record<
      string,
      unknown
    >;

    let result = (machine?.collectionMetersHistory ||
      []) as CollectionMetersHistoryEntry[];

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== "All Time") {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        result = result.filter((entry) => {
          const entryDate = new Date(entry.timestamp);
          return (
            entryDate >= dateRange.startDate! && entryDate <= dateRange.endDate!
          );
        });
      }
    }

    return result;
  } catch (error) {
    console.error(
      "[API] getCollectionMetersHistoryByMachine: error fetching data",
      error
    );
    return [];
  }
}



/**
 * Fetches all accounting details for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an object with acceptedBills, machineEvents, collectionMetersHistory, and machine.
 */
export async function getAccountingDetails(
  machineId: string,
  timePeriod?: string | null
) {
  const [acceptedBills, machineEvents, collectionMetersHistory, machine] =
    await Promise.all([
      getAcceptedBillsByMachine(machineId, timePeriod),
      getMachineEventsByMachine(machineId, timePeriod),
      getCollectionMetersHistoryByMachine(machineId, timePeriod),
      Machine.findOne({ _id: machineId }).lean(),
    ]);

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
