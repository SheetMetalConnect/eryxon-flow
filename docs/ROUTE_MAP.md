# Route Map — Eryxon Flow

> All 46 frontend routes with guards and lazy-loading status.

## Auth Routes (public)

| Path | Component | Guard |
|------|-----------|-------|
| `/auth` | Auth | none |
| `/forgot-password` | ForgotPassword | none |
| `/reset-password` | ResetPassword | none |
| `/operator/login` | TerminalLogin | none |
| `/accept-invitation/:token` | AcceptInvitation | none |

## Admin Routes (32)

All use `ProtectedRoute (adminOnly)` + `LazyRoute`.

| Path | Component |
|------|-----------|
| `/admin/dashboard` | Dashboard |
| `/admin/jobs` | Jobs |
| `/admin/jobs/new` | JobCreate |
| `/admin/parts` | Parts |
| `/admin/parts/new` | PartCreate |
| `/admin/operations` | Operations |
| `/admin/batches` | Batches |
| `/admin/batches/new` | BatchCreate |
| `/admin/batches/:id` | BatchDetail |
| `/admin/batches/:id/edit` | BatchCreate |
| `/admin/issues` | IssueQueue |
| `/admin/assignments` | Assignments |
| `/admin/capacity` | CapacityMatrix |
| `/admin/activity` | ActivityMonitor |
| `/admin/data-export` | DataExport |
| `/admin/data-import` | DataImport |
| `/admin/settings` | Settings |
| `/admin/my-plan` | MyPlan |
| `/admin/mcp-setup` | McpSetup |
| `/admin/organization/settings` | OrganizationSettings |
| `/admin/config/stages` | ConfigStages |
| `/admin/config/calendar` | FactoryCalendar |
| `/admin/config/materials` | ConfigMaterials |
| `/admin/config/resources` | ConfigResources |
| `/admin/config/users` | ConfigUsers |
| `/admin/config/scrap-reasons` | ConfigScrapReasons |
| `/admin/config/steps-templates` | StepsTemplatesView |
| `/admin/config/api-keys` | ConfigApiKeys |
| `/admin/config/webhooks` | ConfigWebhooks |
| `/admin/config/mqtt-publishers` | ConfigMqttPublishers |
| `/admin/config/mcp-keys` | ConfigMcpKeys |
| `/admin/config/mcp-server` | McpServerSettings |

## Operator Routes (4)

All use `ProtectedRoute` (not adminOnly) + `LazyRoute`.

| Path | Component |
|------|-----------|
| `/operator/work-queue` | WorkQueue |
| `/operator/my-activity` | MyActivity |
| `/operator/my-issues` | MyIssues |
| `/operator/view` | OperatorView |

## Common Routes (5)

| Path | Component | Guard |
|------|-----------|-------|
| `/admin/api-docs` | ApiDocs | ProtectedRoute |
| `/admin/pricing` | Pricing | ProtectedRoute |
| `/admin/about` | About | ProtectedRoute |
| `/privacy-policy` | PrivacyPolicy | none (public) |
| `/terms-of-service` | TermsOfService | none (public) |

## Root redirect

`/` redirects based on profile:
- `onboarding_completed === false` → `/onboarding`
- `role === "admin"` → `/admin/dashboard`
- else → `/operator/work-queue`

## Legacy Redirects

| Old Path | New Path |
|----------|----------|
| `/dashboard` | `/admin/dashboard` |
| `/admin/stages` | `/admin/config/stages` |
| `/admin/materials` | `/admin/config/materials` |
| `/admin/resources` | `/admin/config/resources` |
| `/admin/users` | `/admin/config/users` |
| `/work-queue` | `/operator/work-queue` |
| `/my-activity` | `/operator/my-activity` |
| `/my-issues` | `/operator/my-issues` |
| `/operator-view` | `/operator/view` |
