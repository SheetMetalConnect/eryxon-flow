/**
 * Database enums for Supabase
 * All enum types used across tables
 */

export type DatabaseEnums = {
  app_role: "operator" | "admin"
  assignment_status: "assigned" | "accepted" | "in_progress" | "completed"
  integration_category:
    | "erp"
    | "accounting"
    | "crm"
    | "inventory"
    | "analytics"
    | "other"
  integration_status: "draft" | "published" | "deprecated" | "archived"
  invoice_payment_status:
    | "pending"
    | "sent"
    | "viewed"
    | "paid"
    | "overdue"
    | "cancelled"
    | "refunded"
  issue_severity: "low" | "medium" | "high" | "critical"
  issue_status: "pending" | "approved" | "rejected" | "closed"
  issue_type: "general" | "ncr"
  job_status: "not_started" | "in_progress" | "completed" | "on_hold"
  ncr_category:
    | "material_defect"
    | "dimensional"
    | "surface_finish"
    | "process_error"
    | "other"
  ncr_disposition: "scrap" | "rework" | "use_as_is" | "return_to_supplier"
  payment_provider: "invoice" | "stripe" | "sumup"
  payment_transaction_status:
    | "pending"
    | "processing"
    | "succeeded"
    | "failed"
    | "cancelled"
  payment_transaction_type: "charge" | "refund" | "chargeback" | "dispute"
  subscription_plan: "free" | "pro" | "premium" | "enterprise"
  subscription_status: "active" | "cancelled" | "suspended" | "trial"
  task_status: "not_started" | "in_progress" | "completed" | "on_hold"
  waitlist_status: "pending" | "approved" | "rejected" | "converted"
}

/**
 * Runtime enum constants for validation and iteration
 */
export const EnumConstants = {
  app_role: ["operator", "admin"],
  assignment_status: ["assigned", "accepted", "in_progress", "completed"],
  integration_category: [
    "erp",
    "accounting",
    "crm",
    "inventory",
    "analytics",
    "other",
  ],
  integration_status: ["draft", "published", "deprecated", "archived"],
  invoice_payment_status: [
    "pending",
    "sent",
    "viewed",
    "paid",
    "overdue",
    "cancelled",
    "refunded",
  ],
  issue_severity: ["low", "medium", "high", "critical"],
  issue_status: ["pending", "approved", "rejected", "closed"],
  issue_type: ["general", "ncr"],
  job_status: ["not_started", "in_progress", "completed", "on_hold"],
  ncr_category: [
    "material_defect",
    "dimensional",
    "surface_finish",
    "process_error",
    "other",
  ],
  ncr_disposition: ["scrap", "rework", "use_as_is", "return_to_supplier"],
  payment_provider: ["invoice", "stripe", "sumup"],
  payment_transaction_status: [
    "pending",
    "processing",
    "succeeded",
    "failed",
    "cancelled",
  ],
  payment_transaction_type: ["charge", "refund", "chargeback", "dispute"],
  subscription_plan: ["free", "pro", "premium", "enterprise"],
  subscription_status: ["active", "cancelled", "suspended", "trial"],
  task_status: ["not_started", "in_progress", "completed", "on_hold"],
  waitlist_status: ["pending", "approved", "rejected", "converted"],
} as const

/**
 * Named status constants for use in code instead of string literals.
 * Prevents typos and enables IDE autocomplete.
 */
export const JobStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
} as const;

export const OperationStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
} as const;

export const PartStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export const BatchStatus = {
  DRAFT: "draft",
  READY: "ready",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  BLOCKED: "blocked",
} as const;
