---
title: "Troubleshooting"
description: "Common issues and solutions for Eryxon Flow."
---

## Common Issues

### 1. "I don't see any operations in my Work Queue"
- Check if work has been assigned to you.
- Clear all filters in the UI.
- Check "My Activity" - you might have completed them all.

### 2. Timer doesn't start (Click "Start Timing" fails)
- **Cause**: You likely have *another* operation still timing.
- **Fix**: Check the "Currently Timing" widget at the top of the screen. Stop that timer first.

### 3. 3D CAD viewer won't load
- Verify file is `.step` or `.stp` format.
- Max file size is **50MB**.
- Try re-exporting from CAD.
- Click **"Fit View"** (icon) if model is off-screen.

### 4. "Cannot complete - next cell at capacity"
- This is a **QRM restriction**. The destination cell is full.
- **Fix**: Wait for capacity, or ask Supervisor to increase limit/override.

### 5. Can't create new job (Admin)
- Check **My Plan** page. You might have hit the Hosted Alpha Trial limits.
- **Fix**: Delete old jobs or switch to Self-Hosted (Unlimited).

### 6. "Data export taking too long"
- Large datasets take 30-60s. **Do not close the tab.**
- CSV is faster than JSON.

## Reporting Bugs
If you find a system bug:
- **GitHub Issues**: [Report Here](https://github.com/SheetMetalConnect/eryxon-flow/issues)
