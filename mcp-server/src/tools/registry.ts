/**
 * Tool Registry
 * Central registry for all MCP tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolDefinition, ToolHandler, ToolCategory } from "../types/tools.js";
import { withErrorHandling } from "../lib/error-handler.js";
import { logger } from "../lib/logger.js";

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private categories: Map<ToolCategory, string[]> = new Map();

  /**
   * Register a tool
   */
  register(
    definition: Tool,
    handler: ToolHandler,
    category: ToolCategory
  ): void {
    const toolName = definition.name;

    // Wrap handler with error handling
    const wrappedHandler = withErrorHandling(toolName, handler);

    // Store tool definition
    this.tools.set(toolName, {
      definition,
      handler: wrappedHandler,
    });

    // Update category index
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(toolName);

    logger.debug(`Registered tool: ${toolName}`, { category });
  }

  /**
   * Register multiple tools at once
   */
  registerMany(tools: Array<{
    definition: Tool;
    handler: ToolHandler;
    category: ToolCategory;
  }>): void {
    tools.forEach(({ definition, handler, category }) => {
      this.register(definition, handler, category);
    });
  }

  /**
   * Get tool handler by name
   */
  getHandler(name: string): ToolHandler | undefined {
    return this.tools.get(name)?.handler;
  }

  /**
   * Get tool definition by name
   */
  getDefinition(name: string): Tool | undefined {
    return this.tools.get(name)?.definition;
  }

  /**
   * Get all tool definitions
   */
  getAllDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames
      .map((name) => this.getDefinition(name))
      .filter((def): def is Tool => def !== undefined);
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};

    this.categories.forEach((tools, category) => {
      byCategory[category] = tools.length;
    });

    return {
      total: this.tools.size,
      byCategory,
    };
  }

  /**
   * List all registered tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
