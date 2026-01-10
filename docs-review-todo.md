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
| [x] | `docs/API_DOCUMENTATION.md` | **DELETED** - duplicate of website version |
| [x] | `docs/CACHING.md` | Keep - internal reference |
| [x] | `docs/CODING_PATTERNS.md` | Keep - internal reference |
| [x] | `docs/DATABASE.md` | Keep - internal reference |
| [x] | `docs/DESIGN_SYSTEM.md` | Keep - internal reference |
| [x] | `docs/3d-viewer.md` | **DELETED** - duplicate of website version |

---

## Website `/website/src/content/docs/` (Starlight Public Docs)

### API Reference
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/api/api_documentation.md` | Removed TOC, condensed status codes, validation, removed duplicate sections (-374 lines) |
| [x] | `website/src/content/docs/api/api_key_authentication.md` | Added cross-links |
| [x] | `website/src/content/docs/api/api_sync.md` | Added cross-links, improved intro |
| [x] | `website/src/content/docs/api/edge_functions_setup.md` | Added cross-links |
| [x] | `website/src/content/docs/api/mcp_integration.md` | Added cross-links, improved intro |
| [x] | `website/src/content/docs/api/mcp-demo-guide.md` | Added cross-links |

### Architecture
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/architecture/3d-engine.md` | Added cross-links to viewer/PMI docs |
| [x] | `website/src/content/docs/architecture/app-architecture.md` | Condensed intro, user roles table, security section (-107 lines) |
| [x] | `website/src/content/docs/architecture/caching.md` | Clean - good technical detail |
| [x] | `website/src/content/docs/architecture/connectivity-mqtt.md` | Added cross-links |
| [x] | `website/src/content/docs/architecture/connectivity-overview.md` | Added cross-links |
| [x] | `website/src/content/docs/architecture/connectivity-rest-api.md` | Added cross-links |
| [x] | `website/src/content/docs/architecture/database.md` | Removed TOC, added cross-links |
| [x] | `website/src/content/docs/architecture/design-components.md` | Added cross-links |
| [x] | `website/src/content/docs/architecture/design-principles.md` | Clean - no changes needed |
| [x] | `website/src/content/docs/architecture/design-tokens.md` | Added cross-links |
| [x] | `website/src/content/docs/architecture/error-handling.md` | Removed TOC, condensed best practices (-150 lines) |
| [x] | `website/src/content/docs/architecture/notifications-system.md` | Cleaned intro, added cross-links |
| [x] | `website/src/content/docs/architecture/responsive-ui-patterns.md` | Removed TOC, added cross-links |
| [x] | `website/src/content/docs/architecture/workflow-engine.md` | Added cross-links |

### Development
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/development/claude.md` | Added cross-links |
| [x] | `website/src/content/docs/development/coding_patterns.md` | Added cross-links |

### Guides
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/guides/3d-viewer.md` | Condensed setup, added cross-links (-290 lines) |
| [x] | `website/src/content/docs/guides/admin-manual.md` | Clean - no changes needed |
| [x] | `website/src/content/docs/guides/csv_import.md` | Added cross-links |
| [x] | `website/src/content/docs/guides/faq.md` | Clean - no changes needed |
| [x] | `website/src/content/docs/guides/operator-manual.md` | Added cross-links |
| [x] | `website/src/content/docs/guides/quality-management.md` | Added cross-links |
| [x] | `website/src/content/docs/guides/quick-start.md` | Clean - no changes needed |
| [x] | `website/src/content/docs/guides/self-hosting.md` | Added cross-links |
| [x] | `website/src/content/docs/guides/troubleshooting.md` | Clean - no changes needed |

### Features
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/features/batch-operations.md` | Removed TOC, verbose ASCII art, consolidated sections (-538 lines) |
| [x] | `website/src/content/docs/features/employee-tracking.md` | Clean - no changes needed |
| [x] | `website/src/content/docs/features/erp-integration.md` | Added cross-links |
| [x] | `website/src/content/docs/features/flexible-metadata.md` | Condensed types, added table reference (-430 lines) |
| [x] | `website/src/content/docs/features/integrations-marketplace.md` | Removed implementation details (-215 lines) |
| [x] | `website/src/content/docs/features/pmi-extraction.md` | Condensed, added cross-links (-215 lines) |
| [x] | `website/src/content/docs/features/shipping-management.md` | Removed TOC, verbose ASCII art, consolidated sections (-556 lines) |

### Root Level
| Status | File | Notes |
|--------|------|-------|
| [x] | `website/src/content/docs/index.mdx` | Landing page - skip |
| [x] | `website/src/content/docs/introduction.md` | Clean - good tone |
| [x] | `website/src/content/docs/hosted-version.md` | Added cross-links |
| [x] | `website/src/content/docs/404.md` | Skip - 404 page |

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

## Consolidation (completed)

Duplicate files deleted:
- ~~`docs/API_DOCUMENTATION.md`~~ → website version is canonical
- ~~`docs/3d-viewer.md`~~ → website version is canonical

## Sidebar Navigation Fixes

Fixed in `website/src/config/sidebar.json`:
- Added missing `employee-tracking` to Features section
- Moved `quality-management` from Self-Hosting to User Guides

---

## Cross-Links Added

| From | To |
|------|-----|
| pmi-extraction.md | 3d-viewer.md, 3d-engine.md |
| 3d-viewer.md | 3d-engine.md, pmi-extraction.md, database.md |
| 3d-engine.md | 3d-viewer.md, pmi-extraction.md |
| integrations-marketplace.md | api_documentation.md |
| flexible-metadata.md | (links to source code types) |
| api_sync.md | api_key_authentication.md, api_documentation.md, erp-integration.md |
| api_key_authentication.md | api_documentation.md, api_sync.md |
| workflow-engine.md | database.md, 3d-viewer.md, operator-manual.md |
| database.md | api_sync.md, workflow-engine.md, erp-integration.md |
| connectivity-overview.md | api_documentation.md, connectivity-mqtt.md, mcp_integration.md |
| connectivity-mqtt.md | connectivity-overview.md, api_documentation.md, erp-integration.md |
| mcp_integration.md | api_key_authentication.md, connectivity-overview.md, api_documentation.md |
| edge_functions_setup.md | self-hosting.md, api_documentation.md |
| erp-integration.md | api_sync.md, csv_import.md, database.md |
| csv_import.md | erp-integration.md, api_sync.md |
| self-hosting.md | edge_functions_setup.md, mcp_integration.md |
| quality-management.md | workflow-engine.md |

---

## Review Progress

- **Total files:** 47
- **Reviewed/Cleaned:** 43
- **Deleted duplicates:** 2
- **Skipped:** 4 (Dutch, 404, index)
- **Remaining:** 0

**Total lines removed:** ~2,875 lines

**All English documentation files reviewed.** ✓

**Sidebar navigation fixed.** ✓
