---
title: "Admin Manual"
description: "Guide for administrators on configuring and managing Eryxon Flow."
---

## Key Tasks

### Creating Jobs

1. Navigate to **Jobs → Create New Job**.
2. Enter Job details (Number, Customer, Due Date).
3. Add **Parts** (Number, Material, Quantity).
4. Add **Operations** to each part (Name, Cell, Est. Time, Sequence).
- *Tip:* Use `Cmd/Ctrl + N` for Quick Create menu.

### Assigning Work

1. Go to **Assignments** page.
2. Select part from dropdown.
3. Select operator.
4. Click "Assign".
- The operator will see this in their `/work-queue` immediately.

### Managing Issues

1. Go to **Issues** page.
2. Review pending issues.
3. **Approve** (valid issue), **Reject** (not an issue), or **Close** (resolved).
4. Add resolution notes.

### Data Export

> **Access:** `/admin/data-export` (Admin only)

Large datasets can take 30-60 seconds.
- **Included:** All database records, metadata, tenant info.
- **Not Included:** File attachments (only paths), API secrets (only prefixes).
- **Format:** JSON or CSV. CSV is typically faster.

## System Configuration

Go to **Settings** menu:

- **Stages/Cells**: Define workflow stages (Cutting, Bending, etc.).
  - **QRM Settings**:
    - `WIP Limit`: Max jobs allowed.
    - `Enforce Limit`: Blocks previous op from completing if full.
- **Materials**: Create material catalog.
- **Resources**: Track tools, fixtures, molds.
- **Users**: Manage operator and admin accounts.
- **API Keys**: Generate keys for integrations.
- **Webhooks**: Configure `operation.started`, `operation.completed`, etc.

## Best Practices

✅ **Set up workflow cells first** before creating jobs.
✅ **Create materials catalog** before adding jobs.
✅ **Review dashboard daily** to catch issues early.
✅ **Respond to issues quickly** to keep production moving.
✅ **Use due date overrides** when customer dates change.
✅ **Export data regularly** for backups (monthly recommended).
