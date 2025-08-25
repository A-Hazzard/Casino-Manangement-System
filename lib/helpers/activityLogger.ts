import axios from "axios";

export type ActivityAction = "create" | "update" | "delete" | "view";
export type ActivityResource =
  | "user"
  | "licensee"
  | "member"
  | "location"
  | "machine"
  | "session";

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
}

/**
 * Logs user activity for audit purposes
 * This function sends activity data to the activity log API
 */
export async function logActivity(
  activityData: ActivityLogData
): Promise<void> {
  try {
    // Get client information
    const clientInfo = {
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
    };

    const logEntry = {
      ...activityData,
      ...clientInfo,
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
 */
async function getClientIP(): Promise<string> {
  try {
    // In a real implementation, you might want to use a service to get the real IP
    // For now, we'll use a placeholder or try to get it from headers
    return "client-ip"; // Placeholder - the server should capture the real IP
  } catch {
    return "unknown";
  }
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
        details: details || `Created new ${resource}: ${resourceName}`,
      }),

    logUpdate: (
      resourceId: string,
      resourceName: string,
      previousData: Record<string, unknown>,
      newData: Record<string, unknown>,
      details?: string
    ) =>
      logActivity({
        action: "update",
        resource,
        resourceId,
        resourceName,
        previousData,
        newData,
        details: details || `Updated ${resource}: ${resourceName}`,
      }),

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
        details: details || `Deleted ${resource}: ${resourceName}`,
      }),
  };
};
