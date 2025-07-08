import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import {
  X,
  User,
  Settings,
  UserPlus,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import ActivityDetailsModal from "@/components/administration/ActivityDetailsModal";
import { DateRange } from "react-day-picker";
import type { ActivityLog } from "@/app/api/lib/types/activityLog";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ReactNode } from "react";

const filterButtons = [
  { label: "Date Range", color: "bg-buttonActive text-white", key: "date" },
  { label: "Activity Type", color: "bg-green-500 text-white", key: "type" },
];

type UserActivityLogModalProps = {
  open: boolean;
  onClose: () => void;
};

type ActivityGroup = {
  range: string;
  entries: ProcessedActivityEntry[];
};

type ProcessedActivityEntry = {
  id: string;
  time: string;
  type: string;
  icon: ReactNode;
  iconBg: string;
  user: {
    email: string;
    role: string;
  };
  description: ReactNode;
  originalActivity: ActivityLog;
};

const getActionIcon = (actionType: string) => {
  switch (actionType.toLowerCase()) {
    case "create":
      return { icon: <UserPlus className="w-4 h-4" />, bg: "bg-blue-500" };
    case "update":
    case "edit":
      return { icon: <Settings className="w-4 h-4" />, bg: "bg-green-500" };
    case "delete":
      return { icon: <X className="w-4 h-4" />, bg: "bg-red-500" };
    default:
      return { icon: <Settings className="w-4 h-4" />, bg: "bg-gray-500" };
  }
};

const generateDescription = (log: ActivityLog): ReactNode => {
  const actorEmail = log.actor.email;
  const entityName = log.entity.name;

  if (log.changes && log.changes.length > 0) {
    if (log.changes.length === 1) {
      const change = log.changes[0];
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          changed the{" "}
          <span className="text-blue-600 font-semibold">{change.field}</span> of{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span> from{" "}
          <span className="text-blue-600 font-semibold">
            &quot;{String(change.oldValue)}&quot;
          </span>{" "}
          to{" "}
          <span className="text-blue-600 font-semibold">
            &quot;{String(change.newValue)}&quot;
          </span>
        </>
      );
    } else {
      // Multiple changes - show summary
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          updated{" "}
          <span className="text-blue-600 font-semibold">
            {log.changes.length} fields
          </span>{" "}
          for user{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span>
          <span className="text-gray-500 text-sm ml-2">
            (Click to view details)
          </span>
        </>
      );
    }
  }

  switch (log.actionType.toLowerCase()) {
    case "create":
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          created a new user account for{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span>
        </>
      );
    case "delete":
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          deleted the user account of{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span>
        </>
      );
    default:
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          performed{" "}
          <span className="text-blue-600 font-semibold">{log.actionType}</span>{" "}
          action on{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span>
        </>
      );
  }
};

const groupActivitiesByDate = (activities: ActivityLog[]): ActivityGroup[] => {
  const groups: { [key: string]: ActivityLog[] } = {};

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    } else {
      dateKey = format(date, "EEEE d, MMMM yyyy");
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return Object.entries(groups).map(([range, entries]) => ({
    range,
    entries: entries.map((log) => {
      const { icon, bg } = getActionIcon(log.actionType);
      return {
        id: log._id?.toString() || Math.random().toString(),
        time: format(new Date(log.timestamp), "h:mm a"),
        type: log.actionType.toLowerCase(),
        icon,
        iconBg: bg,
        user: {
          email: log.actor.email,
          role: log.actor.role,
        },
        description: generateDescription(log),
        originalActivity: log,
      };
    }),
  }));
};

