/**
 * API Test Utilities for Eryxon Flow
 *
 * Provides helper functions for testing the Supabase Edge Function APIs.
 * Can be used standalone or imported into vitest integration tests.
 *
 * Usage:
 *   npx tsx scripts/api-test-utils.ts
 *
 * Or import in tests:
 *   import { ApiTestClient } from '../scripts/api-test-utils';
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  status: number;
  body: {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      statusCode?: number;
      details?: ValidationDetail[];
    };
    meta?: {
      pagination?: {
        total: number;
        offset: number;
        limit: number;
      };
    };
  };
  headers: Record<string, string>;
}

export interface ValidationDetail {
  field: string;
  message: string;
  value?: any;
  constraint: string;
  entityType: string;
  entityIndex?: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

// ── Payload Factories ───────────────────────────────────────────────────────

/**
 * Generate valid test payloads for each endpoint.
 * All payloads use unique identifiers to avoid conflicts.
 */
export const payloads = {
  /**
   * Minimal valid job creation payload
   */
  minimalJob(jobNumber?: string): object {
    return {
      job_number: jobNumber || `JOB-TEST-${Date.now()}`,
      parts: [
        {
          part_number: `PART-${Date.now()}`,
          quantity: 1,
          operations: [
            {
              operation_name: "Test Operation",
              sequence: 1,
            },
          ],
        },
      ],
    };
  },

  /**
   * Full job creation payload with all optional fields
   */
  fullJob(jobNumber?: string): object {
    const ts = Date.now();
    return {
      job_number: jobNumber || `JOB-FULL-${ts}`,
      customer: "Test Customer",
      due_date: "2025-12-31",
      priority: 5,
      notes: "Full test job",
      status: "not_started",
      metadata: { test: true, timestamp: ts },
      parts: [
        {
          part_number: `PART-A-${ts}`,
          material: "Aluminum 6061",
          quantity: 10,
          description: "Test part A",
          drawing_no: "DWG-001",
          cnc_program_name: "PROG-001",
          operations: [
            {
              operation_name: "Milling",
              sequence: 1,
              estimated_time_minutes: 120,
              setup_time_minutes: 15,
              instructions: "Use coolant",
            },
            {
              operation_name: "Deburr",
              sequence: 2,
              estimated_time_minutes: 30,
            },
          ],
        },
        {
          part_number: `PART-B-${ts}`,
          material: "Steel 4140",
          quantity: 5,
          operations: [
            {
              operation_name: "Turning",
              sequence: 1,
              estimated_time_minutes: 60,
            },
          ],
        },
      ],
    };
  },

  /**
   * Part creation payload (standalone)
   */
  part(jobId: string, partNumber?: string): object {
    return {
      job_id: jobId,
      part_number: partNumber || `PART-${Date.now()}`,
      material: "Aluminum 6061",
      quantity: 5,
      notes: "Test part",
    };
  },

  /**
   * Operation creation payload
   */
  operation(partId: string, name?: string): object {
    return {
      part_id: partId,
      operation_name: name || "Test Operation",
      estimated_time_minutes: 60,
      // sequence is auto-calculated if omitted
    };
  },

  /**
   * Issue creation payload
   */
  issue(operationId: string): object {
    return {
      operation_id: operationId,
      title: "Test Issue",
      description: "Created by test utilities",
      severity: "medium",
    };
  },

  /**
   * NCR creation payload
   */
  ncr(operationId: string): object {
    return {
      operation_id: operationId,
      title: "Test NCR",
      description: "Non-conformance report from test",
      severity: "high",
      issue_type: "ncr",
      ncr_category: "process",
      affected_quantity: 3,
      ncr_disposition: "rework",
      root_cause: "Test root cause",
      corrective_action: "Test corrective action",
      preventive_action: "Test preventive action",
      verification_required: true,
    };
  },

  /**
   * Substep creation payload
   */
  substep(operationId: string, seq: number = 1): object {
    return {
      operation_id: operationId,
      description: `Test substep ${seq}`,
      sequence: seq,
    };
  },

  /**
   * Webhook creation payload
   */
  webhook(eventType: string = "job.completed"): object {
    return {
      url: "https://httpbin.org/post",
      event_type: eventType,
      active: true,
    };
  },

  /**
   * Invalid payloads for validation testing
   */
  invalid: {
    jobMissingNumber(): object {
      return {
        parts: [{ part_number: "P1", quantity: 1, operations: [{ operation_name: "Op1", sequence: 1 }] }],
      };
    },
    jobBadStatus(): object {
      return {
        job_number: `JOB-BAD-${Date.now()}`,
        status: "invalid_status",
        parts: [{ part_number: "P1", quantity: 1, operations: [{ operation_name: "Op1", sequence: 1 }] }],
      };
    },
    jobNegativePriority(): object {
      return {
        job_number: `JOB-NEG-${Date.now()}`,
        priority: -1,
        parts: [{ part_number: "P1", quantity: 1, operations: [{ operation_name: "Op1", sequence: 1 }] }],
      };
    },
    jobBadDate(): object {
      return {
        job_number: `JOB-DATE-${Date.now()}`,
        due_date: "not-a-date",
        parts: [{ part_number: "P1", quantity: 1, operations: [{ operation_name: "Op1", sequence: 1 }] }],
      };
    },
    jobDuplicateParts(): object {
      return {
        job_number: `JOB-DUP-${Date.now()}`,
        parts: [
          { part_number: "SAME", quantity: 1, operations: [{ operation_name: "Op1", sequence: 1 }] },
          { part_number: "SAME", quantity: 1, operations: [{ operation_name: "Op1", sequence: 1 }] },
        ],
      };
    },
    partZeroQuantity(jobId: string): object {
      return {
        job_id: jobId,
        part_number: `PART-ZERO-${Date.now()}`,
        quantity: 0,
      };
    },
    operationBadStatus(partId: string): object {
      return {
        part_id: partId,
        operation_name: "Bad",
        status: "flying",
      };
    },
    issueBadSeverity(opId: string): object {
      return {
        operation_id: opId,
        title: "Bad",
        description: "Bad severity",
        severity: "super_critical",
      };
    },
    issueMissingFields(): object {
      return { title: "Only title" };
    },
  },
};

