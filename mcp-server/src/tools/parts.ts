/**
 * Parts domain tools
 * Handles part tracking and updates
 */

import type { ToolModule, ToolHandler } from "../types/index.js";
import { z } from "zod";
import { schemas } from "../utils/validation.js";
import { createFetchTool, createUpdateTool } from "../utils/tool-factories.js";

// Fetch parts with joins and filters
const { tool: fetchPartsTool, handler: fetchPartsHandler } = createFetchTool({
  tableName: 'parts',
  description: 'Fetch parts from the database with optional filters and pagination',
  selectFields: '*, jobs(job_number, customer_name)',
  filterFields: {
    job_id: schemas.id.optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'on_hold']).optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Update part
const { tool: updatePartTool, handler: updatePartHandler } = createUpdateTool({
  tableName: 'parts',
  description: "Update a part's status or properties",
  resourceName: 'part',
  updateSchema: z.object({
    id: schemas.id,
    status: z.enum(['pending', 'in_progress', 'completed', 'on_hold']).optional(),
    current_stage_id: schemas.id.optional(),
    drawing_no: z.string().optional(),
    cnc_program_name: z.string().optional(),
    is_bullet_card: z.boolean().optional(),
  }),
});

// Export module
export const partsModule: ToolModule = {
  tools: [fetchPartsTool, updatePartTool],
  handlers: new Map<string, ToolHandler>([
    ['fetch_parts', fetchPartsHandler],
    ['update_part', updatePartHandler],
  ]),
};
