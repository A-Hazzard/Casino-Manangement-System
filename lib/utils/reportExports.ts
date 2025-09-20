import { format } from "date-fns";
import type { 
  DailyCountsReport, 
  ActiveCustomersReport, 
  LocationStatsReport,
  MachinePerformanceReport,
  TerminalCountsReport 
} from "@/lib/types/reports";

export class ReportExportUtils {
  /**
   * Export Daily Counts Report to CSV
   */
  static exportDailyCountsToCSV(data: DailyCountsReport[], filename?: string) {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const csvRows = [];
    
    // Headers
    csvRows.push([
      "Location ID",
      "Location Name", 
      "Date",
      "Machine ID",
      "Machine Name",
      "Opening Reading",
      "Closing Reading",
      "Net Revenue",
      "Variance",
      "Vouchers Issued",
      "Vouchers Redeemed",
      "Vouchers Outstanding",
      "Expected Cash",
      "Actual Cash",
      "Cash Variance"
    ].join(","));

    // Data rows
    data.forEach(report => {
      report.meterReadings.forEach(reading => {
        csvRows.push([
          report.locationId,
          `"${report.locationName}"`,
          report.date,
          reading.machineId,
          `"${reading.machineName}"`,
          reading.openingReading,
          reading.closingReading,
          reading.netRevenue,
          reading.variance,
          report.voucherData.issued,
          report.voucherData.redeemed,
          report.voucherData.outstanding,
          report.physicalCounts.expectedCash,
          report.physicalCounts.actualCash,
          report.physicalCounts.variance
        ].join(","));
      });
    });

    this.downloadCSV(csvRows.join("\n"), filename || `daily-counts-${format(new Date(), "yyyy-MM-dd")}.csv`);
  }

  /**
   * Export Active Customers Report to CSV
   */
  static exportActiveCustomersToCSV(data: ActiveCustomersReport, filename?: string) {
    const csvRows = [];
    
    // Summary section
    csvRows.push(["Active Customers Summary"]);
    csvRows.push(["Total Registered", data.totalRegistered]);
    csvRows.push(["Active Today", data.activeToday]);
    csvRows.push(["Active This Week", data.activeThisWeek]);
    csvRows.push(["Active This Month", data.activeThisMonth]);
    csvRows.push([""]); // Empty row

    // Location breakdown
    csvRows.push(["Location Breakdown"]);
    csvRows.push(["Location ID", "Location Name", "Active Customers", "Sign-in Records"]);
    data.locationBreakdown.forEach((location) => {
      csvRows.push([
        location.locationId,
        `"${location.locationName}"`,
        location.activeCustomers,
        location.signInRecords
      ].join(","));
    });

    this.downloadCSV(csvRows.join("\n"), filename || `active-customers-${format(new Date(), "yyyy-MM-dd")}.csv`);
  }

  /**
   * Export Location Statistics Report to CSV
   */
  static exportLocationStatsToCSV(data: LocationStatsReport[], filename?: string) {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const csvRows = [];
    
    // Headers
    csvRows.push([
      "Location ID",
      "Location Name",
      "Total Machines",
      "Online Machines",
      "Offline Machines",
      "Daily Intake",
      "Daily Payouts",
      "Net Revenue",
      "Uptime %",
      "Performance"
    ].join(","));

    // Data rows
    data.forEach(location => {
      csvRows.push([
        location.locationId,
        `"${location.locationName}"`,
        location.machineCount,
        location.onlineMachines,
        location.offlineMachines,
        location.dailyIntake,
        location.dailyPayouts,
        location.netRevenue,
        location.uptime,
        location.performance
      ].join(","));
    });

    this.downloadCSV(csvRows.join("\n"), filename || `location-stats-${format(new Date(), "yyyy-MM-dd")}.csv`);
  }

  /**
   * Export Machine Performance Report to CSV
   */
  static exportMachinePerformanceToCSV(data: MachinePerformanceReport[], filename?: string) {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const csvRows = [];
    
    // Headers
    csvRows.push([
      "Machine ID",
      "Machine Name",
      "Location",
      "Money In",
      "Money Out",
      "Play Count",
      "Avg Play Duration",
      "Total Income",
      "Hold %",
      "Payout Ratio",
      "Manufacturer",
      "Game Type"
    ].join(","));

    // Data rows
    data.forEach(machine => {
      csvRows.push([
        machine.machineId,
        `"${machine.machineName}"`,
        `"${machine.locationName}"`,
        machine.moneyIn,
        machine.moneyOut,
        machine.playCount,
        machine.averagePlayDuration,
        machine.totalIncome,
        machine.holdPercentage,
        machine.payoutRatio,
        machine.manufacturer,
        machine.gameType
      ].join(","));
    });

    this.downloadCSV(csvRows.join("\n"), filename || `machine-performance-${format(new Date(), "yyyy-MM-dd")}.csv`);
  }

  /**
   * Export Terminal Counts Report to CSV
   */
  static exportTerminalCountsToCSV(data: TerminalCountsReport[], filename?: string) {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const csvRows = [];
    
    // Headers
    csvRows.push([
      "Manufacturer",
      "Game Type",
      "Total Terminals",
      "Online Terminals",
      "Offline Terminals",
      "Location ID",
      "Location Name",
      "Location Count"
    ].join(","));

    // Data rows
    data.forEach(terminal => {
      terminal.locations.forEach((location) => {
        csvRows.push([
          terminal.manufacturer,
          terminal.gameType,
          terminal.totalTerminals,
          terminal.onlineTerminals,
          terminal.offlineTerminals,
          location.locationId,
          `"${location.locationName}"`,
          location.count
        ].join(","));
      });
    });

    this.downloadCSV(csvRows.join("\n"), filename || `terminal-counts-${format(new Date(), "yyyy-MM-dd")}.csv`);
  }

  /**
   * Generate PDF report (placeholder - requires PDF library)
   */
  static async exportToPDF() {
    // TODO: Implement PDF generation using libraries like jsPDF or Puppeteer
    // This is a placeholder for PDF export functionality
    throw new Error("PDF export functionality is not yet implemented");
  }

  /**
   * Download CSV file
   */
  private static downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Validate user permissions for export
   */
  static validateExportPermissions(
    userRoles: string[], 
    requiredRoles: string[], 
    reportType: string
  ): { canExport: boolean; message?: string } {
    // Admin can export all reports
    if (userRoles.includes("admin")) {
      return { canExport: true };
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return { 
        canExport: false, 
        message: `Insufficient permissions to export ${reportType}. Required roles: ${requiredRoles.join(", ")}` 
      };
    }

    return { canExport: true };
  }
} 