import { afterEach, describe, expect, it, vi } from 'vitest';
import { OdooAdapter } from './odoo-adapter';
import type { PlanningConfig } from './types';

function createConfig(overrides?: Partial<PlanningConfig>): PlanningConfig {
  return {
    adapter: 'odoo',
    baseUrl: 'https://odoo.example.com/prod',
    username: 'admin',
    password: 'secret',
    syncIntervalMinutes: 15,
    ...overrides,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('OdooAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes execute_kw args and kwargs in the shape Odoo expects', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: 7 }))
      .mockResolvedValueOnce(jsonResponse({
        jsonrpc: '2.0',
        id: 2,
        result: [
          { id: 10, name: 'Laser', capacity: 2, resource_type: 'material' },
          { id: 11, name: 'Operator', capacity: 1, resource_type: 'human' },
        ],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OdooAdapter(createConfig());
    const resources = await adapter.pullResources();

    expect(resources).toEqual([
      { externalId: '10', name: 'Laser', type: 'machine', capacity: 2 },
      { externalId: '11', name: 'Operator', type: 'labor', capacity: 1 },
    ]);

    const requestInit = fetchMock.mock.calls[1][1] as RequestInit;
    const payload = JSON.parse(requestInit.body as string);
    expect(payload.params).toEqual({
      service: 'object',
      method: 'execute_kw',
      args: [
        'prod',
        7,
        'secret',
        'mrp.workcenter',
        'search_read',
        [[]],
        {
          fields: ['id', 'name', 'capacity', 'resource_type'],
          limit: 500,
          offset: 0,
        },
      ],
    });
  });

  it('keeps missing Odoo dates as null instead of inventing current timestamps', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: 7 }))
      .mockResolvedValueOnce(jsonResponse({
        jsonrpc: '2.0',
        id: 2,
        result: [{
          id: 42,
          name: 'MO-42',
          product_id: [5, 'Bracket'],
          product_qty: 10,
          date_start: false,
          date_finished: false,
          date_deadline: false,
          state: 'confirmed',
          priority: '1',
          workcenter_id: false,
          lot_producing_id: false,
        }],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OdooAdapter(createConfig());
    const orders = await adapter.pullWorkOrders();

    expect(orders[0].plannedStart).toBeNull();
    expect(orders[0].plannedEnd).toBeNull();
  });
});
