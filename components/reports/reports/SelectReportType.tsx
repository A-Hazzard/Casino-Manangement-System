'use client';
import { useReportStore } from '@/lib/store/useReportStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { FileText, Building, Milestone } from 'lucide-react';
import { ReportType } from '@/lib/types/reports';

const reportTypes = [
  {
    id: 'locationPerformance' as ReportType,
    title: 'Location Performance',
    description:
      'Compare financial and operational metrics across multiple locations.',
    icon: Building,
  },
  {
    id: 'machineRevenue' as ReportType,
    title: 'Machine Revenue Analysis',
    description:
      'Analyze revenue, handle, and hold for specific machines or manufacturers.',
    icon: Milestone,
  },
  {
    id: 'fullFinancials' as ReportType,
    title: 'Full Financial Audit',
    description:
      'A comprehensive financial report including all metrics for a selected period.',
    icon: FileText,
  },
];

export default function SelectReportType() {
  const { setReportType } = useReportStore();

  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold">New Report</h1>
        <p className="mt-2 text-gray-500">
          Select a report type to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {reportTypes.map(report => (
          <Card
            key={report.id}
            className="cursor-pointer transition-all hover:border-buttonActive hover:shadow-xl"
            onClick={() => setReportType(report.id)}
          >
            <CardHeader className="items-center text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <report.icon className="h-8 w-8 text-buttonActive" />
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
