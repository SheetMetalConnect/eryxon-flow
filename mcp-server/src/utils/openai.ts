/**
 * OpenAI client configuration and utilities
 */

import OpenAI from "openai";

// OpenAI configuration from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Create and return the OpenAI client
 * Returns null if not configured
 */
export function createOpenAIClient(): OpenAI | null {
  if (!isOpenAIConfigured()) {
    return null;
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

/**
 * Default model configuration
 */
export const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_MAX_TOKENS = 1000;
export const DEFAULT_TEMPERATURE = 0.7;

/**
 * System prompts for different chat contexts
 */
export const SYSTEM_PROMPTS = {
  manufacturing: `You are an AI assistant for Eryxon Flow, a Manufacturing Execution System (MES).
You help users understand their manufacturing data, analyze production metrics, and provide insights about jobs, parts, operations, and quality issues.
Be concise and focus on actionable insights. Use manufacturing terminology appropriately.`,

  quality: `You are a quality assurance assistant for a manufacturing system.
You help analyze Non-Conformance Reports (NCRs), identify patterns in defects, and suggest corrective actions.
Focus on root cause analysis and preventive measures.`,

  production: `You are a production planning assistant for a manufacturing system.
You help analyze job schedules, identify bottlenecks, optimize workflows, and track production metrics.
Provide practical suggestions for improving efficiency.`,

  general: `You are a helpful assistant for Eryxon Flow, a Manufacturing Execution System.
Answer questions about manufacturing operations, jobs, parts, and production data.
Be helpful, accurate, and concise.`,
};
