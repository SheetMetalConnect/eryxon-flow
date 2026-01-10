---
title: "Quality Management"
description: "Quality dashboards and scrap tracking"
---

Quality dashboards for real-time visibility into production metrics.

See also: [Workflow Engine](/architecture/workflow-engine/), [OEE Analytics](/architecture/connectivity-overview/)

### Jobs Page
- **Yield Rate**: Percentage of good parts vs total (Green >95%, Yellow >85%, Red <85%).
- **Production Stats**: Total produced, good parts, scrap logs.
- **Top Scrap Reasons**: Most frequently cited scrap codes for this job.

### Parts Page
- **Scrap Breakdown**: Visual breakdown by category (Material, Process, Equipment, Operator, Design).
- **Rework Quantities**: Track items that needed correction but weren't scrapped.

### Issue Queue
- **Resolution Rate**: Percentage of issues resolved.
- **Severity Breakdown**: Critical vs High vs Low.

## Scrap Configuration

Admins can configure Scrap Reasons in **Settings**:
- **Usage Statistics**: See which codes are used most.
- **Scrap by Category**: Breakdown of why scrap happens.
