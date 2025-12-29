# Backend-First Architecture Review: CAD Processing

**Date:** 2025-12-29
**Reviewer:** Claude
**Branch:** `claude/review-backend-architecture-N7iLQ`

---

## Executive Summary

The CAD processing architecture is designed with a **backend-first** approach where:
- **Backend (pythonocc-core)** is PRIMARY and REQUIRED for geometry + PMI extraction
- **Frontend WASM (occt-import-js)** is SECONDARY FALLBACK only for when backend fails

After reviewing the codebase, I identified **one location** where the backend-first flow is correctly implemented (OperatorView → DetailPanel) and **five locations** where STEPViewer is used without backend processing, defaulting immediately to WASM.

---

## Current Architecture Flow

### 1. Backend-First Flow (Correctly Implemented)

**Location:** `src/pages/operator/OperatorView.tsx:305-411`

```
User selects job
    ↓
Load STEP file from Supabase storage (create blob URL)
    ↓
Check if CAD service enabled (isCADServiceEnabled())
    ↓
Call backend processCAD() with signedUrl
    ↓
Backend returns { success, geometry, pmi, error }
    ↓
If success: setPmiData() + setGeometryData()
If error: Set null + show toast + fallback to WASM
    ↓
DetailPanel receives pmiData + serverGeometry
    ↓
STEPViewer uses serverGeometry if available, else falls back to url (WASM)
```

**Code Analysis (OperatorView.tsx lines 365-407):**

```typescript
// Call backend for PMI extraction if CAD service is enabled
if (signedStep && stepFileName && isCADServiceEnabled()) {
  console.log("Calling backend for PMI extraction:", signedStep);
  try {
    const result = await processCAD(signedStep, stepFileName, {
      includeGeometry: true, // Server handles geometry
      includePMI: true,
      generateThumbnail: false,
    });
    if (result.success) {
      console.log("CAD processing successful", result);
      if (result.pmi) setPmiData(result.pmi);
      if (result.geometry) setGeometryData(result.geometry);
    } else if (result.error) {
      console.warn("CAD processing failed:", result.error);
      // Show user-friendly toast notification
      // ... error handling ...
      setPmiData(null);
      setGeometryData(null);
    }
  } catch (pmiError) {
    console.error("Error during CAD processing:", pmiError);
    toast.error("CAD processing service unavailable. Using fallback viewer.");
    setPmiData(null);
    setGeometryData(null);
  }
} else {
  setPmiData(null);
  setGeometryData(null);
}
```

**Verdict:** ✅ Backend is called FIRST when CAD service is enabled

---

## Architecture Violations Found

### Issue #1: Multiple STEPViewer usages skip backend entirely

The following locations render `<STEPViewer>` **without** passing `serverGeometry` or `pmiData`, which means they ALWAYS use WASM processing and NEVER get PMI:

| File | Line | Component Context |
|------|------|-------------------|
| `src/pages/admin/Jobs.tsx` | 551 | File preview modal |
| `src/pages/admin/Parts.tsx` | 484 | File preview modal |
| `src/components/admin/OperationDetailModal.tsx` | 618 | Operation file viewer |
| `src/components/admin/PartDetailModal.tsx` | 1339 | Part detail modal |
| `src/components/operator/OperationDetailModal.tsx` | 647 | Operator file viewer |

**Example of violation:**
```tsx
// src/pages/admin/Jobs.tsx:551
<STEPViewer url={currentFileUrl} />
// ❌ No serverGeometry prop → Always uses WASM fallback
// ❌ No pmiData prop → User never sees PMI data
```

**Impact:**
- Users in admin/parts view NEVER get PMI data
- Backend processing is completely bypassed
- Only the operator terminal properly uses backend processing

---

### Issue #2: Parallel Processing Creates Race Condition

**Location:** `OperatorView.tsx:337-363`

The code creates a blob URL for WASM processing **before** calling the backend:

```typescript
// Lines 337-351: Create blob URL for WASM
if ((ext.endsWith(".step") || ext.endsWith(".stp")) && !step) {
  const { data } = await supabase.storage
    .from("parts-cad")
    .createSignedUrl(path, 3600);
  if (data?.signedUrl) {
    signedStep = data.signedUrl;
    stepFileName = path.split("/").pop() || "model.step";
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    step = URL.createObjectURL(blob);  // ← WASM URL created
  }
}

// Lines 354-356: Set state BEFORE backend call
setPdfUrl(pdf);
setStepUrl(step);  // ← stepUrl available for WASM immediately
setSignedStepUrl(signedStep);

// Lines 365-407: THEN call backend
if (signedStep && stepFileName && isCADServiceEnabled()) {
  const result = await processCAD(...);
  // ... sets geometryData
}
```

**Effect:**
1. `stepUrl` (blob for WASM) is set IMMEDIATELY
2. STEPViewer renders with `url` prop but no `serverGeometry`
3. STEPViewer may start WASM processing before backend responds
4. When backend returns, `serverGeometry` updates and STEPViewer switches

This isn't necessarily a bug since `preferServerGeometry={true}` prioritizes server data, but it's inefficient - WASM library is loaded and may start processing before backend completes.

---

### Issue #3: Fallback Logic in STEPViewer

**Location:** `src/components/STEPViewer.tsx:148-182`, `434-476`

**Library Loading (lines 148-182):**
```typescript
// If server geometry is provided and preferred, skip loading browser library
if (serverGeometry && preferServerGeometry) {
  setLibrariesLoaded(true);
  return;
}

// Otherwise load occt-import-js WASM library
const loadOcct = async () => { ... };
```

