// packages/ultracontrol-app/src/lib/api/interfaces/guards.ts

import type { ApiResponse, ApiError } from './base';

/**
 * Type guards for API interfaces
 */

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'timestamp' in value &&
    typeof (value as any).code === 'string' &&
    typeof (value as any).message === 'string'
  );
}

export function isApiResponse<T = any>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as any).success === 'boolean'
  );
}

export function isSuccessResponse<T = any>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && 'data' in response;
}

export function isErrorResponse(
  response: ApiResponse
): response is ApiResponse & { success: false; error: ApiError } {
  return response.success === false && 'error' in response;
}