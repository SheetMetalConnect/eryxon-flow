# Eryxon Flow MCP Server

MCP server for Eryxon Flow, protocol revision **2026-07-28** only. It gives an AI agent the same production capabilities as the app: jobs, parts and routings, the operation lifecycle, batches, output and scrap reporting, issues and Yellow Cards, cells, resources, operators, calendar, webhooks and workshop settings. Every write goes through the database functions the app uses (`transition_operation`, `time_entry_action`, `transition_batch`, `add_batch_operations`), so production rules and webhook events behave identically.

Built on `@modelcontextprotocol/server` and `@modelcontextprotocol/node` 2.0 (`McpServer`, `createMcpHandler`, `serveStdio`). Version 3.0.0.

## Run

```bash
npm ci
npm run build
SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_KEY=... TENANT_ID=<workshop uuid> npm start
node dist/index.js --version   # eryxon-flow-mcp 3.0.0 (MCP 2026-07-28)
```

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | yes | | Service-role access; run only on trusted infrastructure |
| `TENANT_ID` | recommended | | Pins every query and insert to one workshop |
| `MCP_ACTOR_ID` | for attributed writes | | Profile id stamped on issues (`created_by`), assignments (`assigned_by`), reports (`recorded_by`) when the call gives none |
| `MCP_STATE_KEY` | multi-instance HTTP | random per process | HMAC key that seals `requestState` between rounds of a multi-round-trip tool |
| `MCP_TRANSPORT` | no | `stdio` | `stdio` or `http` |
| `MCP_PORT`, `MCP_HOST` | no | `3001`, `127.0.0.1` | HTTP bind |
| `MCP_BIND_PUBLIC` | no | `false` | Must be `true` to bind `0.0.0.0`; then `MCP_BEARER` is mandatory |
| `MCP_BEARER` | no | | Bearer token checked on every `/mcp` request |
| `MCP_ALLOWED_HOSTS` | no | `localhost,127.0.0.1,[::1]` | Host-header allow-list for HTTP |

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": { "SUPABASE_URL": "https://your-project.supabase.co", "SUPABASE_SERVICE_KEY": "…", "TENANT_ID": "…", "MCP_ACTOR_ID": "…" }
    }
  }
}
```

HTTP: `docker compose up` with `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `MCP_BEARER` in `.env`. The endpoint is `POST http://host:3001/mcp`, stateless: every request builds a fresh server, there is no session id, so any number of instances can sit behind a plain load balancer (set one `MCP_STATE_KEY` for all of them). `GET /health` reports database reachability, version, protocol and tool count.

## Contract

- Protocol 2026-07-28 only: `server/discover` negotiation, per-request `_meta` envelope, standard headers (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`) validated on every request, `_meta['io.modelcontextprotocol/serverInfo']` on every result. A 2025-era `initialize` is answered `-32022 Unsupported protocol version`.
- Every tool has a `title`, a JSON-Schema `inputSchema` and `outputSchema` (from zod), and annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`). Results carry `structuredContent` plus a JSON text block. `tools/list`, `prompts/list` and `resources/list` advertise a one-hour shared cache; the tool order is stable (sorted by name).
- Deletes are multi-round-trip: the first call returns `input_required` with a confirmation elicitation and a sealed `requestState`; the retry with `inputResponses.confirm.content.confirm = true` performs the delete. Tampered or expired state is refused with `-32602` before the handler runs.
- A production rule that refuses a transition (SQLSTATE `22023`, e.g. `Stop active work before starting another operation`, `Previous operation must be completed first`) comes back as `isError: true` with `{"error":{"code":"INVALID_STATE_TRANSITION","message":"<rule text>"}}`. Missing rows are `NOT_FOUND`, duplicates `DUPLICATE_ENTRY`; invalid arguments are rejected by the SDK before the handler runs.
- Job and part status, and the current cell, are derived from operations; no tool sets them directly.
- Resources: `eryxon://jobs`, `eryxon://jobs/{jobId}`, `eryxon://cells`, `eryxon://cells/{cellId}/wip`, `eryxon://timers`. Prompts: `release-plan-for-job`, `shift-handover`.

## Tools

### Jobs (4)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `create_job` | Create job | write | Create a job. Add parts with create_part (optionally with their operations) afterwards. |
| `delete_job` | Delete job | write, destructive | Soft-delete a job (deleted_at). Asks for confirmation before deleting. |
| `fetch_jobs` | Fetch jobs | read, idempotent | List jobs; status and current cell follow their operations. |
| `update_job` | Update job | write, idempotent | Update job details. Status cannot be set; it follows the operations. |

