import { QueryClient } from "@tanstack/react-query";

export const QueryKeys = {
  jobs: {
    all: (tenantId: string) => ["jobs", "all", tenantId] as const,
    list: (tenantId: string) => ["jobs", "list", tenantId] as const,
    active: (tenantId: string) => ["jobs", "active", tenantId] as const,
    detail: (jobId: string) => ["jobs", "detail", jobId] as const,
    dates: (jobId: string) => ["jobs", "dates", jobId] as const,
    byStatus: (tenantId: string, status: string) =>
      ["jobs", "byStatus", tenantId, status] as const,
  },
  parts: {
    all: (tenantId: string) => ["parts", "all", tenantId] as const,
    detail: (partId: string) => ["parts", "detail", partId] as const,
    byJob: (jobId: string) => ["parts", "byJob", jobId] as const,
    parent: (partId: string) => ["parts", "parent", partId] as const,
    children: (partId: string) => ["parts", "children", partId] as const,
    assemblyDeps: (partId: string) => ["parts", "assemblyDeps", partId] as const,
  },
  operations: {
    all: (tenantId: string) => ["operations", "all", tenantId] as const,
    detail: (operationId: string) => ["operations", "detail", operationId] as const,
    byCell: (cellId: string) => ["operations", "byCell", cellId] as const,
    byPart: (partId: string) => ["operations", "byPart", partId] as const,
    workQueue: (cellId: string) => ["operations", "workQueue", cellId] as const,
    resources: (operationId: string) => ["operations", "resources", operationId] as const,
    production: (operationId: string) => ["operations", "production", operationId] as const,
    bookedHours: (operationId: string) => ["operations", "bookedHours", operationId] as const,
    forBatch: (batchId: string) => ["operations", "forBatch", batchId] as const,
  },
  cells: {
    all: (tenantId: string) => ["cells", "all", tenantId] as const,
    active: (tenantId: string) => ["cells", "active", tenantId] as const,
    detail: (cellId: string) => ["cells", "detail", cellId] as const,
    capacity: (tenantId: string) => ["cells", "capacity", tenantId] as const,
    qrmMetrics: (cellId: string, tenantId: string) =>
      ["cells", "qrmMetrics", cellId, tenantId] as const,
    allQrmMetrics: (tenantId: string) =>
      ["cells", "allQrmMetrics", tenantId] as const,
  },
  timeEntries: {
    all: (tenantId: string) => ["timeEntries", "all", tenantId] as const,
    byOperation: (operationId: string) =>
      ["timeEntries", "byOperation", operationId] as const,
    byUser: (userId: string) => ["timeEntries", "byUser", userId] as const,
    active: (tenantId: string) => ["timeEntries", "active", tenantId] as const,
    stuck: (tenantId: string) => ["timeEntries", "stuck", tenantId] as const,
  },
  issues: {
    all: (tenantId: string) => ["issues", "all", tenantId] as const,
    pending: (tenantId: string) => ["issues", "pending", tenantId] as const,
    pendingCount: (tenantId: string) => ["issues", "pendingCount", tenantId] as const,
    summary: (partId?: string, jobId?: string) => ["issues", "summary", partId, jobId] as const,
    byOperation: (operationId: string) =>
      ["issues", "byOperation", operationId] as const,
  },
  profiles: {
    all: (tenantId: string) => ["profiles", "all", tenantId] as const,
    detail: (userId: string) => ["profiles", "detail", userId] as const,
    current: () => ["profiles", "current"] as const,
    operators: (tenantId: string) => ["profiles", "operators", tenantId] as const,
  },
  config: {
    materials: (tenantId: string) => ["config", "materials", tenantId] as const,
    materialsActive: (tenantId: string) => ["config", "materialsActive", tenantId] as const,
    scrapReasons: (tenantId: string) =>
      ["config", "scrapReasons", tenantId] as const,
    resources: (tenantId: string) => ["config", "resources", tenantId] as const,
    availableResources: (tenantId: string) => ["config", "availableResources", tenantId] as const,
    stepsTemplates: (tenantId: string) =>
      ["config", "stepsTemplates", tenantId] as const,
    featureFlags: (tenantId: string) => ["config", "featureFlags", tenantId] as const,
  },
  batches: {
    all: (tenantId: string, filters?: Record<string, unknown>) =>
      ["batches", "all", tenantId, filters] as const,
    detail: (batchId: string) => ["batches", "detail", batchId] as const,
    subBatches: (batchId: string, tenantId: string) =>
      ["batches", "subBatches", batchId, tenantId] as const,
    operations: (batchId: string) => ["batches", "operations", batchId] as const,
    requirements: (batchId: string) => ["batches", "requirements", batchId] as const,
    potentialParents: (tenantId: string) =>
      ["batches", "potentialParents", tenantId] as const,
    activeTimer: (batchId: string) => ["batches", "activeTimer", batchId] as const,
  },
  quality: {
    metrics: (tenantId: string) => ["quality", "metrics", tenantId] as const,
    scrapUsage: (tenantId: string) => ["quality", "scrapUsage", tenantId] as const,
    byJob: (jobId: string) => ["quality", "byJob", jobId] as const,
    byPart: (partId: string) => ["quality", "byPart", partId] as const,
  },
  pmi: {
    byPart: (partId: string) => ["pmi", "byPart", partId] as const,
    geometry: (partId: string) => ["pmi", "geometry", partId] as const,
  },
  exceptions: {
    all: (tenantId: string, status?: string, limit?: number) =>
      ["exceptions", "all", tenantId, status, limit] as const,
    stats: (tenantId: string) => ["exceptions", "stats", tenantId] as const,
    detail: (exceptionId: string) => ["exceptions", "detail", exceptionId] as const,
  },
  locations: {
    all: (tenantId: string, cellId?: string | null) =>
      ["locations", "all", tenantId, cellId ?? null] as const,
    tracking: (tenantId: string) => ["locations", "tracking", tenantId] as const,
  },
  capacity: {
    operations: (tenantId: string) => ["capacity", "operations", tenantId] as const,
    dayAllocations: (tenantId: string) => ["capacity", "dayAllocations", tenantId] as const,
  },
  factoryCalendar: {
    all: (tenantId: string) => ["factoryCalendar", "all", tenantId] as const,
  },
  production: {
    byJob: (jobId: string) => ["production", "byJob", jobId] as const,
  },
  dashboard: {
    stats: (tenantId: string) => ["dashboard", "stats", tenantId] as const,
    activity: (tenantId: string) => ["dashboard", "activity", tenantId] as const,
  },
  tenant: {
    current: (tenantId: string) => ["tenant", "current", tenantId] as const,
    settings: (tenantId: string) => ["tenant", "settings", tenantId] as const,
  },
} as const;
/**
 * Default query options for different data categories
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnReconnect: true,
    },
    mutations: { retry: 1, retryDelay: 1000 },
  },
});
