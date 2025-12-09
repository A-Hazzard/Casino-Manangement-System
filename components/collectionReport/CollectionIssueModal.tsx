/**
 * Collection Issue Modal Component
 * Modal for displaying collection report issues and their details.
 *
 * Features:
 * - Issue type display with icons and colors
 * - Issue description and details
 * - Affected machine information
 * - Issue severity indicators
 * - Action buttons for resolving issues
 * - Issue type configurations (inverted times, meter mismatches, SAS time issues)
 *
 * @param isOpen - Whether the modal is visible
 * @param issue - Collection issue object to display
 * @param onClose - Callback to close the modal
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CollectionIssue } from '@/shared/types/entities';
import { AlertTriangle, Clock, Database, RefreshCw } from 'lucide-react';

// ============================================================================
// Types & Constants
// ============================================================================

interface CollectionIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: CollectionIssue;
}

const issueTypeConfig = {
  inverted_times: {
    title: 'SAS Times Inverted',
    icon: AlertTriangle,
    color: 'destructive',
    description: 'The SAS start time is after or equal to the SAS end time',
  },
  prev_meters_mismatch: {
    title: 'Previous Meters Mismatch',
    icon: Database,
    color: 'warning',
    description:
      "Previous meter values don't match the actual previous collection",
  },
  sas_time_wrong: {
    title: 'SAS Time Range Incorrect',
    icon: Clock,
    color: 'warning',
    description: "SAS time range doesn't align properly with collection timing",
  },
  wrong_sas_start_time: {
    title: 'Wrong SAS Start Time',
    icon: Clock,
    color: 'warning',
    description:
      "SAS start time doesn't match the previous collection's timestamp",
  },
  wrong_sas_end_time: {
    title: 'Wrong SAS End Time',
    icon: Clock,
    color: 'warning',
    description: "SAS end time doesn't match the collection timestamp",
  },
  missing_sas_times: {
    title: 'Missing SAS Times',
    icon: AlertTriangle,
    color: 'destructive',
    description: 'SAS times are missing from this collection',
  },
  history_mismatch: {
    title: 'Collection History Timestamp',
    icon: RefreshCw,
    color: 'secondary',
    description: "Collection history timestamp doesn't match collection time",
  },
  machine_time_mismatch: {
    title: 'Machine Collection Time',
    icon: Clock,
    color: 'secondary',
    description: "Machine collection times don't match collection timestamps",
  },
};

export function CollectionIssueModal({
  isOpen,
  onClose,
  issue,
}: CollectionIssueModalProps) {
  const config = issueTypeConfig[issue.issueType];
  const Icon = config.icon;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const formatTimestamp = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';

    // If it's already a string and looks like a date, try to parse it
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
      // If it's not a valid date string, return as-is
      return value;
    }

    // If it's a Date object
    if (value instanceof Date) {
      return value.toLocaleString();
    }

    // For any other type, convert to string
    return String(value);
  };

  const getWhatWillBeFixed = (): string => {
    switch (issue.issueType) {
      case 'inverted_times':
        return 'The SAS start and end times will be recalculated to ensure proper chronological order';
      case 'prev_meters_mismatch':
        return "The previous meter values will be updated to match the actual previous collection's meters";
      case 'sas_time_wrong':
        return "The SAS time range will be recalculated to align with the collection's actual timing";
      case 'history_mismatch':
        return "The collection history timestamp will be updated to match the collection's actual timestamp";
      case 'machine_time_mismatch':
        return "The machine's collection and previous collection times will be updated";
      default:
        return 'The issue will be corrected based on the actual collection data';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title} - {issue.machineName}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Issue Summary */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-medium">Issue Summary</h4>
            <p className="text-sm text-muted-foreground">
              {issue.details.explanation}
            </p>
          </div>

          {/* Current vs Expected */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium">
                <Badge variant="destructive">Current</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                {issue.details.current ? (
                  Object.entries(issue.details.current).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-muted-foreground">
                        {key.toLowerCase().includes('time') ||
                        key.toLowerCase().includes('timestamp')
                          ? formatTimestamp(value)
                          : formatValue(value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No current data</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium">
                <Badge variant="default">Expected</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                {issue.details.expected ? (
                  Object.entries(issue.details.expected).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-muted-foreground">
                        {key.toLowerCase().includes('time') ||
                        key.toLowerCase().includes('timestamp')
                          ? formatTimestamp(value)
                          : formatValue(value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No expected data</p>
                )}
              </div>
            </div>
          </div>

          {/* What Will Be Fixed */}
          <div className="rounded-lg bg-blue-50 p-4 text-white dark:bg-blue-950">
            <h4 className="mb-2 flex items-center gap-2 font-medium text-white">
              <RefreshCw className="h-4 w-4 text-white" />
              What Will Be Fixed
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {getWhatWillBeFixed()}
            </p>
          </div>

          {/* Collection Details */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Collection Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Collection ID:</span>
                <span className="font-mono text-xs">{issue.collectionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Machine:</span>
                <span>{issue.machineName}</span>
              </div>
              <div className="flex justify-between">
                <span>Issue Type:</span>
                <Badge
                  variant={
                    config.color as
                      | 'default'
                      | 'secondary'
                      | 'destructive'
                      | 'outline'
                  }
                >
                  {config.title}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
