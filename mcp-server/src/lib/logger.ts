/**
 * Logging Utility
 * Provides structured logging for the MCP server
 */

import { env } from "../config/environment.js";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = env.features.logging;
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const output = context
      ? `[${entry.timestamp}] ${level}: ${message} ${JSON.stringify(context)}`
      : `[${entry.timestamp}] ${level}: ${message}`;

    // Use stderr for logging to avoid interfering with MCP stdio communication
    console.error(output);
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  toolCall(toolName: string, args: any): void {
    this.info(`Tool called: ${toolName}`, { args });
  }

  toolSuccess(toolName: string, duration: number): void {
    this.info(`Tool completed: ${toolName}`, { duration: `${duration}ms` });
  }

  toolError(toolName: string, error: any): void {
    this.error(`Tool failed: ${toolName}`, { error: error.message || error });
  }
}

export const logger = new Logger();
