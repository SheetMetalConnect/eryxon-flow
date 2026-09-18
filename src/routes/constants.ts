export const ROUTES = {
  AUTH: "/auth",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  ONBOARDING: "/onboarding",
  ROOT: "/",

  OPERATOR: {
    TERMINAL_LOGIN: "/operator/login",
    LOGIN: "/operator/login", // Alias for TERMINAL_LOGIN
    WORK_QUEUE: "/operator/work-queue",
    MY_ACTIVITY: "/operator/my-activity",
    MY_ISSUES: "/operator/my-issues",
    VIEW: "/operator/view",
  },

  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    JOBS: "/admin/jobs",
    JOBS_NEW: "/admin/jobs/new",
    BATCHES: "/admin/batches",
    BATCHES_NEW: "/admin/batches/new",
    PARTS: "/admin/parts",
    OPERATIONS: "/admin/operations",
    ASSIGNMENTS: "/admin/assignments",
    ISSUES: "/admin/issues",
    EXCEPTIONS: "/admin/exceptions",
    ACTIVITY: "/admin/activity",
    INTEGRATIONS: "/admin/integrations",
    DATA_EXPORT: "/admin/data-export",
    SETTINGS: "/admin/settings",

    CONFIG: {
      STAGES: "/admin/config/stages",
      MATERIALS: "/admin/config/materials",
      RESOURCES: "/admin/config/resources",
      USERS: "/admin/config/users",
      STEPS_TEMPLATES: "/admin/config/steps-templates",
      SCRAP_REASONS: "/admin/config/scrap-reasons",
      API_KEYS: "/admin/config/api-keys",
      MCP: "/admin/mcp",
      WEBHOOKS: "/admin/config/webhooks",
    },

  },

  COMMON: {
    PRICING: "/admin/pricing",
    MY_PLAN: "/admin/my-plan",
    ABOUT: "/admin/about",
    PRIVACY_POLICY: "/privacy-policy",
    TERMS_OF_SERVICE: "/terms-of-service",
  },
} as const;
