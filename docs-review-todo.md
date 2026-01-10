# Documentation Cleanup Review

Inventory of all markdown files requiring review for bloat removal and tone fixes.

## Status Legend
- `[ ]` — Not reviewed
- `[x]` — Reviewed and cleaned
- `[~]` — Flagged for consolidation/deletion
- `[?]` — Needs technical accuracy verification

---

## Root `/docs/` (Internal Engineering Docs)

| Status | File | Notes |
|--------|------|-------|
| [~] | `docs/API_DOCUMENTATION.md` | Likely duplicate of website API docs - verify |
| [ ] | `docs/CACHING.md` | |
| [ ] | `docs/CODING_PATTERNS.md` | |
| [ ] | `docs/DATABASE.md` | |
| [ ] | `docs/DESIGN_SYSTEM.md` | |
| [~] | `docs/3d-viewer.md` | Likely duplicate of website 3D viewer guide - verify |

---

## Website `/website/src/content/docs/` (Starlight Public Docs)

### API Reference
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/api/api_documentation.md` | Removed TOC, condensed status codes, validation, removed duplicate sections (-374 lines) |
| [ ] | `website/src/content/docs/api/api_key_authentication.md` | |
| [ ] | `website/src/content/docs/api/api_sync.md` | |
| [ ] | `website/src/content/docs/api/edge_functions_setup.md` | |
| [ ] | `website/src/content/docs/api/mcp_integration.md` | |
| [ ] | `website/src/content/docs/api/mcp-demo-guide.md` | |

### Architecture
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/architecture/3d-engine.md` | Added cross-links to viewer/PMI docs |
| [x] | `website/src/content/docs/architecture/app-architecture.md` | Condensed intro, user roles table, security section (-107 lines) |
| [ ] | `website/src/content/docs/architecture/caching.md` | |
| [ ] | `website/src/content/docs/architecture/connectivity-mqtt.md` | |
| [ ] | `website/src/content/docs/architecture/connectivity-overview.md` | |
| [ ] | `website/src/content/docs/architecture/connectivity-rest-api.md` | |
| [ ] | `website/src/content/docs/architecture/database.md` | |
| [ ] | `website/src/content/docs/architecture/design-components.md` | |
| [ ] | `website/src/content/docs/architecture/design-principles.md` | Clean - no changes needed |
| [ ] | `website/src/content/docs/architecture/design-tokens.md` | |
| [x] | `website/src/content/docs/architecture/error-handling.md` | Removed TOC, condensed best practices (-150 lines) |
| [ ] | `website/src/content/docs/architecture/notifications-system.md` | |
| [ ] | `website/src/content/docs/architecture/responsive-ui-patterns.md` | |
| [ ] | `website/src/content/docs/architecture/workflow-engine.md` | |

### Development
| Status | File | Notes |
|--------|------|-------|
| [ ] | `website/src/content/docs/development/claude.md` | |
| [ ] | `website/src/content/docs/development/coding_patterns.md` | |

### Guides
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/guides/3d-viewer.md` | Condensed setup, added cross-links (-290 lines) |
| [ ] | `website/src/content/docs/guides/admin-manual.md` | Clean - concise already |
| [ ] | `website/src/content/docs/guides/csv_import.md` | |
| [ ] | `website/src/content/docs/guides/faq.md` | Clean - concise already |
| [ ] | `website/src/content/docs/guides/operator-manual.md` | |
| [ ] | `website/src/content/docs/guides/quality-management.md` | |
| [ ] | `website/src/content/docs/guides/quick-start.md` | Clean - concise already |
| [ ] | `website/src/content/docs/guides/self-hosting.md` | |
| [ ] | `website/src/content/docs/guides/troubleshooting.md` | Clean - concise already |

### Features
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/features/batch-operations.md` | Removed TOC, verbose ASCII art, consolidated sections (-538 lines) |
| [ ] | `website/src/content/docs/features/employee-tracking.md` | Clean - concise already |
| [ ] | `website/src/content/docs/features/erp-integration.md` | Clean - reasonable |
| [x] | `website/src/content/docs/features/flexible-metadata.md` | Condensed types, added table reference (-430 lines) |
| [x] | `website/src/content/docs/features/integrations-marketplace.md` | Removed implementation details (-215 lines) |
| [x] | `website/src/content/docs/features/pmi-extraction.md` | Condensed, added cross-links (-215 lines) |
| [x] | `website/src/content/docs/features/shipping-management.md` | Removed TOC, verbose ASCII art, consolidated sections (-556 lines) |

### Root Level
| Status | File | Notes |
|--------|------|-------|
| [ ] | `website/src/content/docs/index.mdx` | Landing page - marketing content |
| [ ] | `website/src/content/docs/introduction.md` | Clean - good tone |
| [ ] | `website/src/content/docs/hosted-version.md` | |
| [ ] | `website/src/content/docs/404.md` | |

### Dutch (nl/) — Skip detailed review, translate after EN cleanup
| Status | File | Notes |
|--------|------|-------|
| [ ] | `website/src/content/docs/nl/index.mdx` | |
| [ ] | `website/src/content/docs/nl/introduction.md` | |

### Other
| Status | File | Notes |
|--------|------|-------|
| [ ] | `website/src/content/sections/call-to-action.md` | Marketing content |
| [ ] | `website/README.md` | |

---

## Consolidation Candidates (flagged during review)

| File | Reason |
|------|--------|
| `docs/API_DOCUMENTATION.md` | Likely duplicate of `website/.../api/api_documentation.md` |
| `docs/3d-viewer.md` | Likely duplicate of `website/.../guides/3d-viewer.md` |

---

## Cross-Links Added

| From | To |
|------|-----|
| pmi-extraction.md | 3d-viewer.md, 3d-engine.md |
| 3d-viewer.md | 3d-engine.md, pmi-extraction.md, database.md |
| 3d-engine.md | 3d-viewer.md, pmi-extraction.md |
| integrations-marketplace.md | api_documentation.md |
| flexible-metadata.md | (links to source code types) |

---

## Review Progress

- **Total files:** 47
- **Reviewed/Cleaned:** 11
- **Already clean:** 6
- **Flagged for consolidation:** 2
- **Remaining:** 28

**Total lines removed:** ~2,875 lines
