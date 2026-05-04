/**
 * FrePPLe Planning Adapter
 *
 * Connects to FrePPLe's Django REST Framework API to pull manufacturing orders
 * and push execution feedback (start/completion).
 *
 * Authentication: Basic Auth (username:password base64 encoded)
 * Pagination: Django REST Framework page-based (follows `next` links)
 *
 * @see https://frepple.com/docs/current/integration-guide/rest-api/
 */

import type {
  PlanningAdapter,
  PlanningConfig,
  PlanningWorkOrder,
  PlanningWorkOrderStatus,
  PlanningResource,
  PlanningResourceType,
  FrePPLeManufacturingOrder,
  FrePPLeResource,
  FrePPLePaginatedResponse,
} from './types';

export class FrePPLeAdapter implements PlanningAdapter {
  readonly name = 'frepple';

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: PlanningConfig) {
    // Strip trailing slash for consistent URL building
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    const credentials = btoa(`${config.username ?? ''}:${config.password ?? ''}`);
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Test connectivity by hitting the API root.
   * Returns true if the server responds with 200.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/`, {
        method: 'GET',
        headers: this.buildHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Pull manufacturing orders from FrePPLe.
   * Filters to approved/confirmed orders by default.
   * Handles pagination automatically.
   */
  async pullWorkOrders(since?: Date): Promise<PlanningWorkOrder[]> {
    let url = `${this.baseUrl}/api/input/manufacturingorder/?format=json&status__in=approved,confirmed`;

    if (since) {
      url += `&startdate__gte=${since.toISOString()}`;
    }

    const allOrders: FrePPLeManufacturingOrder[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `FrePPLe API error: ${response.status} ${response.statusText}`
        );
      }

      const page: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> =
        await response.json();

      allOrders.push(...page.results);
      nextUrl = page.next;
    }

    return allOrders.map((order) => this.mapWorkOrder(order));
  }

  /**
   * Pull resource definitions from FrePPLe.
   * Handles pagination automatically.
   */
  async pullResources(): Promise<PlanningResource[]> {
    let url = `${this.baseUrl}/api/input/resource/?format=json`;

    const allResources: FrePPLeResource[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `FrePPLe API error: ${response.status} ${response.statusText}`
        );
      }

      const page: FrePPLePaginatedResponse<FrePPLeResource> =
        await response.json();

      allResources.push(...page.results);
      nextUrl = page.next;
    }

    return allResources.map((resource) => this.mapResource(resource));
  }

  /**
   * Push actual start time to FrePPLe for a manufacturing order.
   * PATCHes the order with status=confirmed and actual startdate.
   */
  async pushOrderStart(orderId: string, actualStart: Date): Promise<void> {
    const url = `${this.baseUrl}/api/input/manufacturingorder/${encodeURIComponent(orderId)}/?format=json`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        startdate: actualStart.toISOString(),
        status: 'confirmed',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `FrePPLe pushOrderStart failed: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Push order completion to FrePPLe.
   * PATCHes the order with status=completed, produced quantity, and scrap.
   */
  async pushOrderCompletion(
    orderId: string,
    qty: number,
    scrap: number
  ): Promise<void> {
    const url = `${this.baseUrl}/api/input/manufacturingorder/${encodeURIComponent(orderId)}/?format=json`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        status: 'completed',
        quantity: qty,
        quantity_completed: qty - scrap,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `FrePPLe pushOrderCompletion failed: ${response.status} ${response.statusText}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private mapWorkOrder(order: FrePPLeManufacturingOrder): PlanningWorkOrder {
    return {
      externalId: order.reference,
      externalSource: 'frepple',
      operationName: order.operation,
      itemName: order.item ?? '',
      quantityPlanned: order.quantity,
      plannedStart: new Date(order.startdate),
      plannedEnd: new Date(order.enddate),
      status: this.mapStatus(order.status),
      priority: order.priority,
      resourceName: order.resource ?? undefined,
      batch: order.batch ?? undefined,
    };
  }

  private mapStatus(freppleStatus: string): PlanningWorkOrderStatus {
    switch (freppleStatus) {
      case 'proposed':
        return 'proposed';
      case 'approved':
        return 'approved';
      case 'confirmed':
        return 'confirmed';
      case 'completed':
      case 'closed':
        return 'completed';
      default:
        return 'proposed';
    }
  }

  private mapResource(resource: FrePPLeResource): PlanningResource {
    return {
      externalId: resource.name,
      name: resource.description || resource.name,
      type: this.inferResourceType(resource),
      capacity: resource.maximum ?? undefined,
    };
  }

  private inferResourceType(resource: FrePPLeResource): PlanningResourceType {
    const category = (resource.category ?? '').toLowerCase();
    if (category.includes('labor') || category.includes('operator')) {
      return 'labor';
    }
    if (category.includes('tool')) {
      return 'tool';
    }
    return 'machine';
  }
}
