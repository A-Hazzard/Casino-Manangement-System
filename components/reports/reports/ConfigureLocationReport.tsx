"use client";
import React, { useEffect } from "react";
import { useReportStore } from "@/lib/store/useReportStore";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import { ReportConfig } from "@/lib/types/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/dateRangePicker";
import { MultiSelect } from "./MultiSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  REPORT_TYPE_CONFIG,
  GROUPED_REPORT_FIELDS,
} from "@/lib/constants/reportBuilder";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useGenerateReport } from "@/lib/hooks/useGenerateCustomReport";

export default function ConfigureLocationReport() {
  const {
    reportType,
    resetReportConfig,
    reportConfig,
    updateReportConfig,
    setAvailableLocations,
    setAvailableMachines,
  } = useReportStore();

  const { generateReport } = useGenerateReport();
  const { isGenerating: isLoading } = useReportStore();

  const { locations, machines } = useAnalyticsDataStore();

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    setAvailableLocations(locations);
    setAvailableMachines(machines);

    if (reportType) {
      const config = REPORT_TYPE_CONFIG[reportType];
      const initialRange = { from: subDays(new Date(), 30), to: new Date() };
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

  const handleFieldChange = (fieldId: string) => {
    const currentFields = reportConfig.fields || [];
    const fieldExists = currentFields.includes(fieldId);
    const newFields = fieldExists
      ? currentFields.filter((field) => field !== fieldId)
      : [...currentFields, fieldId];
    updateReportConfig({ fields: newFields });
  };

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
        <h1 className="text-3xl font-bold">
          Configure Location Performance Report
        </h1>
        <p className="text-gray-500 mt-2">
          Analyze and compare performance metrics across different locations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date Range</Label>
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateChange}
                />
              </div>
              {reportTypeConfig.availableFilters.includes("locations") && (
                <div>
                  <Label>Locations</Label>
                  <MultiSelect
                    options={locations.map((l) => ({
                      value: l.id,
                      label: l.name,
                    }))}
                    selected={reportConfig.filters?.locationIds || []}
                    onChange={(ids) =>
                      updateReportConfig({
                        filters: { ...reportConfig.filters, locationIds: ids },
                      })
                    }
                    placeholder="Select locations..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Report Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(GROUPED_REPORT_FIELDS).map(
                ([category, fields]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm mb-2">{category}</h4>
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={field.id}
                            checked={reportConfig.fields?.includes(field.id)}
                            onCheckedChange={() => handleFieldChange(field.id)}
                          />
                          <Label htmlFor={field.id} className="font-normal">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
          {isLoading ? "Generating..." : "Generate Report"}
        </Button>
      </div>
    </div>
  );
}
