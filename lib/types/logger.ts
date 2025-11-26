/**
 * Logger Types
 * Types for API logging functionality and structured logging.
 *
 * Defines log context (endpoint, method, user info) and log result
 * structure with success status, timing, and error information.
 */

export type LogContext = {
  endpoint: string;
  method: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  params?: Record<string, string>;
};

export type LogResult = {
  success: boolean;
  message: string;
  duration: number;
  timestamp: string;
  context: LogContext;
  error?: string;
  data?: Record<string, unknown>;
};
