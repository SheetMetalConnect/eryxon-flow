/**
 * Odoo MRP Planning Adapter (Scaffold)
 *
 * Connects to Odoo via JSON-RPC to pull manufacturing orders from
 * `mrp.production` and `mrp.workorder` models.
 *
 * Authentication: Session-based via `/web/session/authenticate`
 * Protocol: JSON-RPC 2.0 POST to `/jsonrpc`
 *
 * @see https://www.odoo.com/documentation/17.0/developer/reference/external_api.html
 */

import type {
  PlanningAdapter,
  PlanningConfig,
  PlanningWorkOrder,
  PlanningWorkOrderStatus,
  PlanningResource,
  OdooJsonRpcRequest,
  OdooJsonRpcResponse,
  OdooProductionOrder,
} from './types';

export class OdooAdapter implements PlanningAdapter {
  readonly name = 'odoo';

  private readonly baseUrl: string;
  private readonly db: string;
  private uid: number | null = null;
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(private readonly config: PlanningConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    // Odoo DB name is typically the first path segment or configured separately.
    // We extract it from the URL or default to 'odoo'.
    const urlObj = new URL(config.baseUrl);
    this.db = urlObj.pathname.replace(/^\//, '').split('/')[0] || 'odoo';
  }

  /**
   * Test connectivity by authenticating against the Odoo session endpoint.
   */
  async testConnection(): Promise<boolean> {
    try {
      const uid = await this.authenticate();
      return uid > 0;
    } catch {
      return false;
    }
  }

  /**
   * Pull manufacturing orders from mrp.production model.
   * Filters to confirmed/in_progress orders.
   */
  async pullWorkOrders(since?: Date): Promise<PlanningWorkOrder[]> {
    await this.ensureAuthenticated();

    const domain: unknown[] = [
      ['state', 'in', ['confirmed', 'progress']],
    ];

    if (since) {
      domain.push(['write_date', '>=', since.toISOString().replace('T', ' ').slice(0, 19)]);
    }

    const orders = await this.searchRead<OdooProductionOrder>(
      'mrp.production',
      domain,
      [
        'id',
        'name',
        'product_id',
        'product_qty',
        'date_start',
        'date_finished',
        'date_deadline',
        'state',
        'priority',
        'workcenter_id',
        'lot_producing_id',
      ]
    );

    return orders.map((order) => this.mapWorkOrder(order));
  }

  /**
   * Pull resources from mrp.workcenter model.
   *
   * TODO: Implement full resource pull with capacity data.
   */
  async pullResources(): Promise<PlanningResource[]> {
    await this.ensureAuthenticated();

    const workcenters = await this.searchRead<{
      id: number;
      name: string;
      capacity: number;
      resource_type: string;
    }>(
      'mrp.workcenter',
      [],
      ['id', 'name', 'capacity', 'resource_type']
    );

    return workcenters.map((wc) => ({
      externalId: String(wc.id),
      name: wc.name,
      type: 'machine' as const,
      capacity: wc.capacity || undefined,
    }));
  }

  /**
   * Push actual start time for a manufacturing order.
   *
   * TODO: Implement via write() on mrp.production.
   */
  async pushOrderStart(orderId: string, actualStart: Date): Promise<void> {
    await this.ensureAuthenticated();

    await this.callMethod('mrp.production', 'write', [
      [parseInt(orderId, 10)],
      {
        date_start: actualStart.toISOString().replace('T', ' ').slice(0, 19),
        state: 'progress',
      },
    ]);
  }

  /**
   * Push order completion.
   *
   * TODO: In production, this should use mrp.production button_mark_done()
   * or the produce wizard. For now, we do a direct write.
   */
  async pushOrderCompletion(
    orderId: string,
    qty: number,
    _scrap: number
  ): Promise<void> {
    await this.ensureAuthenticated();

    await this.callMethod('mrp.production', 'write', [
      [parseInt(orderId, 10)],
      {
        qty_produced: qty,
        state: 'done',
      },
    ]);
  }

  // ---------------------------------------------------------------------------
  // JSON-RPC helpers
  // ---------------------------------------------------------------------------

  private async authenticate(): Promise<number> {
    const payload: OdooJsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: ++this.requestId,
      params: {
        service: 'common',
        method: 'authenticate',
        args: [this.db, this.config.username ?? '', this.config.password ?? '', {}],
      },
    };

    const response = await fetch(`${this.baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Odoo auth failed: ${response.status}`);
    }

    const data: OdooJsonRpcResponse<number> = await response.json();

    if (data.error) {
      throw new Error(`Odoo auth error: ${data.error.message}`);
    }

    this.uid = data.result ?? 0;
    // Extract session cookie if present
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/session_id=([^;]+)/);
      if (match) {
        this.sessionId = match[1];
      }
    }

    return this.uid;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.uid) {
      await this.authenticate();
    }
  }

  private async searchRead<T>(
    model: string,
    domain: unknown[],
    fields: string[]
  ): Promise<T[]> {
    const result = await this.callMethod(model, 'search_read', [domain], {
      fields,
      limit: 500,
    });
    return (result ?? []) as T[];
  }

  private async callMethod(
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {}
  ): Promise<unknown> {
    const payload: OdooJsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: ++this.requestId,
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          this.db,
          this.uid,
          this.config.password ?? '',
          model,
          method,
          ...args,
        ],
        kwargs,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.sessionId) {
      headers['Cookie'] = `session_id=${this.sessionId}`;
    }

    const response = await fetch(`${this.baseUrl}/jsonrpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Odoo RPC failed: ${response.status}`);
    }

    const data: OdooJsonRpcResponse = await response.json();

    if (data.error) {
      throw new Error(`Odoo RPC error: ${data.error.data?.message ?? data.error.message}`);
    }

    return data.result;
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private mapWorkOrder(order: OdooProductionOrder): PlanningWorkOrder {
    return {
      externalId: String(order.id),
      externalSource: 'odoo',
      operationName: order.name,
      itemName: order.product_id?.[1] ?? '',
      quantityPlanned: order.product_qty,
      plannedStart: this.parseOdooDate(order.date_start),
      plannedEnd: this.parseOdooDate(order.date_deadline || order.date_finished),
      status: this.mapStatus(order.state),
      priority: this.mapPriority(order.priority),
      resourceName: order.workcenter_id ? order.workcenter_id[1] : undefined,
      batch: order.lot_producing_id ? order.lot_producing_id[1] : undefined,
    };
  }

  private mapStatus(odooState: string): PlanningWorkOrderStatus {
    switch (odooState) {
      case 'draft':
        return 'proposed';
      case 'confirmed':
        return 'confirmed';
      case 'progress':
        return 'in_progress';
      case 'done':
        return 'completed';
      case 'cancel':
        return 'completed';
      default:
        return 'proposed';
    }
  }

  private mapPriority(odooPriority: string): number {
    // Odoo uses '0' (normal), '1' (urgent), '2' (very urgent), '3' (not so urgent)
    switch (odooPriority) {
      case '2':
        return 1;
      case '1':
        return 2;
      case '0':
        return 3;
      case '3':
        return 4;
      default:
        return 3;
    }
  }

  private parseOdooDate(value: string | false): Date {
    if (!value) {
      return new Date();
    }
    // Odoo dates are in format "YYYY-MM-DD HH:MM:SS" (UTC)
    return new Date(value.replace(' ', 'T') + 'Z');
  }
}
