/**
 * Chat/AI domain tools
 * Provides OpenAI-powered chat capabilities for manufacturing data analysis
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse, successResponse } from "../utils/response.js";
import {
  createOpenAIClient,
  isOpenAIConfigured,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  SYSTEM_PROMPTS,
} from "../utils/openai.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "chat_query",
    description:
      "Ask a natural language question about manufacturing data. The AI will analyze the context and provide insights based on available data.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The natural language question to ask",
        },
        context: {
          type: "string",
          enum: ["manufacturing", "quality", "production", "general"],
          description: "The context for the query (default: general)",
        },
        include_data: {
          type: "boolean",
          description: "Whether to fetch relevant data from the database to include in the response (default: true)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "chat_summarize_jobs",
    description:
      "Get an AI-generated summary of current job status and production metrics",
    inputSchema: {
      type: "object",
      properties: {
        time_period: {
          type: "string",
          enum: ["today", "this_week", "this_month", "all"],
          description: "Time period for the summary (default: this_week)",
        },
        focus: {
          type: "string",
          enum: ["status", "delays", "completion", "all"],
          description: "Focus area for the summary (default: all)",
        },
      },
    },
  },
  {
    name: "chat_analyze_quality",
    description:
      "Get an AI-generated analysis of quality issues, NCRs, and defect patterns",
    inputSchema: {
      type: "object",
      properties: {
        time_period: {
          type: "string",
          enum: ["today", "this_week", "this_month", "all"],
          description: "Time period for the analysis (default: this_month)",
        },
        include_recommendations: {
          type: "boolean",
          description: "Include AI recommendations for improvement (default: true)",
        },
      },
    },
  },
  {
    name: "chat_explain_data",
    description:
      "Get an AI explanation of specific manufacturing data (job, part, operation, or issue)",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["job", "part", "operation", "issue"],
          description: "Type of entity to explain",
        },
        entity_id: {
          type: "string",
          description: "ID of the entity to explain",
        },
        detail_level: {
          type: "string",
          enum: ["brief", "detailed", "comprehensive"],
          description: "Level of detail in the explanation (default: detailed)",
        },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "chat_suggest_actions",
    description:
      "Get AI-suggested actions based on current production state and issues",
    inputSchema: {
      type: "object",
      properties: {
        focus_area: {
          type: "string",
          enum: ["bottlenecks", "quality", "scheduling", "efficiency", "general"],
          description: "Area to focus suggestions on (default: general)",
        },
        max_suggestions: {
          type: "number",
          description: "Maximum number of suggestions to return (default: 5)",
        },
      },
    },
  },
];

// Helper function to get date filter
function getDateFilter(timePeriod: string): Date | null {
  const now = new Date();
  switch (timePeriod) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "this_week":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "all":
    default:
      return null;
  }
}

// Handler implementations
const chatQuery: ToolHandler = async (args, supabase) => {
  try {
    const openai = createOpenAIClient();
    if (!openai) {
      return errorResponse(
        new Error("OpenAI is not configured. Set OPENAI_API_KEY environment variable.")
      );
    }

    const { query, context = "general", include_data = true } = args as {
      query: string;
      context?: string;
      include_data?: boolean;
    };

    let contextData = "";

    // Fetch relevant data if requested
    if (include_data) {
      const [jobsResult, issuesResult] = await Promise.all([
        supabase
          .from("jobs")
          .select("job_number, customer_name, status, priority, due_date")
          .limit(10)
          .order("created_at", { ascending: false }),
        supabase
          .from("issues")
          .select("title, severity, status, issue_type")
          .limit(5)
          .order("created_at", { ascending: false }),
      ]);

      if (jobsResult.data?.length) {
        contextData += `\n\nRecent Jobs:\n${JSON.stringify(jobsResult.data, null, 2)}`;
      }
      if (issuesResult.data?.length) {
        contextData += `\n\nRecent Issues:\n${JSON.stringify(issuesResult.data, null, 2)}`;
      }
    }

    const systemPrompt =
      SYSTEM_PROMPTS[context as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.general;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: contextData
            ? `Based on this data:${contextData}\n\nQuestion: ${query}`
            : query,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content || "No response generated.";

    return successResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
};

const chatSummarizeJobs: ToolHandler = async (args, supabase) => {
  try {
    const openai = createOpenAIClient();
    if (!openai) {
      return errorResponse(
        new Error("OpenAI is not configured. Set OPENAI_API_KEY environment variable.")
      );
    }

    const { time_period = "this_week", focus = "all" } = args as {
      time_period?: string;
      focus?: string;
    };

    const dateFilter = getDateFilter(time_period);

    // Fetch jobs data
    let query = supabase
      .from("jobs")
      .select("job_number, customer_name, status, priority, due_date, created_at, completed_at")
      .limit(50);

    if (dateFilter) {
      query = query.gte("created_at", dateFilter.toISOString());
    }

    const { data: jobs, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const stats = {
      total: jobs?.length || 0,
      by_status: jobs?.reduce(
        (acc, j) => {
          acc[j.status] = (acc[j.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      by_priority: jobs?.reduce(
        (acc, j) => {
          acc[j.priority || "normal"] = (acc[j.priority || "normal"] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      overdue: jobs?.filter((j) => {
        if (!j.due_date || j.status === "completed") return false;
        return new Date(j.due_date) < new Date();
      }).length,
    };

    const prompt = `Summarize the following job data for a manufacturing operations manager.
Time period: ${time_period}
Focus: ${focus}

Statistics:
${JSON.stringify(stats, null, 2)}

Job Details (sample):
${JSON.stringify(jobs?.slice(0, 10), null, 2)}

Provide a clear, concise summary with key insights and any concerns that should be addressed.`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: 0.5,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.production },
        { role: "user", content: prompt },
      ],
    });

    const response = completion.choices[0]?.message?.content || "No summary generated.";

    return jsonResponse({ summary: response, statistics: stats });
  } catch (error) {
    return errorResponse(error);
  }
};

const chatAnalyzeQuality: ToolHandler = async (args, supabase) => {
  try {
    const openai = createOpenAIClient();
    if (!openai) {
      return errorResponse(
        new Error("OpenAI is not configured. Set OPENAI_API_KEY environment variable.")
      );
    }

    const { time_period = "this_month", include_recommendations = true } = args as {
      time_period?: string;
      include_recommendations?: boolean;
    };

    const dateFilter = getDateFilter(time_period);

    // Fetch quality issues and NCRs
    let query = supabase
      .from("issues")
      .select(
        "title, description, severity, status, issue_type, ncr_category, root_cause, corrective_action, created_at"
      )
      .limit(50);

    if (dateFilter) {
      query = query.gte("created_at", dateFilter.toISOString());
    }

    const { data: issues, error } = await query;

    if (error) throw error;

    // Calculate quality statistics
    const stats = {
      total_issues: issues?.length || 0,
      ncrs: issues?.filter((i) => i.issue_type === "ncr").length || 0,
      by_severity: issues?.reduce(
        (acc, i) => {
          acc[i.severity] = (acc[i.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      by_category: issues?.reduce(
        (acc, i) => {
          const cat = i.ncr_category || "other";
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      open_critical: issues?.filter(
        (i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed"
      ).length,
    };

    const prompt = `Analyze the following quality data for a manufacturing quality manager.
Time period: ${time_period}

Statistics:
${JSON.stringify(stats, null, 2)}

Issue Details:
${JSON.stringify(issues?.slice(0, 15), null, 2)}

${include_recommendations ? "Include specific recommendations for improvement and prevention." : "Focus on analysis and patterns only."}

Provide a professional quality analysis report.`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      temperature: 0.5,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.quality },
        { role: "user", content: prompt },
      ],
    });

    const response = completion.choices[0]?.message?.content || "No analysis generated.";

    return jsonResponse({ analysis: response, statistics: stats });
  } catch (error) {
    return errorResponse(error);
  }
};

const chatExplainData: ToolHandler = async (args, supabase) => {
  try {
    const openai = createOpenAIClient();
    if (!openai) {
      return errorResponse(
        new Error("OpenAI is not configured. Set OPENAI_API_KEY environment variable.")
      );
    }

    const { entity_type, entity_id, detail_level = "detailed" } = args as {
      entity_type: string;
      entity_id: string;
      detail_level?: string;
    };

    // Fetch the entity data
    let entityData: Record<string, unknown> | null = null;

    switch (entity_type) {
      case "job": {
        const { data } = await supabase
          .from("jobs")
          .select("*, parts(part_number, status)")
          .eq("id", entity_id)
          .single();
        entityData = data;
        break;
      }
      case "part": {
        const { data } = await supabase
          .from("parts")
          .select("*, jobs(job_number, customer_name), operations(operation_name, status)")
          .eq("id", entity_id)
          .single();
        entityData = data;
        break;
      }
      case "operation": {
        const { data } = await supabase
          .from("operations")
          .select("*, parts(part_number, jobs(job_number)), substeps(*)")
          .eq("id", entity_id)
          .single();
        entityData = data;
        break;
      }
      case "issue": {
        const { data } = await supabase
          .from("issues")
          .select("*, operations(operation_name, parts(part_number, jobs(job_number)))")
          .eq("id", entity_id)
          .single();
        entityData = data;
        break;
      }
      default:
        return errorResponse(new Error(`Unknown entity type: ${entity_type}`));
    }

    if (!entityData) {
      return errorResponse(new Error(`${entity_type} not found with ID: ${entity_id}`));
    }

    const detailInstructions = {
      brief: "Provide a 2-3 sentence summary.",
      detailed: "Provide a comprehensive explanation with key details and status.",
      comprehensive:
        "Provide an in-depth analysis including all relevant details, relationships, and context.",
    };

    const prompt = `Explain this ${entity_type} data for a manufacturing team member.

${entity_type.toUpperCase()} Data:
${JSON.stringify(entityData, null, 2)}

${detailInstructions[detail_level as keyof typeof detailInstructions]}`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: detail_level === "comprehensive" ? 1500 : detail_level === "detailed" ? 800 : 300,
      temperature: 0.5,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.manufacturing },
        { role: "user", content: prompt },
      ],
    });

    const response = completion.choices[0]?.message?.content || "No explanation generated.";

    return jsonResponse({ explanation: response, data: entityData });
  } catch (error) {
    return errorResponse(error);
  }
};

const chatSuggestActions: ToolHandler = async (args, supabase) => {
  try {
    const openai = createOpenAIClient();
    if (!openai) {
      return errorResponse(
        new Error("OpenAI is not configured. Set OPENAI_API_KEY environment variable.")
      );
    }

    const { focus_area = "general", max_suggestions = 5 } = args as {
      focus_area?: string;
      max_suggestions?: number;
    };

    // Gather relevant data based on focus area
    const [jobsResult, issuesResult, operationsResult] = await Promise.all([
      supabase
        .from("jobs")
        .select("job_number, status, priority, due_date")
        .in("status", ["in_progress", "on_hold", "not_started"])
        .order("due_date", { ascending: true })
        .limit(20),
      supabase
        .from("issues")
        .select("title, severity, status, issue_type")
        .in("status", ["open", "in_progress"])
        .order("severity", { ascending: false })
        .limit(10),
      supabase
        .from("operations")
        .select("operation_name, status, parts(part_number, jobs(job_number))")
        .eq("status", "in_progress")
        .limit(15),
    ]);

    const contextData = {
      active_jobs: jobsResult.data,
      open_issues: issuesResult.data,
      running_operations: operationsResult.data,
      overdue_jobs:
        jobsResult.data?.filter((j) => j.due_date && new Date(j.due_date) < new Date()) || [],
      critical_issues: issuesResult.data?.filter((i) => i.severity === "critical") || [],
    };

    const focusInstructions: Record<string, string> = {
      bottlenecks: "Focus on identifying and resolving production bottlenecks.",
      quality: "Focus on quality issues and defect prevention.",
      scheduling: "Focus on scheduling optimization and deadline management.",
      efficiency: "Focus on operational efficiency improvements.",
      general: "Consider all aspects of manufacturing operations.",
    };

    const prompt = `Based on the current production state, suggest ${max_suggestions} actionable improvements.

Focus: ${focus_area}
${focusInstructions[focus_area]}

Current State:
${JSON.stringify(contextData, null, 2)}

Provide specific, prioritized action items that can be implemented immediately.
Format each suggestion with a clear title and brief description.`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.production },
        { role: "user", content: prompt },
      ],
    });

    const response = completion.choices[0]?.message?.content || "No suggestions generated.";

    return jsonResponse({
      suggestions: response,
      context: {
        active_jobs: contextData.active_jobs?.length || 0,
        open_issues: contextData.open_issues?.length || 0,
        overdue_jobs: contextData.overdue_jobs.length,
        critical_issues: contextData.critical_issues.length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["chat_query", chatQuery],
  ["chat_summarize_jobs", chatSummarizeJobs],
  ["chat_analyze_quality", chatAnalyzeQuality],
  ["chat_explain_data", chatExplainData],
  ["chat_suggest_actions", chatSuggestActions],
]);

// Export module
export const chatModule: ToolModule = {
  tools,
  handlers,
};
