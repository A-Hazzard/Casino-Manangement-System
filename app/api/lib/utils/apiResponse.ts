// Standardized API response utilities

import { NextResponse } from "next/server";
import type { 
  ApiResponse, 
  ApiErrorResponse, 
  PaginatedApiResponse, 
  ValidationErrorResponse 
} from "@/shared/types/api";

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
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Creates a standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  },
  message?: string,
  status: number = 200
): NextResponse<PaginatedApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Creates a standardized validation error response
 */
export function createValidationErrorResponse(
  validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>,
  status: number = 400
): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      validationErrors,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Creates a standardized not found response
 */
export function createNotFoundResponse(
  resource: string = "Resource"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    `${resource} not found`,
    404,
    "NOT_FOUND"
  );
}

/**
 * Creates a standardized unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = "Unauthorized access"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message,
    401,
    "UNAUTHORIZED"
  );
}

/**
 * Creates a standardized forbidden response
 */
export function createForbiddenResponse(
  message: string = "Forbidden access"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message,
    403,
    "FORBIDDEN"
  );
}

/**
 * Creates a standardized server error response
 */
export function createServerErrorResponse(
  message: string = "Internal server error",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message,
    500,
    "INTERNAL_SERVER_ERROR",
    details
  );
}

/**
 * Creates a standardized bad request response
 */
export function createBadRequestResponse(
  message: string = "Bad request",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message,
    400,
    "BAD_REQUEST",
    details
  );
}

/**
 * Creates a standardized conflict response
 */
export function createConflictResponse(
  message: string = "Conflict",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message,
    409,
    "CONFLICT",
    details
  );
}
