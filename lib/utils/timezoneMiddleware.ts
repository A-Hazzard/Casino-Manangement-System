/**
 * Timezone Middleware for API Responses
 *
 * Middleware-style helpers that automatically convert all date fields
 * in API responses from UTC to Trinidad local time (UTC-4).
 *
 * Features:
 * - JSON response helpers with timezone conversion
 * - Success and error response helpers
 * - Paginated response helper
 */

import { NextResponse } from 'next/server';
import { convertResponseToTrinidadTime } from './timezone';

// ============================================================================
// Response Helpers
// ============================================================================
/**
 * Creates a NextResponse with automatic timezone conversion for date fields.
 * @param data - Response data (object or array).
 * @param options - NextResponse options (status, headers, etc.).
 * @param additionalDateFields - Additional date field names to convert.
 * @returns NextResponse with Trinidad time converted dates.
 */
export function createTrinidadTimeResponse<T>(
  data: T,
  options?: {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  },
  additionalDateFields: string[] = []
): NextResponse {
  const convertedData = convertResponseToTrinidadTime(
    data,
    additionalDateFields
  );

  return NextResponse.json(convertedData, options);
}

/**
 * Success response helper with automatic timezone conversion
 * @param data - Response data
 * @param message - Optional success message
 * @param additionalDateFields - Additional date fields to convert
 * @returns NextResponse with success format and Trinidad time
 */
export function successResponse<T>(
  data: T,
  message?: string,
  additionalDateFields: string[] = []
): NextResponse {
  const responseData = {
    success: true,
    ...(message && { message }),
    data: convertResponseToTrinidadTime(data, additionalDateFields),
  };

  return NextResponse.json(responseData);
}

/**
 * Error response helper (no timezone conversion needed for errors)
 * @param error - Error message
 * @param status - HTTP status code
 * @param details - Additional error details
 * @returns NextResponse with error format
 */
export function errorResponse(
  error: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse {
  const responseData = {
    success: false,
    error,
    ...(details && { details }),
  };

  return NextResponse.json(responseData, { status });
}

/**
 * Paginated response helper with automatic timezone conversion
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param additionalDateFields - Additional date fields to convert
 * @returns NextResponse with paginated format and Trinidad time
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  },
  additionalDateFields: string[] = []
): NextResponse {
  const responseData = {
    success: true,
    data: {
      items: convertResponseToTrinidadTime(data, additionalDateFields),
      pagination,
    },
  };

  return NextResponse.json(responseData);
}

/**
 * Example usage in API routes:
 *
 * ```typescript
 * import { successResponse, errorResponse, paginatedResponse } from "@/app/api/lib/utils/timezoneMiddleware";
 *
 * export async function GET() {
 *   try {
 *     const users = await User.find();
 *     return successResponse(users, "Users fetched successfully");
 *   } catch (error) {
 *     return errorResponse("Failed to fetch users", 500);
 *   }
 * }
 *
 * export async function GET(request: NextRequest) {
 *   try {
 *     const activities = await ActivityLog.find().limit(50);
 *     const totalCount = await ActivityLog.countDocuments();
 *
 *     return paginatedResponse(
 *       activities,
 *       {
 *         currentPage: 1,
 *         totalPages: Math.ceil(totalCount / 50),
 *         totalCount,
 *         hasNextPage: totalCount > 50,
 *         hasPrevPage: false,
 *         limit: 50,
 *       }
 *     );
 *   } catch (error) {
 *     return errorResponse("Failed to fetch activities", 500);
 *   }
 * }
 * ```
 */
