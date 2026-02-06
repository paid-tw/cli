/**
 * Unified output format for all CLI commands
 * Agent-friendly structured responses
 */

export interface OutputMetadata {
  timestamp: string;
  command?: string;
  environment?: "sandbox" | "production";
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata: OutputMetadata;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: OutputMetadata;
}

export type OutputResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a success response
 */
export function success<T>(
  data: T,
  metadata?: Partial<OutputMetadata>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Create an error response
 */
export function error(
  code: string,
  message: string,
  details?: unknown,
  metadata?: Partial<OutputMetadata>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Format output based on --json flag
 */
export function formatOutput<T>(
  response: OutputResponse<T>,
  json: boolean
): string {
  if (json) {
    return JSON.stringify(response, null, 2);
  }
  
  // Pretty format for human reading
  if (!response.success) {
    return `❌ Error: ${response.error.message} (${response.error.code})`;
  }
  
  // For success, default to JSON if no custom formatter
  return JSON.stringify(response, null, 2);
}
