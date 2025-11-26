/**
 * Analytics Reports API Route
 *
 * This route handles generating analytics reports based on configuration.
 * It supports:
 * - Validating report configuration using Zod schema
 * - Generating report data for different report types
 * - Supporting location performance, machine revenue, and full financials reports
 *
 * @module app/api/analytics/reports/route
 */

import type { ReportConfig } from '@/lib/types/reports';
import { generateReportData } from '@/app/api/lib/helpers/reports';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Zod schema for report configuration validation
 */
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

/**
 * Builds report configuration from validated data
 *
 * @param validatedData - Validated request data
 * @returns Report configuration object
 */
function buildReportConfig(
  validatedData: z.infer<typeof reportConfigSchema>
): ReportConfig {
  return {
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
}

/**
 * Main POST handler for generating analytics reports
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Validate report configuration
 * 3. Build report configuration
 * 4. Generate report data
 * 5. Return report data
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const body = await request.json();

    // ============================================================================
    // STEP 2: Validate report configuration
    // ============================================================================
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

    // ============================================================================
    // STEP 3: Build report configuration
    // ============================================================================
    const config = buildReportConfig(validationResult.data);

    // ============================================================================
    // STEP 4: Generate report data
    // ============================================================================
    const reportData = generateReportData(config);

    if (!reportData) {
      return NextResponse.json(
        { error: 'Failed to generate report data' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 5: Return report data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Reports POST API] Completed in ${duration}ms`);
    }
    return NextResponse.json(reportData);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An internal error occurred while generating the report';
    console.error(
      `[Analytics Reports POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
