import type { FixResults } from '@/lib/types/fixReport';

/**
 * Generate detailed summary report file with all errors and issues
 */
export async function generateSummaryReport(
  targetReport: { locationReportId: string; _id: string; [key: string]: unknown },
  fixResults: FixResults,
  totalTime: number
) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(process.cwd(), 'scripts', 'fix-reports');
    
    // Ensure directory exists
    try {
      await fs.mkdir(reportDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    const reportPath = path.join(
      reportDir,
      `fix-report-${targetReport.locationReportId}-${timestamp}.json`
    );

    const totalIssuesFixed = Object.values(fixResults.issuesFixed).reduce(
      (sum, val) => sum + val,
      0
    );

    const report = {
      reportId: targetReport.locationReportId,
      timestamp: new Date().toISOString(),
      summary: {
        collectionsProcessed: fixResults.collectionsProcessed,
        totalIssuesFixed,
        issueBreakdown: fixResults.issuesFixed,
        totalErrors: fixResults.errors.length,
        timeTakenSeconds: (totalTime / 1000).toFixed(2),
      },
      errors: fixResults.errors.map(err => ({
        collectionId: err.collectionId,
        machineId: (err as Record<string, unknown>).machineId || 'Unknown',
        machineCustomName: (err as Record<string, unknown>).machineCustomName || 'Unknown',
        phase: (err as Record<string, unknown>).phase || 'Unknown',
        error: err.error,
        details: (err as Record<string, unknown>).details,
      })),
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Summary report saved to: ${reportPath}`);
    console.log(`   📁 Location: scripts/fix-reports/`);
    console.log(`   📋 File: fix-report-${targetReport.locationReportId}-${timestamp}.json`);
    console.log(`   🔍 View full error details in this file\n`);
  } catch (error) {
    console.error('❌ Failed to generate summary report:', error);
  }
}

