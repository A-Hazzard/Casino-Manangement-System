'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/formatting';
import { formatValue } from '@/lib/utils/dateFormatting';
import { resolveIdToName, isIdValue } from '@/lib/utils/idResolution';
import type { ActivityLog } from '@/app/api/lib/types/activityLog';

type ActivityLogDescriptionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  log: ActivityLog | null;
  searchMode: 'username' | 'email' | 'description';
};

const ActivityLogDescriptionDialog: React.FC<
  ActivityLogDescriptionDialogProps
> = ({ isOpen, onClose, log, searchMode }) => {
  const [resolvedChanges, setResolvedChanges] = useState<
    Array<{
      field: string;
      oldValue: string;
      newValue: string;
      originalChange: { field: string; oldValue: unknown; newValue: unknown };
    }>
  >([]);

  // Resolve IDs and format values
  useEffect(() => {
    // Reset when dialog closes or log changes
    if (!isOpen || !log || !log.changes || log.changes.length === 0) {
      setResolvedChanges([]);
      return;
    }

    let isMounted = true;

    const resolveChanges = async () => {
      try {
        const resolved = await Promise.all(
          log.changes!
            // Filter out changes where "To" value is an ID
            .filter(change => !isIdValue(change.newValue))
            .map(async change => {
              const formattedOldValue = isIdValue(change.oldValue)
                ? await resolveIdToName(change.oldValue, change.field)
                : formatValue(change.oldValue, change.field);
              const formattedNewValue = formatValue(
                change.newValue,
                change.field
              );

              return {
                field: change.field,
                oldValue: formattedOldValue,
                newValue: formattedNewValue,
                originalChange: change,
              };
            })
        );
        // Only update state if component is still mounted
        if (isMounted) {
          setResolvedChanges(resolved);
        }
      } catch (error) {
        console.error('Error resolving changes:', error);
        if (isMounted) {
          setResolvedChanges([]);
        }
      }
    };

    resolveChanges();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [isOpen, log]);

  // Early return after hooks
  if (!log) return null;

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'view':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Get resource badge variant
  const getResourceBadgeVariant = (resource: string) => {
    switch (resource) {
      case 'user':
        return 'default';
      case 'machine':
        return 'secondary';
      case 'location':
        return 'outline';
      case 'collection':
        return 'destructive';
      case 'licensee':
        return 'default';
      case 'member':
        return 'secondary';
      case 'session':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const description = log.description || log.details || 'No description';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={getActionBadgeVariant(log.action || 'unknown')}>
              {(log.action || 'unknown').toUpperCase()}
            </Badge>
            <Badge variant={getResourceBadgeVariant(log.resource || 'unknown')}>
              {log.resource || 'unknown'}
            </Badge>
            <span className="text-sm font-normal text-gray-500">
              {formatDate(log.timestamp)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Information */}
          <div className="border-b pb-3">
            <h4 className="mb-2 text-sm font-medium text-gray-700">User</h4>
            <div className="text-sm">
              {searchMode === 'email' ? (
                <>
                  <div className="font-medium">{log.actor?.email || 'N/A'}</div>
                  {log.username && (
                    <div className="text-gray-500">{log.username}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-medium">{log.username}</div>
                  {log.actor?.email && (
                    <div className="text-gray-500">{log.actor.email}</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Resource Information */}
          <div className="border-b pb-3">
            <h4 className="mb-2 text-sm font-medium text-gray-700">Resource</h4>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-500">ID:</span> {log.resourceId}
              </div>
              {log.resourceName && (
                <div>
                  <span className="text-gray-500">Name:</span>{' '}
                  {log.resourceName}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="border-b pb-3">
            <h4 className="mb-2 text-sm font-medium text-gray-700">
              Description
            </h4>
            <div className="whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-sm text-gray-900">
              {description}
            </div>
          </div>

          {/* Changes (if available) */}
          {resolvedChanges && resolvedChanges.length > 0 && (
            <div className="border-b pb-3">
              <h4 className="mb-2 text-sm font-medium text-gray-700">
                Changes
              </h4>
              <div className="space-y-2">
                {resolvedChanges.map((change, index) => (
                  <div
                    key={index}
                    className="rounded-md bg-blue-50 p-3 text-sm"
                  >
                    <div className="mb-1 font-medium text-blue-900">
                      {change.field}
                    </div>
                    <div className="text-blue-800">
                      <span className="text-gray-600">From:</span>{' '}
                      <span className="rounded bg-red-100 px-1 font-mono">
                        {change.oldValue}
                      </span>
                    </div>
                    <div className="text-blue-800">
                      <span className="text-gray-600">To:</span>{' '}
                      <span className="rounded bg-green-100 px-1 font-mono">
                        {change.newValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">
              Technical Details
            </h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>
                <span className="text-gray-500">IP Address:</span>{' '}
                {log.ipAddress || 'N/A'}
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
