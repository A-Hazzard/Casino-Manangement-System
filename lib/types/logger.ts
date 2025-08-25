// Logger types for API logging functionality

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
