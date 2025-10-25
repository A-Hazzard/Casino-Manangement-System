export type AuthLogEntry = {
  action: string;
  userId?: string;
  email?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};
