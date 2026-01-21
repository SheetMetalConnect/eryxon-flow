# Changelog

All notable changes to Eryxon Flow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-01-21

### Focus: Core Production Tracking & Scalability

This release represents a major refactoring focused on solidifying the core platform. We've temporarily removed advanced features to concentrate on what matters most: reliable, real-time production tracking.

### Added
- **Fuzzy search filtering** across Jobs, Parts, and Operations API endpoints
- **Shared CRUD builder pattern** for edge functions
- **Enhanced API documentation** with improved examples
- **Security improvements** with dependency upgrades (fixed HIGH severity vulnerabilities)
- **Modular TypeScript architecture** for better maintainability

### Changed
- **Database migrations**: Now at 87 total migrations
- **Edge Functions**: Refactored 15 functions using shared CRUD builder pattern
- **API responses**: Improved error handling and validation across all endpoints
- **Type system**: Modular Supabase types architecture for better code organization

### Removed (Temporarily)

These features have been removed to focus development effort on core capabilities. They may return in future releases.

- ❌ **Advanced Analytics Dashboards**
  - OEE Analytics (`/admin/analytics/oee`)
  - QRM Dashboard (`/admin/analytics/qrm`)
  - Quality Analytics (`/admin/analytics/quality`)
  - Reliability Analytics (`/admin/analytics/reliability`)
  - Jobs Analytics (`/admin/analytics/jobs`)
  - _Reason_: Basic production stats remain on main dashboard; advanced metrics added complexity without proven ROI

- ❌ **Shipping & Logistics Module**
  - Shipments management (`/admin/shipments`)
  - Postal code grouping
  - Delivery tracking
  - Shipment lifecycle (draft → planned → loading → in transit → delivered)
  - _Reason_: Focus is on production tracking, not post-production logistics

- ❌ **Integrations Marketplace**
  - Integration browsing and installation UI (`/admin/integrations`)
  - Integration catalog and reviews
  - _Reason_: Direct API/webhook integration provides more flexibility; marketplace added unnecessary abstraction

- ❌ **3D Backend Service** (`services/eryxon3d/`)
  - Python STEP file parser service
  - PMI extraction backend
  - Server-side STEP processing
  - _Reason_: Replaced with client-side 3D viewer (occt-import-js + Three.js) - no backend needed

### Fixed
- **CRITICAL**: Missing `await` in validation for `api-parts` and `api-operations`
- **CRITICAL**: Bulk-sync crash and partial success ghosting in CRUD builder
- **CRITICAL**: PATCH validation and response format issues
- Security vulnerabilities in `react-router-dom` (HIGH severity)
- Mixed package manager issues (removed `bun.lockb`, standardized on npm)
- CORS issues with STEP file viewing (now uses blob URLs)

### Technical Improvements
- **Shared CRUD builder**: Eliminated redundant code across edge functions
- **Test coverage**: Added `.env.test.local` for Vitest stability
- **Migration to serveApi pattern**: `api-erp-sync` and `send-invitation`
- **Validation improvements**: Consistent error handling across all CRUD operations

### Developer Experience
- Updated ESLint configuration for better code quality
- Improved TypeScript types with modular architecture
- Better hook patterns and memory leak prevention
- Enhanced documentation in `CODING_PATTERNS.md`

---

## [0.1.x] - 2025-2026

Initial development releases with full feature set including analytics, shipping, and integrations marketplace.

---

## Upcoming

Features under consideration for future releases:

- **Analytics Dashboard v2**: Streamlined, performance-focused metrics
- **Capacity Planning**: QRM-based visual planning tools
- **Mobile App**: Native iOS/Android operator terminals
- **API v2**: GraphQL endpoint for advanced integrations
- **Reporting Engine**: Configurable report builder

---

## Notes

### Why Remove Features?

We believe in **doing fewer things better**. The removed features added maintenance burden and complexity without being core to production tracking. By focusing on the essentials, we can:

1. **Improve reliability** - Fewer moving parts means fewer bugs
2. **Increase performance** - Leaner codebase, faster responses
3. **Better developer experience** - Easier to understand and contribute
4. **Faster iteration** - Ship improvements to core features more quickly

### Migration Guide

If you were using removed features:

- **Analytics**: Use the API/MCP server to export data to your BI tool (PowerBI, Tableau, etc.)
- **Shipping**: Track delivery status via custom fields in Jobs table or use external logistics software
- **Integrations Marketplace**: Build integrations directly using REST API and webhooks (see `/api-docs`)

### Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- **Documentation**: See `/docs` folder or website documentation
- **Commercial Support**: office@sheetmetalconnect.com
