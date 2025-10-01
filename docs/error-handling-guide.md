# Error Handling System Guide

## Overview

The Evolution One CMS now includes a comprehensive error handling system that gracefully manages MongoDB connection timeouts and other API errors across all pages.

## 🚀 Features

### 1. **Automatic Error Detection**
- Detects MongoDB connection timeouts
- Identifies network errors
- Handles server unavailability
- Classifies error types for appropriate handling

### 2. **User-Friendly Error Messages**
- Clear, non-technical error descriptions
- Context-aware error messages
- Helpful troubleshooting suggestions
- Support contact information

### 3. **Automatic Retry Logic**
- Exponential backoff (1s, 2s, 4s, 8s...)
- Configurable max retries (default: 3)
- Smart retry decisions based on error type
- Timeout handling (30s default)

### 4. **Toast Notifications**
- Real-time error notifications
- Success messages when connection restored
- Retry attempt notifications
- Non-intrusive user feedback

## 📁 File Structure

```
components/ui/errors/
├── ConnectionError.tsx          # User-friendly error display
├── ErrorBoundary.tsx           # React error boundary
├── PageErrorBoundary.tsx       # Page-level error handling
└── withErrorHandling.tsx       # HOC for error handling

lib/utils/
├── errorHandling.ts            # Error classification & utilities
├── errorNotifications.ts       # Toast notification system
└── apiClient.ts               # Enhanced axios with retry logic

lib/hooks/data/
├── useApiWithRetry.ts          # Custom hook with retry logic
└── useGlobalErrorHandler.ts   # Global error handler hook
```

## 🔧 Implementation

### 1. **Page-Level Error Handling**

All pages are now wrapped with `PageErrorBoundary`:

```tsx
export default function MyPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <MyPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
```

### 2. **API Call Error Handling**

Use the global error handler for API calls:

```tsx
import { useGlobalErrorHandler } from "@/lib/hooks/data/useGlobalErrorHandler";

function MyComponent() {
  const { handleApiCallWithRetry } = useGlobalErrorHandler();
  
  const fetchData = async () => {
    const { data, error } = await handleApiCallWithRetry(
      () => fetch('/api/my-endpoint'),
      "My Data"
    );
    
    if (error) {
      // Error is automatically handled and user notified
      return;
    }
    
    // Use data...
  };
}
```

### 3. **Custom Error Handling**

For specific error handling needs:

```tsx
import { useErrorHandling } from "@/components/ui/errors/withErrorHandling";

function MyComponent() {
  const { error, handleError, handleRetry } = useErrorHandling();
  
  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/endpoint');
      // Handle success...
    } catch (err) {
      handleError(err);
    }
  };
  
  if (error) {
    return <ConnectionError error={error} onRetry={handleRetry} />;
  }
  
  return <div>My content...</div>;
}
```

## 🎯 Error Types Handled

### 1. **MongoDB Connection Timeouts**
- **Error**: `MongoNetworkTimeoutError`
- **Message**: "Database connection timed out. The server may be experiencing high load."
- **Action**: Automatic retry with exponential backoff

### 2. **Server Unavailable**
- **Error**: `MongooseServerSelectionError`
- **Message**: "Unable to connect to the database server. Please check your connection."
- **Action**: Automatic retry with user notification

### 3. **Network Errors**
- **Error**: Network connectivity issues
- **Message**: "Network error occurred. Please check your internet connection."
- **Action**: User notification with retry option

### 4. **Generic API Errors**
- **Error**: HTTP 500, 502, 503, 504
- **Message**: Context-aware error messages
- **Action**: Automatic retry for retryable errors

## 🔄 Retry Logic

### Automatic Retry Conditions
- Connection timeouts
- Server unavailable (503)
- Network errors
- Temporary server errors (502, 504)

### Retry Strategy
- **Max Retries**: 3 attempts
- **Base Delay**: 1 second
- **Backoff**: Exponential (1s, 2s, 4s, 8s...)
- **Timeout**: 30 seconds per request

### Retry Decision Logic
```typescript
function isRetryableError(error: ApiError): boolean {
  return !!(
    error.isTimeoutError ||
    error.isConnectionError ||
    error.isNetworkError ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}
```

## 📱 User Experience

### 1. **Error Display**
- Clean, professional error UI
- Clear error messages
- Retry buttons
- Support contact information

### 2. **Loading States**
- Skeleton loaders during retries
- Progress indicators
- Non-blocking error handling

### 3. **Notifications**
- Toast notifications for errors
- Success messages when resolved
- Retry attempt notifications
- Non-intrusive feedback

## 🧪 Testing Error Handling

### 1. **Simulate Connection Issues**
```bash
# Block MongoDB connection
sudo iptables -A OUTPUT -d <mongodb-ip> -j DROP

# Test the application
# Should show connection error with retry option
```

### 2. **Test Retry Logic**
- Monitor network tab for retry attempts
- Check exponential backoff timing
- Verify user notifications

### 3. **Test Error Recovery**
- Restore connection after error
- Verify success notifications
- Check data loading resumes

## 🚨 Common Error Scenarios

### 1. **MongoDB Timeout (Most Common)**
```
Error: MongoNetworkTimeoutError: connection 3 to 147.182.210.65:32017 timed out
```
**Handling**: Automatic retry with user notification

### 2. **Server Selection Error**
```
Error: MongooseServerSelectionError: Server selection timeout
```
**Handling**: Automatic retry with exponential backoff

### 3. **Network Connectivity**
```
Error: NetworkError: Failed to fetch
```
**Handling**: User notification with retry option

## 📊 Monitoring & Debugging

### 1. **Development Logging**
```typescript
if (process.env.NODE_ENV === "development") {
  console.error("API Error:", {
    original: error,
    classified: apiError,
    context: "Dashboard Data"
  });
}
```

### 2. **Error Classification**
```typescript
const apiError = classifyError(error);
// Returns: { message, isTimeoutError, isConnectionError, isNetworkError, status }
```

### 3. **Retry Tracking**
```typescript
onRetry: (attempt, apiError) => {
  console.warn(`Retry attempt ${attempt}:`, apiError);
  showRetryWarningNotification(attempt, maxRetries, context);
}
```

## 🔧 Configuration

### 1. **Retry Settings**
```typescript
const { data, error } = await handleApiCallWithRetry(
  () => fetch('/api/endpoint'),
  "Context Name",
  3 // maxRetries
);
```

### 2. **Timeout Settings**
```typescript
const apiClient = axios.create({
  timeout: 60000, // 30 seconds
});
```

### 3. **Notification Settings**
```typescript
toast.error("Connection Timeout", {
  description: "Database is experiencing high load",
  duration: 8000,
  action: {
    label: "Retry",
    onClick: () => window.location.reload(),
  },
});
```

## 🎉 Benefits

1. **Improved User Experience**
   - No more blank screens on errors
   - Clear error messages
   - Automatic recovery

2. **Reduced Support Tickets**
   - Self-healing system
   - Clear error guidance
   - Automatic retry logic

3. **Better Monitoring**
   - Error classification
   - Retry tracking
   - User feedback

4. **Developer Experience**
   - Consistent error handling
   - Easy to implement
   - Comprehensive logging

## 🚀 Next Steps

1. **Monitor Error Rates**
   - Track connection timeout frequency
   - Monitor retry success rates
   - Identify patterns

2. **Optimize Retry Logic**
   - Adjust retry counts based on data
   - Fine-tune backoff timing
   - Add circuit breaker pattern

3. **Enhanced Error Reporting**
   - Send errors to monitoring service
   - Track user impact
   - Improve error messages

---

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: December 19th, 2024
