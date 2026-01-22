"use client";

import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
type ConnectionErrorProps = {
  error?: Error | string;
  onRetry?: () => void;
  isRetrying?: boolean;
  title?: string;
  description?: string;
  showRetryButton?: boolean;
  className?: string;
};

/**
 * ConnectionError component for displaying database connection issues
 *
 * @param error - The error object or error message
 * @param onRetry - Function to call when retry button is clicked
 * @param isRetrying - Whether a retry operation is currently in progress
 * @param title - Custom title for the error
 * @param description - Custom description for the error
 * @param showRetryButton - Whether to show the retry button
 * @param className - Additional CSS classes
 */
export default function ConnectionError({
  error,
  onRetry,
  isRetrying = false,
  title = "Connection Issue",
  description = "We're experiencing connectivity issues with our database. This might be due to network problems or server maintenance.",
  showRetryButton = true,
  className = "",
}: ConnectionErrorProps) {

  const getErrorMessage = () => {
    if (typeof error === "string") return error;
    if (error instanceof Error) {
      // Handle specific MongoDB errors
      if (error.message.includes("timeout")) {
        return "The database connection timed out. This usually happens when the server is under heavy load.";
      }
      if (error.message.includes("connection")) {
        return "Unable to connect to the database. Please check your internet connection.";
      }
      if (error.message.includes("network")) {
        return "Network error occurred while connecting to the database.";
      }
      return error.message;
    }
    return "An unexpected error occurred while connecting to the database.";
  };

  const getErrorIcon = () => {
    const errorMessage = getErrorMessage().toLowerCase();
    if (errorMessage.includes("timeout")) {
      return <Wifi className="h-8 w-8 text-yellow-500" />;
    }
    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("network")
    ) {
      return <WifiOff className="h-8 w-8 text-red-500" />;
    }
    return <AlertTriangle className="h-8 w-8 text-orange-500" />;
  };

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">{getErrorIcon()}</div>
        <CardTitle className="text-orange-800">{title}</CardTitle>
        <CardDescription className="text-orange-700">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="text-sm text-red-800 bg-red-50 p-3 rounded-md max-h-96 overflow-y-auto">
          <strong className="text-red-700">Error Details:</strong>{" "}
          {getErrorMessage()}
          {error instanceof Error && error.stack && (
            <div className="mt-3">
              <strong className="text-red-700">Stack Trace:</strong>
              <pre className="mt-2 text-xs whitespace-pre-wrap font-mono bg-gray-800 text-gray-100 p-2 rounded border">
                {error.stack}
              </pre>
            </div>
          )}
        </div>

        {showRetryButton && onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-orange-600">
          <p>If this problem persists, please:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check your internet connection</li>
            <li>Wait a few minutes and try again</li>
            <li>Contact support if the issue continues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