### Parts (7)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `attach_part_file` | Attach part file | write | Register an uploaded file path on a part so the terminal shows it (PDF → drawing, STEP/STP → 3D model). |
| `create_part` | Create part | write | Create a part on a job, optionally with its routing (operations in sequence). Same contract as POST api-parts. |
| `delete_part` | Delete part | write, destructive | Soft-delete a part. Asks for confirmation before deleting. |
| `fetch_parts` | Fetch parts | read, idempotent | List parts with job number and customer. |
| `get_part_routing` | Part routing | read, idempotent | The operations of a part in sequence with cell, status and hours (get_part_routing). |
| `request_part_file_upload` | Part file upload URL | write | Signed upload URL (15 min) for a drawing/CAD file in the parts-cad bucket. PUT the file there, then call attach_part_file. |
| `update_part` | Update part | write, idempotent | Update part details. Status and current cell follow the part's operations. |

### Operations (16)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `complete_operation` | Complete operation | write, idempotent | Complete a started operation: closes running timers, stores actual time and refreshes part and job status. |
| `complete_operations` | Complete operations in bulk | write | Complete every open operation of a job, part or cell (or explicit ids) through the production lifecycle, in sequence order. Each transition is its own transaction; on failure the result says how far it got. |
| `create_operation` | Create operation | write | Add an operation to a part's routing at a cell. Sequence orders the routing; sequential release uses it. |
| `delete_operation` | Delete operation | write, destructive | Soft-delete an operation from the routing. Asks for confirmation before deleting. |
| `fetch_active_time_entries` | Active timers | read, idempotent | All running timers (end_time is null) with operation and part. |
| `fetch_operations` | Fetch operations | read, idempotent | List operations with part and job numbers. |
| `fetch_time_entries` | Fetch time entries | read, idempotent | Time entries per operation or operator; active ones have no end_time. |
| `pause_operation` | Pause operation | write, idempotent | Pause an in-progress operation and close its running timers. |
| `pause_time_entry` | Pause time entry | write, idempotent | Pause time entry (time_entry_action). Pausing keeps the operation in progress; stopping closes the timer and stores its duration. |
| `reschedule_operations` | Reschedule operations | write | Set or shift planned dates for operations selected by job, part, cell, customer or explicit ids. |
| `resume_operation` | Resume operation | write, idempotent | Resume a paused operation. |
| `resume_time_entry` | Resume time entry | write, idempotent | Resume time entry (time_entry_action). Pausing keeps the operation in progress; stopping closes the timer and stores its duration. |
| `start_operation` | Start operation | write, idempotent | Start an operation (transition_operation). With operator_id a timer opens for that operator. Rule violations (already clocked elsewhere, standstill, sequential release) return INVALID_STATE_TRANSITION with the rule text. |
| `stop_operation` | Stop operator timer | write, idempotent | Stop the given operator's timer on an operation without completing it. |
| `stop_time_entry` | Stop time entry | write, idempotent | Stop time entry (time_entry_action). Pausing keeps the operation in progress; stopping closes the timer and stores its duration. |
| `update_operation` | Update operation | write, idempotent | Update routing (cell, sequence), times, planning dates or notes. Use the lifecycle tools to change status. |

### Batches (7)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `add_batch_operations` | Add operations to batch | write, idempotent | Append operations to a batch (add_batch_operations); already-member operations are ignored. |
| `create_batch` | Create batch | write | Create a batch at a cell and optionally add operations to it (same rules as POST api-batches: automated mode only for laser_nesting). |
| `delete_batch` | Delete batch | write, destructive | Delete a batch and its memberships. Asks for confirmation before deleting. |
| `fetch_batches` | Fetch batches | read, idempotent | Operation batches (nestings, tube/saw/finishing batches) with their cell. |
| `start_batch` | Start batch | write, idempotent | Start batch (transition_batch): starts every member operation and opens the operator's batch timer. |
| `stop_batch` | Stop batch | write, idempotent | Stop batch (transition_batch): stops the batch timer and pauses its operations. |
| `update_batch` | Update batch | write, idempotent | Update batch details or mark it ready/cancelled. Membership changes go through add_batch_operations. |

### Substeps (7)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `add_substep` | Add substep | write | Add a substep to an operation; sequence defaults to the next free number. |
| `apply_substep_template` | Apply substep template | write | Copy a template's items onto an operation as substeps, after its existing ones. |
| `complete_substep` | Complete substep | write, idempotent | Mark a substep completed. |
| `delete_substep` | Delete substep | write, destructive | Delete a substep permanently. |
| `fetch_substep_templates` | Fetch substep templates | read, idempotent | Reusable substep checklists per operation type. |
| `fetch_substeps` | Fetch substeps | read, idempotent | List the substeps of an operation in sequence order. |
| `update_substep` | Update substep | write, idempotent | Rename, reorder or annotate a substep. |

