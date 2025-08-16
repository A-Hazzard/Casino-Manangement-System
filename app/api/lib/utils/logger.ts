import { NextRequest } from "next/server";

export interface LogContext {
  endpoint: string;
  method: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  params?: Record<string, any>;
}

export interface LogResult {
  success: boolean;
  message: string;
  duration: number;
  timestamp: string;
  context: LogContext;
  error?: string;
  data?: any;
}

class APILogger {
  private startTime: number = 0;

  startLogging() {
    this.startTime = Date.now();
  }

  private getDuration(): number {
    return Date.now() - this.startTime;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private getLogLevel(success: boolean): string {
    return success ? "INFO" : "ERROR";
  }

  private formatMessage(result: LogResult): string {
    const duration = `${result.duration}ms`;
    const timestamp = `[${result.timestamp}]`;
    const level = `[${this.getLogLevel(result.success)}]`;
    const endpoint = `[${result.context.method} ${result.context.endpoint}]`;

    let message = `${timestamp} ${level} ${endpoint} ${duration} - ${result.message}`;

    if (result.context.userId) {
      message += ` (User: ${result.context.userId})`;
    }

    if (result.error) {
      message += ` | Error: ${result.error}`;
    }

    return message;
  }

  logSuccess(context: LogContext, message: string, data?: any): void {
    const result: LogResult = {
      success: true,
      message,
      duration: this.getDuration(),
      timestamp: this.formatTimestamp(),
      context,
      data,
    };

    console.log(this.formatMessage(result));
  }

  logError(context: LogContext, message: string, error?: string): void {
    const result: LogResult = {
      success: false,
      message,
      duration: this.getDuration(),
      timestamp: this.formatTimestamp(),
      context,
      error,
    };

    console.error(this.formatMessage(result));
  }

  createContext(request: NextRequest, endpoint: string): LogContext {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    return {
      endpoint,
      method: request.method,
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      params: Object.keys(params).length > 0 ? params : undefined,
    };
  }
}

export const apiLogger = new APILogger();

// Helper function to extract user info from request
export function extractUserInfo(request: NextRequest): {
  userId?: string;
  email?: string;
} {
  // This would need to be implemented based on your authentication system
  // For now, returning empty object
  return {};
}

// Decorator-style function for API endpoints
export function withLogging<R>(
  fn: (request: NextRequest) => Promise<R>,
  endpointName: string
) {
  return async (request: NextRequest): Promise<R> => {
    const context = apiLogger.createContext(request, endpointName);
    apiLogger.startLogging();

    try {
      const result = await fn(request);
      apiLogger.logSuccess(context, "Operation completed successfully");
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      apiLogger.logError(context, "Operation failed", errorMessage);
      throw error;
    }
  };
}
