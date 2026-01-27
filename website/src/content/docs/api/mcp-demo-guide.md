---
title: MCP Server Demo Guide
description: Step-by-step instructions for demonstrating the Eryxon Flow MCP Server capabilities.
---

This guide provides step-by-step instructions for demonstrating the Eryxon Flow MCP Server capabilities.


This guide provides step-by-step instructions for demonstrating the Eryxon Flow MCP Server capabilities.

## Prerequisites

Before the demo, ensure you have:

1. **Environment Variables Set**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_KEY="your-service-key"
   export OPENAI_API_KEY="sk-..."  # Optional, for AI chat features
   ```

2. **Server Built and Ready**
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

3. **Sample Data** - Ensure your Supabase database has some sample jobs, parts, and operations for demonstration.

## Quick Start

### Start the MCP Server

```bash
npm start
# or for development with hot reload:
npm run dev
```

You should see:
```
Eryxon Flow MCP Server v2.3.0
Loaded 55 tools from 10 modules
Eryxon Flow MCP Server running on stdio
```

### Configure Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key"
      }
    }
  }
}
```

---

## Demo Scenarios

### Scenario 1: Basic Job Management (5 min)

**Objective**: Show basic CRUD operations for manufacturing jobs.

1. **Fetch Current Jobs**
   ```
   "Show me all jobs currently in progress"
   ```
   The AI will use `fetch_jobs` with `status: "in_progress"`.

2. **Create a New Job**
   ```
   "Create a new job for customer 'Acme Corp' with job number 'JOB-2024-0042' due next Friday"
   ```
   Uses `create_job` tool.

3. **Update Job Priority**
   ```
   "Change job JOB-2024-0042 to high priority"
   ```
   Uses `update_job` tool.

4. **Start the Job**
   ```
   "Start job JOB-2024-0042"
   ```
   Uses `start_job` tool.

---

### Scenario 2: Production Dashboard (3 min)

**Objective**: Demonstrate real-time production metrics.

1. **Get Dashboard Stats**
   ```
   "Show me the current production dashboard stats"
   ```
   Uses `get_dashboard_stats`.

2. **View QRM Capacity**
   ```
   "What's our current cell capacity utilization?"
   ```
   Uses `get_qrm_data`.

3. **Production Metrics**
   ```
   "Show me production metrics for the last 7 days"
   ```
   Uses `get_production_metrics`.

---

### Scenario 3: AI-Powered Analysis (5 min)

**Objective**: Showcase natural language AI capabilities.

1. **Ask a Natural Language Question**
   ```
   "What are the most common quality issues we've seen this month?"
   ```
   Uses `chat_query` with context: "quality".

2. **Get Job Summary**
   ```
   "Give me an AI summary of our job status focusing on any delays"
   ```
   Uses `chat_summarize_jobs` with focus: "delays".

3. **Quality Analysis**
   ```
   "Analyze our quality issues and give me recommendations"
   ```
   Uses `chat_analyze_quality` with `include_recommendations: true`.

4. **Get Action Suggestions**
   ```
   "What actions should we take to address bottlenecks?"
   ```
   Uses `chat_suggest_actions` with focus_area: "bottlenecks".

---

### Scenario 4: Rush Order Handling (5 min)

**Objective**: Demonstrate agent batch operations for handling urgent orders.

1. **Prioritize a Rush Job**
   ```
   "We have a rush order from customer 'Premium Parts Inc'.
   Prioritize job JOB-2024-0035, mark all parts as bullet cards,
   and add a note about the customer's deadline."
   ```
   Uses `prioritize_job`.

2. **Check Resource Availability**
   ```
   "What machines are available to work on this rush job?"
   ```
   Uses `check_resource_availability`.

3. **Get Parts Due Soon**
   ```
   "What parts are due in the next 3 days?"
   ```
   Uses `get_parts_due_soon`.

4. **Suggest Reschedule**
   ```
   "Suggest a reschedule plan to accommodate this rush order"
   ```
   Uses `suggest_reschedule`.

---

### Scenario 5: ERP Integration (5 min)

**Objective**: Show bidirectional sync with external ERP systems.

1. **Check Sync Differences**
   ```
   "Compare our current jobs with this ERP data and show me the differences:
   [
     { external_id: 'SAP-123', external_source: 'SAP', job_number: 'JOB-001', customer: 'Acme' },
     { external_id: 'SAP-124', external_source: 'SAP', job_number: 'JOB-002', customer: 'Beta Corp' }
   ]"
   ```
   Uses `erp_sync_diff`.

2. **Lookup External ID**
   ```
   "Find the local job for SAP external ID 'SAP-123'"
   ```
   Uses `erp_lookup_external_id`.

3. **Execute Sync**
   ```
   "Sync this ERP data with our system, skipping unchanged records"
   ```
   Uses `erp_sync_execute`.

---

### Scenario 6: Shipping & Logistics (5 min)

**Objective**: Demonstrate shipping management capabilities.

1. **Check Jobs Ready for Shipping**
   ```
   "What jobs are ready to be shipped?"
   ```
   Uses `get_jobs_ready_for_shipping`.

2. **Get Shipping Status**
   ```
   "Show me all pending shipments for customer 'Acme Corp'"
   ```
   Uses `get_shipping_status`.

