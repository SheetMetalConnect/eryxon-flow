---
title: "Employee Time & OEE Tracking"
description: "Track employee attendance, productivity, and overall equipment effectiveness (OEE) metrics."
---

Eryxon Flow provides comprehensive employee time tracking and OEE analytics.

## Setup Workflow

1. **Configure Shifts** - Admin → Settings → Factory Configuration
2. **Create Operators** - Admin → Configuration → Users → Add Operator (name, employee ID, 4-digit PIN)
3. **Deploy Terminal** - Operators use `/operator/login` to clock in via tap + PIN
4. **Train Staff** - Clock in → Start timing → Report production → Clock out

## Live Floor Status (`/admin/analytics/live-operators`)

- **Clocked In** / **On Job** / **Idle** counts
- Production output by cell (good/scrap/rework)
- Real-time operator locations

## Employee OEE (`/admin/analytics/employee-oee`)

- **Availability** = Attendance / Scheduled hours
- **Performance** = Productive / Attendance hours  
- **Quality** = Good parts / Total parts
- **OEE** = A × P × Q

## Production Reporting

Operators report good parts with traceability (lot, supplier, cert) and bad parts with scrap reasons.

## Best Practices

✅ Configure shifts first for accurate availability metrics
✅ Create operators before go-live
✅ Use consistent scrap reasons for quality analysis
✅ Review Live Floor Status during shifts
✅ Analyze OEE trends weekly
