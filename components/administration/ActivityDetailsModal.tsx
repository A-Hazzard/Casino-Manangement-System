import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, User, Building2, Calendar, Clock } from 'lucide-react';
import gsap from 'gsap';
import { format } from 'date-fns';
import type { ActivityLog } from '@/app/api/lib/types/activityLog';
import { getIPDescription } from '@/lib/utils/ipAddress';
import { formatFieldName } from '@/lib/utils/fieldFormatting';
import { formatValue } from '@/lib/utils/dateFormatting';

type ActivityDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  activity: ActivityLog | null;
};

export default function ActivityDetailsModal({
  open,
  onClose,
  activity,
}: ActivityDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  if (!open || !activity) return null;

  const getActionColor = (actionType: string | undefined) => {
    if (!actionType) return 'text-gray-600 bg-gray-50';

    switch (actionType.toLowerCase()) {
      case 'create':
        return 'text-blue-600 bg-blue-50';
      case 'update':
        return 'text-green-600 bg-green-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getEntityIcon = (entityType: string | undefined) => {
    if (!entityType) return <User className="h-5 w-5" />;

    switch (entityType.toLowerCase()) {
      case 'user':
        return <User className="h-5 w-5" />;
      case 'licensee':
        return <Building2 className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative flex h-full w-full flex-col overflow-hidden border border-border bg-background lg:max-h-[90vh] lg:max-w-4xl lg:rounded-2xl"
        style={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-6">
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full p-3 ${getActionColor(
                activity.actionType
              )}`}
            >
              {getEntityIcon(activity.entityType)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Activity Details
              </h2>
              <p className="mt-1 text-gray-600">
                {activity.entityType || activity.resource} •{' '}
                {activity.entity?.name || activity.resourceName || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Activity Summary */}
          <div className="mb-6 rounded-xl bg-gray-50 p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Performed by
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.actor?.email ||
                        activity.username ||
                        'Unknown User'}
                    </p>
                    <p className="text-xs capitalize text-gray-500">
                      {activity.actor?.role || 'User'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Date</p>
                    <p className="text-sm text-gray-600">
                      {format(
                        new Date(activity.timestamp),
                        'EEEE, MMMM d, yyyy'
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Time</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(activity.timestamp), 'h:mm:ss a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded-full ${getActionColor(
                      activity.actionType
                    )}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Action</p>
                    <p
                      className={`text-sm font-semibold capitalize ${
                        getActionColor(
                          activity.actionType || activity.action
                        ).split(' ')[0]
                      }`}
                    >
                      {(
                        activity.actionType ||
                        activity.action ||
                        'unknown'
                      ).toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Changes Details */}
          {activity.changes && activity.changes.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {(
                  activity.actionType ||
                  activity.action ||
                  'unknown'
                ).toLowerCase() === 'create'
                  ? `Fields Created (${activity.changes.length})`
                  : (
                        activity.actionType ||
                        activity.action ||
                        'unknown'
                      ).toLowerCase() === 'delete'
                    ? `Fields Deleted (${activity.changes.length})`
                    : `Changes Made (${activity.changes.length})`}
              </h3>
              <div className="space-y-3">
                {activity.changes.map((change, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {formatFieldName(change.field)}
                        </h4>
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                          Field {index + 1}
                        </span>
                      </div>
                      {(
                        activity.actionType ||
                        activity.action ||
                        'unknown'
                      ).toLowerCase() === 'create' ? (
                        // For CREATE operations, show only the created value
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Created Value
                          </p>
                          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                            <p className="break-all font-mono text-sm text-blue-800">
                              {formatValue(change.newValue, change.field)}
                            </p>
                          </div>
                        </div>
                      ) : (
                          activity.actionType ||
                          activity.action ||
                          'unknown'
                        ).toLowerCase() === 'delete' ? (
                        // For DELETE operations, show only the deleted value
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Deleted Value
                          </p>
                          <div className="rounded-md border border-red-200 bg-red-50 p-3">
                            <p className="break-all font-mono text-sm text-red-800">
                              {formatValue(change.oldValue, change.field)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // For UPDATE operations, show both old and new values
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Previous Value
                            </p>
                            <div className="rounded-md border border-red-200 bg-red-50 p-3">
                              <p className="break-all font-mono text-sm text-red-800">
                                {formatValue(change.oldValue, change.field)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              New Value
                            </p>
                            <div className="rounded-md border border-green-200 bg-green-50 p-3">
                              <p className="break-all font-mono text-sm text-green-800">
                                {formatValue(change.newValue, change.field)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mb-2 text-gray-400">
                <User className="mx-auto h-12 w-12" />
              </div>
              <p className="text-gray-600">
                No detailed changes recorded for this activity.
              </p>
              {activity.description && (
                <p className="mt-2 text-sm text-gray-500">
                  {activity.description}
                </p>
              )}
            </div>
          )}

          {/* Additional Info */}
          {activity.ipAddress && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="text-sm text-gray-500">
                <span className="font-medium">IP Address:</span>{' '}
                {getIPDescription(activity.ipAddress)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="rounded-md bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
