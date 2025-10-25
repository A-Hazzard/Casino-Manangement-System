import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import {
  X,
  IdCard,
  Settings,
  Loader2,
  ChevronRight,
  User,
  UserPlus,
} from 'lucide-react';
import ActivityLogDateFilter from '@/components/ui/ActivityLogDateFilter';
import ActivityDetailsModal from '@/components/administration/ActivityDetailsModal';

import type { ActivityLog } from '@/app/api/lib/types/activityLog';
import type {
  ActivityLogModalProps,
  ActivityGroup,
} from '@/lib/types/components';
import { format } from 'date-fns';
import { ReactNode } from 'react';
import axios from 'axios';
import { useDashBoardStore } from '@/lib/store/dashboardStore';

const getActionIcon = (actionType: string) => {
  switch (actionType.toLowerCase()) {
    case 'create':
      return { icon: <UserPlus className="h-4 w-4" />, bg: 'bg-emerald-500' };
    case 'update':
    case 'edit':
      return { icon: <Settings className="h-4 w-4" />, bg: 'bg-amber-500' };
    case 'delete':
      return { icon: <X className="h-4 w-4" />, bg: 'bg-red-500' };
    case 'payment':
      return { icon: <IdCard className="h-4 w-4" />, bg: 'bg-violet-500' };
    case 'view':
      return { icon: <User className="h-4 w-4" />, bg: 'bg-slate-500' };
    default:
      return { icon: <Settings className="h-4 w-4" />, bg: 'bg-gray-500' };
  }
};

const generateDescription = (log: ActivityLog): ReactNode => {
  // Use new fields if available, fallback to legacy fields
  const actorEmail = log.username || log.actor?.email || 'Unknown User';
  const entityName = log.resourceName || log.entity?.name || 'Unknown Resource';
  const action = log.action || log.actionType || 'unknown';

  if (log.changes && log.changes.length > 0) {
    if (log.changes.length === 1) {
      const change = log.changes[0];
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
          changed the{' '}
          <span className="font-semibold text-blue-600">{change.field}</span> of{' '}
          <span className="font-semibold text-blue-600">{entityName}</span> from{' '}
          <span className="font-semibold text-blue-600">
            &quot;{String(change.oldValue)}&quot;
          </span>{' '}
          to{' '}
          <span className="font-semibold text-blue-600">
            &quot;{String(change.newValue)}&quot;
          </span>
        </>
      );
    } else {
      // Multiple changes - show summary
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
          updated{' '}
          <span className="font-semibold text-blue-600">
            {log.changes.length} fields
          </span>{' '}
          for licensee{' '}
          <span className="font-semibold text-blue-600">{entityName}</span>
          <span className="ml-2 text-sm text-gray-500">
            (Click to view details)
          </span>
        </>
      );
    }
  }

  // Use details field if available
  if (log.details) {
    return (
      <>
        <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
        {log.details}
      </>
    );
  }

  switch (action.toLowerCase()) {
    case 'create':
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
          created a new licensee{' '}
          <span className="font-semibold text-blue-600">{entityName}</span>
        </>
      );
    case 'delete':
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
          deleted the licensee{' '}
          <span className="font-semibold text-blue-600">{entityName}</span>
        </>
      );
    case 'payment':
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
          processed payment for{' '}
          <span className="font-semibold text-blue-600">{entityName}</span>
        </>
      );
    default:
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{' '}
          performed{' '}
          <span className="font-semibold text-blue-600">{action}</span> action
          on <span className="font-semibold text-blue-600">{entityName}</span>
        </>
      );
  }
};

