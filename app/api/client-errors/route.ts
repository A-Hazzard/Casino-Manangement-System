/**
 * POST /api/client-errors
 *
 * Receives client-side runtime errors (window errors, unhandled promise
 * rejections, and React component crashes) and writes them to the server
 * console so they appear in deployment/platform logs alongside server errors.
 * Called automatically by GlobalErrorBoundary — no frontend page invokes
 * this directly. No authentication required; the payload contains no
 * sensitive user data.
 *
 * Body fields:
 * @param message        {string} Required. The error message string.
 * @param context        {string} Required. Error origin: 'window', 'react', or 'promise'.
 * @param url            {string} Required. The page URL where the error occurred.
 * @param userAgent      {string} Required. Browser user-agent string from the client.
 * @param timestamp      {string} Required. ISO timestamp of when the error was captured.
 * @param stack          {string} Optional. JavaScript stack trace from the Error object.
 * @param componentStack {string} Optional. React component stack trace (only present for
 *   React render errors caught by an error boundary).
 *
 * @module app/api/client-errors/route
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ClientErrorPayload } from '@/shared/types/api';

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
