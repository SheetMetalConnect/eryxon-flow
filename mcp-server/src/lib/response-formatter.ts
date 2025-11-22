/**
 * Response Formatter
 * Standardizes tool response formatting
 */

import { ToolResponse } from "../types/tools.js";

/**
 * Format successful data response
 */
export function formatDataResponse(data: any): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Format successful message response
 */
export function formatMessageResponse(message: string, data?: any): ToolResponse {
  const text = data
    ? `${message}\n\n${JSON.stringify(data, null, 2)}`
    : message;

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
 * Format error response
 */
export function formatErrorResponse(error: any): ToolResponse {
  const errorMessage = error.message || String(error);

  return {
    content: [
      {
        type: "text",
        text: `Error: ${errorMessage}`,
      },
    ],
    isError: true,
  };
}

/**
 * Format list response with count
 */
export function formatListResponse(items: any[], entityName: string): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: `Found ${items.length} ${entityName}:\n\n${JSON.stringify(items, null, 2)}`,
      },
    ],
  };
}

/**
 * Format update response
 */
export function formatUpdateResponse(
  entityName: string,
  data: any,
  successMessage?: string
): ToolResponse {
  const message = successMessage || `${entityName} updated successfully`;

  return {
    content: [
      {
        type: "text",
        text: `${message}\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/**
 * Format create response
 */
export function formatCreateResponse(
  entityName: string,
  data: any,
  successMessage?: string
): ToolResponse {
  const message = successMessage || `${entityName} created successfully`;

  return {
    content: [
      {
        type: "text",
        text: `${message}\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}
