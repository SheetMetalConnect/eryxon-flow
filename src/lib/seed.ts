import { generateMockData } from "./mockDataGenerator";
import { logger } from "@/lib/logger";

/**
 * Legacy seed function - now delegates to comprehensive mockDataGenerator
 * @deprecated Use generateMockData from mockDataGenerator.ts instead
 */
export async function seedDemoData(tenantId: string) {
  logger.warn('Seed', 'seedDemoData is deprecated. Use generateMockData from mockDataGenerator.ts instead.');

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
    includeCalendar: true,
  });
}
