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
      JOBS: "/admin/analytics/jobs",
      QUALITY: "/admin/analytics/quality",
    }
  },

  COMMON: {
    API_DOCS: "/admin/api-docs",
    PRICING: "/admin/pricing",
    MY_PLAN: "/admin/my-plan",
    HELP: "/admin/help",
    ABOUT: "/admin/about",
    PRIVACY_POLICY: "/privacy-policy",
    TERMS_OF_SERVICE: "/terms-of-service",
  },
} as const;
