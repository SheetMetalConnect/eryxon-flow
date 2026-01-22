/**
 * Response utilities for consistent tool responses
 */

import type { ToolResult } from "../types/index.js";

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
 * Create an error response
 */
export function errorResponse(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}
