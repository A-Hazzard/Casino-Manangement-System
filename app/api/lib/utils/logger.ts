import { NextRequest } from 'next/server';

import type { LogContext, LogResult } from '@/lib/types/common';

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
    return success ? 'INFO' : 'ERROR';
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

  logSuccess(
    context: LogContext,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const result: LogResult = {
      success: true,
      message,
      duration: this.getDuration(),
      timestamp: this.formatTimestamp(),
      context,
      data,
    };

    // Log to console in development, could be replaced with proper logging service
    if (process.env.NODE_ENV === 'development') {
      console.warn(this.formatMessage(result));
    }
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
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      params: Object.keys(params).length > 0 ? params : undefined,
    };
  }
}

export const apiLogger = new APILogger();
