---
title: "Help & FAQ"
description: "Frequently Asked Questions about Eryxon Flow."
---

## General Questions

### What represents the hierarchy in Eryxon Flow?
1. **Job** = Customer Order (e.g., "PO-12345")
2. **Part** = Component (e.g., "Bracket A")
3. **Operation** = Task (e.g., "Laser Cut", "Bend")

### How do assemblies work?
Assemblies are parts that contain other parts.
```
Bracket Assembly (Parent)
├── Left Plate (Child)
├── Right Plate (Child)
```
Each part is tracked individually with its own operations.

### What is QRM?
**Quick Response Manufacturing (QRM)** is a methodology to reduce lead times. Eryxon Flow uses it to manage **WIP (Work In Progress)**. If a cell is "At Capacity", the system prevents over-production by blocking upstream completions.

## Specialized Guides

For detailed instructions, please refer to:

- **[Operator Manual](./operator-manual)** - Daily workflow, Terminal info, Time tracking.
- **[Admin Manual](./admin-manual)** - Job creation, Users, Settings.
- **[Quality Management](./quality-management)** - Scrap tracking and Dashboards.
- **[Troubleshooting](./troubleshooting)** - Common errors and fixes.
- **[Self Hosting](./self-hosting)** - Installation guide.
