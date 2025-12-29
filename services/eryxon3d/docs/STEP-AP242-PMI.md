# STEP AP242 PMI Extraction

## Overview

This document explains how STEP AP242 PMI (Product Manufacturing Information) extraction works in Eryxon3D and how to troubleshoot common issues.

## What is STEP AP242 PMI?

STEP AP242 files can contain **semantic PMI** — structured data representing:

- **Dimensions** — linear, angular, radius, diameter with nominal value and tolerances
- **Geometric Tolerances** — flatness, parallelism, position, etc. with datum references
- **Datums** — reference features labeled A, B, C, etc.
- **Annotation positions** — 3D coordinates for where to display the annotation
- **Leader lines** — lines connecting annotation to geometry
- **Associated geometry** — which faces/edges the annotation applies to

## Architecture

### Backend: pythonocc-core + OpenCASCADE

PMI extraction uses **pythonocc-core**, Python bindings for OpenCASCADE Technology (OCCT). PMI is accessed via XDE (Extended Data Exchange) modules.

**Key OCCT classes:**
```
STEPCAFControl_Reader         — reads STEP with PMI when GDT mode enabled
XCAFDoc_DocumentTool          — access to document tools
XCAFDoc_ShapeTool             — navigate geometry/assembly structure
XCAFDoc_DimTolTool            — iterate over dimensions and tolerances
XCAFDoc_Dimension             — individual dimension object
XCAFDoc_GeomTolerance         — geometric tolerance object
XCAFDoc_Datum                 — datum feature
XCAFDimTolObjects_*           — dimension/tolerance properties
```

### Critical Requirement: GDT Mode

The STEP reader **must** have `SetGDTMode(True)` enabled, otherwise PMI is discarded during import:

```python
reader = STEPCAFControl_Reader()
reader.SetGDTMode(True)  # CRITICAL — enables PMI import
reader.SetNameMode(True)
reader.SetColorMode(True)
```

## Known Issue: Handle_TDocStd_Document

### The Problem

Certain pythonocc-core versions don't expose `Handle_TDocStd_Document`, which is required to create a valid XCAF document. Without this handle, XCAF document initialization crashes or PMI gets silently disabled.

**Symptoms:**
- All NIST test files crash with "Worker crashed (process pool broken)"
- PMI extraction returns empty results
- Log shows: `XCAF handle document init failed`

### Version Compatibility

| pythonocc-core | Handle Exposed | PMI Works |
|----------------|----------------|-----------|
| 7.4.x          | ❓ Unknown     | Test required |
| 7.5.x          | ❓ Unknown     | Test required |
| 7.6.x          | ❓ Unknown     | Test required |
| 7.7.0          | ❓ Unknown     | Test required |
| 7.7.1          | ❓ Unknown     | Test required |
| 7.7.2          | ❌ No          | ❌ Crashes |

### How to Test a Version

Run this Docker command to check if a version exposes the handle:

```bash
# Check Handle_TDocStd_Document availability
docker run --rm continuumio/miniconda3:latest /bin/sh -lc "
  conda install -c conda-forge pythonocc-core=VERSION_HERE -y 2>&1 | tail -5 && \
  python -c \"
from OCC.Core import TDocStd
attrs = [n for n in dir(TDocStd) if 'Handle' in n or 'Document' in n]
print('Available TDocStd exports:')
for a in attrs: print(f'  {a}')
has_handle = 'Handle_TDocStd_Document' in attrs
print(f'\\nHandle_TDocStd_Document available: {has_handle}')
\""
```

### Solution: Find a Working Version

1. **Search available versions:**
```bash
docker run --rm continuumio/miniconda3:latest /bin/sh -lc \
  "conda search -c conda-forge pythonocc-core | tail -n 40"
```

2. **Test each version using the test script:**
```bash
cd services/eryxon3d
PYTHONOCC_VERSION=7.6.2 ./run_tests.sh --nist
```

3. **Update Dockerfile with working version:**
```dockerfile
ARG PYTHONOCC_VERSION=7.6.2
RUN conda install -c conda-forge python=3.11 pythonocc-core=${PYTHONOCC_VERSION} -y
```

## NIST Test Files

The `/NIST-PMI-STEP-Files/` directory contains official NIST MBE PMI validation files:

| Folder | Files | Description | Expected PMI |
|--------|-------|-------------|--------------|
| `AP203 geometry only/` | 11 | Geometry-only exports | None |
| `AP203 with PMI/` | 5 | AP203 with graphical PMI | Graphical only |
| Root (AP242 files) | 17 | AP242 with semantic PMI | Full PMI |

### File Naming Convention

- `nist_ctc_##` — Combination Test Cases
- `nist_ftc_##` — Functional Tolerance Cases
- `nist_stc_##` — Semantic Tolerance Cases
- `_ap242-e#` suffix — AP242 edition (e1, e2, e3)
- `_rd`, `_rc`, `_rb` suffix — Revision codes

### Running NIST Batch Test

```bash
# Build and run all NIST tests
./run_tests.sh --nist --report=/app/NIST-PMI-STEP-Files/nist_report.json

# With specific pythonocc version
PYTHONOCC_VERSION=7.6.2 ./run_tests.sh --nist
```

## Output Format

PMI extraction returns JSON with:

```json
{
  "version": "1.0",
  "dimensions": [
    {
      "id": "dim_1",
      "type": "linear|angular|radius|diameter|ordinate",
      "value": 50.0,
      "unit": "mm",
      "tolerance": {"upper": 0.1, "lower": -0.1, "type": "bilateral"},
      "text": "50.00 ±0.10 mm",
      "position": {"x": 0, "y": 0, "z": 0},
      "leader_points": []
    }
  ],
  "geometric_tolerances": [
    {
      "id": "tol_1",
      "type": "flatness|position|...",
      "value": 0.05,
      "unit": "mm",
      "symbol": "⏥",
      "modifier": "Ⓜ",
      "datum_refs": ["A", "B"],
      "text": "⏥ 0.050 Ⓜ | A | B",
      "position": {"x": 0, "y": 0, "z": 0}
    }
  ],
  "datums": [
    {
      "id": "datum_1",
      "label": "A",
      "position": {"x": 0, "y": 0, "z": 0}
    }
  ],
  "surface_finishes": [],
  "notes": [],
  "graphical_pmi": []
}
```

## References

- [OCCT XDE User Guide](https://dev.opencascade.org/doc/overview/html/occt_user_guides__xde.html)
- [OCCT STEP Translator](https://dev.opencascade.org/doc/overview/html/occt_user_guides__step.html)
- [pythonocc-core](https://github.com/tpaviot/pythonocc-core)
- [NIST PMI Validation](https://www.nist.gov/el/systems-integration-division-73400/mbe-pmi-validation-and-conformance-testing)
- [MBx-IF CAX STEP Files](https://www.mbx-if.org/cax/cax_step.php)
