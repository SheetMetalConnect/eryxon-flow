import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    fetchOperationsWithDetails,
    startTimeTracking,
    stopTimeTracking,
    completeOperation,
    OperationWithDetails
} from "@/lib/database";
import { JobRow } from "@/components/terminal/JobRow";
import { DetailPanel } from "@/components/terminal/DetailPanel";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

// Define the interface locally if not exported, matching the one in JobRow
import { TerminalJob } from '@/types/terminal';

// ... imports ...

// REMOVED local TerminalJob interface


interface Cell {
    id: string;
    name: string;
    color: string | null;
}

export default function OperatorTerminal() {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const [operations, setOperations] = useState<OperationWithDetails[]>([]);
    const [cells, setCells] = useState<Cell[]>([]);
    const [selectedCellId, setSelectedCellId] = useState<string>(() => localStorage.getItem("operator_selected_cell") || "all");
    const [loading, setLoading] = useState(true);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    // File URLs
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [stepUrl, setStepUrl] = useState<string | null>(null);

    // Load Data
    const loadData = async () => {
        if (!profile?.tenant_id) return;
        try {
            setLoading(true);

            // Fetch operations and cells in parallel
            const [opsData, cellsData] = await Promise.all([
                fetchOperationsWithDetails(profile.tenant_id),
                supabase
                    .from("cells")
                    .select("id, name, color")
                    .eq("tenant_id", profile.tenant_id)
                    .eq("active", true)
                    .order("sequence")
            ]);

            setOperations(opsData);
            if (cellsData.data) setCells(cellsData.data);

        } catch (error) {
            console.error("Error loading data:", error);
            toast.error(t("terminal.failedToLoadData"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Real-time subscription
        if (!profile?.tenant_id) return;
        const channel = supabase
            .channel("operator-terminal-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "operations", filter: `tenant_id=eq.${profile.tenant_id}` },
                () => loadData()
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "time_entries", filter: `tenant_id=eq.${profile.tenant_id}` },
                () => loadData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.tenant_id]);

    // Handle cell selection change
    const handleCellChange = (value: string) => {
        setSelectedCellId(value);
        localStorage.setItem("operator_selected_cell", value);
        setSelectedJobId(null); // Clear selection when changing cells
    };

    // Map operations to TerminalJob
    const mapOperationToJob = (op: OperationWithDetails): TerminalJob => {
        // Debug log for part data
        if (op.part.file_paths && op.part.file_paths.length > 0) {
            console.log("Mapping op with files:", op.id, op.part.part_number, op.part.file_paths);
        } else {
            // console.log("Mapping op WITHOUT files:", op.id, op.part.part_number, op.part);
        }

        const hasPdf = op.part.file_paths?.some(p => p.toLowerCase().endsWith('.pdf')) || false;
        const hasModel = op.part.file_paths?.some(p => p.toLowerCase().endsWith('.step') || p.toLowerCase().endsWith('.stp')) || false;

        // Determine status based on active time entry (someone actively working)
        let status: TerminalJob['status'] = 'expected';
        if (op.active_time_entry) {
            status = 'in_progress'; // Currently being worked on
        } else if (op.status === 'in_progress' || op.status === 'not_started') {
            // Ready to start or paused
            status = 'in_buffer';
        } else if (op.status === 'on_hold') {
            status = 'on_hold';
        }

        // Calculate remaining hours
        const estimated = op.estimated_time || 0;
        const actual = op.actual_time || 0;
        const remaining = Math.max(0, estimated - actual);

        // Find next operation in sequence for this part
        const partOperations = operations.filter(o => o.part.id === op.part.id).sort((a, b) => a.sequence - b.sequence);
        const currentIndex = partOperations.findIndex(o => o.id === op.id);
        const nextOp = currentIndex !== -1 && currentIndex < partOperations.length - 1 ? partOperations[currentIndex + 1] : null;

        return {
            id: op.id, // Use operation ID as the unique key
            operationId: op.id,
            partId: op.part.id,
            jobId: op.part.job.id,
            jobCode: op.part.job.job_number,
            description: op.part.part_number, // Or op.operation_name? Design showed Part Name as description
            material: op.part.material,
            quantity: op.part.quantity,
            currentOp: op.operation_name,
            totalOps: 0, // Placeholder
            hours: Number(remaining.toFixed(1)), // Format to 1 decimal place
            estimatedHours: Number(estimated.toFixed(1)),
            actualHours: Number(actual.toFixed(1)),
            dueDate: op.part.job.due_date || new Date().toISOString(),
            status: status,
            hasPdf,
            hasModel,
            filePaths: op.part.file_paths || [],
            activeTimeEntryId: op.active_time_entry?.id,
            notes: op.notes,
            cellName: op.cell.name,
            cellColor: op.cell.color || "#3b82f6",
            cellId: op.cell_id,
            nextCellName: nextOp?.cell?.name,
            nextCellColor: nextOp?.cell?.color || undefined,
            nextCellId: nextOp?.cell_id,
            currentSequence: op.sequence,
            operatorName: op.active_time_entry?.operator?.full_name,
        };
    };

    const allJobs = useMemo(() => operations.map(mapOperationToJob), [operations]);

    // Filter by Cell
    const filteredJobs = useMemo(() => {
        if (selectedCellId === "all") return allJobs;
        return allJobs.filter(job => job.cellId === selectedCellId);
    }, [allJobs, selectedCellId]);

    // Filter into 3 lists
    const inProcessJobs = filteredJobs.filter(j => j.status === 'in_progress');

    // For Buffer vs Expected, let's just split the 'in_buffer' ones (which are 'not_started')
    // We'll take the first 5 as Buffer, rest as Expected for now to simulate the flow
    const notStartedJobs = filteredJobs.filter(j => j.status === 'in_buffer' || j.status === 'expected');
    const inBufferJobs = notStartedJobs.slice(0, 5).map(j => ({ ...j, status: 'in_buffer' as const }));
    const expectedJobs = notStartedJobs.slice(5).map(j => ({ ...j, status: 'expected' as const }));

    const selectedJob = allJobs.find(j => j.id === selectedJobId) || null;

    // Get all operations for the selected part to show in the Ops tab
    const selectedPartOperations = useMemo(() => {
        if (!selectedJob) return [];
        return operations
            .filter(op => op.part.id === selectedJob.partId)
            .sort((a, b) => a.sequence - b.sequence);
    }, [selectedJob, operations]);

    // Load file URLs when selection changes
    useEffect(() => {
        const loadFiles = async () => {
            if (!selectedJob?.filePaths?.length) {
                console.log("No file paths for job:", selectedJob?.jobCode);
                setPdfUrl(null);
                setStepUrl(null);
                return;
            }

            console.log("Loading files for:", selectedJob.jobCode, selectedJob.filePaths);

            try {
                let pdf: string | null = null;
                let step: string | null = null;

                for (const path of selectedJob.filePaths) {
                    const ext = path.toLowerCase();
                    console.log("Checking file:", path, "Ext:", ext);

                    if (ext.endsWith(".pdf") && !pdf) {
                        const { data } = await supabase.storage.from("parts-cad").createSignedUrl(path, 3600);
                        if (data?.signedUrl) pdf = data.signedUrl;
                    } else if ((ext.endsWith(".step") || ext.endsWith(".stp")) && !step) {
                        const { data } = await supabase.storage.from("parts-cad").createSignedUrl(path, 3600);
                        if (data?.signedUrl) {
                            console.log("Found STEP file, creating blob URL from:", data.signedUrl);
                            const response = await fetch(data.signedUrl);
                            const blob = await response.blob();
                            step = URL.createObjectURL(blob);
                        }
                    }
                }
                setPdfUrl(pdf);
                setStepUrl(step);
            } catch (e) {
                console.error("Error loading file URLs", e);
            }
        };

        loadFiles();
    }, [selectedJob]);

    // Actions
    const handleStart = async () => {
        if (!selectedJob || !profile) return;
        try {
            await startTimeTracking(selectedJob.operationId, profile.id, profile.tenant_id);
            toast.success(`${t("operations.started")}: ${selectedJob.currentOp}`);
            // Data will reload via subscription
        } catch (error: any) {
            toast.error(error.message || t("operations.failedToStart"));
        }
    };

    const handlePause = async () => {
        if (!selectedJob || !profile) return;
        try {
            await stopTimeTracking(selectedJob.operationId, profile.id);
            toast.success(t("operations.operationPaused"));
        } catch (error: any) {
            toast.error(error.message || t("operations.failedToPause"));
        }
    };

    const handleComplete = async () => {
        if (!selectedJob || !profile) return;
        try {
            await completeOperation(selectedJob.operationId, profile.tenant_id, profile.id);
            toast.success(t("operations.operationComplete"));
            setSelectedJobId(null); // Deselect
        } catch (error: any) {
            toast.error(error.message || t("operations.failedToComplete"));
        }
    };

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative">
            {loading && (
                <div className="absolute inset-0 bg-background/90 z-50 flex items-center justify-center backdrop-blur-md">
                    <div className="glass-card p-8 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-foreground font-medium animate-pulse">{t("terminal.loadingTerminalData")}</p>
                    </div>
                </div>
            )}
            {/* LEFT PANEL - 70% */}
            <div className="w-[70%] flex flex-col border-r border-border/50">

                {/* HEADER / CELL SELECTOR */}
                <div className="h-14 border-b border-border/50 bg-surface-elevated/80 backdrop-blur-sm flex items-center px-4 justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-foreground font-semibold text-sm">{t("terminal.terminalView")}</span>
                        <Select value={selectedCellId} onValueChange={handleCellChange}>
                            <SelectTrigger className="w-[200px] h-9 bg-card/50 backdrop-blur-sm border-border/50 text-foreground hover:bg-card/70 transition-colors">
                                <SelectValue placeholder={t("terminal.selectCell")} />
                            </SelectTrigger>
                            <SelectContent className="glass-card border-border/50">
                                <SelectItem value="all">{t("terminal.allCells")}</SelectItem>
                                {cells.map(cell => (
                                    <SelectItem key={cell.id} value={cell.id}>{cell.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Active Time Tracking Display */}
                        {operations.filter(op => op.active_time_entry).length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-active-work/10 border border-active-work/30 rounded-md">
                                <div className="w-2 h-2 rounded-full bg-active-work animate-pulse" />
                                <span className="text-xs font-medium text-active-work">
                                    {operations.filter(op => op.active_time_entry).length} active
                                </span>
                            </div>
                        )}
                        <div className="text-xs text-muted-foreground font-medium">
                            {filteredJobs.length} {t("terminal.jobsFound")}
                        </div>
                    </div>
                </div>

                {/* 1. IN PROCESS */}
                <div className="flex-1 flex flex-col min-h-0 border-b border-border/50">
                    <div className="px-4 py-2 bg-status-active/20 backdrop-blur-sm border-l-4 border-status-active flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-bold text-status-active uppercase tracking-wide">{t("terminal.inProcess")} ({inProcessJobs.length})</h2>
                            <Info
                                className="h-3.5 w-3.5 text-status-active/70 cursor-help"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden"  style={{ maxHeight: '100%' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-surface-elevated/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                                <tr className="border-b border-border/50">
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.jobNumber")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.partNumber")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.operation")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.operator")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.cell")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.material")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{t("terminal.columns.quantity")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">{t("terminal.columns.hours")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.dueDate")}</th>
                                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{t("terminal.columns.files")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inProcessJobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-muted-foreground italic">
                                            {t("terminal.noActiveJobs")}
                                        </td>
                                    </tr>
                                ) : (
                                    inProcessJobs.map(job => (
                                        <JobRow
                                            key={job.id}
                                            job={job}
                                            isSelected={selectedJobId === job.id}
                                            onClick={() => setSelectedJobId(job.id)}
                                            variant="process"
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. IN BUFFER */}
                <div className="flex-1 flex flex-col min-h-0 border-b border-border/50">
                    <div className="px-6 py-3 bg-info/20 backdrop-blur-sm border-l-4 border-info flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-info uppercase tracking-wide">{t("terminal.inBuffer")} ({inBufferJobs.length})</h2>
                            <Info
                                className="h-4 w-4 text-info/70 cursor-help"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '100%' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-surface-elevated/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                                <tr className="border-b border-border/50">
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.jobNumber")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.partNumber")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.operation")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.cell")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.material")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{t("terminal.columns.quantity")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">{t("terminal.columns.hours")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.dueDate")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{t("terminal.columns.files")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inBufferJobs.map(job => (
                                    <JobRow
                                        key={job.id}
                                        job={job}
                                        isSelected={selectedJobId === job.id}
                                        onClick={() => setSelectedJobId(job.id)}
                                        variant="buffer"
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. EXPECTED */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-3 bg-status-pending/20 backdrop-blur-sm border-l-4 border-status-pending flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-status-pending uppercase tracking-wide">{t("terminal.expected")} ({expectedJobs.length})</h2>
                            <Info
                                className="h-4 w-4 text-status-pending/70 cursor-help"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '100%' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-surface-elevated/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                                <tr className="border-b border-border/50">
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.jobNumber")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.partNumber")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.operation")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.cell")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.material")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{t("terminal.columns.quantity")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">{t("terminal.columns.hours")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("terminal.columns.dueDate")}</th>
                                    <th className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{t("terminal.columns.files")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expectedJobs.map(job => (
                                    <JobRow
                                        key={job.id}
                                        job={job}
                                        isSelected={selectedJobId === job.id}
                                        onClick={() => setSelectedJobId(job.id)}
                                        variant="expected"
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - 30% */}
            <div className="w-[30%] bg-surface-elevated/80 backdrop-blur-md flex flex-col border-l border-border/50 shadow-2xl z-10">
                {selectedJob ? (
                    <DetailPanel
                        job={selectedJob}
                        onStart={handleStart}
                        onPause={handlePause}
                        onComplete={handleComplete}
                        stepUrl={stepUrl}
                        pdfUrl={pdfUrl}
                        operations={selectedPartOperations}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 mb-6 flex items-center justify-center">
                            <span className="text-4xl">👈</span>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">{t("terminal.noJobSelected")}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{t("terminal.selectJobPrompt")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
