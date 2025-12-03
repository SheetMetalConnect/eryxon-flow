import React, { useState, useMemo, useEffect } from 'react';
import { TerminalJob } from '@/types/terminal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, FileText, Box, AlertTriangle, CheckCircle2, Clock, Circle, Maximize2, X, ChevronDown, ChevronRight, PackageCheck, Zap } from 'lucide-react';
import { CncProgramQrCode } from './CncProgramQrCode';
import { STEPViewer } from '@/components/STEPViewer';
import { PDFViewer } from '@/components/PDFViewer';
import { OperationResources } from './OperationResources';
import { AssemblyDependencies } from './AssemblyDependencies';
import { OperationWithDetails } from '@/lib/database';
import { cn } from '@/lib/utils';
import IssueForm from '@/components/operator/IssueForm';
import ProductionQuantityModal from '@/components/operator/ProductionQuantityModal';
import { JobFlowProgress } from './JobFlowProgress';
import { useCellQRMMetrics } from '@/hooks/useQRMMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { IconDisplay } from '@/components/ui/icon-picker';
import { useTranslation } from 'react-i18next';

interface Substep {
    id: string;
    operation_id: string;
    name: string;
    icon_name?: string | null;
    sequence: number;
    status: string;
    notes?: string;
}

interface DetailPanelProps {
    job: TerminalJob;
    onStart?: () => void;
    onPause?: () => void;
    onComplete?: () => void;
    stepUrl?: string | null;
    pdfUrl?: string | null;
    operations?: OperationWithDetails[];
    onDataRefresh?: () => void;
}

