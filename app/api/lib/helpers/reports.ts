import { ReportConfig, ReportData, Reportable } from "@/lib/types/reports";
import { generateMockAnalyticsData } from "@/lib/helpers/reports";
import { CasinoLocation, GamingMachine } from "@/lib/types/reports";
import { isWithinInterval } from "date-fns";

const mockData = generateMockAnalyticsData();

function applyFilters(config: ReportConfig): GamingMachine[] {
  let filteredMachines = mockData.machines;

  const dateRange = config.dateRange
    ? {
        start: new Date(config.dateRange.start),
        end: new Date(config.dateRange.end),
      }
    : {
        start: new Date(),
        end: new Date(),
      };

  filteredMachines = filteredMachines.filter((m) => {
    const machineDate = new Date(m.installDate);
    return isWithinInterval(machineDate, dateRange);
  });

  // Filter by location
  if (config.filters.locationIds && config.filters.locationIds.length > 0) {
    const locationSet = new Set(config.filters.locationIds);
    filteredMachines = filteredMachines.filter((m) =>
      locationSet.has(m.locationId)
    );
  }

  // Filter by manufacturer
  if (config.filters.manufacturers && config.filters.manufacturers.length > 0) {
    const manufacturerSet = new Set(config.filters.manufacturers);
    filteredMachines = filteredMachines.filter((m) =>
      manufacturerSet.has(m.manufacturer)
    );
  }

  return filteredMachines;
}

function createReportableRow(
  machine: GamingMachine,
  location: CasinoLocation | undefined,
  fields: string[]
): Reportable {
  const row: Reportable = {};
  for (const fieldId of fields) {
    switch (fieldId) {
      case "locationName":
        row[fieldId] = location?.name || "N/A";
        break;
      case "locationRegion":
        row[fieldId] = location?.region || "N/A";
        break;
      case "machineGameTitle":
        row[fieldId] = machine.gameTitle;
        break;
      case "machineManufacturer":
        row[fieldId] = machine.manufacturer;
        break;
      case "totalHandle":
        row[fieldId] = machine.totalHandle;
        break;
      case "totalWin":
        row[fieldId] = machine.totalWin;
        break;
      case "actualHold":
        row[fieldId] = machine.actualHold;
        break;
      case "gamesPlayed":
        row[fieldId] = machine.gamesPlayed;
        break;
      case "averageWager":
        row[fieldId] = machine.avgBet || machine.averageWager || 0;
        break;
      case "jackpot":
        row[fieldId] = machine.jackpot || 0;
        break;
      case "date":
        row[fieldId] = machine.installDate;
        break;
    }
  }
  return row;
}

export function generateReportData(config: ReportConfig): ReportData {
  const filteredMachines = applyFilters(config);

  const tableData: Reportable[] = filteredMachines.map((machine) => {
    const location = mockData.locations.find(
      (l) => l.id === machine.locationId
    );
    return createReportableRow(machine, location, config.fields);
  });

  const summary = {
    totalRecords: filteredMachines.length,
    dateGenerated: new Date().toISOString(),
    keyMetrics: [
      { label: "Total Machines Analyzed", value: filteredMachines.length },
      {
        label: "Total Handle",
        value: filteredMachines.reduce((sum, m) => sum + m.totalHandle, 0),
      },
      {
        label: "Total Win",
        value: filteredMachines.reduce((sum, m) => sum + m.totalWin, 0),
      },
    ],
  };

  return {
    config,
    summary,
    tableData,
    chartData: tableData.map((row) => ({
      label: String(row.machineGameTitle || row.locationName || "Unknown"),
      value: Number(row.totalWin || 0),
    })),
    metadata: {
      generatedBy: "System",
      generatedAt: new Date().toISOString(),
      executionTime: 0,
      dataSourceLastUpdated: new Date().toISOString(),
      reportVersion: "1.0.0",
      totalDataPoints: tableData.length,
    },
  };
}
