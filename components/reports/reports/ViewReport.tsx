'use client';
import { useReportStore } from '@/lib/store/useReportStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Reportable } from '@/lib/types/reports';

export default function ViewReport() {
  const { reportData, resetReportConfig, setStep, isGenerating } =
    useReportStore();

  if (isGenerating) {
    return (
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Generating Your Report...</h1>
        <p className="mb-8 text-gray-500">
          Please wait while we process your data.
        </p>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center">
        <p className="mb-2 text-lg font-semibold">No report data available.</p>
        <p className="mb-4 text-gray-500">
          It seems something went wrong or no data was generated.
        </p>
        <Button
          onClick={() =>
            setStep({
              id: 'configure',
              name: 'Configure Report',
              status: 'pending',
              progress: 0,
            })
          }
        >
          Back to Configuration
        </Button>
      </div>
    );
  }

  const { config, summary, tableData } = reportData;
  const headers = config.fields;

  const formatValue = (key: string, value: Reportable[string]): string => {
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      const date = new Date(value);
      // A simple check to avoid formatting something like "123" as a date
      if (date.getFullYear() > 1990) {
        return format(date, 'MMM d, yyyy');
      }
    }
    if (
      typeof value === 'number' &&
      (key.includes('Hold') || key.includes('hold'))
    ) {
      return `${value.toFixed(2)}%`;
    }
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{config.title}</h1>
          <p className="mt-1 text-gray-500">
            {format(new Date(config.dateRange.start), 'MMM d, yyyy')} -{' '}
            {format(new Date(config.dateRange.end), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() =>
              setStep({
                id: 'configure',
                name: 'Configure Report',
                status: 'pending',
                progress: 0,
              })
            }
          >
            Back to Configuration
          </Button>
          <Button variant="outline" onClick={resetReportConfig}>
            Create New Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summary.keyMetrics.map((item, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatValue(item.label, item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Data</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map(header => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {headers.map(header => (
                      <TableCell key={`${rowIndex}-${header}`}>
                        {formatValue(header, row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
