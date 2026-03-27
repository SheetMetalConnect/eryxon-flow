# Architecture — Eryxon Flow

> Machine-readable architecture map for AI agents and human developers.

## System Overview

```mermaid
graph TB
    subgraph Client["Browser (React SPA)"]
        App[App.tsx]
        Auth[AuthContext]
        Op[OperatorContext]
        Router[React Router]
        Pages[Pages]
        Components[Components]
        Hooks[Hooks]
        QC[TanStack Query]
    end

    subgraph Supabase["Supabase Platform"]
        SBClient[supabase-js Client]
        SBAuth[Supabase Auth]
        SBRealtime[Realtime WebSocket]
        SBStorage[Storage]
        EdgeFns[Edge Functions<br/>22 API endpoints]
        DB[(PostgreSQL + RLS)]
    end

    subgraph External["External Systems"]
        ERP[ERP Systems]
        MQTT[MQTT Broker]
        MCP[MCP Server]
        Webhooks[Webhook Targets]
    end

    App --> Auth --> Router
    App --> Op
    Router --> Pages --> Components
    Components --> Hooks
    Hooks --> QC --> SBClient
    Hooks --> SBRealtime

    SBClient --> SBAuth
    SBClient --> DB
    SBClient --> SBStorage

    EdgeFns --> DB
    EdgeFns --> SBStorage

    ERP -->|"REST API"| EdgeFns
    MCP -->|"Tool calls"| SBClient
    EdgeFns -->|"POST"| Webhooks
    MQTT -->|"Pub/Sub"| SBRealtime
```

## Frontend Architecture

```mermaid
graph LR
    subgraph Entry
        main[main.tsx] --> App[App.tsx]
    end

    subgraph Providers["Provider Stack (top→bottom)"]
        Theme[ThemeProvider]
        QueryProvider[QueryClientProvider]
        Tooltip[TooltipProvider]
        BrowserRouter
        AuthProvider
        OperatorProvider
        Notifications[NotificationToastProvider]
    end

    subgraph Routing
        ProtectedRoute
        AdminRoutes["AdminRoutes<br/>21 pages"]
        OperatorRoutes["OperatorRoutes<br/>work queue, time tracking"]
        CommonRoutes["CommonRoutes<br/>shared pages"]
    end

    subgraph UILayer["UI Layer"]
        shadcn["shadcn/ui + Radix"]
        Tailwind[Tailwind CSS]
        ThreeJS["Three.js STEP Viewer"]
        Recharts[Recharts Analytics]
        i18n["i18next (EN/NL/DE)"]
    end

    App --> Theme --> QueryProvider --> BrowserRouter --> AuthProvider
    AuthProvider --> ProtectedRoute
    ProtectedRoute --> AdminRoutes & OperatorRoutes & CommonRoutes
    AdminRoutes & OperatorRoutes --> shadcn & ThreeJS & Recharts
    shadcn --> Tailwind
```

## Backend Architecture (Edge Functions)

```mermaid
graph TB
    subgraph Request["Incoming Request"]
        HTTP["HTTP Request + Bearer Token"]
    end

    subgraph SharedLayer["_shared/ Modules"]
        handler["handler.ts<br/>serveApi() / createApiHandler()"]
        auth["auth.ts<br/>API key auth (SHA-256 prefix lookup)"]
        crud["crud-builder.ts<br/>Generic CRUD (pagination, filters, search, sync)"]
        plans["plan-limits.ts<br/>Subscription quota enforcement"]
        security["security.ts<br/>Upload validation"]
        rateLimit["rate-limiter.ts<br/>Plan-based rate limiting"]
        cache["cache-utils.ts<br/>In-memory caching"]
        validation["validation/<br/>Error handling, input validation"]
    end

    subgraph Endpoints["API Endpoints (22)"]
        direction LR
        jobs[api-jobs]
        parts[api-parts]
        ops[api-operations]
        issues[api-issues]
        time[api-time-entries]
        materials[api-materials]
        resources[api-resources]
        lifecycle["api-job-lifecycle<br/>api-operation-lifecycle"]
        sync[api-erp-sync]
        webhooks[api-webhooks]
        other["api-cells, api-assignments,<br/>api-templates, api-substeps,<br/>api-export, api-scrap-reasons,<br/>api-key-generate, api-upload-url,<br/>api-parts-images, api-webhook-logs,<br/>api-operation-quantities"]
    end

    HTTP --> handler
    handler --> auth --> rateLimit --> plans
    auth -->|"tenantId + plan"| crud
    handler --> crud
    crud --> jobs & parts & ops & issues & time & materials & resources & other
    lifecycle --> handler
    sync --> handler
    webhooks --> handler
    handler --> validation
    handler --> cache
    handler --> security
```

## Data Flow

```mermaid
graph LR
    subgraph Sources["Data Sources"]
        UI[React UI]
        API[REST API / ERP]
        MQTT[MQTT]
    end

    subgraph Processing
        SBClient[Supabase Client<br/>from frontend]
        EdgeFn[Edge Functions<br/>from API]
        Realtime[Supabase Realtime]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        S3[Supabase Storage<br/>files, images, STEP]
    end

    subgraph Outputs
        Dashboard[Admin Dashboard]
        Operator[Operator UI]
        Webhook[Webhooks]
        Export[Data Export]
    end

    UI -->|"Direct queries"| SBClient --> PG
    UI -->|"File upload"| S3
    API -->|"Bearer token"| EdgeFn --> PG
    MQTT --> Realtime

    PG --> Realtime -->|"WebSocket"| UI
    PG --> Dashboard & Operator
    EdgeFn --> Webhook
    PG --> Export
```

