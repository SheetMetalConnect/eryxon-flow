export interface MockDataOptions {
    includeCells?: boolean;
    includeJobs?: boolean;
    includeParts?: boolean;
    includeOperations?: boolean;
    includeResources?: boolean;
    includeOperators?: boolean;
    includeTimeEntries?: boolean;
    includeQuantityRecords?: boolean;
    includeIssues?: boolean;
    includeCalendar?: boolean;
    includeBatches?: boolean;
}

export interface MockDataResult {
    success: boolean;
    error?: string;
    // Optional data returns for chaining
    cellIds?: string[];
    cellIdMap?: Record<string, string>;
    resourceData?: any[];
    scrapReasonData?: any[];
    operatorIds?: string[];
    profiles?: any[]; // Added for batches
    jobIds?: string[];
    jobIdMap?: Record<string, string>;
    partIds?: string[];
    partData?: any[];
    operationData?: any[];
}

export interface GeneratorContext {
    tenantId: string;
    options: MockDataOptions;
    now: Date;
}
