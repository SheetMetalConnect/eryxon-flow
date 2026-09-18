import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, IDEMPOTENT_WRITE, actor, tool } from "../tool.js";
import { deleteTool, fetchTool, updateTool } from "./crud.js";

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const count = (map: Record<string, number>, key: string) => (map[key] = (map[key] ?? 0) + 1);

type IssueRow = {
  severity: string | null; status: string; ncr_category?: string | null; created_at: string; updated_at: string;
  root_cause?: string | null; corrective_action?: string | null;
  operations?: { operation_name: string | null; cells?: { name: string } | null } | null;
};

const ncrFields = {
  ncr_category: s.ncrCategory.optional(), affected_quantity: z.number().int().min(0).optional(), disposition: s.ncrDisposition.optional(),
  root_cause: z.string().optional(), corrective_action: z.string().optional(), preventive_action: z.string().optional(),
};

export const issueTools = [
  fetchTool({
    table: "issues", title: "Fetch issues", description: "Issues and NCRs with operation, part and job context.",
    select: "*, operations(operation_name, parts(part_number, jobs(job_number)))",
    filters: { status: s.issueStatus.optional(), severity: s.issueSeverity.optional(), issue_type: s.issueType.optional(), operation_id: s.id.optional(), causes_standstill: z.boolean().optional() },
    orderBy: { column: "created_at" }, softDelete: false,
  }),
  tool({
    name: "create_issue",
    title: "Report issue",
    description: "Report an issue on an operation like the terminal's Report Issue. causes_standstill=true parks the operation under a Yellow Card until the issue is resolved. issue_type 'ncr' makes it a non-conformance report.",
    input: {
      operation_id: s.id, description: z.string().min(1), severity: s.issueSeverity.default("medium"), issue_type: s.issueType.default("general"),
      title: z.string().optional(), causes_standstill: z.boolean().default(false), current_cell_id: s.id.optional(), intended_next_cell_id: s.id.optional(),
      created_by: s.id.optional(), reported_by_id: s.id.optional(), ...ncrFields,
    },
    output: s.ROW,
    annotations: WRITE,
    async handler({ created_by, ...issue }, supabase) {
      const { data, error } = await supabase.from("issues").insert({ ...issue, created_by: actor(created_by), status: "pending" }).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  }),
  updateTool({
    table: "issues", name: "update_issue", title: "Update issue",
    description: "Edit severity, NCR fields or notes. Use resolve_issue to close it.",
    fields: { title: z.string().optional(), description: z.string().optional(), severity: s.issueSeverity.optional(), resolution_notes: z.string().optional(), verification_required: z.boolean().optional(), ...ncrFields },
  }),
  tool({
    name: "resolve_issue",
    title: "Resolve issue",
    description: "Set an issue to approved, rejected or closed with resolution notes. Resolving a standstill issue lifts the Yellow Card from its operation.",
    input: { id: s.id, status: z.enum(["approved", "rejected", "closed"]).default("closed"), resolution_notes: z.string().optional(), reviewed_by: s.id.optional() },
    output: { id: z.string(), status: z.string() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ id, status, resolution_notes, reviewed_by }, supabase) {
      const { data, error } = await supabase.from("issues")
        .update({ status, resolution_notes, reviewed_by: reviewed_by ?? process.env.MCP_ACTOR_ID ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  }),
  deleteTool({ table: "issues", name: "delete_issue", title: "Delete issue", description: "Delete an issue permanently.", softDelete: false }),
  tool({
    name: "get_issue_analytics", title: "Issue analytics",
    description: "Issue counts over a period grouped by severity, status, NCR category, cell or operation, with average resolution time.",
    input: { days: s.days, group_by: z.enum(["severity", "status", "ncr_category", "cell", "operation"]).default("severity") },
    output: { total_issues: z.number(), grouped_data: z.record(z.string(), z.number()), avg_resolution_days: z.number() }, annotations: READ,
    async handler({ days, group_by }, supabase) {
      const { data, error } = await supabase.from("issues").select("severity, status, ncr_category, created_at, updated_at, operations(operation_name, cells(name))").gte("created_at", since(days));
      if (error) throw error;
      const grouped: Record<string, number> = {};
      let resolved = 0, resolutionDays = 0;
      for (const issue of data as unknown as IssueRow[]) {
        count(grouped, { severity: issue.severity ?? "unknown", status: issue.status, ncr_category: issue.ncr_category ?? "none", cell: issue.operations?.cells?.name ?? "Unknown", operation: issue.operations?.operation_name ?? "Unknown" }[group_by]);
        if (issue.status === "approved" || issue.status === "closed") { resolved++; resolutionDays += (Date.parse(issue.updated_at) - Date.parse(issue.created_at)) / 86_400_000; }
      }
      return { period_days: days, group_by, total_issues: data.length, grouped_data: grouped, avg_resolution_days: resolved ? Math.round((resolutionDays / resolved) * 10) / 10 : 0 };
    },
  }),
  tool({
    name: "get_issue_trends", title: "Issue trends", description: "Issues per day or week over a period, split by severity.",
    input: { days: s.days, interval: z.enum(["daily", "weekly"]).default("daily") },
    output: { data: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler({ days, interval }, supabase) {
      const { data, error } = await supabase.from("issues").select("severity, created_at").gte("created_at", since(days)).order("created_at");
      if (error) throw error;
      const buckets: Record<string, { total: number; by_severity: Record<string, number> }> = {};
      for (const issue of data) {
        const entry = (buckets[bucket(issue.created_at, interval)] ??= { total: 0, by_severity: {} });
        entry.total++; count(entry.by_severity, issue.severity ?? "unknown");
      }
      return { interval, period_days: days, data: Object.entries(buckets).map(([date, v]) => ({ date, ...v })) };
    },
  }),
  tool({
    name: "get_root_cause_analysis", title: "Root cause analysis", description: "Recurring root causes over a period with affected cells and sample corrective actions.",
    input: { days: s.days.default(90), min_occurrences: z.number().int().min(1).default(2) },
    output: { common_root_causes: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler({ days, min_occurrences }, supabase) {
      const { data, error } = await supabase.from("issues").select("root_cause, corrective_action, severity, operations(operation_name, cells(name))").gte("created_at", since(days)).not("root_cause", "is", null);
      if (error) throw error;
      const causes: Record<string, { count: number; severities: Record<string, number>; cells: Set<string>; actions: Set<string> }> = {};
      for (const issue of data as unknown as IssueRow[]) {
        const key = issue.root_cause?.toLowerCase().trim();
        if (!key) continue;
        const entry = (causes[key] ??= { count: 0, severities: {}, cells: new Set(), actions: new Set() });
        entry.count++;
        if (issue.severity) count(entry.severities, issue.severity);
        if (issue.operations?.cells?.name) entry.cells.add(issue.operations.cells.name);
        if (issue.corrective_action) entry.actions.add(issue.corrective_action);
      }
      const common = Object.entries(causes).filter(([, v]) => v.count >= min_occurrences).map(([root_cause, v]) => ({
        root_cause, occurrence_count: v.count, most_common_severity: Object.entries(v.severities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        affected_cells: [...v.cells], sample_corrective_actions: [...v.actions].slice(0, 3),
      })).sort((a, b) => b.occurrence_count - a.occurrence_count);
      return { period_days: days, min_occurrences, total_with_root_cause: data.length, common_root_causes: common };
    },
  }),
];

export function bucket(timestamp: string, interval: "daily" | "weekly") {
  const date = new Date(timestamp);
  if (interval === "weekly") date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