## Multi-Tenant Isolation

```mermaid
graph TB
    subgraph Auth["Authentication"]
        APIKey["API Key (ery_live_*)"]
        SBAuth["Supabase Auth (JWT)"]
    end

    subgraph Tenant["Tenant Context"]
        Prefix["Key prefix lookup<br/>(12-char prefix → candidate keys)"]
        Hash["SHA-256 hash comparison<br/>(constant-time)"]
        RPC["set_active_tenant(tenant_id)<br/>Sets RLS context"]
    end

    subgraph Isolation["Data Isolation"]
        RLS["Row-Level Security<br/>Every table has tenant_id"]
        SoftDelete["Soft deletes<br/>deleted_at IS NULL"]
        PlanLimits["Plan-based quotas<br/>free/pro/premium/enterprise"]
    end

    APIKey --> Prefix --> Hash --> RPC --> RLS
    SBAuth --> RLS
    RLS --> SoftDelete
    RPC --> PlanLimits
```

## Domain Model

```mermaid
erDiagram
    TENANT ||--o{ JOB : has
    TENANT ||--o{ PART : has
    TENANT ||--o{ RESOURCE : has
    TENANT ||--o{ API_KEY : has

    JOB ||--o{ PART : contains
    PART ||--o{ OPERATION : requires
    OPERATION ||--o{ TIME_ENTRY : tracks
    OPERATION ||--o{ SUBSTEP : breaks_into
    OPERATION ||--o{ ISSUE : reports

    JOB ||--o{ BATCH : groups
    BATCH ||--o{ BATCH_ITEM : contains

    RESOURCE ||--o{ CELL : belongs_to
    RESOURCE ||--o{ ASSIGNMENT : assigned_to
    OPERATION ||--o{ ASSIGNMENT : receives

    JOB {
        uuid id PK
        uuid tenant_id FK
        string job_number
        string customer
        enum status
        string external_id
    }
    PART {
        uuid id PK
        uuid job_id FK
        string part_number
        int quantity
    }
    OPERATION {
        uuid id PK
        uuid part_id FK
        string name
        enum status
        int sequence
    }
```

## Directory Map

```
eryxon-flow/
├── src/
│   ├── components/          # 168 files — UI components
│   │   ├── ui/              # shadcn/ui base (buttons, dialogs, tables)
│   │   ├── admin/           # Admin-specific (MCP, analytics, settings)
│   │   ├── operator/        # Tablet UI (work queue, time tracking)
│   │   ├── viewer/          # 3D STEP viewer (Three.js)
│   │   ├── scheduler/       # Job scheduling (drag-drop)
│   │   ├── issues/          # NCR/issue management
│   │   └── ...              # auth, capacity, onboarding, parts, qrm, terminal
│   ├── hooks/               # 42 files — Data fetching & state
│   │   ├── useRealtimeSubscription  # WebSocket subscriptions
│   │   ├── useOEEMetrics            # OEE calculations
│   │   ├── useServerPagination      # API pagination
│   │   └── ...
│   ├── pages/               # 55 files — Route targets
│   │   ├── admin/           # Dashboard, Jobs, Parts, Operations, Analytics...
│   │   └── operator/        # Work queue, time tracking
│   ├── routes/              # Route definitions + guards
│   ├── contexts/            # AuthContext, OperatorContext
│   ├── lib/                 # Utilities (queryClient, logger, scheduler, search)
│   ├── integrations/        # Supabase client + generated types
│   ├── i18n/                # Translations (EN, NL, DE)
│   ├── config/              # App config, CAD backend, status enums
│   ├── types/               # Shared TypeScript types
│   └── theme/               # Dark/light theme
├── supabase/
│   ├── functions/
│   │   ├── _shared/         # handler, crud-builder, auth, plan-limits, security
│   │   └── api-*/           # 22 REST API endpoints (Deno)
│   └── migrations/          # PostgreSQL schema (timestamped SQL)
├── mcp-server/              # MCP server for AI tool integration
├── website/                 # Astro documentation site
├── scripts/                 # Build & deployment utilities
├── docs/                    # DBML schema, guides, operations
└── .agents/                 # Universal AI agent instructions
```

## Key Patterns

| Pattern | Where | How |
|---------|-------|-----|
| CRUD Builder | `_shared/crud-builder.ts` | Config-driven CRUD: pass table name + options, get pagination/filters/search/sync |
| API Handler Factory | `_shared/handler.ts` | `serveApi(handler)` wraps CORS, auth, error handling around any endpoint |
| Prefix Auth | `_shared/auth.ts` | API keys use 12-char prefix lookup + SHA-256 hash for O(1) auth |
| Plan Limits | `_shared/plan-limits.ts` | Quota checks per tenant plan (free/pro/premium/enterprise) |
| Soft Deletes | All tables | `deleted_at` + `deleted_by` columns, filtered by default in queries |
| ERP Sync | `api-erp-sync/`, crud-builder | `external_id` + `external_source` + `sync_hash` for idempotent sync |
| Realtime | `useRealtimeSubscription` | Supabase Realtime channels for live UI updates |
| i18n | `src/i18n/` | All UI text via `t()` keys — EN, NL, DE |
| Chunk Splitting | `vite.config.ts` | Manual chunks: react, supabase, query, charts, three, ui |
