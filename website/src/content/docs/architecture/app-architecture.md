---
title: "App Architecture"
description: "Technical and functional architecture overview of Eryxon Flow."
---



**Version:** 1.2
**Last Updated:** November 22, 2025
**Status:** Active

## Introduction

**Eryxon Flow** is a comprehensive manufacturing execution system (MES) designed specifically for sheet metal fabrication operations. It provides end-to-end tracking from job creation through production completion, with real-time visibility, time tracking, issue management, and integration capabilities.

### What Does Eryxon Flow Do?

The system tracks manufacturing work through three hierarchical levels:

1. **Jobs** - Customer orders or manufacturing projects
2. **Parts** - Individual components within jobs (can be assemblies or components)
3. **Operations** - Specific tasks performed on parts (cutting, bending, welding, etc.)

---

## System Overview

### Technology Stack

- **Frontend:** React 18 + TypeScript + Material UI v7
- **Backend:** Supabase (PostgreSQL database, Edge Functions)
- **Authentication:** Supabase Auth with JWT tokens
- **3D Viewer:** Three.js + occt-import-js for STEP files
- **API:** RESTful Edge Functions with API key authentication
- **Real-time:** Supabase Realtime for live updates

### Architecture Pattern

- **Multi-tenant:** Complete tenant isolation at database and application level
- **Role-based access:** Admin and Operator roles with different permissions
- **Progressive Web App:** Mobile-responsive, can be installed as PWA

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

**Framework:** React 18 with TypeScript

**State Management:**
- React Context (`AuthContext`) - Global auth state
- React Query (TanStack Query) - Server state caching
- React Hook Form - Form state
- Local state (useState) - Component UI state

**Routing:** React Router v6
- Protected routes with auth check
- Role-based route access
- Automatic redirects

**UI Libraries:**
- Material UI v7 - Complex components (DataGrid, date pickers)
- shadcn/ui - Base UI primitives (Button, Card, Dialog)
- Tailwind CSS - Utility styling

**3D Rendering:**
- Three.js - WebGL 3D graphics
- occt-import-js - STEP file parser

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

**Authentication:** Supabase Auth
- JWT-based sessions
- Email/password auth
- Auto-refresh tokens
- Session persistence

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

**2. Authorization:**
- Role-based access control (RBAC)
- Admin vs. Operator permissions
- UI route protection
- API endpoint validation

**3. Data Isolation:**
- Row-Level Security (RLS)
- Tenant-scoped queries
- API key tenant binding

**4. API Security:**
- API key hashing (bcrypt)
- HMAC signature for webhooks
- Rate limiting
- Input validation

**5. Storage Security:**
- Private buckets
- Signed URLs with expiration
- Tenant-scoped paths
- File type validation

---

## API & Integrations

### Authentication

**Method:** Bearer token with API key

**Header:**
```
Authorization: Bearer ery_live_xxxxxxxxxxxxx
```

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
