import { NextResponse } from 'next/server';
import { ReportConfig } from '@/lib/types/reports';
import { generateReportData } from '../../lib/helpers/reports';
import { z } from 'zod';

// Zod schema for validation
const reportConfigSchema = z.object({
  title: z.string(),
  reportType: z.enum([
    'locationPerformance',
    'machineRevenue',
    'fullFinancials',
  ]),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  filters: z.object({
    locationIds: z.array(z.string()).optional(),
    manufacturers: z.array(z.string()).optional(),
  }),
  fields: z.array(z.string()),
  chartType: z.enum(['bar', 'line', 'table']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body against the Zod schema
    const validationResult = reportConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid report configuration',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const config: ReportConfig = {
      title: validatedData.title,
      reportType: validatedData.reportType,
      category: 'operational',
      dateRange: {
        start: new Date(validatedData.dateRange.start),
        end: new Date(validatedData.dateRange.end),
      },
      timeGranularity: 'daily',
      fields: validatedData.fields,
      filters: {
        ...validatedData.filters,
      },
      chartType: validatedData.chartType,
      exportFormat: 'pdf',
      includeCharts: true,
      includeSummary: true,
    };

    const reportData = generateReportData(config);

    if (!reportData) {
      return NextResponse.json(
        { error: 'Failed to generate report data' },
        { status: 500 }
      );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while generating the report' },
      { status: 500 }
    );
  }
}