**Rendering Decision (lines 434-476):**
```typescript
// If server geometry is provided and preferred, use it
if (serverGeometry && preferServerGeometry && serverGeometry.meshes.length > 0) {
  setProcessingMode('server');
  // ... render from server geometry
  return;
}

// Fall back to browser-based STEP processing
if (!url) return;
const loadSTEP = async () => { ... };  // WASM processing
```

**Verdict:** ✅ STEPViewer correctly prioritizes `serverGeometry` when available

---

## Backend Error Communication

### Error Types and Fallback Behavior

**Location:** `src/hooks/useCADProcessing.ts`

| Error Scenario | Backend Response | Frontend Behavior |
|----------------|------------------|-------------------|
| Service not configured | `{ success: false, error: 'CAD processing service not configured' }` | WASM fallback |
| Unsupported format | `{ success: false, error: 'Unsupported file format: xxx' }` | Error toast, no fallback |
| HTTP 401/403 | Throws error | WASM fallback with toast |
| HTTP other errors | Throws error | WASM fallback with toast |
| Invalid geometry | `{ success: false, error: '...invalid geometry...' }` | WASM fallback with toast |
| Segfault | `{ success: false, error: '...segfault...' }` | WASM fallback with toast |
| Network error | Throws error | WASM fallback with toast |

**Location:** `OperatorView.tsx:381-402`

```typescript
if (result.error.includes("invalid geometry") || result.error.includes("segfault")) {
  toast.error("CAD file contains errors and cannot be processed. Using fallback viewer.");
} else if (result.error.includes("Unsupported")) {
  toast.error("Unsupported CAD file format");
} else {
  toast.error("CAD processing failed. Using fallback viewer.");
}
setPmiData(null);
setGeometryData(null);
```

**Issue:** When backend fails, `geometryData` is set to `null`, which correctly triggers WASM fallback. However, the user has **no way to know why PMI is missing** - they just see the model without PMI annotations.

---

## Backend-First Compliance Matrix

| Criterion | Status | Notes |
|-----------|--------|-------|
| Backend called FIRST for all files | ⚠️ Partial | Only in OperatorView/DetailPanel |
| Frontend WASM only on backend failure | ⚠️ Partial | 5 locations skip backend entirely |
| PMI extracted when available | ⚠️ Partial | Only operator terminal gets PMI |
| Fallback is transparent | ✅ Yes | Processing mode indicator shown |
| Backend failure clearly communicated | ✅ Yes | Toast notifications shown |
| No logic paths skip backend | ❌ No | 5 locations bypass backend |

---

## Recommendations

### Priority 1: Extend Backend Processing to All STEPViewer Usages

Each component using STEPViewer should:
1. Call `useCADProcessing()` hook
2. Check `isCADServiceEnabled()`
3. Call `processCAD()` before rendering STEPViewer
4. Pass `serverGeometry` and `pmiData` props

**Affected components:**
- `src/pages/admin/Jobs.tsx`
- `src/pages/admin/Parts.tsx`
- `src/components/admin/OperationDetailModal.tsx`
- `src/components/admin/PartDetailModal.tsx`
- `src/components/operator/OperationDetailModal.tsx`

### Priority 2: Optimize Loading Sequence

Consider deferring blob URL creation until backend confirms failure:

```typescript
// Current (suboptimal):
const blob = URL.createObjectURL(blob);  // Create WASM URL
setStepUrl(step);                        // Set immediately
// Then call backend...

// Recommended:
let stepUrl = null;
if (isCADServiceEnabled()) {
  const result = await processCAD(...);
  if (!result.success) {
    stepUrl = URL.createObjectURL(blob);  // Create only on failure
  }
}
setStepUrl(stepUrl);
```

### Priority 3: Add PMI Availability Indicator

When PMI is missing, inform the user whether:
- File has no PMI data (backend processed successfully but found no annotations)
- Backend failed (fallback to WASM, PMI unavailable)
- Backend not configured (never tried)

---

## File Reference

| File | Purpose | Backend-First? |
|------|---------|----------------|
| `src/hooks/useCADProcessing.ts` | CAD processing hook with backend API | ✅ Core |
| `src/components/STEPViewer.tsx` | 3D viewer with server/browser modes | ✅ Supports |
| `src/pages/operator/OperatorView.tsx` | Operator terminal main view | ✅ Implements |
| `src/components/terminal/DetailPanel.tsx` | Job detail panel | ✅ Receives props |
| `src/pages/admin/Jobs.tsx` | Admin jobs page | ❌ Skips backend |
| `src/pages/admin/Parts.tsx` | Admin parts page | ❌ Skips backend |
| `src/components/admin/OperationDetailModal.tsx` | Admin operation modal | ❌ Skips backend |
| `src/components/admin/PartDetailModal.tsx` | Admin part modal | ❌ Skips backend |
| `src/components/operator/OperationDetailModal.tsx` | Operator operation modal | ❌ Skips backend |

---

## Conclusion

The backend-first architecture is **correctly designed** in the core processing logic but **inconsistently applied** across the application. The operator terminal (OperatorView → DetailPanel → STEPViewer) properly implements backend-first processing with WASM fallback. However, five other locations bypass the backend entirely and always use WASM, meaning users in those contexts never get PMI data.

To achieve 100% backend-first compliance, each STEPViewer usage must be updated to integrate with the `useCADProcessing` hook and pass the resulting `serverGeometry` and `pmiData` props.
