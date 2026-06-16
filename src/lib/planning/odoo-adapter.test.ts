import { afterEach, describe, expect, it, vi } from 'vitest';
import { OdooAdapter } from './odoo-adapter';
import type { PlanningConfig } from './types';

function createConfig(overrides?: Partial<PlanningConfig>): PlanningConfig {
  return {
    adapter: 'odoo',
    baseUrl: 'https://odoo.example.com',
    databaseName: 'manufacturing_prod',
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
        'manufacturing_prod',
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

  it('requires an explicit database name instead of inferring one from the URL path', () => {
    expect(() => new OdooAdapter(createConfig({
      baseUrl: 'https://odoo.example.com/prod',
      databaseName: '   ',
    }))).toThrow('Odoo requires an explicit database name in planning configuration');
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

  it('confirms draft orders before setting the actual start timestamp', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: 7 }))
      .mockResolvedValueOnce(jsonResponse({
        jsonrpc: '2.0',
        id: 2,
        result: [{ state: 'draft' }],
      }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 3, result: true }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 4, result: true }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OdooAdapter(createConfig());
    await adapter.pushOrderStart('42', new Date('2026-05-26T08:30:00Z'));

    const confirmPayload = JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string);
    expect(confirmPayload.params.args.slice(3)).toEqual([
      'mrp.production',
      'action_confirm',
      [[42]],
      {},
    ]);

    const writePayload = JSON.parse((fetchMock.mock.calls[3][1] as RequestInit).body as string);
    expect(writePayload.params.args.slice(3)).toEqual([
      'mrp.production',
      'write',
      [[42], { date_start: '2026-05-26 08:30:00' }],
      {},
    ]);
  });

  it('completes orders through button_mark_done instead of writing state directly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: 7 }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 2, result: true }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 3, result: true }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OdooAdapter(createConfig());
    await adapter.pushOrderCompletion('42', 8, 0);

    const writePayload = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(writePayload.params.args.slice(3)).toEqual([
      'mrp.production',
      'write',
      [[42], { qty_producing: 8 }],
      {},
    ]);

    const donePayload = JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string);
    expect(donePayload.params.args.slice(3)).toEqual([
      'mrp.production',
      'button_mark_done',
      [[42]],
      {},
    ]);
  });
});
