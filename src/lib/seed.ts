import { generateMockData } from "./mockDataGenerator";

/**
 * Legacy seed function - now delegates to comprehensive mockDataGenerator
 * @deprecated Use generateMockData from mockDataGenerator.ts instead
 */
export async function seedDemoData(tenantId: string) {
  console.warn(
    "seedDemoData is deprecated. Use generateMockData from mockDataGenerator.ts instead.",
  );

  return generateMockData(tenantId, {
    includeCells: true,
    includeJobs: true,
    includeParts: true,
    includeOperations: true,
    includeResources: true,
    includeOperators: true,
    includeTimeEntries: true,
    includeQuantityRecords: true,
    includeIssues: true,
  });
}
