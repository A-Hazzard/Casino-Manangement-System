"use client";
import React, { useEffect } from "react";
import { useReportStore } from "@/lib/store/useReportStore";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import { ReportConfig } from "@/lib/types/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/dateRangePicker";
import { MultiSelect } from "./MultiSelect";
import { Label } from "@/components/ui/label";
import { REPORT_TYPE_CONFIG } from "@/lib/constants/reportBuilder";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useGenerateCustomReport } from "@/lib/hooks/reports";

export default function ConfigureFinancialsReport() {
  const {
    reportType,
    resetReportConfig,
    reportConfig,
    updateReportConfig,
    setAvailableLocations,
    setAvailableMachines,
  } = useReportStore();

  const { generateReport } = useGenerateCustomReport();
  const { isGenerating: isLoading } = useReportStore();

  const { locations, machines } = useAnalyticsDataStore();

  // Local state for the date picker
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    setAvailableLocations(locations);
    setAvailableMachines(machines);

    if (reportType) {
      const config = REPORT_TYPE_CONFIG[reportType];
      const initialRange = { from: subDays(new Date(), 365), to: new Date() }; // Default to a year
      setDateRange(initialRange);
      updateReportConfig({
        title: config.title,
        fields: config.defaultFields,
        filters: {},
        chartType: "table",
        exportFormat: "pdf",
      });
    }
  }, [
    reportType,
    locations,
    machines,
    setAvailableLocations,
    setAvailableMachines,
    updateReportConfig,
  ]);

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      updateReportConfig({
        dateRange: {
          start: range.from,
          end: range.to,
        },
      });
    }
  };

  const reportTypeConfig = reportType ? REPORT_TYPE_CONFIG[reportType] : null;

  if (!reportType || !reportTypeConfig) {
    return (
      <div className="text-center">
        <p>Something went wrong. Please start over.</p>
        <Button onClick={resetReportConfig} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button
          variant="link"
          onClick={resetReportConfig}
          className="p-0 h-auto mb-4"
        >
          &larr; Back to Report Types
        </Button>
        <h1 className="text-3xl font-bold">Full Financial Audit Report</h1>
        <p className="text-gray-500 mt-2">
          Generate a comprehensive financial data dump for a specific period.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Audit Period</CardTitle>
          <p className="text-sm text-gray-500">
            Select a date range for the comprehensive audit. A larger range may
            take longer to generate.
          </p>
        </CardHeader>
        <CardContent>
          <DateRangePicker value={dateRange} onChange={handleDateChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optional Filters</CardTitle>
          <p className="text-sm text-gray-500">
            You can optionally filter by specific locations.
          </p>
        </CardHeader>
        <CardContent>
          {reportTypeConfig.availableFilters.includes("locations") && (
            <div>
              <Label>Locations</Label>
              <MultiSelect
                options={locations.map((l) => ({
                  value: l._id,
                  label: l.name,
                }))}
                selected={reportConfig.filters?.locationIds || []}
                onChange={(ids) =>
                  updateReportConfig({
                    filters: { ...reportConfig.filters, locationIds: ids },
                  })
                }
                placeholder="All locations"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          onClick={() => {
            if (
              reportConfig.title &&
              reportConfig.fields &&
              reportConfig.chartType &&
              reportConfig.exportFormat
            ) {
              generateReport(reportConfig as ReportConfig);
            }
          }}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Full Audit"}
        </Button>
      </div>
    </div>
  );
}