export default function UserActivityLogModal({
  open,
  onClose,
}: UserActivityLogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState("date");
  const [activityType, setActivityType] = useState("update");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pendingDateRange, setPendingDateRange] = useState<
    DateRange | undefined
  >(dateRange);
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
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        entityType: "User",
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
      });

      if (activeFilter === "type" && activityType) {
        params.append("actionType", activityType.toUpperCase());
      }

      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString());
      }

      if (dateRange?.to) {
        params.append("endDate", dateRange.to.toISOString());
      }

      const response = await fetch(`/api/activity-logs?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch activity logs");
      }

      const data = await response.json();

      if (data.success) {
        setActivities(data.data || []);
        setTotalPages(
          Math.ceil((data.total || data.count || 0) / itemsPerPage)
        );
      } else {
        throw new Error(data.message || "Failed to fetch activity logs");
      }
    } catch (err) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching activities:", err);
      }
      setError(
        err instanceof Error ? err.message : "Failed to load activity logs"
      );
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, activeFilter, activityType, dateRange]);

  useEffect(() => {
    if (open) {
      fetchActivities();
    }
  }, [open, fetchActivities]);

  const activityGroups = groupActivitiesByDate(activities);

  const handleFilterChange = (filterKey: string) => {
    setActiveFilter(filterKey);
    setCurrentPage(1);
    if (filterKey === "type") {
      setActivityType("update");
    }
  };

  const handleActivityTypeChange = (type: string) => {
    setActivityType(type);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setPendingDateRange(range);
  };

  const handleGoClick = () => {
    setDateRange(pendingDateRange);
    setCurrentPage(1);
    fetchActivities();
  };

  const handleActivityClick = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setIsDetailsModalOpen(true);
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    setPendingDateRange({
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div
          ref={modalRef}
          className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-white border-b border-gray-200 px-6 py-6">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-gray-900 pr-12">
              User Activity Log
            </h2>
          </div>

          {/* Filter Section */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
              <span className="font-semibold text-lg text-gray-700 flex-shrink-0">
                Filter By:
              </span>
              <div className="flex flex-wrap gap-3 flex-1">
                {filterButtons.map((btn) => (
                  <button
                    key={btn.key}
                    className={`rounded-xl px-6 py-2.5 font-semibold text-base focus:outline-none transition-all duration-200 ${
                      activeFilter === btn.key
                        ? btn.color + " shadow-md transform scale-105"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => handleFilterChange(btn.key)}
                  >
                    {btn.label}
                  </button>
                ))}
                {activeFilter === "type" && (
                  <select
                    className="rounded-xl px-4 py-2.5 font-semibold text-base bg-white border-2 border-gray-300 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                    value={activityType}
                    onChange={(e) => handleActivityTypeChange(e.target.value)}
                  >
                    <option value="update">Update</option>
                    <option value="create">Create</option>
                    <option value="delete">Delete</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          {activeFilter === "date" && (
            <div className="bg-white border-b border-gray-200">
              <ModernDateRangePicker
                value={pendingDateRange}
                onChange={handleDateRangeChange}
                onGo={handleGoClick}
                onSetLastMonth={handleSetLastMonth}
              />
            </div>
          )}

          {/* Activity Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-lg text-gray-600">
                    Loading user activities...
                  </span>
                </div>
              )}

              {error && (
                <div className="text-center text-red-500 py-12">
                  <div className="text-lg font-medium">
                    Error loading activities
                  </div>
                  <div className="text-sm mt-1">{error}</div>
                  <button
                    onClick={fetchActivities}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && activityGroups.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium">
                    No user activities found
                  </div>
                  <div className="text-sm mt-1">
                    {activeFilter === "type"
                      ? `No ${activityType} activities found for the selected criteria`
                      : "No user activities match your current filter criteria"}
                  </div>
                  <div className="text-xs mt-2 text-gray-400">
                    Try adjusting your filters or date range
                  </div>
                </div>
              )}

              {!loading && !error && activityGroups.length > 0 && (
                <div className="space-y-8">
                  {activityGroups.map((group, groupIdx) => (
                    <div key={group.range} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {group.range}
                        </h3>
                        <div className="flex-1 h-px bg-gray-300"></div>
                      </div>
                      <div className="space-y-4">
                        {group.entries.map((entry, idx) => (
                          <div key={entry.id} className="relative flex gap-4">
                            {/* Timeline */}
                            <div className="relative flex flex-col items-center">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-300 shadow-sm">
                                <div
                                  className={`${entry.iconBg} rounded-full p-2 text-white`}
                                >
                                  {entry.icon}
                                </div>
                              </div>
                              <div
                                className="absolute top-3 left-1/2 transform -translate-x-0.5 text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap"
                                style={{ top: "50px" }}
                              >
                                {entry.time}
                              </div>
                              {!(
                                groupIdx === activityGroups.length - 1 &&
                                idx === group.entries.length - 1
                              ) && (
                                <div
                                  className="absolute w-0.5 bg-gray-300 left-1/2 transform -translate-x-0.5 bottom-0 h-6"
                                  style={{ top: "60px" }}
                                />
                              )}
                            </div>

                            {/* Activity Card */}
                            <div
                              className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 cursor-pointer group"
                              onClick={() =>
                                handleActivityClick(entry.originalActivity)
                              }
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                {/* User Info */}
                                <div className="flex items-center gap-3 sm:min-w-0 sm:w-48">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-gray-900 text-sm truncate">
                                      {entry.user.email}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {entry.user.role}
                                    </div>
                                  </div>
                                </div>

                                {/* Activity Description */}
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <div className="text-sm text-gray-700 leading-relaxed break-words">
                                    {entry.description}
                                  </div>
                                  {entry.originalActivity.changes &&
                                    entry.originalActivity.changes.length >
                                      1 && (
                                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors ml-2 flex-shrink-0" />
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
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Pagination Info */}
                {!loading && !error && activities.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({activities.length}{" "}
                    activities)
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1)
                        )
                      }
                      disabled={currentPage === totalPages || loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Save Button */}
                <Button className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Activity Details Modal */}
          <ActivityDetailsModal
            open={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedActivity(null);
            }}
            activity={selectedActivity}
          />
        </div>
      </div>
    </>
  );
}
