import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, User, Building2, Calendar, Clock } from "lucide-react";
import gsap from "gsap";
import { format } from "date-fns";
import type { ActivityLog } from "@/app/api/lib/types/activityLog";
import { getIPDescription } from "@/lib/utils/ipAddress";

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
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  if (!open || !activity) return null;

  const getActionColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case "create":
        return "text-blue-600 bg-blue-50";
      case "update":
        return "text-green-600 bg-green-50";
      case "delete":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case "user":
        return <User className="w-5 h-5" />;
      case "licensee":
        return <Building2 className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const formatFieldName = (field: string) => {
    // Handle common field names with better labels
    const fieldLabels: { [key: string]: string } = {
      // Date fields
      startDate: "Start Date",
      expiryDate: "Expiry Date",
      endDate: "End Date",
      dateOfBirth: "Date of Birth",
      createdAt: "Created At",
      updatedAt: "Updated At",
      timestamp: "Timestamp",
      lastEdited: "Last Edited",
      // User fields
      username: "Username",
      emailAddress: "Email Address",
      firstName: "First Name",
      lastName: "Last Name",
      middleName: "Middle Name",
      otherName: "Other Name",
      profilePicture: "Profile Picture",
      isEnabled: "Account Status",
      // Licensee fields
      licenseKey: "License Key",
      isPaid: "Payment Status",
      prevStartDate: "Previous Start Date",
      prevExpiryDate: "Previous Expiry Date",
      // Common fields
      name: "Name",
      description: "Description",
      country: "Country",
      roles: "Roles",
      gender: "Gender",
      // Nested fields
      "address.street": "Street Address",
      "address.town": "Town/City",
      "address.region": "Region/State",
      "address.country": "Country",
      "address.postalCode": "Postal Code",
      "identification.dateOfBirth": "Date of Birth",
      "identification.idType": "ID Type",
      "identification.idNumber": "ID Number",
      "identification.notes": "Notes",
    };

    // Check if it's a known field
    if (fieldLabels[field]) {
      return fieldLabels[field];
    }

    // Convert camelCase and dot notation to readable format
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/\./g, " → ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: unknown, fieldName?: string) => {
    if (value === null || value === undefined) return "Not set";
    if (typeof value === "string" && value.trim() === "") return "Empty";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    // Check if the value is a date string (ISO format or Date object)
    if (typeof value === "string" || value instanceof Date) {
      const dateValue = typeof value === "string" ? value : value.toISOString();

      // Check if it's a valid ISO date string with time
      const isoDateTimeRegex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (isoDateTimeRegex.test(dateValue)) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            // For date-only fields, show just the date
            const dateOnlyFields = [
              "startDate",
              "expiryDate",
              "endDate",
              "dateOfBirth",
            ];
            if (fieldName && dateOnlyFields.includes(fieldName)) {
              return format(date, "MMMM d, yyyy");
            }
            // For timestamp fields, show date and time
            return format(date, "MMMM d, yyyy 'at' h:mm a");
          }
        } catch {}
      }

      // Check if it's a simple date string (YYYY-MM-DD)
      const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof value === "string" && simpleDateRegex.test(value)) {
        try {
          const date = new Date(value + "T00:00:00");
          if (!isNaN(date.getTime())) {
            // Format as readable date only
            return format(date, "MMMM d, yyyy");
          }
        } catch {}
      }

      // Check if it's a timestamp number (milliseconds since epoch)
      if (typeof value === "string" && /^\d{13}$/.test(value)) {
        try {
          const date = new Date(parseInt(value));
          if (!isNaN(date.getTime())) {
            return format(date, "MMMM d, yyyy 'at' h:mm a");
          }
        } catch {}
      }
    }

    // Handle numeric timestamps
    if (typeof value === "number" && value > 1000000000000) {
      // Likely a timestamp in milliseconds
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return format(date, "MMMM d, yyyy 'at' h:mm a");
        }
      } catch {}
    }

    return String(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative w-full h-full lg:max-w-4xl lg:max-h-[90vh] lg:rounded-2xl bg-background flex flex-col overflow-hidden border border-border"
        style={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <button
            className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${getActionColor(
                activity.actionType
              )}`}
            >
              {getEntityIcon(activity.entityType)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Activity Details
              </h2>
              <p className="text-gray-600 mt-1">
                {activity.entityType} • {activity.entity.name}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Activity Summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Performed by
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.actor.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {activity.actor.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Date</p>
                    <p className="text-sm text-gray-600">
                      {format(
                        new Date(activity.timestamp),
                        "EEEE, MMMM d, yyyy"
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Time</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(activity.timestamp), "h:mm:ss a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full ${getActionColor(
                      activity.actionType
                    )}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Action</p>
                    <p
                      className={`text-sm font-semibold capitalize ${
                        getActionColor(activity.actionType).split(" ")[0]
                      }`}
                    >
                      {activity.actionType.toLowerCase()}
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
                {activity.actionType.toLowerCase() === "create"
                  ? `Fields Created (${activity.changes.length})`
                  : activity.actionType.toLowerCase() === "delete"
                  ? `Fields Deleted (${activity.changes.length})`
                  : `Changes Made (${activity.changes.length})`}
              </h3>
              <div className="space-y-3">
                {activity.changes.map((change, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {formatFieldName(change.field)}
                        </h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Field {index + 1}
                        </span>
                      </div>
                      {activity.actionType.toLowerCase() === "create" ? (
                        // For CREATE operations, show only the created value
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Created Value
                          </p>
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm text-blue-800 font-mono break-all">
                              {formatValue(change.newValue, change.field)}
                            </p>
                          </div>
                        </div>
                      ) : activity.actionType.toLowerCase() === "delete" ? (
                        // For DELETE operations, show only the deleted value
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Deleted Value
                          </p>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-800 font-mono break-all">
                              {formatValue(change.oldValue, change.field)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // For UPDATE operations, show both old and new values
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Previous Value
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                              <p className="text-sm text-red-800 font-mono break-all">
                                {formatValue(change.oldValue, change.field)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              New Value
                            </p>
                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                              <p className="text-sm text-green-800 font-mono break-all">
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
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <User className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-600">
                No detailed changes recorded for this activity.
              </p>
              {activity.description && (
                <p className="text-sm text-gray-500 mt-2">
                  {activity.description}
                </p>
              )}
            </div>
          )}

          {/* Additional Info */}
          {activity.ipAddress && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <span className="font-medium">IP Address:</span>{" "}
                {getIPDescription(activity.ipAddress)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
