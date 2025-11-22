export interface TerminalJob {
    id: string;
    jobCode: string;
    description: string;
    material: string;
    quantity: number;
    currentOp: string;
    totalOps: number; // We might not have this easily, default to 0 or sequence
    hours: number;
    estimatedHours: number; // Total estimated time
    actualHours: number; // Time actually used
    dueDate: string;
    status: "in_progress" | "in_buffer" | "expected" | "completed" | "on_hold";
    warnings?: string[];
    nextStep?: string;
    hasPdf: boolean;
    hasModel: boolean;
    // Extra fields for logic
    operationId: string;
    partId: string;
    jobId: string; // Added for QRM routing
    filePaths: string[];
    activeTimeEntryId?: string;
    notes?: string | null;
    cellName?: string; // Current cell
    cellColor?: string; // Current cell color
    cellId: string; // Current cell ID
    nextCellName?: string; // Next cell in routing
    nextCellColor?: string; // Next cell color
    nextCellId?: string; // Next cell ID
    currentSequence?: number; // Added for next operation detection
}
