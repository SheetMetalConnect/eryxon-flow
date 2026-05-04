/**
 * Planning Tool Integration Layer — Type Definitions
 *
 * ISA-95 aligned vocabulary:
 *   Work Schedule → Work Request → Job Order
 *
 * This adapter interface abstracts planning/scheduling tools (FrePPLe, Odoo MRP,
 * ERPNext) behind a common contract, allowing Eryxon Flow to pull planned work
 * orders and push actual execution feedback.
 */

// -----------------------------------------------------------------------------
// Core adapter interface
// -----------------------------------------------------------------------------

export interface PlanningAdapter {
  /** Identifier for this adapter type */
  name: string;

  /** Verify connectivity and authentication to the planning system */
  testConnection(): Promise<boolean>;

  /** Pull work orders (manufacturing orders) from the planning system */
  pullWorkOrders(since?: Date): Promise<PlanningWorkOrder[]>;

  /** Pull resource definitions from the planning system */
  pullResources(): Promise<PlanningResource[]>;

  /** Push actual start time for an order back to the planning system */
  pushOrderStart(orderId: string, actualStart: Date): Promise<void>;

  /** Push order completion with produced quantity and scrap */
  pushOrderCompletion(orderId: string, qty: number, scrap: number): Promise<void>;
}

// -----------------------------------------------------------------------------
// Data transfer objects
// -----------------------------------------------------------------------------

export type PlanningWorkOrderStatus =
  | 'proposed'
  | 'approved'
  | 'confirmed'
  | 'in_progress'
  | 'completed';

export interface PlanningWorkOrder {
  /** Unique identifier in the external planning system */
  externalId: string;
  /** Source system name (e.g. 'frepple', 'odoo') */
  externalSource: string;
  /** Name of the manufacturing operation */
  operationName: string;
  /** Name of the item/product being produced */
  itemName: string;
  /** Planned quantity to produce */
  quantityPlanned: number;
  /** Scheduled start date/time */
  plannedStart: Date;
  /** Scheduled end date/time */
  plannedEnd: Date;
  /** Current status in the planning system */
  status: PlanningWorkOrderStatus;
  /** Priority (lower = higher priority, 1 is highest) */
  priority: number;
  /** Assigned resource name (machine/workcenter) */
  resourceName?: string;
  /** Batch/lot identifier */
  batch?: string;
}

export type PlanningResourceType = 'machine' | 'labor' | 'tool';

export interface PlanningResource {
  /** Unique identifier in the external planning system */
  externalId: string;
  /** Human-readable resource name */
  name: string;
  /** Resource classification */
  type: PlanningResourceType;
  /** Maximum capacity (units depend on resource type) */
  capacity?: number;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export type PlanningAdapterType = 'frepple' | 'odoo' | 'none';

export interface PlanningConfig {
  /** Which adapter to use */
  adapter: PlanningAdapterType;
  /** Base URL of the planning system (e.g. https://frepple.example.com) */
  baseUrl: string;
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** API key (alternative to username/password) */
  apiKey?: string;
  /** How often to sync, in minutes */
  syncIntervalMinutes: number;
  /** Optional UNS topic prefix for publishing sync events */
  topicPrefix?: string;
}

// -----------------------------------------------------------------------------
// FrePPLe-specific response types (for internal mapping)
// -----------------------------------------------------------------------------

export interface FrePPLeManufacturingOrder {
  reference: string;
  operation: string;
  item?: string;
  quantity: number;
  startdate: string;
  enddate: string;
  status: string;
  priority: number;
  resource?: string;
  batch?: string;
}

export interface FrePPLeResource {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  maximum?: number;
  type?: string;
}

export interface FrePPLePaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// -----------------------------------------------------------------------------
// Odoo-specific types (for internal mapping)
// -----------------------------------------------------------------------------

export interface OdooJsonRpcRequest {
  jsonrpc: '2.0';
  method: 'call';
  id: number;
  params: Record<string, unknown>;
}

export interface OdooJsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data: {
      name: string;
      debug: string;
      message: string;
    };
  };
}

export interface OdooProductionOrder {
  id: number;
  name: string;
  product_id: [number, string];
  product_qty: number;
  date_start: string | false;
  date_finished: string | false;
  date_deadline: string | false;
  state: string;
  priority: string;
  workcenter_id: [number, string] | false;
  lot_producing_id: [number, string] | false;
}