### Quality (12)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `create_scrap_reason` | Create scrap reason | write | Add a scrap reason code. |
| `delete_production_report` | Delete production report | write, destructive | Remove a quantity report. Asks for confirmation before deleting. |
| `fetch_operation_quantities` | Fetch production reports | read, idempotent | Reported good/scrap/rework quantities per operation. |
| `fetch_scrap_reasons` | Fetch scrap reasons | read, idempotent | Configured scrap reason codes. |
| `get_quality_score` | Quality score | read, idempotent | A 0-100 quality score from yield (50%), weighted issues (30%) and issue resolution speed (20%). |
| `get_scrap_analytics` | Scrap analytics | read, idempotent | Scrap totals over a period grouped by reason, cell, operation or material. |
| `get_scrap_pareto` | Scrap Pareto | read, idempotent | Top scrap reasons with share and cumulative share of total scrap. |
| `get_scrap_trends` | Scrap trends | read, idempotent | Scrap, good and produced quantities per day or week. |
| `get_yield_metrics` | Yield metrics | read, idempotent | First-pass yield, scrap rate and rework rate overall and per cell. |
| `report_production` | Report production | write | Record output on an operation the way the terminal does: good, scrap and rework quantities with optional scrap reasons and material traceability. |
| `seed_default_scrap_reasons` | Seed default scrap reasons | write, idempotent | Insert the standard scrap reason set for the workshop (seed_default_scrap_reasons). |
| `update_scrap_reason` | Update scrap reason | write, idempotent | Edit or deactivate a scrap reason. |

### Issues (8)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `create_issue` | Report issue | write | Report an issue on an operation like the terminal's Report Issue. causes_standstill=true parks the operation under a Yellow Card until the issue is resolved. issue_type 'ncr' makes it a non-conformance report. |
| `delete_issue` | Delete issue | write, destructive | Delete an issue permanently. Asks for confirmation before deleting. |
| `fetch_issues` | Fetch issues | read, idempotent | Issues and NCRs with operation, part and job context. |
| `get_issue_analytics` | Issue analytics | read, idempotent | Issue counts over a period grouped by severity, status, NCR category, cell or operation, with average resolution time. |
| `get_issue_trends` | Issue trends | read, idempotent | Issues per day or week over a period, split by severity. |
| `get_root_cause_analysis` | Root cause analysis | read, idempotent | Recurring root causes over a period with affected cells and sample corrective actions. |
| `resolve_issue` | Resolve issue | write, idempotent | Set an issue to approved, rejected or closed with resolution notes. Resolving a standstill issue lifts the Yellow Card from its operation. |
| `update_issue` | Update issue | write, idempotent | Edit severity, NCR fields or notes. Use resolve_issue to close it. |

### Config (33)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `create_assignment` | Assign work | write | Assign a job or part to an operator (profile) or shop-floor operator. |
| `create_cell` | Create cell | write | Add a production cell/stage. |
| `create_material` | Create material | write | Add a material to the catalogue. |
| `create_operator` | Create operator | write | Create a shop-floor operator with a PIN (create_operator_with_pin). |
| `create_resource` | Create resource | write | Add a machine, tool or fixture. |
| `create_webhook` | Create webhook | write | Subscribe an HTTPS URL to events. Every delivery is signed with the secret (X-Eryxon-Signature: t=<unix>,v1=<hmac>). |
| `delete_assignment` | Remove assignment | write, destructive | Remove an operator assignment. Asks for confirmation before deleting. |
| `delete_calendar_day` | Delete calendar day | write, destructive | Remove a calendar exception. Asks for confirmation before deleting. |
| `delete_cell` | Delete cell | write, destructive | Soft-delete a cell; operations routed through it keep their history. Asks for confirmation before deleting. |
| `delete_material` | Delete material | write, destructive | Remove a material from the catalogue. Asks for confirmation before deleting. |
| `delete_resource` | Delete resource | write, destructive | Soft-delete a resource. Asks for confirmation before deleting. |
| `delete_webhook` | Delete webhook | write, destructive | Remove a webhook subscription. Asks for confirmation before deleting. |
| `fetch_assignments` | Fetch assignments | read, idempotent | Operator assignments to jobs or parts. |
| `fetch_cells` | Fetch cells | read, idempotent | Production cells (stages) in routing order with WIP limits. |
| `fetch_factory_calendar` | Fetch factory calendar | read, idempotent | Calendar exceptions: holidays, closures, half days and special working days. |
| `fetch_materials` | Fetch materials | read, idempotent | Material catalogue. |
| `fetch_resources` | Fetch resources | read, idempotent | Machines, tools and fixtures. |
| `fetch_webhook_deliveries` | Fetch webhook deliveries | read, idempotent | Delivery records per webhook: event, outcome, status code, attempts, latency and error. |
| `fetch_webhooks` | Fetch webhooks | read, idempotent | Outbound webhook subscriptions. |
| `get_workshop_settings` | Workshop settings | read, idempotent | Feature flags (sequentialRelease, operatorTerminalWorkModes, …), factory hours, timezone and location tracking of the workshop. |
| `list_operators` | List operators | read, idempotent | Shop-floor operators (PIN accounts) with lock state (list_operators). |
| `redeliver_webhook` | Redeliver webhook event | write, idempotent | Deliver a failed or past delivery again (webhook_redeliver). |
| `reset_operator_pin` | Reset operator PIN | write, idempotent | Set a new PIN for an operator (reset_operator_pin). |
| `send_test_webhook` | Send test webhook | write | Deliver a signed test event to a webhook (webhook_send_test); the result shows up in fetch_webhook_deliveries. |
| `set_calendar_day` | Set calendar day | write, idempotent | Create or replace the calendar entry for a date (holiday, closure, half day or working day with custom hours). |
| `unassign_resource` | Unassign resource | write, destructive | Remove a resource assignment from an operation. |
| `unlock_operator` | Unlock operator | write, idempotent | Clear a PIN lockout (unlock_operator). |
| `update_cell` | Update cell | write, idempotent | Rename, reorder or change WIP limits of a cell. |
| `update_material` | Update material | write, idempotent | Edit a material. |
| `update_operator` | Update operator | write, idempotent | Rename or deactivate an operator. |
| `update_resource` | Update resource | write, idempotent | Change a resource's status, location or details. |
| `update_webhook` | Update webhook | write, idempotent | Change name, URL, events, secret or activation. |
| `update_workshop_settings` | Update workshop settings | write, idempotent | Merge feature flags (e.g. {"sequentialRelease": true} to block starting an operation before its predecessor is completed) and change factory hours or location tracking. |

