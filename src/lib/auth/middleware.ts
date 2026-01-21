import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  extractApiKey,
  validateApiKey,
  hasPermission,
  checkApiKeyRateLimit,
} from './api-key';
import { prisma } from '@/lib/db/prisma';

export type AuthContext = {
  type: 'session' | 'api-key';
  userId: string;
  userRole: string;
  permissions?: string[];
};

type AuthResult =
  | { success: true; context: AuthContext }
  | { success: false; error: string; status: number };

/**
 * Authenticate request via session or API key
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // First, try API key authentication
  const apiKey = extractApiKey(request);

  if (apiKey) {
    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid API key',
        status: 401,
      };
    }

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: validation.userId },
      select: { role: true },
    });

    return {
      success: true,
      context: {
        type: 'api-key',
        userId: validation.userId!,
        userRole: user?.role || 'USER',
        permissions: validation.permissions,
      },
    };
  }

  // Fall back to session authentication
  const session = await auth();

  if (!session?.user) {
    return {
      success: false,
      error: 'Unauthorized',
      status: 401,
    };
  }

  return {
    success: true,
    context: {
      type: 'session',
      userId: session.user.id,
      userRole: session.user.role,
    },
  };
}

/**
 * Require authentication middleware
 */
export function requireAuth() {
  return async (
    request: NextRequest
  ): Promise<{ context: AuthContext } | NextResponse> => {
    const result = await authenticateRequest(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return { context: result.context };
  };
}

/**
 * Require specific permission middleware
 */
export function requirePermission(required: string | string[]) {
  return async (
    request: NextRequest
  ): Promise<{ context: AuthContext } | NextResponse> => {
    const result = await authenticateRequest(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { context } = result;

    // Session-based auth has full permissions
    if (context.type === 'session') {
      return { context };
    }

    // Check API key permissions
    if (!context.permissions || !hasPermission(context.permissions, required)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return { context };
  };
}

/**
 * Require admin role middleware
 */
export function requireAdmin() {
  return async (
    request: NextRequest
  ): Promise<{ context: AuthContext } | NextResponse> => {
    const result = await authenticateRequest(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { context } = result;

    if (context.userRole !== 'ADMIN' && context.userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return { context };
  };
}

/**
 * Require super admin role middleware
 */
export function requireSuperAdmin() {
  return async (
    request: NextRequest
  ): Promise<{ context: AuthContext } | NextResponse> => {
    const result = await authenticateRequest(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { context } = result;

    if (context.userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return { context };
  };
}

/**
 * API key rate limit check middleware
 */
export async function checkApiKeyRateLimitMiddleware(
  request: NextRequest,
  apiKeyId: string,
  limit: number
): Promise<NextResponse | null> {
  const { allowed, remaining, resetAt } = await checkApiKeyRateLimit(apiKeyId, limit);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        remaining: 0,
        resetAt: resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toISOString(),
        },
      }
    );
  }

  // Add rate limit headers to be used in response
  request.headers.set('X-RateLimit-Limit', limit.toString());
  request.headers.set('X-RateLimit-Remaining', remaining.toString());
  request.headers.set('X-RateLimit-Reset', resetAt.toISOString());

  return null;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth<T extends object>(
  handler: (request: NextRequest, context: AuthContext, params?: T) => Promise<NextResponse>,
  options: {
    requiredPermission?: string | string[];
    requireAdmin?: boolean;
    requireSuperAdmin?: boolean;
  } = {}
) {
  return async (request: NextRequest, routeParams?: { params: Promise<T> }): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { context } = authResult;

    // Check admin requirement
    if (options.requireSuperAdmin) {
      if (context.userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (options.requireAdmin) {
      if (context.userRole !== 'ADMIN' && context.userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Check permission requirement for API key auth
    if (
      options.requiredPermission &&
      context.type === 'api-key' &&
      context.permissions &&
      !hasPermission(context.permissions, options.requiredPermission)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const params = routeParams ? await routeParams.params : undefined;
    return handler(request, context, params);
  };
}

/**
 * Helper to create error response
 * @deprecated Use apiError from '@/lib/api-response' for standardized responses
 */
export function createErrorResponse(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

/**
 * Helper to create success response
 * @deprecated Use apiSuccess from '@/lib/api-response' for standardized responses
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

// Re-export standardized response utilities for convenience
export {
  apiSuccess,
  apiError,
  ApiErrors,
  handleApiError,
  handleZodError,
  paginatedResponse,
  ErrorCodes,
} from '@/lib/api-response';
export type { PaginationMeta, SuccessResponse, ErrorResponse, ErrorCode } from '@/lib/api-response';
