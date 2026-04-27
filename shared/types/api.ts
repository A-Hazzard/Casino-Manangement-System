export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

export type ClientErrorPayload = {
  message: string;
  stack?: string;
  componentStack?: string;
  context: 'window' | 'react' | 'promise';
  url: string;
  userAgent: string;
  timestamp: string;
};
