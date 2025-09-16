"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/formatting";

interface ActivityLog {
  _id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  details?: string;
  description?: string;
  actor?: {
    id: string;
    email: string;
    role: string;
  };
  ipAddress?: string;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

interface ActivityLogDescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ActivityLog | null;
  searchMode: "username" | "email" | "description";
}

const ActivityLogDescriptionDialog: React.FC<ActivityLogDescriptionDialogProps> = ({
  isOpen,
  onClose,
  log,
  searchMode,
}) => {
  if (!log) return null;

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      case "view":
        return "outline";
      default:
        return "outline";
    }
  };

  // Get resource badge variant
  const getResourceBadgeVariant = (resource: string) => {
    switch (resource) {
      case "user":
        return "default";
      case "machine":
        return "secondary";
      case "location":
        return "outline";
      case "collection":
        return "destructive";
      case "licensee":
        return "default";
      case "member":
        return "secondary";
      case "session":
        return "outline";
      default:
        return "outline";
    }
  };

  const description = log.description || log.details || "No description";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={getActionBadgeVariant(log.action)}>
              {log.action.toUpperCase()}
            </Badge>
            <Badge variant={getResourceBadgeVariant(log.resource)}>
              {log.resource}
            </Badge>
            <span className="text-sm text-gray-500 font-normal">
              {formatDate(log.timestamp)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Information */}
          <div className="border-b pb-3">
            <h4 className="font-medium text-sm text-gray-700 mb-2">User</h4>
            <div className="text-sm">
              {searchMode === "email" ? (
                <>
                  <div className="font-medium">{log.actor?.email || "N/A"}</div>
                  {log.username && (
                    <div className="text-gray-500">
                      {log.username}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-medium">{log.username}</div>
                  {log.actor?.email && (
                    <div className="text-gray-500">
                      {log.actor.email}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Resource Information */}
          <div className="border-b pb-3">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Resource</h4>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-gray-500">ID:</span> {log.resourceId}
              </div>
              {log.resourceName && (
                <div>
                  <span className="text-gray-500">Name:</span> {log.resourceName}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="border-b pb-3">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Description</h4>
            <div className="text-sm text-gray-900 whitespace-pre-wrap break-words bg-gray-50 p-3 rounded-md">
              {description}
            </div>
          </div>

          {/* Changes (if available) */}
          {log.changes && log.changes.length > 0 && (
            <div className="border-b pb-3">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Changes</h4>
              <div className="space-y-2">
                {log.changes.map((change, index) => (
                  <div key={index} className="text-sm bg-blue-50 p-3 rounded-md">
                    <div className="font-medium text-blue-900 mb-1">
                      {change.field}
                    </div>
                    <div className="text-blue-800">
                      <span className="text-gray-600">From:</span>{" "}
                      <span className="font-mono bg-red-100 px-1 rounded">
                        {String(change.oldValue || "empty")}
                      </span>
                    </div>
                    <div className="text-blue-800">
                      <span className="text-gray-600">To:</span>{" "}
                      <span className="font-mono bg-green-100 px-1 rounded">
                        {String(change.newValue || "empty")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Technical Details</h4>
            <div className="text-sm space-y-1 text-gray-600">
              <div>
                <span className="text-gray-500">IP Address:</span> {log.ipAddress || "N/A"}
              </div>
              <div>
                <span className="text-gray-500">User ID:</span> {log.userId}
              </div>
              <div>
                <span className="text-gray-500">Log ID:</span> {log._id}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityLogDescriptionDialog;
