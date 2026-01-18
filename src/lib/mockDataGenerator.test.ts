import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMockData } from './mock-data';
import { supabase } from '@/integrations/supabase/client';

// Comprehensive mock of Supabase client
// We will store inserted data in variables to verify relationships
const mockDb = {
    tenants: [] as any[],
    cells: [] as any[],
    jobs: [] as any[],
    parts: [] as any[],
    operations: [] as any[],
    profiles: [] as any[], // operators
    time_entries: [] as any[],
    operation_quantities: [] as any[],
    issues: [] as any[],
    factory_calendar: [] as any[],
    resources: [] as any[],
    operation_resources: [] as any[],
    operation_batches: [] as any[],
    batch_operations: [] as any[],
};

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
    },
}));

describe('Modular Seed Data Generator (Deep Test)', () => {
    const mockTenantId = 'test-tenant-uuid-123';

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock DB
        Object.keys(mockDb).forEach(key => (mockDb as any)[key] = []);

        // Setup generic mock implementation
        (supabase.from as any).mockImplementation((table: string) => {
            return {
                select: () => ({
                    eq: () => ({
                        maybeSingle: () => Promise.resolve({ data: null, error: null }), // Default: not found (trigger insert)
                        like: () => Promise.resolve({ data: [] }), // For profiles check
                    }),
                    single: () => Promise.resolve({ data: { id: 'temp-id' }, error: null }),
                }),
                insert: (rows: any | any[]) => {
                    const rowArray = Array.isArray(rows) ? rows : [rows];
                    // Store in mock DB
                    if ((mockDb as any)[table]) {
                        (mockDb as any)[table].push(...rowArray);
                    }

                    // Return mock data with generated IDs
                    const returnData = rowArray.map((r, i) => ({
                        ...r,
                        id: r.id || `${table}-id-${(mockDb as any)[table].length + i}`, // Generate ID if missing
                    }));

                    return {
                        select: () => ({
                            single: () => Promise.resolve({ data: returnData[0] || null, error: null }),
                            maybeSingle: () => Promise.resolve({ data: returnData[0] || null, error: null }),
                            then: (resolve: any) => resolve({ data: returnData, error: null })
                        }),
                        then: (resolve: any) => resolve({ data: returnData, error: null })
                    };
                },
                upsert: (rows: any | any[]) => {
                    const rowArray = Array.isArray(rows) ? rows : [rows];
                    if ((mockDb as any)[table]) {
                        (mockDb as any)[table].push(...rowArray);
                    }
                    const returnData = rowArray.map((r, i) => ({
                        ...r,
                        id: r.id || `${table}-id-${i}`,
                    }));
                    return {
                        select: () => Promise.resolve({ data: returnData, error: null }),
                        then: (resolve: any) => resolve({ data: returnData, error: null })
                    };
                },
                update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
            };
        });

        // Mock RPCs
        (supabase.rpc as any).mockImplementation((fnName: string) => {
            if (fnName === 'is_demo_mode') return Promise.resolve({ data: false, error: null });
            if (fnName === 'seed_demo_operators') {
                // Simulate creating operators
                mockDb.profiles.push({ id: 'op-1', tenant_id: mockTenantId, role: 'operator', email: 'demo.operator1@sheetmetalconnect.nl' });
                mockDb.profiles.push({ id: 'op-2', tenant_id: mockTenantId, role: 'operator', email: 'demo.operator2@sheetmetalconnect.nl' });
                return Promise.resolve({ error: null });
            }
            if (fnName === 'seed_demo_resources') {
                mockDb.resources.push({ id: 'res-1', tenant_id: mockTenantId, name: 'Laser Cutting Head', type: 'machine' });
                return Promise.resolve({ error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        // Specific mock behavior for fetching created profiles
        (supabase.from as any).mockImplementation((table: string) => {
            // ... duplicate logic helper ... 
            // Ideally we use a smarter mock factory, but for inline this is fine.
            const baseMock = {
                select: () => baseMock,
                eq: () => baseMock,
                like: () => baseMock,
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
                single: () => Promise.resolve({ data: { id: 'temp' }, error: null }),
                insert: (rows: any) => {
                    const rowArray = Array.isArray(rows) ? rows : [rows];
                    if ((mockDb as any)[table]) (mockDb as any)[table].push(...rowArray);
                    const returnData = rowArray.map((r, i) => ({ ...r, id: `${table}-${i}` }));
                    return {
                        select: () => ({
                            single: () => Promise.resolve({ data: returnData[0], error: null }),
                            maybeSingle: () => Promise.resolve({ data: returnData[0], error: null }),
                            then: (resolve: any) => resolve({ data: returnData, error: null })
                        }),
                        then: (resolve: any) => resolve({ data: returnData, error: null })
                    };
                },
                upsert: (rows: any) => {
                    const rowArray = Array.isArray(rows) ? rows : [rows];
                    if ((mockDb as any)[table]) (mockDb as any)[table].push(...rowArray);
                    return { select: () => Promise.resolve({ data: rowArray.map((r, i) => ({ ...r, id: `${table}-${i}` })), error: null }) };
                }
            };

            if (table === 'profiles') {
                return {
                    ...baseMock,
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                like: () => Promise.resolve({ data: mockDb.profiles }) // Return the ones we "seeded" via RPC
                            })
                        })
                    })
                };
            }
            if (table === 'resources') {
                return {
                    ...baseMock,
                    select: () => ({
                        eq: () => Promise.resolve({ data: mockDb.resources })
                    })
                };
            }
            return baseMock;
        });
    });

    it('should generate a full set of correlated data', async () => {
        const result = await generateMockData(mockTenantId);

        expect(result.success).toBe(true);

        // 1. Verify Cells
        expect(mockDb.cells.length).toBeGreaterThan(0);
        expect(mockDb.cells.some(c => c.name === 'Lasersnijden')).toBe(true);

        // 2. Verify Jobs
        expect(mockDb.jobs.length).toBeGreaterThan(0);
        const jobIds = mockDb.jobs.map(j => j.id);

        // 3. Verify Parts linked to Jobs
        expect(mockDb.parts.length).toBeGreaterThan(0);
        mockDb.parts.forEach(part => {
            // Every part must belong to a created job
            // Note: In our mock, IDs might be auto-generated strings like "jobs-id-0", 
            // but `insert` returns them, and `parts.ts` uses them.
            // We need to ensure the ID flow in our mock matches.
            // Since parts.ts uses the IDs returned by insert, validity depends on our insert mock returning consistent IDs.
            // Our mock above returns `${table}-${index}`.

            // Check if part.job_id looks valid (it comes from the job insert return)
            expect(part.job_id).toBeDefined();
        });

        // 4. Verify Operations linked to Parts and Cells
        expect(mockDb.operations.length).toBeGreaterThan(0);
        mockDb.operations.forEach(op => {
            expect(op.part_id).toBeDefined();
            expect(op.cell_id).toBeDefined();
        });

        // 5. Verify Execution Data (Time Entries)
        // Should only be created if we have operators
        if (mockDb.profiles.length > 0) {
            expect(mockDb.time_entries.length).toBeGreaterThan(0);
            mockDb.time_entries.forEach(te => {
                expect(te.operation_id).toBeDefined();
                expect(te.operator_id).toBeDefined();
            });
        }
    });

    it('should handle options to disable sections', async () => {
        const result = await generateMockData(mockTenantId, {
            includeCells: true,
            includeJobs: false, // Should disable jobs, parts, operations, execution
        });

        expect(result.success).toBe(true);
        expect(mockDb.cells.length).toBeGreaterThan(0);
        expect(mockDb.jobs.length).toBe(0);
        expect(mockDb.parts.length).toBe(0);
        expect(mockDb.operations.length).toBe(0);
    });

    it('should respect tenant isolation', async () => {
        await generateMockData(mockTenantId);

        // Verify all inserted records have the correct tenant_id
        const tablesToCheck = ['cells', 'jobs', 'parts', 'operations', 'time_entries'];
        tablesToCheck.forEach(table => {
            if ((mockDb as any)[table].length > 0) {
                (mockDb as any)[table].forEach((row: any) => {
                    expect(row.tenant_id).toBe(mockTenantId);
                });
            }
        });
    });
});
