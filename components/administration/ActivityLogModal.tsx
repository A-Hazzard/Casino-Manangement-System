import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import {
  X,
  IdCard,
  Settings,
  Building2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import ActivityDetailsModal from "@/components/administration/ActivityDetailsModal";
import { DateRange as RDPDateRange } from "react-day-picker";
import type { ActivityLog } from "@/app/api/lib/types/activityLog";
import { format } from "date-fns";
import { ReactNode } from "react";

type ActivityLogModalProps = {
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
      return { icon: <Building2 className="w-4 h-4" />, bg: "bg-blue-500" };
    case "update":
    case "edit":
      return { icon: <Settings className="w-4 h-4" />, bg: "bg-green-500" };
    case "delete":
      return { icon: <X className="w-4 h-4" />, bg: "bg-red-500" };
    case "payment":
      return { icon: <IdCard className="w-4 h-4" />, bg: "bg-purple-500" };
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
          for licensee{" "}
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
          created a new licensee{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span>
        </>
      );
    case "delete":
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          deleted the licensee{" "}
          <span className="text-blue-600 font-semibold">{entityName}</span>
        </>
      );
    case "payment":
      return (
        <>
          <span className="font-semibold text-gray-800">{actorEmail}</span>{" "}
          processed payment for{" "}
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

export default function ActivityLogModal({
  open,
  onClose,
}: ActivityLogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activityType, setActivityType] = useState("update");
  const [dateRange, setDateRange] = useState<RDPDateRange | undefined>(
    undefined
  );
  const [pendingDateRange, setPendingDateRange] = useState<
    RDPDateRange | undefined
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

  const handleGoClick = () => {
    setDateRange(pendingDateRange);
    setCurrentPage(1);
  };

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        entityType: "Licensee",
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
      });

        params.append("actionType", activityType.toUpperCase());

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
        throw new Error(data.message || "An unknown error occurred");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activityType, dateRange, currentPage]);

  useEffect(() => {
      fetchActivities();
  }, [fetchActivities]);

  const groupedActivities = useMemo(() => groupActivitiesByDate(activities), [
    activities,
  ]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
        <div
          ref={modalRef}
        className="bg-gray-50 rounded-2xl shadow-2xl w-[95%] h-[95%] max-w-4xl flex flex-col overflow-hidden border border-gray-200"
        >
          {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <IdCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Activity Log
              </h2>
              <p className="text-sm text-gray-500">
                Recent activities of all licensees
              </p>
            </div>
          </div>
            <button
              onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
            <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

        {/* Filters */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
              {["create", "update", "delete", "payment"].map((type) => (
                <Button
                  key={type}
                  variant={activityType === type ? "default" : "ghost"}
                  onClick={() => handleActivityTypeChange(type)}
                  className={`capitalize px-4 py-2 text-sm rounded-md ${
                    activityType === type
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {type}
                </Button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <ModernDateRangePicker
                value={pendingDateRange}
                onChange={setPendingDateRange}
                onGo={handleGoClick}
                onSetLastMonth={() => {
                  const now = new Date();
                  const firstDayLastMonth = new Date(
                    now.getFullYear(),
                    now.getMonth() - 1,
                    1
                  );
                  const lastDayLastMonth = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    0
                  );
                  setPendingDateRange({
                    from: firstDayLastMonth,
                    to: lastDayLastMonth,
                  });
                }}
              />
            </div>
                  </div>
                </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
                <div className="space-y-8">
              {groupedActivities.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="sticky top-0 bg-gray-50 py-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-600">
                          {group.range}
                        </h3>
                      </div>
                  <ul className="space-y-4">
                    {group.entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleActivityClick(entry.originalActivity)}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white ${entry.iconBg}`}
                                >
                                  {entry.icon}
                                </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            {entry.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                                {entry.time}
                          </p>
                                  </div>
                                  {entry.originalActivity.changes &&
                          entry.originalActivity.changes.length > 1 && (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                      </li>
                        ))}
                  </ul>
                    </div>
                  ))}
                </div>
              )}
          </div>

        {/* Pagination */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
                  >
                    Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
                  </span>
            <Button
              variant="outline"
              size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
              disabled={currentPage === totalPages}
                  >
                    Next
              </Button>
          </div>
        </div>
      </div>
      {selectedActivity && (
      <ActivityDetailsModal
        open={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        activity={selectedActivity}
      />
      )}
    </div>
  );
}

