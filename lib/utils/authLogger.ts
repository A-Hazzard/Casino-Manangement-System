import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import type { AuthLogEntry } from "@/lib/types/authLogger";

export class AuthLogger {
  private static instance: AuthLogger;

  private constructor() {}

  static getInstance(): AuthLogger {
    if (!AuthLogger.instance) {
      AuthLogger.instance = new AuthLogger();
    }
    return AuthLogger.instance;
  }

  async logAuthEvent(
    action: string,
    details: string,
    success: boolean,
    userId?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const logEntry: AuthLogEntry = {
        action,
        userId,
        email,
        details,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: new Date(),
        success,
        errorMessage,
        metadata,
      };

      // Log to activity logger
      await logActivity({
        action,
        details: `${details}${errorMessage ? ` - Error: ${errorMessage}` : ""}`,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
        metadata: {
          ...metadata,
          success,
          userId,
          email,
          timestamp: logEntry.timestamp.toISOString(),
        },
      });

      // Also log to console for development
      if (process.env.NODE_ENV === "development") {
        console.warn("Auth Event:", {
          ...logEntry,
          timestamp: logEntry.timestamp.toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to log auth event:", error);
    }
  }

  async logLoginAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const action = success ? "login_success" : "login_failed";
    const details = success
      ? `Successful login attempt for ${email}`
      : `Failed login attempt for ${email}`;

    await this.logAuthEvent(
      action,
      details,
      success,
      undefined,
      email,
      ipAddress,
      userAgent,
      errorMessage,
      metadata
    );
  }

  async logLogout(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logAuthEvent(
      "logout",
      `User ${email} logged out`,
      true,
      userId,
      email,
      ipAddress,
      userAgent,
      undefined,
      metadata
    );
  }

  async logTokenRefresh(
    userId: string,
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    errorMessage?: string
  ): Promise<void> {
    const action = success ? "token_refresh_success" : "token_refresh_failed";
    const details = success
      ? `Token refreshed successfully for ${email}`
      : `Token refresh failed for ${email}`;

    await this.logAuthEvent(
      action,
      details,
      success,
      userId,
      email,
      ipAddress,
      userAgent,
      errorMessage
    );
  }

  async logPasswordReset(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    errorMessage?: string
  ): Promise<void> {
    const action = success
      ? "password_reset_requested"
      : "password_reset_failed";
    const details = success
      ? `Password reset requested for ${email}`
      : `Password reset failed for ${email}`;

    await this.logAuthEvent(
      action,
      details,
      success,
      undefined,
      email,
      ipAddress,
      userAgent,
      errorMessage
    );
  }

  async logAccountLocked(
    email: string,
    reason: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logAuthEvent(
      "account_locked",
      `Account locked for ${email}: ${reason}`,
      false,
      undefined,
      email,
      ipAddress,
      userAgent,
      reason,
      metadata
    );
  }

  async logAccountUnlocked(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logAuthEvent(
      "account_unlocked",
      `Account unlocked for ${email}`,
      true,
      userId,
      email,
      ipAddress,
      userAgent,
      undefined,
      metadata
    );
  }

  async logPermissionDenied(
    userId: string,
    email: string,
    resource: string,
    action: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.logAuthEvent(
      "permission_denied",
      `Access denied to ${resource} for ${email} (action: ${action})`,
      false,
      userId,
      email,
      ipAddress,
      userAgent,
      "Insufficient permissions",
      { resource, attemptedAction: action }
    );
  }

  async logSuspiciousActivity(
    email: string,
    activity: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logAuthEvent(
      "suspicious_activity",
      `Suspicious activity detected: ${activity} for ${email}`,
      false,
      undefined,
      email,
      ipAddress,
      userAgent,
      activity,
      metadata
    );
  }
}

// Export singleton instance
export const authLogger = AuthLogger.getInstance();

// Utility functions for common auth logging scenarios
export async function logLoginSuccess(
  email: string,
  ipAddress: string,
  userAgent: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await authLogger.logLoginAttempt(
    email,
    true,
    ipAddress,
    userAgent,
    undefined,
    metadata
  );
}

export async function logLoginFailure(
  email: string,
  ipAddress: string,
  userAgent: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await authLogger.logLoginAttempt(
    email,
    false,
    ipAddress,
    userAgent,
    errorMessage,
    metadata
  );
}

export async function logSecurityEvent(
  action: string,
  details: string,
  userId?: string,
  email?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await authLogger.logAuthEvent(
    action,
    details,
    false, // Security events are typically failures/concerns
    userId,
    email,
    ipAddress,
    userAgent,
    details,
    metadata
  );
}
