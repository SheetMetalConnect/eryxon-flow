import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FrePPLeAdapter } from './frepple-adapter';
import type {
  PlanningConfig,
  FrePPLePaginatedResponse,
  FrePPLeManufacturingOrder,
  FrePPLeResource,
} from './types';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createConfig(overrides?: Partial<PlanningConfig>): PlanningConfig {
  return {
    adapter: 'frepple',
    baseUrl: 'https://frepple.example.com',
    username: 'admin',
    password: 'secret123',
    syncIntervalMinutes: 15,
    ...overrides,
  };
}

function jsonResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as unknown as Response;
}

describe('FrePPLeAdapter', () => {
  let adapter: FrePPLeAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FrePPLeAdapter(createConfig());
  });

  describe('testConnection', () => {
    it('returns true when API responds with 200', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 200));

      const result = await adapter.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://frepple.example.com/api/',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Basic ${btoa('admin:secret123')}`,
          }),
        })
      );
    });

    it('returns false on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 401));

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('pullWorkOrders', () => {
    const sampleOrder: FrePPLeManufacturingOrder = {
      reference: 'MO-001',
      operation: 'Laser Cut 3mm Steel',
      item: 'BRACKET-A',
      quantity: 50,
      startdate: '2026-05-05T08:00:00Z',
      enddate: '2026-05-05T12:00:00Z',
      status: 'approved',
      priority: 2,
      resource: 'Laser-1',
      batch: 'BATCH-2026-05',
    };

    it('maps FrePPLe response to PlanningWorkOrder correctly', async () => {
      const page: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> = {
        count: 1,
        next: null,
        previous: null,
        results: [sampleOrder],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const orders = await adapter.pullWorkOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        externalId: 'MO-001',
        externalSource: 'frepple',
        operationName: 'Laser Cut 3mm Steel',
        itemName: 'BRACKET-A',
        quantityPlanned: 50,
        plannedStart: new Date('2026-05-05T08:00:00Z'),
        plannedEnd: new Date('2026-05-05T12:00:00Z'),
        status: 'approved',
        priority: 2,
        resourceName: 'Laser-1',
        batch: 'BATCH-2026-05',
      });
    });

    it('maps "closed" status to "completed"', async () => {
      const page: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> = {
        count: 1,
        next: null,
        previous: null,
        results: [{ ...sampleOrder, status: 'closed' }],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const orders = await adapter.pullWorkOrders();

      expect(orders[0].status).toBe('completed');
    });

    it('handles orders without optional fields', async () => {
      const minimalOrder: FrePPLeManufacturingOrder = {
        reference: 'MO-002',
        operation: 'Bend',
        quantity: 10,
        startdate: '2026-05-06T09:00:00Z',
        enddate: '2026-05-06T10:00:00Z',
        status: 'confirmed',
        priority: 1,
      };
      const page: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> = {
        count: 1,
        next: null,
        previous: null,
        results: [minimalOrder],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const orders = await adapter.pullWorkOrders();

      expect(orders[0].itemName).toBe('');
      expect(orders[0].resourceName).toBeUndefined();
      expect(orders[0].batch).toBeUndefined();
    });

    it('follows pagination links', async () => {
      const page1: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> = {
        count: 2,
        next: 'https://frepple.example.com/api/input/manufacturingorder/?format=json&page=2',
        previous: null,
        results: [sampleOrder],
      };
      const page2: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> = {
        count: 2,
        next: null,
        previous: 'https://frepple.example.com/api/input/manufacturingorder/?format=json&page=1',
        results: [{ ...sampleOrder, reference: 'MO-002' }],
      };

      mockFetch
        .mockResolvedValueOnce(jsonResponse(page1))
        .mockResolvedValueOnce(jsonResponse(page2));

      const orders = await adapter.pullWorkOrders();

      expect(orders).toHaveLength(2);
      expect(orders[0].externalId).toBe('MO-001');
      expect(orders[1].externalId).toBe('MO-002');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('includes since filter in URL when provided', async () => {
      const page: FrePPLePaginatedResponse<FrePPLeManufacturingOrder> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const since = new Date('2026-05-01T00:00:00Z');
      await adapter.pullWorkOrders(since);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startdate__gte=2026-05-01T00:00:00.000Z'),
        expect.any(Object)
      );
    });

    it('throws on non-OK response', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 500));

      await expect(adapter.pullWorkOrders()).rejects.toThrow(
        'FrePPLe API error: 500'
      );
    });
  });

  describe('pullResources', () => {
    it('maps FrePPLe resource to PlanningResource', async () => {
      const page: FrePPLePaginatedResponse<FrePPLeResource> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            name: 'Laser-1',
            description: 'Trumpf TruLaser 3030',
            category: 'machine',
            maximum: 1,
          },
        ],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const resources = await adapter.pullResources();

      expect(resources).toHaveLength(1);
      expect(resources[0]).toEqual({
        externalId: 'Laser-1',
        name: 'Trumpf TruLaser 3030',
        type: 'machine',
        capacity: 1,
      });
    });

    it('infers labor type from category', async () => {
      const page: FrePPLePaginatedResponse<FrePPLeResource> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            name: 'operator-team-A',
            category: 'labor',
            maximum: 4,
          },
        ],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const resources = await adapter.pullResources();

      expect(resources[0].type).toBe('labor');
    });

    it('uses name as fallback when description is missing', async () => {
      const page: FrePPLePaginatedResponse<FrePPLeResource> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            name: 'Press-Brake-2',
            maximum: 1,
          },
        ],
      };
      mockFetch.mockResolvedValue(jsonResponse(page));

      const resources = await adapter.pullResources();

      expect(resources[0].name).toBe('Press-Brake-2');
    });
  });

  describe('pushOrderStart', () => {
    it('PATCHes the order with status and startdate', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 200));

      const start = new Date('2026-05-05T07:30:00Z');
      await adapter.pushOrderStart('MO-001', start);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://frepple.example.com/api/input/manufacturingorder/MO-001/?format=json',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            startdate: '2026-05-05T07:30:00.000Z',
            status: 'confirmed',
          }),
        })
      );
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 404));

      await expect(
        adapter.pushOrderStart('INVALID', new Date())
      ).rejects.toThrow('FrePPLe pushOrderStart failed: 404');
    });
  });

  describe('pushOrderCompletion', () => {
    it('PATCHes the order with completed status and quantities', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 200));

      await adapter.pushOrderCompletion('MO-001', 48, 2);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://frepple.example.com/api/input/manufacturingorder/MO-001/?format=json',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'completed',
            quantity: 48,
            quantity_completed: 46,
          }),
        })
      );
    });

    it('throws on server error', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 503));

      await expect(
        adapter.pushOrderCompletion('MO-001', 50, 0)
      ).rejects.toThrow('FrePPLe pushOrderCompletion failed: 503');
    });
  });

  describe('URL handling', () => {
    it('strips trailing slashes from baseUrl', async () => {
      const adapterWithSlash = new FrePPLeAdapter(
        createConfig({ baseUrl: 'https://frepple.example.com///' })
      );
      mockFetch.mockResolvedValue(jsonResponse({}, 200));

      await adapterWithSlash.testConnection();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://frepple.example.com/api/',
        expect.any(Object)
      );
    });

    it('encodes orderId in URL for special characters', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 200));

      await adapter.pushOrderStart('MO/2026/001', new Date());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('MO%2F2026%2F001'),
        expect.any(Object)
      );
    });
  });

  describe('authentication', () => {
    it('sends correct Basic Auth header', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ count: 0, next: null, previous: null, results: [] })
      );

      await adapter.pullWorkOrders();

      const expectedAuth = `Basic ${btoa('admin:secret123')}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });

    it('handles missing credentials gracefully', async () => {
      const noCredAdapter = new FrePPLeAdapter(
        createConfig({ username: undefined, password: undefined })
      );
      mockFetch.mockResolvedValue(jsonResponse({}, 200));

      await noCredAdapter.testConnection();

      const expectedAuth = `Basic ${btoa(':')}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });
  });
});
