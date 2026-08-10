# Work order / delivery dispatch

## Model
- **Work orders** = Eryxon `jobs` (no duplicate WO table)
- **Reservations** = `inventory_allocations` with optional `job_id` FK → `jobs`
- **Deliveries** = `inventory_dispatches` + `inventory_dispatch_lines`
- **Ship** = RPC `ship_inventory_dispatch(uuid)` issues allocations and decrements `qty_on_hand` / `qty_reserved`

## Routes
| Path | Page |
| --- | --- |
| `/admin/inventory/work-orders` | Material work orders (create job, reserve, dispatch) |
| `/admin/inventory/dispatch` | Pick reserved lines → create ticket → mark shipped |
| `/admin/inventory/calculator?jobId=` | Reserve stock onto a job |

## Flow
1. Create work order (or use existing Jobs)
2. Calculator → select work order → Allocate
3. Dispatch → select reserved lines → Create dispatch
4. Mark shipped → stock leaves inventory

## Migration
`supabase/migrations/20260807200000_inventory_dispatch.sql` (applied)