// ── API Client ──────────────────────────────────────────────────────────────

export class ApiTestClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(supabaseUrl?: string, apiKey?: string) {
    this.baseUrl = `${supabaseUrl || process.env.SUPABASE_URL}/functions/v1`;
    this.apiKey = apiKey || process.env.API_KEY || "";

    if (!this.baseUrl || this.baseUrl.includes("undefined")) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    if (!this.apiKey) {
      throw new Error("API_KEY environment variable is required");
    }
  }

  /**
   * Make an API call and return structured response
   */
  async call<T = any>(
    method: string,
    endpoint: string,
    body?: object,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/${endpoint}`;
    const fetchHeaders: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...headers,
    };

    const options: RequestInit = {
      method,
      headers: fetchHeaders,
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const responseBody = await response.json().catch(() => ({}));

    return {
      status: response.status,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  // Convenience methods
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.call<T>("GET", endpoint);
  }

  async post<T = any>(endpoint: string, body: object): Promise<ApiResponse<T>> {
    return this.call<T>("POST", endpoint, body);
  }

  async patch<T = any>(endpoint: string, body: object): Promise<ApiResponse<T>> {
    return this.call<T>("PATCH", endpoint, body);
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.call<T>("DELETE", endpoint);
  }

  /**
   * Make a call without authentication (for testing 401 responses)
   */
  async callUnauthenticated(method: string, endpoint: string): Promise<ApiResponse> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
    });
    const responseBody = await response.json().catch(() => ({}));
    return {
      status: response.status,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
}

// ── Assertions ──────────────────────────────────────────────────────────────

export const assert = {
  status(response: ApiResponse, expected: number, message?: string): void {
    if (response.status !== expected) {
      throw new Error(
        `${message || "Status mismatch"}: expected ${expected}, got ${response.status}. ` +
        `Body: ${JSON.stringify(response.body).slice(0, 200)}`
      );
    }
  },

  success(response: ApiResponse, message?: string): void {
    if (!response.body.success) {
      throw new Error(
        `${message || "Expected success"}: got error ${response.body.error?.code}: ${response.body.error?.message}`
      );
    }
  },

  error(response: ApiResponse, expectedCode?: string, message?: string): void {
    if (response.body.success) {
      throw new Error(`${message || "Expected error"}: but got success`);
    }
    if (expectedCode && response.body.error?.code !== expectedCode) {
      throw new Error(
        `${message || "Error code mismatch"}: expected ${expectedCode}, got ${response.body.error?.code}`
      );
    }
  },

  hasField(response: ApiResponse, path: string, message?: string): void {
    const value = getNestedField(response.body, path);
    if (value === undefined) {
      throw new Error(`${message || "Missing field"}: ${path} not found in response`);
    }
  },

  fieldEquals(response: ApiResponse, path: string, expected: any, message?: string): void {
    const value = getNestedField(response.body, path);
    if (value !== expected) {
      throw new Error(
        `${message || "Field mismatch"}: ${path} expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`
      );
    }
  },

  hasPagination(response: ApiResponse): void {
    const data = response.body.data;
    if (!data || !data.pagination) {
      throw new Error("Response missing pagination object");
    }
    if (data.pagination.total === undefined || data.pagination.limit === undefined) {
      throw new Error("Pagination missing total or limit");
    }
  },

  validationError(response: ApiResponse, expectedField?: string): void {
    assert.status(response, 422);
    assert.error(response, "VALIDATION_ERROR");
    if (expectedField && response.body.error?.details) {
      const hasField = response.body.error.details.some(
        (d: ValidationDetail) => d.field === expectedField || d.field.includes(expectedField)
      );
      if (!hasField) {
        throw new Error(
          `Expected validation error for field '${expectedField}', got: ` +
          response.body.error.details.map((d: ValidationDetail) => d.field).join(", ")
        );
      }
    }
  },
};

function getNestedField(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// ── Test Runner (standalone) ────────────────────────────────────────────────

async function runStandaloneTests() {
  const client = new ApiTestClient();
  const results: TestResult[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      results.push({ name, passed: true, message: "OK", duration });
      console.log(`  \x1b[32mPASS\x1b[0m ${name} (${duration}ms)`);
    } catch (err: any) {
      const duration = Date.now() - start;
      results.push({ name, passed: false, message: err.message, duration });
      console.log(`  \x1b[31mFAIL\x1b[0m ${name}`);
      console.log(`       ${err.message}`);
    }
  }

  console.log("\n\x1b[1mEryxon Flow API - Node.js Test Runner\x1b[0m\n");

  // Track resources for cleanup
  let jobId: string | undefined;
  let partId: string | undefined;
  let operationId: string | undefined;

  try {
    // ── Auth tests ──
    console.log("\x1b[36m── Authentication ──\x1b[0m");

    await test("Authenticated request succeeds", async () => {
      const resp = await client.get("api-jobs?limit=1");
      assert.status(resp, 200);
      assert.success(resp);
    });

    await test("Unauthenticated request returns 401", async () => {
      const resp = await client.callUnauthenticated("GET", "api-jobs?limit=1");
      assert.status(resp, 401);
    });

    // ── Job CRUD ──
    console.log("\n\x1b[36m── Jobs CRUD ──\x1b[0m");

    await test("Create job with nested parts", async () => {
      const resp = await client.post("api-jobs", payloads.fullJob());
      assert.status(resp, 201);
      assert.success(resp);
      jobId = (resp.body.data as any)?.job?.id;
      partId = (resp.body.data as any)?.job?.parts?.[0]?.id;
      operationId = (resp.body.data as any)?.job?.parts?.[0]?.operations?.[0]?.id;
    });

    await test("List jobs with pagination", async () => {
      const resp = await client.get("api-jobs?limit=5&sort=created_at&order=desc");
      assert.status(resp, 200);
      assert.success(resp);
      assert.hasPagination(resp);
    });

    if (jobId) {
      await test("Get single job by ID", async () => {
        const resp = await client.get(`api-jobs?id=${jobId}`);
        assert.status(resp, 200);
        assert.success(resp);
      });

      await test("Update job", async () => {
        const resp = await client.patch(`api-jobs?id=${jobId}`, { notes: "Updated" });
        assert.status(resp, 200);
        assert.success(resp);
      });
    }

    await test("Get non-existent job returns 404", async () => {
      const resp = await client.get("api-jobs?id=00000000-0000-0000-0000-000000000000");
      assert.status(resp, 404);
    });

    // ── Validation tests ──
    console.log("\n\x1b[36m── Validation ──\x1b[0m");

    await test("Missing job_number returns 422", async () => {
      const resp = await client.post("api-jobs", payloads.invalid.jobMissingNumber());
      assert.status(resp, 422);
      assert.error(resp, "VALIDATION_ERROR");
    });

    await test("Invalid status enum returns 422", async () => {
      const resp = await client.post("api-jobs", payloads.invalid.jobBadStatus());
      assert.status(resp, 422);
    });

    await test("Negative priority returns 422", async () => {
      const resp = await client.post("api-jobs", payloads.invalid.jobNegativePriority());
      assert.status(resp, 422);
    });

    await test("Duplicate part numbers returns 422", async () => {
      const resp = await client.post("api-jobs", payloads.invalid.jobDuplicateParts());
      assert.status(resp, 422);
    });

    // ── Lifecycle tests ──
    if (jobId) {
      console.log("\n\x1b[36m── Job Lifecycle ──\x1b[0m");

      await test("Start job", async () => {
        const resp = await client.post(`api-job-lifecycle/start?id=${jobId}`, {});
        assert.status(resp, 200);
        assert.fieldEquals(resp, "data.new_status", "in_progress");
      });

      await test("Double start returns 400", async () => {
        const resp = await client.post(`api-job-lifecycle/start?id=${jobId}`, {});
        assert.status(resp, 400);
        assert.error(resp, "INVALID_STATE_TRANSITION");
      });

      await test("Stop job", async () => {
        const resp = await client.post(`api-job-lifecycle/stop?id=${jobId}`, {});
        assert.status(resp, 200);
        assert.fieldEquals(resp, "data.new_status", "on_hold");
      });

      await test("Resume job", async () => {
        const resp = await client.post(`api-job-lifecycle/resume?id=${jobId}`, {});
        assert.status(resp, 200);
        assert.fieldEquals(resp, "data.new_status", "in_progress");
      });

      await test("Complete job", async () => {
        const resp = await client.post(`api-job-lifecycle/complete?id=${jobId}`, {});
        assert.status(resp, 200);
        assert.fieldEquals(resp, "data.new_status", "completed");
      });
    }

    if (operationId) {
      console.log("\n\x1b[36m── Operation Lifecycle ──\x1b[0m");

      await test("Start operation", async () => {
        const resp = await client.post(`api-operation-lifecycle/start?id=${operationId}`, {});
        assert.status(resp, 200);
      });

      await test("Complete operation", async () => {
        const resp = await client.post(`api-operation-lifecycle/complete?id=${operationId}`, {});
        assert.status(resp, 200);
      });
    }

  } finally {
    // Cleanup
    console.log("\n\x1b[36m── Cleanup ──\x1b[0m");
    if (jobId) {
      await client.delete(`api-jobs?id=${jobId}`).catch(() => {});
      console.log(`  Deleted job: ${jobId}`);
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`\n\x1b[1m━━━ Results: ${passed} passed, ${failed} failed, ${results.length} total ━━━\x1b[0m`);
    if (failed > 0) {
      console.log("\nFailed tests:");
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
      process.exit(1);
    }
  }
}

// Run if executed directly
const isMainModule = typeof require !== "undefined"
  ? require.main === module
  : import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  runStandaloneTests().catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
}