export function DetailPanel({ job, onStart, onPause, onComplete, stepUrl, pdfUrl, operations = [], onDataRefresh }: DetailPanelProps) {
    const { t } = useTranslation();
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
    const [fullscreenViewer, setFullscreenViewer] = useState<'3d' | 'pdf' | null>(null);
    const [substepsByOperation, setSubstepsByOperation] = useState<Record<string, Substep[]>>({});
    const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
    const { profile } = useAuth();

    // Fetch substeps for all operations
    useEffect(() => {
        const fetchSubsteps = async () => {
            if (!profile?.tenant_id || operations.length === 0) return;

            const operationIds = operations.map(op => op.id);
            const { data, error } = await supabase
                .from("substeps")
                .select("*")
                .in("operation_id", operationIds)
                .eq("tenant_id", profile.tenant_id)
                .order("sequence", { ascending: true });

            if (error) {
                console.error("Error fetching substeps:", error);
                return;
            }

            // Group substeps by operation_id
            const grouped: Record<string, Substep[]> = {};
            (data || []).forEach((substep) => {
                if (!grouped[substep.operation_id]) {
                    grouped[substep.operation_id] = [];
                }
                grouped[substep.operation_id].push(substep);
            });
            setSubstepsByOperation(grouped);
        };

        fetchSubsteps();
    }, [operations, profile?.tenant_id]);

    const toggleOperationExpand = (opId: string) => {
        setExpandedOperations(prev => {
            const next = new Set(prev);
            if (next.has(opId)) {
                next.delete(opId);
            } else {
                next.add(opId);
            }
            return next;
        });
    };

    // Compute next operation in the sequence FIRST
    const nextOperation = useMemo(() => {
        if (!job.currentSequence) return null;
        // Find the next operation in sequence order
        const sorted = [...operations].sort((a, b) => a.sequence - b.sequence);
        const currentIndex = sorted.findIndex(op => op.id === job.operationId);
        if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
        return sorted[currentIndex + 1];
    }, [operations, job.currentSequence, job.operationId]);

    // Get QRM metrics for the ACTUAL next cell in the job routing
    const { metrics: nextCellMetrics } = useCellQRMMetrics(
        nextOperation?.cell_id || null,
        profile?.tenant_id || null
    );

    // Check if we can complete (blocked by next cell capacity)
    const isBlockedByCapacity = useMemo(() => {
        if (!nextOperation || !nextCellMetrics) return false;
        // Check if capacity is enforced and if we're at or over the limit
        if (!nextCellMetrics.enforce_limit) return false;
        if (nextCellMetrics.wip_limit === null) return false;
        return nextCellMetrics.current_wip >= nextCellMetrics.wip_limit;
    }, [nextOperation, nextCellMetrics]);

    return (
        <div className="flex flex-col h-full bg-card text-card-foreground">

            {/* Header Card - Compact */}
            <div className="p-3 border-b border-border bg-card">
                {/* Bullet Card Alert Banner */}
                {job.isBulletCard && (
                    <div className="mb-2 -mx-3 -mt-3 px-3 py-1.5 bg-destructive/10 border-b border-destructive/30 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-destructive animate-pulse" />
                        <span className="text-xs font-bold text-destructive uppercase tracking-wider">{t('terminal.bulletCard')}</span>
                    </div>
                )}

                <div className="flex justify-between items-start mb-1.5">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-foreground truncate">{job.jobCode}</h2>
                        <p className="text-muted-foreground text-xs truncate">{job.description}</p>
                        {job.drawingNo && (
                            <p className="text-muted-foreground text-[10px]">{t('parts.drawingNo')}: {job.drawingNo}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                        <div className="text-base font-mono font-bold text-primary">{job.quantity} <span className="text-xs text-muted-foreground">pcs</span></div>
                        <div className="text-[10px] text-muted-foreground">Due: {new Date(job.dueDate).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Current Operation Highlight - Compact */}
                <div className="my-2 p-2 bg-accent/10 border border-accent/20 rounded-md">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Ready to Start</div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        {job.currentOp}
                    </div>
                </div>

                <div className="flex gap-1.5">
                    {!job.isCurrentUserClocked ? (
                        <Button onClick={onStart} size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                            <Play className="w-3.5 h-3.5 mr-1.5" /> Start
                        </Button>
                    ) : (
                        <>
                            <Button onClick={onPause} variant="outline" size="sm" className="flex-1 border-border text-foreground hover:bg-accent h-8 text-xs">
                                <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                            </Button>
                            <Button 
                                onClick={() => setIsQuantityModalOpen(true)} 
                                variant="outline" 
                                size="sm" 
                                className="border-primary text-primary hover:bg-primary/10 h-8 text-xs px-2"
                                title="Record Production Quantities"
                            >
                                <PackageCheck className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}
                    {(job.status === 'in_progress' || job.isCurrentUserClocked) && !job.activeTimeEntryId && (
                        <Button
                            onClick={onComplete}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-border text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-8 text-xs"
                            disabled={isBlockedByCapacity}
                            title={isBlockedByCapacity ? "Cannot complete - next cell at capacity" : "Complete operation"}
                        >
                            <Square className="w-3.5 h-3.5 mr-1.5" /> Complete
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsIssueModalOpen(true)}
                        title="Report Issue"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30 h-8 w-8 p-0"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Job Flow Progress - Compact routing indicator */}
            {job.jobId && (
                <div className="px-3 py-2 border-b border-border bg-muted/20">
                    <JobFlowProgress
                        jobId={job.jobId}
                        currentCellId={job.cellId}
                        nextCellName={nextOperation?.cell?.name}
                        nextCellMetrics={nextCellMetrics}
                    />
                </div>
            )}

            {/* CNC Program QR Code - Compact inline display */}
            {job.cncProgramName && (
                <div className="px-3 py-2 border-b border-border flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded border border-border shrink-0">
                        <CncProgramQrCode
                            programName={job.cncProgramName}
                            size={56}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('parts.cncProgramName')}</div>
                        <p className="font-mono font-semibold text-sm text-foreground truncate">{job.cncProgramName}</p>
                    </div>
                </div>
            )}

            {/* Resources & Assembly Dependencies Section */}
            <div className="px-3 py-2 border-b border-border bg-muted/10 space-y-2">
                {/* Required Resources for this Operation */}
                <OperationResources operationId={job.operationId} />

                {/* Assembly Dependencies - show if this part has child parts */}
                <AssemblyDependencies partId={job.partId} />
            </div>

            {/* Main Content Tabs - Compact */}
            <div className="flex-1 min-h-0">
                <Tabs defaultValue={job.hasModel ? "3d" : job.hasPdf ? "pdf" : "ops"} className="h-full flex flex-col">
                    <div className="px-2 pt-1.5">
                        <TabsList className="w-full bg-muted text-muted-foreground h-8">
                            {job.hasModel && (
                                <TabsTrigger value="3d" className="flex-1 text-xs h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                    <Box className="w-3.5 h-3.5 mr-1" /> 3D
                                </TabsTrigger>
                            )}
                            {job.hasPdf && (
                                <TabsTrigger value="pdf" className="flex-1 text-xs h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                    <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="ops" className="flex-1 text-xs h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                Ops
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 p-2 min-h-0 overflow-hidden">
                        {job.hasModel && (
                            <TabsContent value="3d" className="h-full m-0 rounded-md overflow-hidden border border-border bg-background relative group">
                                <STEPViewer url={stepUrl || ""} title={job.jobCode} />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setFullscreenViewer('3d')}
                                    className="absolute top-2 right-2 h-7 px-2 opacity-70 hover:opacity-100 bg-background/80 backdrop-blur-sm shadow-md z-10"
                                >
                                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Expand
                                </Button>
                            </TabsContent>
                        )}

                        {job.hasPdf && (
                            <TabsContent value="pdf" className="h-full m-0 rounded-md overflow-hidden border border-border bg-background relative group">
                                <PDFViewer url={pdfUrl || ""} title={job.jobCode} />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setFullscreenViewer('pdf')}
                                    className="absolute top-2 right-2 h-7 px-2 opacity-70 hover:opacity-100 bg-background/80 backdrop-blur-sm shadow-md z-10"
                                >
                                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Expand
                                </Button>
                            </TabsContent>
                        )}

                        <TabsContent value="ops" className="h-full m-0 overflow-auto">
                            <div className="space-y-0.5">
                                {operations.length === 0 && (
                                    <div className="text-center text-muted-foreground py-4 text-xs">No operations found</div>
                                )}
                                {operations.map((op) => {
                                    const opSubsteps = substepsByOperation[op.id] || [];
                                    const hasSubsteps = opSubsteps.length > 0;
                                    const isExpanded = expandedOperations.has(op.id);
                                    const completedSubsteps = opSubsteps.filter(s => s.status === 'completed').length;

                                    return (
                                        <div key={op.id}>
                                            <div
                                                className={cn(
                                                    "px-2 py-1 rounded border-l-2 flex items-center justify-between transition-colors",
                                                    op.status === 'in_progress'
                                                        ? "bg-primary/5 border-l-primary"
                                                        : "bg-transparent border-l-transparent hover:bg-muted/30",
                                                    op.status === 'completed' && "opacity-50",
                                                    hasSubsteps && "cursor-pointer"
                                                )}
                                                onClick={() => hasSubsteps && toggleOperationExpand(op.id)}
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {hasSubsteps && (
                                                        <span className="text-muted-foreground">
                                                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-[9px] font-mono w-4 shrink-0",
                                                        op.status === 'completed' ? "text-emerald-500" :
                                                            op.status === 'in_progress' ? "text-primary font-bold" :
                                                                "text-muted-foreground"
                                                    )}>
                                                        {op.sequence}.
                                                    </span>
                                                    <span className={cn(
                                                        "text-[11px] truncate",
                                                        op.status === 'completed' ? "text-muted-foreground line-through" : "text-foreground"
                                                    )}>
                                                        {op.operation_name}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground shrink-0">
                                                        ({op.cell?.name?.slice(0, 8) || '?'})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {hasSubsteps && (
                                                        <span className="text-[8px] text-muted-foreground bg-muted px-1 rounded">
                                                            {completedSubsteps}/{opSubsteps.length}
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] text-muted-foreground">{op.estimated_time}h</span>
                                                    {op.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                    {op.status === 'in_progress' && <Clock className="w-3 h-3 text-primary" />}
                                                    {op.status === 'not_started' && <Circle className="w-3 h-3 text-muted-foreground/50" />}
                                                    {op.status === 'on_hold' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                                </div>
                                            </div>
                                            {/* Substeps */}
                                            {hasSubsteps && isExpanded && (
                                                <div className="ml-6 pl-2 border-l border-muted/50 space-y-0.5 py-1">
                                                    {opSubsteps.map((substep) => (
                                                        <div
                                                            key={substep.id}
                                                            className="flex items-center gap-1.5 text-[10px] py-0.5"
                                                        >
                                                            {substep.status === 'completed' ? (
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                            ) : substep.status === 'in_progress' ? (
                                                                <Clock className="w-3 h-3 text-primary shrink-0" />
                                                            ) : substep.status === 'blocked' ? (
                                                                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                                            ) : (
                                                                <Circle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                                            )}
                                                            {substep.icon_name && (
                                                                <IconDisplay
                                                                    iconName={substep.icon_name}
                                                                    className="w-3 h-3 text-muted-foreground shrink-0"
                                                                />
                                                            )}
                                                            <span className={cn(
                                                                "truncate",
                                                                substep.status === 'completed' && "text-muted-foreground line-through"
                                                            )}>
                                                                {substep.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Footer Warnings - Compact */}
            {job.warnings && job.warnings.length > 0 && (
                <div className="px-2 py-1.5 bg-amber-950/20 border-t border-amber-900/50">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {job.warnings.join(', ')}
                    </div>
                </div>
            )}

            <IssueForm
                operationId={job.operationId}
                open={isIssueModalOpen}
                onOpenChange={setIsIssueModalOpen}
                onSuccess={() => setIsIssueModalOpen(false)}
            />

            {/* Production Quantity Modal */}
            <ProductionQuantityModal
                isOpen={isQuantityModalOpen}
                onClose={() => setIsQuantityModalOpen(false)}
                operationId={job.operationId}
                operationName={job.currentOp}
                partNumber={job.description}
                plannedQuantity={job.quantity}
                onSuccess={() => {
                    setIsQuantityModalOpen(false);
                    onDataRefresh?.();
                }}
            />

            {/* Fullscreen Viewer Overlay */}
            {fullscreenViewer && createPortal(
                <div
                    className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col"
                    onClick={() => setFullscreenViewer(null)}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            {fullscreenViewer === '3d' ? (
                                <Box className="w-4 h-4 text-primary" />
                            ) : (
                                <FileText className="w-4 h-4 text-primary" />
                            )}
                            <span className="font-medium text-foreground">{job.jobCode}</span>
                            <span className="text-muted-foreground text-sm">- {fullscreenViewer === '3d' ? '3D Model' : 'Drawing'}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFullscreenViewer(null)}
                            className="h-8 w-8 p-0 hover:bg-accent"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Viewer */}
                    <div
                        className="flex-1 p-4 min-h-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="h-full rounded-lg overflow-hidden border border-border bg-background shadow-xl">
                            {fullscreenViewer === '3d' && stepUrl && (
                                <STEPViewer url={stepUrl} title={job.jobCode} />
                            )}
                            {fullscreenViewer === 'pdf' && pdfUrl && (
                                <PDFViewer url={pdfUrl} title={job.jobCode} />
                            )}
                        </div>
                    </div>

                    {/* Tap hint */}
                    <div className="text-center pb-3 text-muted-foreground text-xs">
                        Tap outside or press X to close
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
