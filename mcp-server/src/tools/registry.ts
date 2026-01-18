/**
 * Tool Registry
 * Centralizes tool registration and provides lookup functionality
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolModule, ToolHandler, ToolResult } from "../types/index.js";
import { errorResponse } from "../utils/response.js";

/**
 * Tool Registry class
 * Manages registration of tool modules and execution of tools
 */
export class ToolRegistry {
  private tools: Tool[] = [];
  private handlers: Map<string, ToolHandler> = new Map();

  /**
   * Register a tool module
   * @param module - The tool module to register
   */
  registerModule(module: ToolModule): void {
    this.tools.push(...module.tools);
    module.handlers.forEach((handler, name) => {
      if (this.handlers.has(name)) {
        console.warn(`Warning: Tool "${name}" is being overwritten`);
      }
      this.handlers.set(name, handler);
    });
  }

  /**
   * Get all registered tools
   * @returns Array of tool definitions
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Check if a tool is registered
   * @param name - Tool name
   * @returns True if tool exists
   */
  hasTool(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Execute a tool by name
   * @param name - Tool name
   * @param args - Tool arguments
   * @param supabase - Supabase client
   * @returns Tool result
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    supabase: SupabaseClient
  ): Promise<ToolResult> {
    const handler = this.handlers.get(name);

    if (!handler) {
      return errorResponse(new Error(`Unknown tool: ${name}`));
    }

    try {
      return await handler(args, supabase);
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Get tool statistics
   * @returns Statistics about registered tools
   */
  getStats(): { totalTools: number; toolNames: string[] } {
    return {
      totalTools: this.tools.length,
      toolNames: Array.from(this.handlers.keys()),
    };
  }
}

/**
 * Create a new tool registry with all modules registered
 */
export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  return registry;
}
