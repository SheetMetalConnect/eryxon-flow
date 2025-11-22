export interface TerminalJob {
    id: string;
    jobCode: string;
    description: string;
    material: string;
    quantity: number;
    currentOp: string;
    totalOps: number; // We might not have this easily, default to 0 or sequence
    hours: number;
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
    cellName?: string;
    cellColor?: string;
    cellId: string;
    currentSequence?: number; // Added for next operation detection
}
