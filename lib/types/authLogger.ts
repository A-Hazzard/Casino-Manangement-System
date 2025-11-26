/**
 * Auth Logger Types
 * Types for authentication logging and audit trails.
 *
 * Tracks authentication events including login attempts, token operations,
 * and security-related actions with IP addresses and user agents.
 */
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
