"use client";
import { useReportStore } from "@/lib/store/useReportStore";
import SelectReportType from "@/components/reports/reports/SelectReportType";
import ConfigureLocationReport from "@/components/reports/reports/ConfigureLocationReport";
import ConfigureMachineReport from "@/components/reports/reports/ConfigureMachineReport";
import ConfigureFinancialsReport from "@/components/reports/reports/ConfigureFinancialsReport";
import ViewReport from "@/components/reports/reports/ViewReport";

export default function ReportsTab() {
  const { currentStep, reportType } = useReportStore();

  const renderStep = () => {
    switch (currentStep) {
      case "selectType":
        return <SelectReportType />;
      case "configure":
        switch (reportType) {
          case "locationPerformance":
            return <ConfigureLocationReport />;
          case "machineRevenue":
            return <ConfigureMachineReport />;
          case "fullFinancials":
            return <ConfigureFinancialsReport />;
          default:
            return <SelectReportType />;
        }
      case "view":
        return <ViewReport />;
      default:
        return <SelectReportType />;
    }
  };

  return <div className="space-y-6">{renderStep()}</div>;
}
