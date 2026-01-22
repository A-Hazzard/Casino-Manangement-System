// Standardized API response utilities

import { NextResponse } from 'next/server';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '@/shared/types/api';

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  code?: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      message: error,  // Include 'message' field for frontend compatibility
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}


/**
 * Creates a standardized server error response
 */
export function createServerErrorResponse(
  message: string = 'Internal server error',
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 500, 'INTERNAL_SERVER_ERROR', details);
}

/**
 * Creates a standardized bad request response
 */
export function createBadRequestResponse(
  message: string = 'Bad request',
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 400, 'BAD_REQUEST', details);
}