3. **Find Consolidation Opportunities**
   ```
   "Find opportunities to consolidate shipments going to the same destination"
   ```
   Uses `find_shipping_consolidation`.

4. **Plan Shipping**
   ```
   "Plan shipping for jobs JOB-001 and JOB-002, consolidating where possible"
   ```
   Uses `plan_shipping`.

---

### Scenario 7: Operations Management (5 min)

**Objective**: Show granular operation control.

1. **Fetch Operations**
   ```
   "Show me all operations for job JOB-2024-0035"
   ```
   Uses `fetch_operations`.

2. **Start an Operation**
   ```
   "Start the laser cutting operation"
   ```
   Uses `start_operation`.

3. **Complete Multiple Operations**
   ```
   "Complete operations OP-001 and OP-002"
   ```
   Uses `batch_complete_operations`.

4. **Assign Resources**
   ```
   "Assign Machine #3 to operations OP-003 and OP-004"
   ```
   Uses `assign_resource_to_operations`.

---

### Scenario 8: Quality & NCR Management (5 min)

**Objective**: Demonstrate issue tracking and NCR workflow.

1. **Fetch Open Issues**
   ```
   "Show me all critical issues that are currently open"
   ```
   Uses `fetch_issues` with severity: "critical", status: "open".

2. **Create an NCR**
   ```
   "Create a Non-Conformance Report for operation OP-005:
   - Title: 'Dimensional out of tolerance'
   - Severity: high
   - Category: process
   - Description: 'Part dimensions exceed tolerance by 0.5mm'"
   ```
   Uses `create_ncr`.

3. **Update Issue Status**
   ```
   "Mark issue ISS-001 as resolved"
   ```
   Uses `update_issue`.

---

## Demo Tips

### Before the Demo

- [ ] Verify all environment variables are set correctly
- [ ] Test the server starts without errors
- [ ] Ensure sample data exists in the database
- [ ] Have Claude Desktop configured and connected
- [ ] Test a few basic queries to warm up the connection

### During the Demo

1. **Start Simple** - Begin with basic fetch operations to show the connection works
2. **Build Complexity** - Progress to more complex scenarios
3. **Show Real Data** - Always use real database data, never mock data
4. **Highlight AI Capabilities** - The AI chat tools are often the most impressive
5. **Demonstrate Batch Operations** - Show efficiency gains from batch tools

### Common Questions & Answers

**Q: How does authentication work?**
A: The MCP server uses a Supabase service key for database access. In production, you would also implement MCP authentication keys for per-tenant access control.

**Q: Can this integrate with our existing ERP?**
A: Yes! The ERP sync tools support bidirectional synchronization with any external system. Just map your external IDs and sources.

**Q: What happens if OpenAI is not configured?**
A: The server still works - only the AI chat tools (`chat_*`) will return errors. All other 50 tools function normally.

**Q: How is data security handled?**
A: All data access goes through Supabase with Row-Level Security (RLS). The MCP server respects tenant boundaries.

---

## Troubleshooting

### Server Won't Start

```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Rebuild
npm run build

# Check for errors
npm start 2>&1 | head -20
```

### Tools Not Appearing in Claude

1. Restart Claude Desktop
2. Check the MCP configuration file syntax
3. Verify the path to `dist/index.js` is correct
4. Check Claude Desktop logs

### Database Connection Errors

```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.from('jobs').select('count').single().then(console.log);
"
```

### AI Chat Not Working

1. Verify `OPENAI_API_KEY` is set
2. Check the API key has sufficient quota
3. Test with a simple query first

---

## Tool Reference Quick Card

| Category | Tools | Key Use Case |
|----------|-------|--------------|
| **Jobs** | fetch_jobs, create_job, update_job, start_job, stop_job, complete_job, resume_job | Full job lifecycle |
| **Parts** | fetch_parts, update_part | Part tracking |
| **Operations** | fetch_operations, start_operation, pause_operation, complete_operation, update_operation | Operation control |
| **Tasks** | fetch_tasks, update_task | Task assignment |
| **Issues** | fetch_issues, create_ncr, fetch_ncrs, update_issue | Quality tracking |
| **Substeps** | fetch_substeps, add_substep, complete_substep, update_substep, delete_substep | Granular tracking |
| **Dashboard** | get_dashboard_stats, get_qrm_data, get_production_metrics | Real-time metrics |
| **AI Chat** | chat_query, chat_summarize_jobs, chat_analyze_quality, chat_explain_data, chat_suggest_actions | AI analysis |
| **ERP Sync** | erp_sync_diff, erp_sync_execute, erp_lookup_external_id, erp_sync_status, erp_batch_lookup, erp_resolve_ids | Integration |
| **Batch Ops** | 16 tools for bulk operations | Efficiency |

---

## Next Steps After Demo

1. **Production Setup** - Configure proper authentication keys
2. **ERP Integration** - Map your external system IDs
3. **Custom Tools** - Extend with business-specific tools
4. **Monitoring** - Set up MCP activity monitoring in the admin UI

For more details, see the main [README.md](../README.md) and [MCP_INTEGRATION.md](../../docs/MCP_INTEGRATION.md).
