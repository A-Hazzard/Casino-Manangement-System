"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
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

interface ActivityLogCardProps {
  log: ActivityLog;
  searchMode: "username" | "email" | "description";
  onDescriptionClick?: (log: ActivityLog) => void;
}

const ActivityLogCard: React.FC<ActivityLogCardProps> = ({ log, searchMode, onDescriptionClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
  const isLongDescription = description.length > 100;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getActionBadgeVariant(log.action)}>
              {log.action.toUpperCase()}
            </Badge>
            <Badge variant={getResourceBadgeVariant(log.resource)}>
              {log.resource}
            </Badge>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm font-mono text-gray-600">
              {formatDate(log.timestamp)}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {log.ipAddress || "N/A"}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-900">
            {searchMode === "email" ? (
              <>
                <div className="font-medium">{log.actor?.email || "N/A"}</div>
                {log.username && (
                  <div className="text-sm text-gray-500">
                    {log.username}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-medium">{log.username}</div>
                {log.actor?.email && (
                  <div className="text-sm text-gray-500">
                    {log.actor.email}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <div className="text-sm text-gray-700">
            {isExpanded ? (
              <div className="whitespace-pre-wrap break-words">{description}</div>
            ) : (
              <div className="overflow-hidden">
                {isLongDescription ? (
                  <>
                    <div className="break-words" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {description.substring(0, 100)}...
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Show More
                      </Button>
                      {onDescriptionClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDescriptionClick(log)}
                          className="text-green-600 hover:text-green-700 p-0 h-auto text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Full
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="break-words">
                    {onDescriptionClick ? (
                      <button
                        onClick={() => onDescriptionClick(log)}
                        className="hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left"
                        title="Click to view full description"
                      >
                        {description}
                      </button>
                    ) : (
                      description
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Show Less Button */}
        {isExpanded && isLongDescription && (
          <div className="flex justify-end mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Show Less
            </Button>
          </div>
        )}

        {/* Resource Info */}
        {log.resourceName && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 break-words">
              Resource: <span className="font-medium">{log.resourceName}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogCard;
