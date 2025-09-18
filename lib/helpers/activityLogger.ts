import axios from "axios";
import { useUserStore } from "@/lib/store/userStore";

export type ActivityAction = "create" | "update" | "delete" | "view";
export type ActivityResource =
  | "user"
  | "licensee"
  | "member"
  | "location"
  | "machine"
  | "session"
  | "movement-request";

export type ActivityLogData = {
  action: "create" | "update" | "delete" | "login" | "logout";
  resource: ActivityResource;
  resourceId: string;
  resourceName?: string;
  details?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  username?: string;

  userRole?: string;
};

/**
 * Logs user activity for audit purposes
 * This function sends activity data to the activity log API
 */
export async function logActivity(
  activityData: ActivityLogData
): Promise<void> {
  try {
    // Get user information from store
    const user = useUserStore.getState().user;



    
    // Get client information
    const clientInfo = {
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
    };

    const logEntry = {
      ...activityData,
      ...clientInfo,
      userId: activityData.userId || user?._id || "unknown",
      username: activityData.username || user?.emailAddress || "unknown",

      userRole: activityData.userRole || user?.roles?.[0] || "user",

      timestamp: new Date().toISOString(),
    };

    await axios.post("/api/activity-logs", logEntry);
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Get client IP address (best effort)
 * The server-side API will capture the real IP from request headers
 */
async function getClientIP(): Promise<string> {
  try {
    // The client-side can't reliably get the real IP address
    // The server-side API will capture the real IP from request headers
    // This is just a placeholder - the actual IP will be captured server-side
    return "client-side"; // Server will replace this with real IP
  } catch {
    return "unknown";
  }
}


/**
 * Generate a detailed description with "from" and "to" values
 */
function generateDetailedDescription(
  action: string,
  resource: string,
  resourceName: string,
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
): string {
  if (action === "create") {
    return `Created new ${resource}: ${resourceName}`;
  }

  if (action === "delete") {
    return `Deleted ${resource}: ${resourceName}`;
  }

  if (action === "update" && changes && changes.length > 0) {
    if (changes.length === 1) {
      const change = changes[0];

      return `Updated ${resource} "${resourceName}": changed ${
        change.field
      } from "${String(change.oldValue || "empty")}" to "${String(
        change.newValue || "empty"
      )}"`;
    } else {
      const changeDescriptions = changes.map(
        (change) =>
          `${change.field}: "${String(change.oldValue || "empty")}" → "${String(
            change.newValue || "empty"
          )}"`
      );
      return `Updated ${resource} "${resourceName}": ${changeDescriptions.join(
        ", "
      )}`;
    }
  }

  return `Updated ${resource}: ${resourceName}`;
}

/**
 * Helper function to create activity log entries for CRUD operations
 */
export const createActivityLogger = (resource: ActivityResource) => {
  return {
    logCreate: (
      resourceId: string,
      resourceName: string,
      newData: Record<string, unknown>,
      details?: string
    ) =>
      logActivity({
        action: "create",
        resource,
        resourceId,
        resourceName,
        newData,
        details: details || generateDetailedDescription("create", resource, resourceName),
      }),

    logUpdate: (
      resourceId: string,
      resourceName: string,
      previousData: Record<string, unknown>,
      newData: Record<string, unknown>,
      details?: string
    ) => {
      return logActivity({
        action: "update",
        resource,
        resourceId,
        resourceName,
        previousData,
        newData,
        details: details || generateDetailedDescription("update", resource, resourceName),
      });
    },

    logDelete: (
      resourceId: string,
      resourceName: string,
      previousData: Record<string, unknown>,
      details?: string
    ) =>
      logActivity({
        action: "delete",
        resource,
        resourceId,
        resourceName,
        previousData,
        details: details || generateDetailedDescription("delete", resource, resourceName),
      }),
  };
};
