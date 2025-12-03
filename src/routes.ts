export const ROUTES = {
  AUTH: "/auth",
  ONBOARDING: "/onboarding",
  ROOT: "/",

  OPERATOR: {
    WORK_QUEUE: "/operator/work-queue",
    MY_ACTIVITY: "/operator/my-activity",
    MY_ISSUES: "/operator/my-issues",
    VIEW: "/operator/view",
  },

  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    JOBS: "/admin/jobs",
    JOBS_NEW: "/admin/jobs/new",
    PARTS: "/admin/parts",
    OPERATIONS: "/admin/operations",
    ASSIGNMENTS: "/admin/assignments",
    ISSUES: "/admin/issues",
    ACTIVITY: "/admin/activity",
    INTEGRATIONS: "/admin/integrations",
    DATA_EXPORT: "/admin/data-export",
    SHIPPING: "/admin/shipping",
    SETTINGS: "/admin/settings",

    CONFIG: {
      STAGES: "/admin/config/stages",
      MATERIALS: "/admin/config/materials",
      RESOURCES: "/admin/config/resources",
      USERS: "/admin/config/users",
      STEPS_TEMPLATES: "/admin/config/steps-templates",
      SCRAP_REASONS: "/admin/config/scrap-reasons",
      API_KEYS: "/admin/config/api-keys",
      MCP_KEYS: "/admin/config/mcp-keys",
      WEBHOOKS: "/admin/config/webhooks",
      MQTT_PUBLISHERS: "/admin/config/mqtt-publishers",
      MCP_SERVER: "/admin/config/mcp-server",
    },

    ANALYTICS: {
      ROOT: "/admin/analytics",
      OEE: "/admin/analytics/oee",
      RELIABILITY: "/admin/analytics/reliability",
      QRM: "/admin/analytics/qrm",
      QRM_DASHBOARD: "/admin/analytics/qrm-dashboard",
    }
  },

  COMMON: {
    API_DOCS: "/api-docs",
    PRICING: "/pricing",
    MY_PLAN: "/my-plan",
    BILLING_COMING_SOON: "/billing/coming-soon",
    HELP: "/help",
    ABOUT: "/about",
  },

  // Legacy redirects
  LEGACY: {
    WORK_QUEUE: "/work-queue",
    MY_ACTIVITY: "/my-activity",
    MY_ISSUES: "/my-issues",
    OPERATOR_VIEW: "/operator-view",
    DASHBOARD: "/dashboard",
    STAGES: "/admin/stages",
    MATERIALS: "/admin/materials",
    RESOURCES: "/admin/resources",
    USERS: "/admin/users",
    API_DOCS: "/api-docs",
    PRICING: "/pricing",
    MY_PLAN: "/my-plan",
    HELP: "/help",
  }
} as const;
