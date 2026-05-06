/**
 * Planning Integration Layer — Barrel Export
 *
 * Provides a factory function to instantiate the correct planning adapter
 * based on configuration, plus re-exports of all types.
 */

export type {
  PlanningAdapter,
  PlanningWorkOrder,
  PlanningWorkOrderStatus,
  PlanningResource,
  PlanningResourceType,
  PlanningConfig,
  PlanningAdapterType,
  FrePPLeManufacturingOrder,
  FrePPLeResource,
  FrePPLePaginatedResponse,
  OdooJsonRpcRequest,
  OdooJsonRpcResponse,
  OdooProductionOrder,
} from './types';

export { FrePPLeAdapter } from './frepple-adapter';
export { OdooAdapter } from './odoo-adapter';

import type { PlanningAdapter, PlanningConfig } from './types';
import { FrePPLeAdapter } from './frepple-adapter';
import { OdooAdapter } from './odoo-adapter';

/**
 * Create a planning adapter instance based on configuration.
 *
 * Returns null when adapter is set to 'none' (no planning tool configured).
 *
 * @example
 * ```ts
 * const adapter = createPlanningAdapter({
 *   adapter: 'frepple',
 *   baseUrl: 'https://frepple.example.com',
 *   username: 'admin',
 *   password: 'secret',
 *   syncIntervalMinutes: 15,
 * });
 *
 * if (adapter) {
 *   const orders = await adapter.pullWorkOrders();
 * }
 * ```
 */
export function createPlanningAdapter(config: PlanningConfig): PlanningAdapter | null {
  switch (config.adapter) {
    case 'frepple':
      return new FrePPLeAdapter(config);
    case 'odoo':
      return new OdooAdapter(config);
    case 'none':
      return null;
  }
}
