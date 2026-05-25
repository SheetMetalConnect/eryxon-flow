# Eryxon Flow — Admin UI kit

Desktop, light-mode-primary surfaces for production planners and shop
managers.

## Files

- `index.html` — interactive dashboard with KPIs, jobs table (with
  routing flow paths), and a cell-capacity panel.
- `components.jsx` — React components.
- `styles.css` — admin layout & component CSS.

## What's in this kit

| Component | Purpose |
|---|---|
| `AdminSidebar` | Left rail — brand + grouped nav, urgent counters |
| `AdminHeader` | Sticky top bar — breadcrumb, page title, ⌘K search, notifications, primary action |
| `KpiTile` | Dashboard KPI with delta + trend |
| `JobsTable` | Dense table — mono job numbers, routing flow path, progress bar, status chip, due-date pill |
| `StatusChip` | MES work-order status pill (5 colors) |
| `FlowPath` | Inline horizontal route through stage cells |
| `CapacityRow` | Cell load bar with over-capacity overflow |

## Design rules in this kit

- **Sidebar 256 px** with grouped nav. Urgent counters use the danger
  tint, not red text.
- **Tables are dense** — 11 px uppercase column headers, 13 px body, 14
  px row padding. Job numbers and PO numbers in mono.
- **Routing visualisation** is a horizontal chain of 3-letter cell pills
  (CUT → BEN → WEL → FIN). Done = green, current = brand blue, future =
  muted.
- **Cell-capacity bar** uses warning amber when ≥ 80 %, plus an
  overflow red segment when > 100 %.
- **All primary numbers use tabular figures** (`font-feature-settings:
  'tnum'`).
- **Search is ⌘K-keyed.** Convention from the existing Flow command
  palette.

## Source

Recreated from:
- `src/components/AdminLayout.tsx`
- `src/pages/admin/Dashboard.tsx`
- `src/pages/admin/Jobs.tsx`
- `src/components/qrm/OperationsFlowVisualization.tsx` (routing path)
- `src/components/capacity/*` (capacity rows)
- `src/components/ui/{button,badge,card,input}.tsx` (shadcn primitives)

in [`SheetMetalConnect/eryxon-flow`](https://github.com/SheetMetalConnect/eryxon-flow).
