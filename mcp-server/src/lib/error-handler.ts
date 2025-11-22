/**
 * Error Handler
 * Centralized error handling and formatting
 */

import { ToolResponse } from "../types/tools.js";
import { formatErrorResponse } from "./response-formatter.js";
import { logger } from "./logger.js";

/**
 * Custom error types
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/**
 * Handle tool execution errors
 */
export function handleToolError(
  error: any,
  toolName: string,
  context?: any
): ToolResponse {
  logger.toolError(toolName, error);

  // Log additional context if provided
  if (context) {
    logger.error(`Error context for ${toolName}`, context);
  }

  // Format different error types
  if (error instanceof ValidationError) {
    return formatErrorResponse(`Validation error: ${error.message}`);
  }

  if (error instanceof NotFoundError) {
    return formatErrorResponse(error.message);
  }

  if (error instanceof DatabaseError) {
    return formatErrorResponse(`Database error: ${error.message}`);
  }

  // Generic error
  return formatErrorResponse(error);
}

/**
 * Validate required parameters
 */
export function validateRequired(
  args: any,
  required: string[],
  toolName: string
): void {
  const missing = required.filter((field) => !args[field]);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required parameters for ${toolName}: ${missing.join(", ")}`
    );
  }
}

/**
 * Wrap tool handler with error handling
 */
export function withErrorHandling(
  toolName: string,
  handler: (args: any) => Promise<ToolResponse>
): (args: any) => Promise<ToolResponse> {
  return async (args: any): Promise<ToolResponse> => {
    const startTime = Date.now();

    try {
      logger.toolCall(toolName, args);
      const result = await handler(args);
      const duration = Date.now() - startTime;
      logger.toolSuccess(toolName, duration);
      return result;
    } catch (error) {
      return handleToolError(error, toolName, { args });
    }
  };
}
