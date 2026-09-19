---
title: MCP Server Demo Guide
description: Scenarios that show what an AI agent can do in Eryxon Flow through the MCP server.
---

Set the server up first: [MCP Server Setup](/guides/mcp-setup/). Tool names below are the ones the agent uses; the full list is in the [MCP Server Reference](/api/mcp-server-reference/).

## Scenario 1: an order from scratch

1. "Create job JOB-2026-0042 for customer Acme, due next Friday." → `create_job`
2. "Add part BRACKET-01, 12 pieces, S235 3 mm, with routing laser cutting → bending → powder coating." → `create_part` with `operations` (cells looked up with `fetch_cells`)
3. "Show the routing." → `get_part_routing`
4. "Mark the whole job as a rush order." → `prioritize_job`

## Scenario 2: production on the floor

1. "Start laser cutting on BRACKET-01 for operator Jan." → `start_operation` with `operator_id`
2. "Jan is done, 12 good, 0 scrap." → `report_production`, then `complete_operation`
3. "Start bending now." → `start_operation`. With sequential release on and laser cutting not completed the tool returns `INVALID_STATE_TRANSITION: Previous operation must be completed first`.
4. "Who is clocked on right now?" → resource `eryxon://timers` or `fetch_active_time_entries`

## Scenario 3: a problem at a cell

1. "Report a standstill on the bending operation: tool broke, high severity." → `create_issue` with `causes_standstill: true` (the operation is parked under a Yellow Card)
2. "What is blocked right now?" → `fetch_issues` with `causes_standstill: true`, `status: pending`
3. "Tool replaced, resolve it." → `resolve_issue`
4. "Scrap 2 pieces, reason burr." → `fetch_scrap_reasons`, `report_production` with `scrap_reasons`

## Scenario 4: planning

1. "Which parts are due in the next three days and what blocks them?" → `get_parts_due_soon`
2. "How full is the bending cell?" → `get_cell_capacity` or `eryxon://cells/{id}/wip`
3. "Shift every open operation of JOB-2026-0042 by two days." → `reschedule_operations`
4. "Suggest how to fit a rush job in." → `suggest_reschedule`, or the `release-plan-for-job` prompt

## Scenario 5: quality review

- "Scrap by reason for the last 30 days." → `get_scrap_analytics`
- "Pareto of scrap reasons." → `get_scrap_pareto`
- "Recurring root causes this quarter." → `get_root_cause_analysis`
- "Quality score for last month." → `get_quality_score`

## Scenario 6: workshop configuration

- "Add a cell Deburring after bending with a WIP limit of 6." → `create_cell`
- "Register laser 2 as a machine." → `create_resource`
- "Create operator Piet with PIN 4711." → `create_operator`
- "Block starting an operation before the previous one is done." → `update_workshop_settings` with `{"feature_flags": {"sequentialRelease": true}}`
- "Send operation.completed events to https://erp.example/hook." → `create_webhook`
- "Friday 2 October 2026 is a holiday." → `set_calendar_day`

## Scenario 7: shift handover

Run the `shift-handover` prompt. It reads the running timers, the open standstills and the parts due within two days and writes the handover note.

## Scenario 8: a confirmed delete

"Delete the Deburring cell." → `delete_cell` answers with a confirmation request (multi-round-trip); the client shows "Delete cell …?", the agent confirms, and the retry performs the delete. Declining leaves the cell in place.

## Notes for a demo

- Use a workshop with a few jobs, cells and operators; `seed_default_scrap_reasons` fills the scrap reason list.
- Refusals are part of the demo: the agent sees the production rule in the error message and can explain it.
- Everything the agent does is visible in the app immediately and appears in `fetch_activity_log`.
