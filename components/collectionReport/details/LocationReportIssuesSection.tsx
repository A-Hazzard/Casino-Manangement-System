/**
 * LocationReportIssuesSection Component
 *
 * Displays a summary of detected issues in the collection report.
 *
 * Features:
 * - Alerts for SAS time issues and collection history mismatches
 * - Direct links to "Fix Issues" functionality
 * - Visual indicators for machines with issues
 */

'use client';

import { AlertCircle, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LocationReportIssuesSectionProps = {
  hasSasTimeIssues: boolean;
  hasCollectionHistoryIssues: boolean;
  sasTimeIssuesCount: number;
  collectionHistoryMachinesCount: number;
  onFixIssuesClick: () => void;
};

export default function LocationReportIssuesSection({
  hasSasTimeIssues,
  hasCollectionHistoryIssues,
  sasTimeIssuesCount,
  collectionHistoryMachinesCount,
  onFixIssuesClick,
}: LocationReportIssuesSectionProps) {
  if (!hasSasTimeIssues && !hasCollectionHistoryIssues) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-red-100 p-2 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-red-900">Issues Detected</h3>
            <p className="text-sm text-red-700/80">
              The following inconsistencies were found in this report.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {hasSasTimeIssues && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-white p-3 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">
                  {sasTimeIssuesCount} machines have SAS time issues
                </span>
              </div>
            )}

            {hasCollectionHistoryIssues && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-white p-3 shadow-sm">
                <Zap className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700">
                  {collectionHistoryMachinesCount} history mismatches found
                </span>
              </div>
            )}
          </div>

          <Button 
            onClick={onFixIssuesClick}
            variant="destructive" 
            className="w-full sm:w-auto shadow-md"
          >
            Resolve All Issues Now
          </Button>
        </div>
      </div>
    </div>
  );
}