const groupActivitiesByDate = (activities: ActivityLog[]): ActivityGroup[] => {
  const groups: { [key: string]: ActivityLog[] } = {};

  activities.forEach(activity => {
    // Safely parse the timestamp with validation
    const timestamp = activity.timestamp;
    let date: Date;

    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      // Fallback to current date if timestamp is invalid
      console.warn('Invalid timestamp for activity:', activity);
      date = new Date();
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date for activity:', activity);
      date = new Date(); // Fallback to current date
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'EEEE d, MMMM yyyy');
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return Object.entries(groups).map(([range, entries]) => ({
    range,
    entries: entries.map(log => {
      const action = log.action || log.actionType || 'unknown';
      const { icon, bg } = getActionIcon(action);

      // Safely parse timestamp for time display
      let logDate: Date;
      if (log.timestamp instanceof Date) {
        logDate = log.timestamp;
      } else if (typeof log.timestamp === 'string') {
        logDate = new Date(log.timestamp);
      } else {
        logDate = new Date();
      }

      // Validate the date before formatting
      if (isNaN(logDate.getTime())) {
        console.warn('Invalid timestamp for log entry:', log);
        logDate = new Date();
      }

      return {
        id: log._id?.toString() || Math.random().toString(),
        time: format(logDate, 'h:mm a'),
        type: action.toLowerCase(),
        icon,
        iconBg: bg,
        user: {
          email: log.username || log.actor?.email || 'Unknown User',
          role: log.actor?.role || 'User',
        },
        description: generateDescription(log),
        originalActivity: log,
      };
    }),
  }));
};

export default function ActivityLogModal({
  open,
  onClose,
}: ActivityLogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activityType, setActivityType] = useState('update');

  // Use dashboard store for date filtering
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(
    null
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        resource: 'licensee',
        limit: itemsPerPage.toString(),
        page: currentPage.toString(),
      });

      params.append('action', activityType);

      // Use dashboard store date filtering
      if (activeMetricsFilter === 'Custom' && customDateRange) {
        const sd =
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate as unknown as string);
        const ed =
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate as unknown as string);
        params.append('startDate', sd.toISOString());
        params.append('endDate', ed.toISOString());
      } else if (activeMetricsFilter !== 'All Time') {
        // Add date filtering based on activeMetricsFilter
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        switch (activeMetricsFilter) {
          case 'Today':
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            break;
          case 'Yesterday':
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 1
            );
            endDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 1,
              23,
              59,
              59
            );
            break;
          case 'last7days':
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last30days':
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
        }

        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }

      const response = await axios.get(`/api/activity-logs?${params}`);
      const data = response.data;

      if (data.success) {
        // Fix: The API returns data.data.activities, not data.data
        setActivities(data.data.activities || []);
        setTotalPages(
          Math.ceil((data.data.pagination?.totalCount || 0) / itemsPerPage)
        );
      } else {
        throw new Error(data.message || 'An unknown error occurred');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activityType, activeMetricsFilter, customDateRange, currentPage]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const groupedActivities = useMemo(
    () => groupActivitiesByDate(activities),
    [activities]
  );

  const handleActivityTypeChange = (type: string) => {
    setActivityType(type);
    setCurrentPage(1);
  };

  const handleActivityClick = (activity: ActivityLog) => {
    if (activity.changes && activity.changes.length > 1) {
      setSelectedActivity(activity);
      setIsDetailsModalOpen(true);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 p-2 md:items-center md:p-4">
        <div
          ref={modalRef}
          className="flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-2xl bg-gray-50 shadow-2xl md:max-h-[90vh] md:rounded-2xl"
        >
          {/* Header */}
          <div className="relative border-b border-gray-200 bg-white px-4 py-4 md:px-6 md:py-6">
            <button
              className="absolute right-3 top-3 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 md:right-4 md:top-4"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <h2 className="pr-10 text-center text-xl font-bold text-gray-900 md:pr-12 md:text-3xl">
              Licensees Activity Log
            </h2>
          </div>

          {/* Filter Section */}
          <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-6">
            <div className="flex w-full flex-col gap-4">
              <span className="text-lg font-semibold text-gray-700">
                Filter By:
              </span>
              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Date Filters */}
                <div className="min-w-0 flex-1">
                  <ActivityLogDateFilter />
                </div>

                {/* Activity Type Filter */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="whitespace-nowrap text-sm font-medium text-gray-600">
                    Activity Type:
                  </span>
                  <select
                    className="min-w-0 rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors focus:border-blue-500 focus:outline-none md:px-4 md:py-2.5 md:text-base"
                    value={activityType}
                    onChange={e => handleActivityTypeChange(e.target.value)}
                  >
                    <option value="update">Update</option>
                    <option value="create">Create</option>
                    <option value="delete">Delete</option>
                    <option value="payment">Payment</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 md:px-6 md:py-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-lg text-gray-600">
                    Loading licensee activities...
                  </span>
                </div>
              )}

              {error && (
                <div className="py-12 text-center text-red-500">
                  <div className="text-lg font-medium">
                    Error loading activities
                  </div>
                  <div className="mt-1 text-sm">{error}</div>
                  <button
                    onClick={fetchActivities}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && groupedActivities.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <IdCard className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <div className="text-lg font-medium">
                    No licensee activities found
                  </div>
                  <div className="mt-1 text-sm">
                    No licensee activities match your current filter criteria
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Try adjusting your filters or date range
                  </div>
                </div>
              )}

              {!loading && !error && groupedActivities.length > 0 && (
                <div className="space-y-8">
                  {groupedActivities.map((group, groupIdx) => (
                    <div key={group.range} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {group.range}
                        </h3>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>
                      <div className="space-y-4">
                        {group.entries.map((entry, idx) => (
                          <div key={entry.id} className="relative flex gap-4">
                            {/* Timeline */}
                            <div className="relative flex flex-col items-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white shadow-sm">
                                <div
                                  className={`${entry.iconBg} rounded-full p-2 text-white`}
                                >
                                  {entry.icon}
                                </div>
                              </div>
                              <div
                                className="absolute left-1/2 top-3 -translate-x-0.5 transform whitespace-nowrap rounded bg-white px-2 py-1 text-xs font-medium text-gray-500 shadow-sm"
                                style={{ top: '50px' }}
                              >
                                {entry.time}
                              </div>
                              {!(
                                groupIdx === groupedActivities.length - 1 &&
                                idx === group.entries.length - 1
                              ) && (
                                <div
                                  className="absolute bottom-0 left-1/2 h-6 w-0.5 -translate-x-0.5 transform bg-gray-300"
                                  style={{ top: '60px' }}
                                />
                              )}
                            </div>

                            {/* Activity Card */}
                            <div
                              className="group flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                              onClick={() =>
                                handleActivityClick(entry.originalActivity)
                              }
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                {/* User Info */}
                                <div className="flex items-center gap-3 sm:w-48 sm:min-w-0">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-200">
                                    <User className="h-5 w-5 text-gray-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-gray-900">
                                      {entry.user.email}
                                    </div>
                                    <div className="truncate text-xs text-gray-500">
                                      {entry.user.role}
                                    </div>
                                  </div>
                                </div>

                                {/* Activity Description */}
                                <div className="flex min-w-0 flex-1 items-center justify-between">
                                  <div className="break-words text-sm leading-relaxed text-gray-700">
                                    {entry.description}
                                  </div>
                                  {entry.originalActivity.changes &&
                                    entry.originalActivity.changes.length >
                                      1 && (
                                      <ChevronRight className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-gray-600" />
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Pagination */}
            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                {/* Pagination Info */}
                {!loading && !error && activities.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({activities.length}{' '}
                    activities)
                  </div>
                )}

                {/* Pagination Controls - Mobile Responsive */}
                {totalPages > 1 && (
                  <>
                    {/* Mobile Pagination */}
                    <div className="flex flex-col space-y-2 sm:hidden">
                      <div className="text-center text-xs text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1 || loading}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ««
                        </button>
                        <button
                          onClick={() =>
                            setCurrentPage(prev => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1 || loading}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ‹
                        </button>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={e => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 1;
                              if (val < 1) val = 1;
                              if (val > totalPages) val = totalPages;
                              setCurrentPage(val);
                            }}
                            className="w-10 rounded border border-gray-300 px-1 py-1 text-center text-xs text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                            aria-label="Page number"
                            disabled={loading}
                          />
                          <span className="text-xs text-gray-600">
                            of {totalPages}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setCurrentPage(prev =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentPage === totalPages || loading}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages || loading}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          »»
                        </button>
                      </div>
                    </div>

                    {/* Desktop Pagination */}
                    <div className="hidden items-center gap-2 sm:flex">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || loading}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        First
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage(prev => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1 || loading}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Page</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={currentPage}
                          onChange={e => {
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = 1;
                            if (val < 1) val = 1;
                            if (val > totalPages) val = totalPages;
                            setCurrentPage(val);
                          }}
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                          aria-label="Page number"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-600">
                          of {totalPages}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setCurrentPage(prev => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages || loading}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || loading}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Last
                      </button>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <Button className="rounded-xl bg-green-500 px-8 py-2 font-semibold text-white shadow-md transition-all duration-200 hover:bg-green-600 hover:shadow-lg">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Details Modal - Moved to top level for proper z-index */}
      <ActivityDetailsModal
        open={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedActivity(null);
        }}
        activity={selectedActivity}
      />
    </>
  );
}
