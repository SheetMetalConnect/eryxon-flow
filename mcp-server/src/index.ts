#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vatgianzotsurljznsry.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "fetch_jobs",
    description: "Fetch jobs from the database with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "Filter by job status",
        },
        limit: {
          type: "number",
          description: "Maximum number of jobs to return (default: 50)",
        },
      },
    },
  },
  {
    name: "fetch_parts",
    description: "Fetch parts from the database with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Filter by job ID",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "Filter by part status",
        },
        limit: {
          type: "number",
          description: "Maximum number of parts to return (default: 50)",
        },
      },
    },
  },
  {
    name: "fetch_tasks",
    description: "Fetch tasks from the database with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        part_id: {
          type: "string",
          description: "Filter by part ID",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "paused"],
          description: "Filter by task status",
        },
        assigned_to: {
          type: "string",
          description: "Filter by assigned user ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (default: 50)",
        },
      },
    },
  },
  {
    name: "update_job",
    description: "Update a job's status or properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Job ID to update",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "New status for the job",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "New priority for the job",
        },
        due_date: {
          type: "string",
          description: "New due date (ISO 8601 format)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_part",
    description: "Update a part's status or properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Part ID to update",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "New status for the part",
        },
        current_stage_id: {
          type: "string",
          description: "New current stage ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_task",
    description: "Update a task's status or properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Task ID to update",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "paused"],
          description: "New status for the task",
        },
        assigned_to: {
          type: "string",
          description: "Assign to user ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_job",
    description: "Create a new job",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer name",
        },
        job_number: {
          type: "string",
          description: "Job number/identifier",
        },
        description: {
          type: "string",
          description: "Job description",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Job priority",
        },
        due_date: {
          type: "string",
          description: "Due date (ISO 8601 format)",
        },
      },
      required: ["customer_name", "job_number"],
    },
  },
  {
    name: "fetch_issues",
    description: "Fetch issues/defects from the database",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "in_progress", "resolved", "closed"],
          description: "Filter by issue status",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Filter by severity",
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_dashboard_stats",
    description: "Get dashboard statistics and metrics",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: "eryxon-flow-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "fetch_jobs": {
        let query = supabase.from("jobs").select("*");

        if (args?.status) {
          query = query.eq("status", args.status);
        }

        const limit = (typeof args?.limit === 'number' ? args.limit : 50);
        query = query.limit(limit).order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "fetch_parts": {
        let query = supabase.from("parts").select("*, jobs(job_number, customer_name)");

        if (args?.job_id) {
          query = query.eq("job_id", args.job_id);
        }
        if (args?.status) {
          query = query.eq("status", args.status);
        }

        const limit = (typeof args?.limit === 'number' ? args.limit : 50);
        query = query.limit(limit).order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "fetch_tasks": {
        let query = supabase.from("tasks").select("*, parts(part_number), profiles(full_name)");

        if (args?.part_id) {
          query = query.eq("part_id", args.part_id);
        }
        if (args?.status) {
          query = query.eq("status", args.status);
        }
        if (args?.assigned_to) {
          query = query.eq("assigned_to", args.assigned_to);
        }

        const limit = (typeof args?.limit === 'number' ? args.limit : 50);
        query = query.limit(limit).order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "update_job": {
        const { id, ...updates } = args as any;

        const { data, error } = await supabase
          .from("jobs")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Job updated successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "update_part": {
        const { id, ...updates } = args as any;

        const { data, error } = await supabase
          .from("parts")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Part updated successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "update_task": {
        const { id, ...updates } = args as any;

        const { data, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Task updated successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "create_job": {
        const { data, error } = await supabase
          .from("jobs")
          .insert([args])
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Job created successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "fetch_issues": {
        let query = supabase.from("issues").select("*, parts(part_number), profiles(full_name)");

        if (args?.status) {
          query = query.eq("status", args.status);
        }
        if (args?.severity) {
          query = query.eq("severity", args.severity);
        }

        const limit = (typeof args?.limit === 'number' ? args.limit : 50);
        query = query.limit(limit).order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_dashboard_stats": {
        // Fetch multiple stats in parallel
        const [jobsResult, partsResult, tasksResult, issuesResult] = await Promise.all([
          supabase.from("jobs").select("status", { count: "exact", head: false }),
          supabase.from("parts").select("status", { count: "exact", head: false }),
          supabase.from("tasks").select("status", { count: "exact", head: false }),
          supabase.from("issues").select("status", { count: "exact", head: false }),
        ]);

        const stats = {
          jobs: {
            total: jobsResult.data?.length || 0,
            by_status: jobsResult.data?.reduce((acc: any, j: any) => {
              acc[j.status] = (acc[j.status] || 0) + 1;
              return acc;
            }, {}),
          },
          parts: {
            total: partsResult.data?.length || 0,
            by_status: partsResult.data?.reduce((acc: any, p: any) => {
              acc[p.status] = (acc[p.status] || 0) + 1;
              return acc;
            }, {}),
          },
          tasks: {
            total: tasksResult.data?.length || 0,
            by_status: tasksResult.data?.reduce((acc: any, t: any) => {
              acc[t.status] = (acc[t.status] || 0) + 1;
              return acc;
            }, {}),
          },
          issues: {
            total: issuesResult.data?.length || 0,
            by_status: issuesResult.data?.reduce((acc: any, i: any) => {
              acc[i.status] = (acc[i.status] || 0) + 1;
              return acc;
            }, {}),
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Eryxon Flow MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
