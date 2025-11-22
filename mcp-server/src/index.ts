#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server - Entry Point
 * Modular, future-proof architecture with comprehensive tooling
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeDatabase, checkDatabaseHealth } from "./config/database.js";
import { registerAllTools } from "./tools/index.js";
import { createMcpServer } from "./server.js";
import { logger } from "./lib/logger.js";
import { env } from "./config/environment.js";

/**
 * Main server initialization
 */
async function main() {
  try {
    logger.info("Starting Eryxon Flow MCP Server...");
    logger.info(`Server: ${env.server.name} v${env.server.version}`);

    // Initialize database
    logger.info("Initializing database connection...");
    initializeDatabase();

    // Check database health
    if (env.features.healthCheck) {
      logger.info("Checking database health...");
      const isHealthy = await checkDatabaseHealth();

      if (!isHealthy) {
        logger.warn("Database health check failed, but continuing...");
      } else {
        logger.info("Database health check passed");
      }
    }

    // Register all tools
    logger.info("Registering tools...");
    registerAllTools();

    // Create and configure server
    logger.info("Creating MCP server...");
    const server = createMcpServer();

    // Connect to stdio transport
    logger.info("Connecting to stdio transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("✓ Eryxon Flow MCP Server running on stdio");
    logger.info("Ready to accept tool requests");
  } catch (error) {
    logger.error("Failed to start server", error);
    console.error("Server error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error("Unhandled error in main", error);
  console.error("Fatal error:", error);
  process.exit(1);
});
