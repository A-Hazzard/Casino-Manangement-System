"use client";
import { useReportStore } from "@/lib/store/useReportStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileText, Building, Milestone } from "lucide-react";
import { ReportType } from "@/lib/types/reports";

const reportTypes = [
  {
    id: "locationPerformance" as ReportType,
    title: "Location Performance",
    description:
      "Compare financial and operational metrics across multiple locations.",
    icon: Building,
  },
  {
    id: "machineRevenue" as ReportType,
    title: "Machine Revenue Analysis",
    description:
      "Analyze revenue, handle, and hold for specific machines or manufacturers.",
    icon: Milestone,
  },
  {
    id: "fullFinancials" as ReportType,
    title: "Full Financial Audit",
    description:
      "A comprehensive financial report including all metrics for a selected period.",
    icon: FileText,
  },
];

export default function SelectReportType() {
  const { setReportType } = useReportStore();

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">New Report</h1>
        <p className="text-gray-500 mt-2">
          Select a report type to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTypes.map((report) => (
          <Card
            key={report.id}
            className="cursor-pointer hover:shadow-xl hover:border-buttonActive transition-all"
            onClick={() => setReportType(report.id)}
          >
            <CardHeader className="items-center text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <report.icon className="w-8 h-8 text-buttonActive" />
              </div>
              <CardTitle>{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                {report.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