### Monitoring (8)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `create_notification` | Create notification | write | Post an in-app notification to a user (create_notification). |
| `fetch_activity_log` | Fetch activity log | read, idempotent | Audit trail of actions with actor and entity. |
| `fetch_notifications` | Fetch notifications | read, idempotent | In-app notifications. |
| `fetch_storage_locations` | Fetch storage locations | read, idempotent | Physical locations (racks, carts, shelves) used for part placement. |
| `get_cell_wip` | Cell WIP metrics | read, idempotent | QRM metrics for one cell: current WIP against its limit and the next-cell capacity signal the terminal shows (get_cell_qrm_metrics, check_next_cell_capacity). |
| `mark_notification_read` | Mark notification read | write, idempotent | Mark one notification as read (mark_notification_read). |
| `place_part` | Place part | write | Record where a part physically is (part_placements). Closes any open placement of that part first. |
| `remove_part_placement` | Remove part placement | write, idempotent | Close the open placement of a part (it left the location). |

### Dashboard (3)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `get_cell_capacity` | Cell capacity | read, idempotent | WIP against limits per cell: running and queued operations, queued hours and capacity warnings. |
| `get_dashboard_stats` | Dashboard stats | read, idempotent | Counts of jobs, parts, operations and issues by status. |
| `get_production_metrics` | Production metrics | read, idempotent | Completed jobs and operations plus good/scrap quantities and yield for a period (default last 30 days). |

### Planning (8)

| Tool | Title | Kind | Description |
|------|-------|------|-------------|
| `assign_resource_to_operations` | Assign resource | write, idempotent | Assign a resource (by id or name) to explicit operations or to all open operations of a job, part or cell. |
| `check_resource_availability` | Resource availability | read, idempotent | Active resources (machines, tools, fixtures) with their current operation assignments. |
| `fetch_parts_by_customer` | Parts by customer | read, idempotent | Open parts for a customer (case-insensitive match), grouped by job with operation progress. |
| `get_job_overview` | Job overview | read, idempotent | A job with its parts, operations, progress and issue counts. |
| `get_parts_due_soon` | Parts due soon | read, idempotent | Open parts whose job is due within N days, with progress and the next operation that blocks completion. |
| `prioritize_job` | Prioritize job | write, idempotent | Rush a job: sets the QRM bullet card on all its open parts and optionally appends a priority note. |
| `suggest_reschedule` | Suggest reschedule | read, idempotent | Capacity bottlenecks, consolidation options with the same customer and target-date feasibility for a job. |
| `update_parts` | Update parts in bulk | write, idempotent | Set the bullet-card flag or notes on all open parts of a job, or on explicit part ids. |

`src/coverage.ts` maps every app and REST capability to these tools; `npm test` fails when a capability has no tool or a tool is unmapped, and when the webhook event list drifts from the app's.

## Development

```bash
npm run dev      # stdio with reload
npm test         # vitest: protocol round-trips through createMcpHandler, MRTR, header validation, coverage
```
