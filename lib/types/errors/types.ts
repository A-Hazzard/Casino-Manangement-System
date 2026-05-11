export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isConnectionError?: boolean;
};
