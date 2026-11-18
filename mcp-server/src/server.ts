import type { SupabaseClient } from "@supabase/supabase-js";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { z } from "zod";
import { run } from "./tool.js";
import { allTools } from "./tools/index.js";
import { stateCodec } from "./state.js";

export const VERSION = "3.0.1";
export const PROTOCOL_VERSION = "2026-07-28";

const HOUR = 3_600_000;
const json = (uri: URL, data: unknown) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] });

export function buildServer(supabase: SupabaseClient): McpServer {
  const server = new McpServer(
    { name: "eryxon-flow", version: VERSION },
    {
      capabilities: { tools: {}, resources: {}, prompts: {} },
      cacheHints: {
        "tools/list": { ttlMs: HOUR, cacheScope: "public" },
        "prompts/list": { ttlMs: HOUR, cacheScope: "public" },
        "resources/list": { ttlMs: HOUR, cacheScope: "public" },
        "resources/templates/list": { ttlMs: HOUR, cacheScope: "public" },
      },
      requestState: { verify: stateCodec.verify },
      inputRequired: { legacyShim: false },
    },
  );

  for (const def of allTools) {
    server.registerTool(
      def.name,
      {
        title: def.title, description: def.description, annotations: def.annotations,
        inputSchema: z.object(def.input), outputSchema: def.output ? z.object(def.output).loose() : undefined,
      },
      (args, ctx) => run(def, args as Record<string, unknown>, supabase, ctx),
    );
  }

  server.registerResource("open-jobs", "eryxon://jobs", { title: "Open jobs", description: "Jobs not yet completed, earliest due first", mimeType: "application/json", cacheHint: { ttlMs: 30_000, cacheScope: "private" } }, async (uri) => {
    const { data, error } = await supabase.from("jobs").select("id, job_number, customer, status, due_date, current_cell_id").is("deleted_at", null).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false }).limit(200);
    if (error) throw error;
    return json(uri, data);
  });
  server.registerResource("job", new ResourceTemplate("eryxon://jobs/{jobId}", { list: undefined }), { title: "Job with routing", mimeType: "application/json" }, async (uri, { jobId }) => {
    const { data, error } = await supabase.from("jobs").select("*, parts(id, part_number, material, quantity, status, is_bullet_card, operations(id, operation_name, sequence, status, cell_id, estimated_time, actual_time))").eq("id", String(jobId)).single();
    if (error) throw error;
    return json(uri, data);
  });
  server.registerResource("cells", "eryxon://cells", { title: "Cells", description: "Production cells in routing order", mimeType: "application/json", cacheHint: { ttlMs: HOUR, cacheScope: "public" } }, async (uri) => {
    const { data, error } = await supabase.from("cells").select("id, name, sequence, color, wip_limit, wip_warning_threshold, enforce_wip_limit, active").is("deleted_at", null).order("sequence");
    if (error) throw error;
    return json(uri, data);
  });
  server.registerResource("cell-wip", new ResourceTemplate("eryxon://cells/{cellId}/wip", { list: undefined }), { title: "Cell work in progress", mimeType: "application/json" }, async (uri, { cellId }) => {
    const { data, error } = await supabase.from("operations").select("id, operation_name, status, sequence, estimated_time, parts(part_number, jobs(job_number, due_date))").eq("cell_id", String(cellId)).in("status", ["not_started", "in_progress", "on_hold"]).is("deleted_at", null).order("status");
    if (error) throw error;
    return json(uri, { cell_id: cellId, wip: data.length, operations: data });
  });
  server.registerResource("active-timers", "eryxon://timers", { title: "Active timers", description: "Who is clocked on what right now", mimeType: "application/json" }, async (uri) => {
    const { data, error } = await supabase.from("time_entries").select("id, operator_id, shop_floor_operator_id, start_time, is_paused, operations(operation_name, parts(part_number, jobs(job_number)))").is("end_time", null);
    if (error) throw error;
    return json(uri, data);
  });

  server.registerPrompt("release-plan-for-job", {
    title: "Release plan for a job",
    description: "Walk a job's routing and propose what to release next, respecting sequence and cell WIP limits.",
    argsSchema: z.object({ job_number: z.string() }),
  }, ({ job_number }) => ({
    messages: [{ role: "user", content: { type: "text", text:
      `Use get_job_overview for job ${job_number}, then get_cell_capacity for the cells in its routing. For each part, list the next operation that can start (all lower-sequence operations completed), flag cells at or near their WIP limit, and propose a release order. Do not start anything; propose only.` } }],
  }));
  server.registerPrompt("shift-handover", {
    title: "Shift handover",
    description: "Summarise running work, standstills and overdue parts for the next shift.",
  }, () => ({
    messages: [{ role: "user", content: { type: "text", text:
      "Read eryxon://timers, fetch_issues with causes_standstill=true and status=pending, and get_parts_due_soon with due_within_days=2. Write a handover note: what is running and by whom, what is parked under a Yellow Card and why, and which parts are overdue or due within two days with their blocking operation." } }],
  }));

  return server;
}
