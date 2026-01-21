/**
 * Standardized API Response Utilities
 *
 * Success Response Format:
 * {
 *   success: true,
 *   data: { ... },
 *   meta?: { page, total, ... }
 * }
 *
 * Error Response Format:
 * {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Human readable message',
 *     details?: { ... }
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Authentication & Authorization (401, 403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_JSON: 'INVALID_JSON',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource (404, 409)
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate Limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server Errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Business Logic (400)
  INVALID_OPERATION: 'INVALID_OPERATION',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

/**
 * Success response with data
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Error response with details
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Create a standardized success response
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: PaginationMeta
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = {
      ...meta,
      hasMore: meta.page < meta.totalPages,
    };
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized error response
 */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Pre-built error responses
 */
export const ApiErrors = {
  // 401 Unauthorized
  unauthorized: (message = 'Authentication required') =>
    apiError(ErrorCodes.UNAUTHORIZED, message, 401),

  invalidToken: (message = 'Invalid or expired token') =>
    apiError(ErrorCodes.INVALID_TOKEN, message, 401),

  // 403 Forbidden
  forbidden: (message = 'You do not have permission to perform this action') =>
    apiError(ErrorCodes.FORBIDDEN, message, 403),

  insufficientPermissions: (required?: string) =>
    apiError(
      ErrorCodes.INSUFFICIENT_PERMISSIONS,
      required
        ? `Missing required permission: ${required}`
        : 'Insufficient permissions',
      403
    ),

  // 404 Not Found
  notFound: (resource = 'Resource') =>
    apiError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  // 409 Conflict
  alreadyExists: (resource = 'Resource') =>
    apiError(ErrorCodes.ALREADY_EXISTS, `${resource} already exists`, 409),

  conflict: (message: string) => apiError(ErrorCodes.CONFLICT, message, 409),

  // 429 Rate Limited
  rateLimited: (retryAfter?: number) =>
    apiError(
      ErrorCodes.RATE_LIMITED,
      'Too many requests. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  // 400 Bad Request
  validationError: (details?: Record<string, unknown>) =>
    apiError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details),

  invalidInput: (message: string, details?: Record<string, unknown>) =>
    apiError(ErrorCodes.INVALID_INPUT, message, 400, details),

  invalidJson: () =>
    apiError(ErrorCodes.INVALID_JSON, 'Invalid JSON in request body', 400),

  invalidOperation: (message: string) =>
    apiError(ErrorCodes.INVALID_OPERATION, message, 400),

  quotaExceeded: (resource: string) =>
    apiError(ErrorCodes.QUOTA_EXCEEDED, `${resource} quota exceeded`, 400),

  // 500 Internal Server Error
  internalError: (message = 'An unexpected error occurred') =>
    apiError(ErrorCodes.INTERNAL_ERROR, message, 500),

  databaseError: (message = 'Database operation failed') =>
    apiError(ErrorCodes.DATABASE_ERROR, message, 500),

  externalServiceError: (service: string) =>
    apiError(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      `External service error: ${service}`,
      500
    ),
};

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: ZodError): NextResponse<ErrorResponse> {
  const details: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(err.message);
  });

  return apiError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, {
    fields: details,
  });
}

/**
 * Handle common errors in API routes
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Zod validation error
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // JSON parse error
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return ApiErrors.invalidJson();
  }

  // Known error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Not found patterns
    if (message.includes('not found')) {
      return ApiErrors.notFound();
    }

    // Already exists patterns
    if (message.includes('already exists') || message.includes('duplicate')) {
      return ApiErrors.alreadyExists();
    }

    // Permission denied patterns
    if (
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('not allowed')
    ) {
      return ApiErrors.forbidden(error.message);
    }

    // Rate limit patterns
    if (message.includes('rate limit') || message.includes('too many')) {
      return ApiErrors.rateLimited();
    }
  }

  // Default: internal server error
  console.error('Unhandled API error:', error);
  return ApiErrors.internalError();
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): NextResponse<SuccessResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return apiSuccess(data, 200, {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages,
    hasMore: pagination.page < totalPages,
  });
}
