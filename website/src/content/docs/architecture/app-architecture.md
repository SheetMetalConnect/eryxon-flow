---
title: "App Architecture"
description: "Technical and functional architecture overview of Eryxon Flow."
---

**Eryxon Flow** is a manufacturing execution system (MES) for sheet metal fabrication. It tracks jobs from creation through completion with real-time visibility, time tracking, issue management, and integrations.

### What Does Eryxon Flow Do?

The system tracks manufacturing work through three hierarchical levels:

1. **Jobs** - Customer orders or manufacturing projects
2. **Parts** - Individual components within jobs (can be assemblies or components)
3. **Operations** - Specific tasks performed on parts (cutting, bending, welding, etc.)

---

## System Overview

### Technology Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Radix primitives + Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Row Level Security, Edge Functions, Realtime, Storage)
- **Authentication:** Supabase Auth with JWT tokens
- **3D Viewer:** Three.js + browser STEP parsing + optional CAD backend + measurement support modules
- **API:** RESTful Edge Functions with API key authentication
- **Real-time:** Supabase Realtime for live updates

### Architecture Pattern

- **Multi-tenant:** Complete tenant isolation at database and application level
- **Role-based access:** Admin and Operator roles with different permissions
- **API-first:** ERP and automation systems integrate through APIs, webhooks, and MQTT
- **Responsive app shell:** Optimized for desktop admin workflows and tablet operator terminals

### Data Model Hierarchy

```mermaid
graph TD
    Tenant --> Jobs
    Jobs --> Parts
    Parts --> Operations
    Operations --> TimeEntries[Time Entries]
    Operations --> Substeps
    Operations --> Issues
    Operations --> Resources
    Parts --> ChildParts[Child Parts - assemblies]
    Jobs --> Assignments
    Tenant --> Cells[Cells - Workflow Stages]
    Tenant --> Materials
    Tenant --> AllResources[Resources]
    Tenant --> Users[Users - Profiles]
    Tenant --> APIKeys[API Keys]
    Tenant --> Webhooks
```

---

## Technical Architecture

### Frontend Architecture

**Framework:** React 18 with TypeScript and Vite

**State Management:**
- React Context (`AuthContext`) - Global auth state
- React Query (TanStack Query) - Server state caching
- React Hook Form - Form state
- Local state (useState) - Component UI state

**Routing:** React Router v7
- Protected routes with auth check
- Role-based route access
- Route groups split by admin, operator, and shared flows

**UI Libraries:**
- shadcn/ui - Base UI primitives (Button, Card, Dialog)
- Radix UI - Accessible behavior primitives
- Tailwind CSS - Utility styling

**3D Rendering:**
- Three.js - WebGL 3D graphics
- Browser STEP parsing for fallback rendering
- Optional CAD backend for server-processed geometry and PMI extraction
- three-mesh-bvh - Efficient picking and measurement acceleration

### Backend Architecture

**Platform:** Supabase

**Database:** PostgreSQL with Row-Level Security (RLS)
- Multi-tenant isolation via RLS policies
- Automatic filtering by tenant_id
- Role-based permissions

**Edge Functions:** Deno-based serverless functions
- RESTful API endpoints
- API key authentication
- Request validation
- Response formatting
- Webhook dispatch
- Shared security and handler helpers under `supabase/functions/_shared`

**Authentication:** Supabase Auth
- JWT-based sessions
- Email/password auth
- Invitation-based onboarding
- Optional Turnstile CAPTCHA for public auth flows
- Auto-refresh tokens
- Session persistence
- Immediate tenant/profile teardown when session state is lost

**Storage:** Supabase Storage
- File uploads (STEP, images, PDFs)
- Signed URLs with expiration
- RLS policies for tenant isolation

**Real-time:** Supabase Realtime
- PostgreSQL change data capture (CDC)
- WebSocket-based subscriptions
- Live updates across clients

---

## User Roles & Access

### 1. Admin Role

**Full System Access** - Can do everything operators can do, plus:

**Capabilities:**
- Create and manage jobs, parts, operations
- Configure workflow cells (stages)
- Manage materials catalog
- Manage resources (tools, fixtures, molds)
- Manage users and permissions
- View all operations across all operators
- Assign work to operators
- Review and resolve issues
- Generate API keys
- Configure webhooks
- Export data
- View subscription and usage

**Primary Interface:** Desktop/laptop browser
**Main Dashboard:** `/dashboard` - overview with KPIs and active work

### 2. Operator Role

**Production Floor Access** - Focused on executing work:

**Capabilities:**
- View assigned operations
- Start/stop/pause time tracking
- View part details and CAD files
- Report production issues
- View their activity history
- Complete operations

**Primary Interface:** Tablet on the shop floor
**Main Dashboard:** `/work-queue` - operations waiting to be done

### 3. Machine Accounts (Special)

**API-only Access** - For integrations:

**Capabilities:**
- API access only (no UI login)
- Same permissions as admin via API
- Used for ERP integrations, automation scripts

---

## Security Layers

**1. Authentication:**
- JWT tokens with short expiration
- Auto-refresh mechanism
- Invitation acceptance and password validation hardening
- Optional Turnstile protection on public auth flows, with CSP and hosting config allowing the Cloudflare widget where enabled

**2. Authorization:**
- Role-based access control (RBAC)
- Admin vs. Operator permissions
- UI route protection
- API endpoint validation
- Server-side enforcement via RLS and role-aware queries
- Client-side role checks are UX-only and not treated as a security boundary

**3. Data Isolation:**
- Row-Level Security (RLS)
- Tenant-scoped queries
- API key tenant binding
- Tenant-aware realtime subscriptions and storage paths

**4. API Security:**
- API key hashing (SHA-256)
- Constant-time API key comparison
- Shared validation and sanitization helpers
- CORS enforcement in edge functions
- Rate limiting
- Input validation
- Internal token checks for internal-only webhook and MQTT paths

**5. Storage Security:**
- Private buckets
- Signed URLs with expiration
- Tenant-scoped paths
- File type validation

**6. Deployment Security:**
- Environment-specific webhook wiring instead of hardcoded project URLs in migrations
- Service-role secrets stay in Supabase Edge Function secrets, never in frontend config
- Self-hosted setups can opt into Redis and CAPTCHA without changing core app behavior
- `ALLOWED_ORIGIN` should be set for production edge-function CORS restrictions

---

## API & Integrations

### Authentication

**Method:** Bearer token with API key

**Header:**
```
Authorization: Bearer ery_live_xxxxxxxxxxxxx
```

The REST API currently authenticates through the `Authorization` header rather than a separate `X-API-Key` header.

### Webhooks (External Real-Time)

**For external systems:**

1. Register webhook URL in system
2. Select events to receive
3. Receive HTTP POST when events occur
4. Verify HMAC signature
5. Process event data

**Use Cases:**
- Update ERP when job completes
- Send notifications to Slack/Teams
- Trigger automated workflows
- Update external dashboards

## Related Docs

- [Security Architecture](/architecture/security-architecture/)
- [Connectivity Overview](/architecture/connectivity-overview/)
