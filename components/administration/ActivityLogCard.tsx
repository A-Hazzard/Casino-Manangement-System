'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import type { ActivityLog } from '@/app/api/lib/types/activityLog';

type ActivityLogCardProps = {
  log: ActivityLog;
  searchMode: 'username' | 'email' | 'description';
  onDescriptionClick?: (log: ActivityLog) => void;
};

const ActivityLogCard: React.FC<ActivityLogCardProps> = ({
  log,
  searchMode,
  onDescriptionClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle undefined _id
  if (!log._id) {
    return null;
  }

  // Get action badge styling with enhanced colors
  const getActionBadgeStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 font-semibold';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-semibold';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 font-semibold';
      case 'view':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 font-semibold';
      case 'login':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 font-semibold';
      case 'logout':
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-semibold';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-semibold';
    }
  };

  // Get resource badge styling with enhanced colors
  const getResourceBadgeStyle = (resource: string) => {
    switch (resource.toLowerCase()) {
      case 'user':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 font-medium';
      case 'machine':
      case 'cabinet':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 font-medium';
      case 'location':
        return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 font-medium';
      case 'collection':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 font-medium';
      case 'member':
        return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 font-medium';
      case 'licensee':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200 font-medium';
      case 'session':
        return 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200 font-medium';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-medium';
    }
  };

  const description = log.description || log.details || 'No description';
  const isLongDescription = description.length > 100;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getActionBadgeStyle(log.action || 'unknown')}>
              {(log.action || 'unknown').toUpperCase()}
            </Badge>
            <Badge className={getResourceBadgeStyle(log.resource || 'unknown')}>
              {log.resource || 'unknown'}
            </Badge>
          </div>
          <div className="text-left sm:text-right">
            <div className="font-mono text-sm text-gray-600">
              {formatDate(log.timestamp)}
            </div>
            <div className="font-mono text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>{log.ipAddress || 'N/A'}</span>
                {log.ipAddress && log.ipAddress.includes('(Local)') && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    Local
                  </span>
                )}
                {log.ipAddress && log.ipAddress.includes('(Public)') && (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-600">
                    Public
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-900">
            {searchMode === 'email' ? (
              <>
                <div className="font-medium">{log.actor?.email || 'N/A'}</div>
                {log.username && (
                  <div className="text-sm text-gray-500">{log.username}</div>
                )}
              </>
            ) : (
              <>
                <div className="font-medium">{log.username}</div>
                {log.actor?.email && (
                  <div className="text-sm text-gray-500">{log.actor.email}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <div className="text-sm text-gray-700">
            {isExpanded ? (
              <div className="whitespace-pre-wrap break-words">
                {description}
              </div>
            ) : (
              <div className="overflow-hidden">
                {isLongDescription ? (
                  <>
                    <div
                      className="break-words"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {description.substring(0, 100)}...
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Show More
                      </Button>
                      {onDescriptionClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDescriptionClick(log)}
                          className="h-auto p-0 text-xs text-green-600 hover:text-green-700"
                        >
                          <Eye className="mr-1 h-3 w-3" />
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
                        className="cursor-pointer text-left transition-colors hover:text-blue-600 hover:underline"
                        title="Click to view full description"
                      >
                        <span className="inline-flex items-center gap-1">
                          {description}
                          <span className="text-xs text-blue-500">📋</span>
                        </span>
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
          <div className="mb-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Show Less
            </Button>
          </div>
        )}

        {/* Resource Info */}
        {log.resourceName && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="break-words text-xs text-gray-500">
              Resource: <span className="font-medium">{log.resourceName}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogCard;
