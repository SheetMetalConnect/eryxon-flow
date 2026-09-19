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
**Quick Response Manufacturing (QRM)** is a methodology to reduce lead times. Eryxon Flow uses WIP limits and next-cell capacity signals to support that goal. A cell can optionally block the previous operation from completing when its WIP limit is reached.

### What is a bullet card?
A **bullet card** is the rush marker on a part. When set, the part jumps to the top of every queue and table, and every operation on it inherits the marker. Use it sparingly: if everything is urgent, nothing is.

### What is POLCA?
**POLCA** (Paired-cell Overlapping Loops of Cards with Authorization) is a workload control method. Eryxon Flow does not implement full POLCA or paired card loops. It uses the related idea of GO/PAUSE next-cell signals: **GO** means the next cell has capacity; **PAUSE** means its configured WIP limit has been reached.

### What are cells and stages?
**Cells** (also called **stages**) are the physical workstations or departments in your shop, such as "Laser 1", "Press brake", "Welding" or "Assembly". Operations are assigned to cells. Each cell has a WIP limit and capacity hours.

### What is the capacity matrix?
A visual overview of the load per cell per day. Each cell is a row, each day a column. Colours show available (green), loaded (orange) and overloaded (red). Use it to spot bottlenecks before they reach the floor.

### How does time tracking work?
Operators tap **Start** to start a timer and **Pause** to stop it. Only one operation is timed at a time; starting another operation stops the running one. The running timer is always visible in the status bar.

### What are issues (NCRs)?
Issues are quality problems operators report from an active operation: wrong material, damaged parts, machine trouble, drawing errors. They carry a severity (low/medium/high/critical) and can include photos. An issue blocks work only when it is marked as a standstill.

### What is metadata?
Jobs, parts and operations accept **custom JSON metadata**: machine settings, bend angles, weld parameters, tooling. These are free fields you fill as your shop needs.

## Specialized Guides

For detailed instructions, please refer to:

- **[Operator Manual](/guides/operator-manual/)** - Daily workflow, Terminal info, Time tracking.
- **[Admin Manual](/guides/admin-manual/)** - Job creation, Users, Settings.
- **[Quality Management](/guides/quality-management/)** - Scrap tracking and Dashboards.
- **[Troubleshooting](/guides/troubleshooting/)** - Common errors and fixes.
- **[Self Hosting](/guides/self-hosting/)** - Installation guide.
