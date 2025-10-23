import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Database, RefreshCw } from "lucide-react";
import type { CollectionIssue } from "@/shared/types/entities";

interface CollectionIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: CollectionIssue;
}

const issueTypeConfig = {
  inverted_times: {
    title: "SAS Times Inverted",
    icon: AlertTriangle,
    color: "destructive",
    description: "The SAS start time is after or equal to the SAS end time",
  },
  prev_meters_mismatch: {
    title: "Previous Meters Mismatch",
    icon: Database,
    color: "warning",
    description:
      "Previous meter values don't match the actual previous collection",
  },
  sas_time_wrong: {
    title: "SAS Time Range Incorrect",
    icon: Clock,
    color: "warning",
    description: "SAS time range doesn't align properly with collection timing",
  },
  history_mismatch: {
    title: "Collection History Timestamp",
    icon: RefreshCw,
    color: "secondary",
    description: "Collection history timestamp doesn't match collection time",
  },
  machine_time_mismatch: {
    title: "Machine Collection Time",
    icon: Clock,
    color: "secondary",
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
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return String(value);
  };

  const formatTimestamp = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";

    // If it's already a string and looks like a date, try to parse it
    if (typeof value === "string") {
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
      case "inverted_times":
        return "The SAS start and end times will be recalculated to ensure proper chronological order";
      case "prev_meters_mismatch":
        return "The previous meter values will be updated to match the actual previous collection's meters";
      case "sas_time_wrong":
        return "The SAS time range will be recalculated to align with the collection's actual timing";
      case "history_mismatch":
        return "The collection history timestamp will be updated to match the collection's actual timestamp";
      case "machine_time_mismatch":
        return "The machine's collection and previous collection times will be updated";
      default:
        return "The issue will be corrected based on the actual collection data";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title} - {issue.machineName}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Issue Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Issue Summary</h4>
            <p className="text-sm text-muted-foreground">
              {issue.details.explanation}
            </p>
          </div>

          {/* Current vs Expected */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Badge variant="destructive">Current</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                {Object.entries(issue.details.current).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </span>
                    <span className="text-muted-foreground">
                      {key.toLowerCase().includes("time") ||
                      key.toLowerCase().includes("timestamp")
                        ? formatTimestamp(value)
                        : formatValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Badge variant="default">Expected</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                {Object.entries(issue.details.expected).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </span>
                    <span className="text-muted-foreground">
                      {key.toLowerCase().includes("time") ||
                      key.toLowerCase().includes("timestamp")
                        ? formatTimestamp(value)
                        : formatValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What Will Be Fixed */}
          <div className="text-white p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <RefreshCw className="text-white h-4 w-4" />
              What Will Be Fixed
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {getWhatWillBeFixed()}
            </p>
          </div>

          {/* Collection Details */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Collection Details</h4>
            <div className="text-sm space-y-1">
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
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
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
