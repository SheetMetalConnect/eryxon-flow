/**
 * Database enums for Supabase
 * All enum types used across tables
 */

export type DatabaseEnums = {
  app_role: "operator" | "admin"
  assignment_status: "assigned" | "accepted" | "in_progress" | "completed"
  batch_status: "draft" | "ready" | "in_progress" | "completed" | "cancelled"
  batch_type: "laser_nesting" | "tube_batch" | "saw_batch" | "finishing_batch" | "general"
  integration_category:
    | "erp"
    | "accounting"
    | "crm"
    | "inventory"
    | "shipping"
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
  shipment_status:
    | "draft"
    | "planned"
    | "loading"
    | "in_transit"
    | "delivered"
    | "cancelled"
  subscription_plan: "free" | "pro" | "premium" | "enterprise"
  subscription_status: "active" | "cancelled" | "suspended" | "trial"
  task_status: "not_started" | "in_progress" | "completed" | "on_hold"
  vehicle_type:
    | "truck"
    | "van"
    | "car"
    | "bike"
    | "freight"
    | "air"
    | "sea"
    | "rail"
    | "other"
  waitlist_status: "pending" | "approved" | "rejected" | "converted"
}

/**
 * Runtime enum constants for validation and iteration
 */
export const EnumConstants = {
  app_role: ["operator", "admin"],
  assignment_status: ["assigned", "accepted", "in_progress", "completed"],
  batch_status: ["draft", "ready", "in_progress", "completed", "cancelled"],
  batch_type: ["laser_nesting", "tube_batch", "saw_batch", "finishing_batch", "general"],
  integration_category: [
    "erp",
    "accounting",
    "crm",
    "inventory",
    "shipping",
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
  shipment_status: [
    "draft",
    "planned",
    "loading",
    "in_transit",
    "delivered",
    "cancelled",
  ],
  subscription_plan: ["free", "pro", "premium", "enterprise"],
  subscription_status: ["active", "cancelled", "suspended", "trial"],
  task_status: ["not_started", "in_progress", "completed", "on_hold"],
  vehicle_type: [
    "truck",
    "van",
    "car",
    "bike",
    "freight",
    "air",
    "sea",
    "rail",
    "other",
  ],
  waitlist_status: ["pending", "approved", "rejected", "converted"],
} as const
