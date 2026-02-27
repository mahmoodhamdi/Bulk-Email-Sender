import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  ErrorCodes,
  ErrorCode,
  PaginationMeta,
  SuccessResponse,
  ErrorResponse,
  apiSuccess,
  apiError,
  ApiErrors,
  handleZodError,
  handleApiError,
  paginatedResponse,
} from '@/lib/api-response';

// Mock NextResponse.json
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      status: init?.status || 200,
      data,
      json: async () => data,
      ok: (init?.status || 200) < 400,
    })),
  },
}));

describe('api-response', () => {
  describe('ErrorCodes', () => {
    it('should contain all authentication error codes', () => {
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(ErrorCodes.EXPIRED_TOKEN).toBe('EXPIRED_TOKEN');
      expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should contain all validation error codes', () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorCodes.INVALID_JSON).toBe('INVALID_JSON');
      expect(ErrorCodes.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should contain all resource error codes', () => {
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
      expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
    });

    it('should contain rate limiting error codes', () => {
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.TOO_MANY_REQUESTS).toBe('TOO_MANY_REQUESTS');
    });

    it('should contain server error codes', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCodes.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should contain business logic error codes', () => {
      expect(ErrorCodes.INVALID_OPERATION).toBe('INVALID_OPERATION');
      expect(ErrorCodes.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
      expect(ErrorCodes.FEATURE_DISABLED).toBe('FEATURE_DISABLED');
    });

    it('should have the correct number of error codes', () => {
      const codeCount = Object.keys(ErrorCodes).length;
      expect(codeCount).toBeGreaterThan(0);
      expect(codeCount).toBe(20);
    });
  });

  describe('apiSuccess', () => {
    it('should create a success response with default status 200', () => {
      const data = { id: 1, name: 'Test' };
      const response = apiSuccess(data);

      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        success: true,
        data,
      });
    });

    it('should create a success response with custom status code', () => {
      const data = { id: 1 };
      const response = apiSuccess(data, 201);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    it('should include meta when provided', () => {
      const data = ['item1', 'item2'];
      const meta: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      };

      const response = apiSuccess(data, 200, meta);

      expect(response.data.meta).toBeDefined();
      expect(response.data.meta?.page).toBe(1);
      expect(response.data.meta?.limit).toBe(10);
      expect(response.data.meta?.total).toBe(25);
      expect(response.data.meta?.totalPages).toBe(3);
    });

    it('should calculate hasMore correctly when on first page', () => {
      const data = [];
      const meta: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      };

      const response = apiSuccess(data, 200, meta);

      expect(response.data.meta?.hasMore).toBe(true);
    });

    it('should calculate hasMore as false when on last page', () => {
      const data = [];
      const meta: PaginationMeta = {
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
      };

      const response = apiSuccess(data, 200, meta);

      expect(response.data.meta?.hasMore).toBe(false);
    });

    it('should handle various status codes', () => {
      [200, 201, 202, 204].forEach((status) => {
        const response = apiSuccess({ test: true }, status);
        expect(response.status).toBe(status);
      });
    });

    it('should work with generic data types', () => {
      interface User {
        id: number;
        email: string;
      }

      const user: User = { id: 1, email: 'test@example.com' };
      const response = apiSuccess(user);

      expect(response.data.data).toEqual(user);
    });

    it('should handle null data', () => {
      const response = apiSuccess(null);

      expect(response.data.data).toBeNull();
    });

    it('should handle empty arrays', () => {
      const response = apiSuccess([]);

      expect(response.data.data).toEqual([]);
    });

    it('should not include meta when not provided', () => {
      const response = apiSuccess({ test: true });

      expect(response.data.meta).toBeUndefined();
    });
  });

  describe('apiError', () => {
    it('should create an error response with all properties', () => {
      const response = apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid input',
        400
      );

      expect(response.status).toBe(400);
      expect(response.data).toEqual({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid input',
        },
      });
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const response = apiError(
        ErrorCodes.INVALID_INPUT,
        'Invalid email',
        400,
        details
      );

      expect(response.data.error.details).toEqual(details);
    });

    it('should not include details property when undefined', () => {
      const response = apiError(
        ErrorCodes.INVALID_INPUT,
        'Invalid email',
        400
      );

      expect(response.data.error.details).toBeUndefined();
    });

    it('should not include details property when passed as undefined', () => {
      const response = apiError(
        ErrorCodes.INVALID_INPUT,
        'Invalid email',
        400,
        undefined
      );

      expect(response.data.error.details).toBeUndefined();
    });

    it('should handle various HTTP status codes', () => {
      [400, 401, 403, 404, 409, 429, 500].forEach((status) => {
        const response = apiError(ErrorCodes.INTERNAL_ERROR, 'Error', status);
        expect(response.status).toBe(status);
      });
    });

    it('should work with all error codes', () => {
      const errorCodeValues = Object.values(ErrorCodes);

      errorCodeValues.forEach((code) => {
        const response = apiError(code, 'Test error', 400);
        expect(response.data.error.code).toBe(code);
      });
    });

    it('should preserve special characters in message', () => {
      const message = 'Error with special chars: $@#!^&*()';
      const response = apiError(ErrorCodes.INTERNAL_ERROR, message, 500);

      expect(response.data.error.message).toBe(message);
    });

    it('should handle empty string message', () => {
      const response = apiError(ErrorCodes.INTERNAL_ERROR, '', 500);

      expect(response.data.error.message).toBe('');
    });

    it('should handle complex details object', () => {
      const details = {
        errors: [
          { field: 'email', message: 'invalid' },
          { field: 'password', message: 'too short' },
        ],
        timestamp: new Date().toISOString(),
      };

      const response = apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        details
      );

      expect(response.data.error.details).toEqual(details);
    });
  });

  describe('ApiErrors', () => {
    describe('unauthorized', () => {
      it('should return unauthorized error with default message', () => {
        const response = ApiErrors.unauthorized();

        expect(response.status).toBe(401);
        expect(response.data.error.code).toBe(ErrorCodes.UNAUTHORIZED);
        expect(response.data.error.message).toBe('Authentication required');
      });

      it('should return unauthorized error with custom message', () => {
        const response = ApiErrors.unauthorized('Please log in first');

        expect(response.data.error.message).toBe('Please log in first');
      });
    });

    describe('invalidToken', () => {
      it('should return invalid token error with default message', () => {
        const response = ApiErrors.invalidToken();

        expect(response.status).toBe(401);
        expect(response.data.error.code).toBe(ErrorCodes.INVALID_TOKEN);
        expect(response.data.error.message).toBe('Invalid or expired token');
      });

      it('should return invalid token error with custom message', () => {
        const response = ApiErrors.invalidToken('Token has expired');

        expect(response.data.error.message).toBe('Token has expired');
      });
    });

    describe('forbidden', () => {
      it('should return forbidden error with default message', () => {
        const response = ApiErrors.forbidden();

        expect(response.status).toBe(403);
        expect(response.data.error.code).toBe(ErrorCodes.FORBIDDEN);
        expect(response.data.error.message).toBe(
          'You do not have permission to perform this action'
        );
      });

      it('should return forbidden error with custom message', () => {
        const response = ApiErrors.forbidden('Access denied');

        expect(response.data.error.message).toBe('Access denied');
      });
    });

    describe('insufficientPermissions', () => {
      it('should return insufficient permissions error without required permission', () => {
        const response = ApiErrors.insufficientPermissions();

        expect(response.status).toBe(403);
        expect(response.data.error.code).toBe(ErrorCodes.INSUFFICIENT_PERMISSIONS);
        expect(response.data.error.message).toBe('Insufficient permissions');
      });

      it('should return insufficient permissions error with required permission', () => {
        const response = ApiErrors.insufficientPermissions('campaigns:delete');

        expect(response.data.error.message).toBe(
          'Missing required permission: campaigns:delete'
        );
      });
    });

    describe('notFound', () => {
      it('should return not found error with default resource name', () => {
        const response = ApiErrors.notFound();

        expect(response.status).toBe(404);
        expect(response.data.error.code).toBe(ErrorCodes.NOT_FOUND);
        expect(response.data.error.message).toBe('Resource not found');
      });

      it('should return not found error with custom resource name', () => {
        const response = ApiErrors.notFound('User');

        expect(response.data.error.message).toBe('User not found');
      });

      it('should work with various resource names', () => {
        ['Campaign', 'Template', 'Contact', 'Email'].forEach((resource) => {
          const response = ApiErrors.notFound(resource);
          expect(response.data.error.message).toBe(`${resource} not found`);
        });
      });
    });

    describe('alreadyExists', () => {
      it('should return already exists error with default resource name', () => {
        const response = ApiErrors.alreadyExists();

        expect(response.status).toBe(409);
        expect(response.data.error.code).toBe(ErrorCodes.ALREADY_EXISTS);
        expect(response.data.error.message).toBe('Resource already exists');
      });

      it('should return already exists error with custom resource name', () => {
        const response = ApiErrors.alreadyExists('Email');

        expect(response.data.error.message).toBe('Email already exists');
      });

      it('should work with various resource names', () => {
        ['Campaign', 'User', 'Template'].forEach((resource) => {
          const response = ApiErrors.alreadyExists(resource);
          expect(response.data.error.message).toBe(
            `${resource} already exists`
          );
        });
      });
    });

    describe('conflict', () => {
      it('should return conflict error with custom message', () => {
        const response = ApiErrors.conflict('Version conflict detected');

        expect(response.status).toBe(409);
        expect(response.data.error.code).toBe(ErrorCodes.CONFLICT);
        expect(response.data.error.message).toBe('Version conflict detected');
      });
    });

    describe('rateLimited', () => {
      it('should return rate limited error without retryAfter', () => {
        const response = ApiErrors.rateLimited();

        expect(response.status).toBe(429);
        expect(response.data.error.code).toBe(ErrorCodes.RATE_LIMITED);
        expect(response.data.error.message).toBe(
          'Too many requests. Please try again later.'
        );
        expect(response.data.error.details).toBeUndefined();
      });

      it('should return rate limited error with retryAfter', () => {
        const response = ApiErrors.rateLimited(60);

        expect(response.data.error.details).toEqual({ retryAfter: 60 });
      });

      it('should work with various retryAfter values', () => {
        [10, 30, 60, 300].forEach((seconds) => {
          const response = ApiErrors.rateLimited(seconds);
          expect(response.data.error.details?.retryAfter).toBe(seconds);
        });
      });
    });

    describe('validationError', () => {
      it('should return validation error without details', () => {
        const response = ApiErrors.validationError();

        expect(response.status).toBe(400);
        expect(response.data.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect(response.data.error.message).toBe('Validation failed');
      });

      it('should return validation error with details', () => {
        const details = {
          email: 'Invalid email format',
          password: 'Too short',
        };
        const response = ApiErrors.validationError(details);

        expect(response.data.error.details).toEqual(details);
      });
    });

    describe('invalidInput', () => {
      it('should return invalid input error without details', () => {
        const response = ApiErrors.invalidInput('Invalid campaign status');

        expect(response.status).toBe(400);
        expect(response.data.error.code).toBe(ErrorCodes.INVALID_INPUT);
        expect(response.data.error.message).toBe('Invalid campaign status');
      });

      it('should return invalid input error with details', () => {
        const details = { field: 'status', expected: 'DRAFT|SCHEDULED' };
        const response = ApiErrors.invalidInput('Invalid status', details);

        expect(response.data.error.details).toEqual(details);
      });
    });

    describe('invalidJson', () => {
      it('should return invalid JSON error', () => {
        const response = ApiErrors.invalidJson();

        expect(response.status).toBe(400);
        expect(response.data.error.code).toBe(ErrorCodes.INVALID_JSON);
        expect(response.data.error.message).toBe(
          'Invalid JSON in request body'
        );
      });
    });

    describe('invalidOperation', () => {
      it('should return invalid operation error with message', () => {
        const response = ApiErrors.invalidOperation(
          'Cannot delete active campaign'
        );

        expect(response.status).toBe(400);
        expect(response.data.error.code).toBe(ErrorCodes.INVALID_OPERATION);
        expect(response.data.error.message).toBe(
          'Cannot delete active campaign'
        );
      });
    });

    describe('quotaExceeded', () => {
      it('should return quota exceeded error', () => {
        const response = ApiErrors.quotaExceeded('emails');

        expect(response.status).toBe(400);
        expect(response.data.error.code).toBe(ErrorCodes.QUOTA_EXCEEDED);
        expect(response.data.error.message).toBe('emails quota exceeded');
      });

      it('should work with various resource names', () => {
        ['emails', 'templates', 'contacts', 'campaigns'].forEach((resource) => {
          const response = ApiErrors.quotaExceeded(resource);
          expect(response.data.error.message).toBe(`${resource} quota exceeded`);
        });
      });
    });

    describe('internalError', () => {
      it('should return internal error with default message', () => {
        const response = ApiErrors.internalError();

        expect(response.status).toBe(500);
        expect(response.data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
        expect(response.data.error.message).toBe(
          'An unexpected error occurred'
        );
      });

      it('should return internal error with custom message', () => {
        const response = ApiErrors.internalError('Server crashed');

        expect(response.data.error.message).toBe('Server crashed');
      });
    });

    describe('databaseError', () => {
      it('should return database error with default message', () => {
        const response = ApiErrors.databaseError();

        expect(response.status).toBe(500);
        expect(response.data.error.code).toBe(ErrorCodes.DATABASE_ERROR);
        expect(response.data.error.message).toBe('Database operation failed');
      });

      it('should return database error with custom message', () => {
        const response = ApiErrors.databaseError('Connection timeout');

        expect(response.data.error.message).toBe('Connection timeout');
      });
    });

    describe('externalServiceError', () => {
      it('should return external service error', () => {
        const response = ApiErrors.externalServiceError('Stripe');

        expect(response.status).toBe(500);
        expect(response.data.error.code).toBe(
          ErrorCodes.EXTERNAL_SERVICE_ERROR
        );
        expect(response.data.error.message).toBe('External service error: Stripe');
      });

      it('should work with various service names', () => {
        ['Stripe', 'AWS SES', 'SendGrid', 'Paymob'].forEach((service) => {
          const response = ApiErrors.externalServiceError(service);
          expect(response.data.error.message).toContain(service);
        });
      });
    });
  });

  describe('handleZodError', () => {
    it('should convert single ZodError to API error response', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const response = handleZodError(zodError);

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.data.error.message).toBe('Validation failed');
      expect(response.data.error.details?.fields).toBeDefined();
    });

    it('should format multiple errors on same field', () => {
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          path: ['password'],
          message: 'String must contain at least 8 character(s)',
          inclusive: true,
        },
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['password'],
          message: 'Required',
        },
      ]);

      const response = handleZodError(zodError);
      const fields = response.data.error.details?.fields as Record<
        string,
        string[]
      >;

      expect(fields.password).toHaveLength(2);
      expect(fields.password).toContain('String must contain at least 8 character(s)');
      expect(fields.password).toContain('Required');
    });

    it('should handle nested field paths', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['user', 'profile', 'email'],
          message: 'Expected string, received number',
        },
      ]);

      const response = handleZodError(zodError);
      const fields = response.data.error.details?.fields as Record<
        string,
        string[]
      >;

      expect(fields['user.profile.email']).toBeDefined();
      expect(fields['user.profile.email']).toContain(
        'Expected string, received number'
      );
    });

    it('should handle multiple fields with different errors', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          path: ['password'],
          message: 'String must contain at least 8 character(s)',
          inclusive: true,
        },
        {
          code: 'invalid_enum_value',
          options: ['DRAFT', 'PUBLISHED'],
          path: ['status'],
          message: "Invalid enum value. Expected 'DRAFT' | 'PUBLISHED'",
          received: 'INVALID',
        },
      ]);

      const response = handleZodError(zodError);
      const fields = response.data.error.details?.fields as Record<
        string,
        string[]
      >;

      expect(Object.keys(fields)).toHaveLength(3);
      expect(fields.email).toBeDefined();
      expect(fields.password).toBeDefined();
      expect(fields.status).toBeDefined();
    });

    it('should handle empty path (root level error)', () => {
      const zodError = new ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Root level validation error',
        },
      ]);

      const response = handleZodError(zodError);
      const fields = response.data.error.details?.fields as Record<
        string,
        string[]
      >;

      expect(fields['']).toBeDefined();
      expect(fields['']).toContain('Root level validation error');
    });

    it('should handle array index in path', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['contacts', 0, 'email'],
          message: 'Expected string, received number',
        },
      ]);

      const response = handleZodError(zodError);
      const fields = response.data.error.details?.fields as Record<
        string,
        string[]
      >;

      expect(fields['contacts.0.email']).toBeDefined();
    });
  });

  describe('handleApiError', () => {
    it('should handle ZodError and call handleZodError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const response = handleApiError(zodError);

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should handle JSON parsing error', () => {
      const syntaxError = new SyntaxError(
        'Unexpected token < in JSON at position 0'
      );

      const response = handleApiError(syntaxError);

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe(ErrorCodes.INVALID_JSON);
      expect(response.data.error.message).toBe(
        'Invalid JSON in request body'
      );
    });

    it('should handle generic SyntaxError without JSON in message', () => {
      const syntaxError = new SyntaxError('Unexpected token');

      const response = handleApiError(syntaxError);

      expect(response.status).toBe(500);
      expect(response.data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it('should handle not found error', () => {
      const error = new Error('User not found');

      const response = handleApiError(error);

      expect(response.status).toBe(404);
      expect(response.data.error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('should handle not found error with various messages', () => {
      const messages = [
        'Campaign not found',
        'Resource not found',
        'Template not found',
      ];

      messages.forEach((message) => {
        const error = new Error(message);
        const response = handleApiError(error);

        expect(response.status).toBe(404);
        expect(response.data.error.code).toBe(ErrorCodes.NOT_FOUND);
      });
    });

    it('should handle already exists error', () => {
      const error = new Error('User already exists');

      const response = handleApiError(error);

      expect(response.status).toBe(409);
      expect(response.data.error.code).toBe(ErrorCodes.ALREADY_EXISTS);
    });

    it('should handle duplicate key error', () => {
      const error = new Error('Duplicate key error');

      const response = handleApiError(error);

      expect(response.status).toBe(409);
      expect(response.data.error.code).toBe(ErrorCodes.ALREADY_EXISTS);
    });

    it('should handle permission denied error', () => {
      const error = new Error('Permission denied');

      const response = handleApiError(error);

      expect(response.status).toBe(403);
      expect(response.data.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should handle forbidden error', () => {
      const error = new Error('Access forbidden');

      const response = handleApiError(error);

      expect(response.status).toBe(403);
      expect(response.data.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should handle not allowed error', () => {
      const error = new Error('This action is not allowed');

      const response = handleApiError(error);

      expect(response.status).toBe(403);
      expect(response.data.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should preserve original error message in forbidden response', () => {
      const message = 'Only admins can delete campaigns';
      const error = new Error(`Permission denied: ${message}`);

      const response = handleApiError(error);

      expect(response.data.error.message).toBe(error.message);
    });

    it('should handle rate limit error', () => {
      const error = new Error('Rate limit exceeded');

      const response = handleApiError(error);

      expect(response.status).toBe(429);
      expect(response.data.error.code).toBe(ErrorCodes.RATE_LIMITED);
    });

    it('should handle too many requests error', () => {
      const error = new Error('Too many requests from this IP');

      const response = handleApiError(error);

      expect(response.status).toBe(429);
      expect(response.data.error.code).toBe(ErrorCodes.RATE_LIMITED);
    });

    it('should handle generic Error and return internal error', () => {
      const error = new Error('Some unexpected error');

      const response = handleApiError(error);

      expect(response.status).toBe(500);
      expect(response.data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it('should handle non-Error objects', () => {
      const response = handleApiError('string error');

      expect(response.status).toBe(500);
      expect(response.data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it('should handle null error', () => {
      const response = handleApiError(null);

      expect(response.status).toBe(500);
      expect(response.data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it('should handle undefined error', () => {
      const response = handleApiError(undefined);

      expect(response.status).toBe(500);
      expect(response.data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it('should handle case-insensitive error messages', () => {
      const variations = [
        'Not Found',
        'NOT FOUND',
        'not found',
        'NoT FoUnD',
      ];

      variations.forEach((message) => {
        const error = new Error(message);
        const response = handleApiError(error);

        expect(response.status).toBe(404);
      });
    });

    it('should log unhandled errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      const error = new Error('Unexpected error');

      handleApiError(error);

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled API error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('paginatedResponse', () => {
    it('should create paginated response with correct metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = paginatedResponse(data, {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual(data);
      expect(response.data.meta?.page).toBe(1);
      expect(response.data.meta?.limit).toBe(10);
      expect(response.data.meta?.total).toBe(25);
    });

    it('should calculate totalPages correctly', () => {
      const response = paginatedResponse([], {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(response.data.meta?.totalPages).toBe(3);
    });

    it('should calculate totalPages for exact division', () => {
      const response = paginatedResponse([], {
        page: 1,
        limit: 10,
        total: 30,
      });

      expect(response.data.meta?.totalPages).toBe(3);
    });

    it('should calculate hasMore when not on last page', () => {
      const response = paginatedResponse([], {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(response.data.meta?.hasMore).toBe(true);
    });

    it('should calculate hasMore as false when on last page', () => {
      const response = paginatedResponse([], {
        page: 3,
        limit: 10,
        total: 25,
      });

      expect(response.data.meta?.hasMore).toBe(false);
    });

    it('should handle single page of results', () => {
      const response = paginatedResponse([{ id: 1 }], {
        page: 1,
        limit: 10,
        total: 5,
      });

      expect(response.data.meta?.totalPages).toBe(1);
      expect(response.data.meta?.hasMore).toBe(false);
    });

    it('should handle empty results', () => {
      const response = paginatedResponse([], {
        page: 1,
        limit: 10,
        total: 0,
      });

      expect(response.data.meta?.totalPages).toBe(0);
      expect(response.data.meta?.hasMore).toBe(false);
    });

    it('should handle large result sets in middle pages', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const response = paginatedResponse(data, {
        page: 25,
        limit: 100,
        total: 5000,
      });

      expect(response.data.meta?.totalPages).toBe(50);
      expect(response.data.meta?.hasMore).toBe(true);
    });

    it('should handle last page with partial results', () => {
      const data = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
      const response = paginatedResponse(data, {
        page: 3,
        limit: 10,
        total: 25,
      });

      expect(response.data.meta?.hasMore).toBe(false);
      expect(response.data.data).toHaveLength(5);
    });

    it('should work with generic data types', () => {
      interface User {
        id: number;
        name: string;
      }

      const users: User[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const response = paginatedResponse(users, {
        page: 1,
        limit: 10,
        total: 2,
      });

      expect(response.data.data).toEqual(users);
    });

    it('should handle various limit sizes', () => {
      [5, 10, 25, 50, 100].forEach((limit) => {
        const response = paginatedResponse([], {
          page: 1,
          limit,
          total: 100,
        });

        expect(response.data.meta?.limit).toBe(limit);
      });
    });

    it('should always return status 200', () => {
      const response = paginatedResponse([], {
        page: 1,
        limit: 10,
        total: 0,
      });

      expect(response.status).toBe(200);
    });

    it('should calculate totalPages with ceiling for non-exact division', () => {
      const response = paginatedResponse([], {
        page: 1,
        limit: 7,
        total: 25,
      });

      expect(response.data.meta?.totalPages).toBe(4);
    });
  });

  describe('Integration tests', () => {
    it('should chain success and error responses', () => {
      const successResponse = apiSuccess({ id: 1 }, 201);
      expect(successResponse.data.success).toBe(true);

      const errorResponse = apiError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed',
        500
      );
      expect(errorResponse.data.success).toBe(false);
    });

    it('should work with complex nested data structures', () => {
      const data = {
        user: {
          id: 1,
          profile: {
            email: 'test@example.com',
            settings: {
              notifications: true,
            },
          },
        },
        campaigns: [{ id: 1, name: 'Campaign 1' }],
      };

      const response = apiSuccess(data);
      expect(response.data.data).toEqual(data);
    });

    it('should handle common API response patterns', () => {
      const listResponse = paginatedResponse(
        [{ id: 1 }, { id: 2 }],
        { page: 1, limit: 10, total: 100 }
      );
      expect(listResponse.data.meta).toBeDefined();

      const createResponse = apiSuccess({ id: 1 }, 201);
      expect(createResponse.status).toBe(201);

      const errorResponse = ApiErrors.notFound('Campaign');
      expect(errorResponse.status).toBe(404);
    });
  });
});
