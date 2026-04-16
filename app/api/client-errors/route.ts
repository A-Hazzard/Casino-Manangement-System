/**
 * Client Error Logging Route
 *
 * Receives client-side runtime errors (including React component stacks)
 * and logs them on the server so they are visible in deployment/platform logs.
 *
 * Called from GlobalErrorBoundary automatically when an error is caught.
 * No auth required — the payload contains no sensitive user data.
 *
 * @module app/api/client-errors/route
 */

import { NextRequest, NextResponse } from 'next/server';

type ClientErrorPayload = {
  message: string;
  stack?: string;
  componentStack?: string;
  context: 'window' | 'react' | 'promise';
  url: string;
  userAgent: string;
  timestamp: string;
};

/**
 * POST /api/client-errors
 * Logs a client-side error to the server console.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClientErrorPayload;

    const divider = '='.repeat(60);

    console.error(
      [
        `\n${divider}`,
        `[CLIENT ERROR] context=${body.context}`,
        `Time      : ${body.timestamp}`,
        `URL       : ${body.url}`,
        `UserAgent : ${body.userAgent}`,
        ``,
        `Message   : ${body.message}`,
        ``,
        `JS Stack Trace:`,
        body.stack ?? '(none)',
        ``,
        `React Component Stack:`,
        body.componentStack ?? '(none)',
        divider,
      ].join('\n')
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CLIENT ERROR] Failed to parse client error payload:', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
