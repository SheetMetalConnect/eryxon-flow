/**
 * Response utilities for consistent tool responses
 */

import type { ToolResult } from "../types/index.js";
import { AppError, wrapError } from "./errors.js";

export interface PaginationMeta {
  offset: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    context?: Record<string, any>;
  };
  pagination?: PaginationMeta;
  message?: string;
}

/**
 * Create a successful text response
 */
export function successResponse(text: string): ToolResult {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Create a JSON response (pretty-printed)
 */
export function jsonResponse(data: unknown, message?: string): ToolResult {
  const text = message
    ? `${message}:\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Create a paginated JSON response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string
): ToolResult {
  const response: ToolResponse<T[]> = {
    success: true,
    data,
    pagination,
    message,
  };

  return jsonResponse(response);
}

/**
 * Create a structured success response
 */
export function structuredResponse<T>(
  data: T,
  message?: string,
  pagination?: PaginationMeta
): ToolResult {
  const response: ToolResponse<T> = {
    success: true,
    data,
    message,
    pagination,
  };

  return jsonResponse(response);
}

/**
 * Create an error response
 */
export function errorResponse(error: unknown): ToolResult {
  const appError = wrapError(error);

  const response: ToolResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      context: appError.context,
    },
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response, null, 2),
      },
    ],
    isError: true,
  };
}
