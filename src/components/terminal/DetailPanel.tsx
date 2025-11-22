import React, { useState, useMemo } from 'react';
import { TerminalJob } from '@/types/terminal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Square, FileText, Box, AlertTriangle, CheckCircle2, Clock, Circle } from 'lucide-react';
import { STEPViewer } from '@/components/STEPViewer'; // Reusing existing viewer
import { PDFViewer } from '@/components/PDFViewer';
import { OperationWithDetails } from '@/lib/database';
import { cn } from '@/lib/utils';
import IssueForm from '@/components/operator/IssueForm';
import { NextCellInfo } from './NextCellInfo';
import { RoutingVisualization } from './RoutingVisualization';
import { useCellQRMMetrics } from '@/hooks/useQRMMetrics';
import { useAuth } from '@/contexts/AuthContext';

interface DetailPanelProps {
    job: TerminalJob;
    onStart?: () => void;
    onPause?: () => void;
    onComplete?: () => void;
    stepUrl?: string | null;
    pdfUrl?: string | null;
    operations?: OperationWithDetails[];
}

export function DetailPanel({ job, onStart, onPause, onComplete, stepUrl, pdfUrl, operations = [] }: DetailPanelProps) {
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const { profile } = useAuth();

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

            {/* Header Card */}
            <div className="p-4 border-b border-border bg-card">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{job.jobCode}</h2>
                        <p className="text-muted-foreground text-sm">{job.description}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold text-primary">{job.quantity} <span className="text-sm text-muted-foreground">pcs</span></div>
                        <div className="text-xs text-muted-foreground">Due: {new Date(job.dueDate).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Current Operation Highlight */}
                <div className="my-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Ready to Start</div>
                    <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        {job.currentOp}
                    </div>
                </div>

                <div className="flex gap-2">
                    {job.status !== 'in_progress' ? (
                        <Button onClick={onStart} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Play className="w-4 h-4 mr-2" /> Start Operation
                        </Button>
                    ) : (
                        <Button onClick={onPause} variant="outline" className="flex-1 border-border text-foreground hover:bg-accent">
                            <Pause className="w-4 h-4 mr-2" /> Pause
                        </Button>
                    )}
                    {job.status === 'in_progress' && (
                        <Button
                            onClick={onComplete}
                            variant="outline"
                            className="flex-1 border-border text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            disabled={isBlockedByCapacity}
                            title={isBlockedByCapacity ? "Cannot complete - next cell at capacity" : "Complete operation"}
                        >
                            <Square className="w-4 h-4 mr-2" /> Complete
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsIssueModalOpen(true)}
                        title="Report Issue"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    >
                        <AlertTriangle className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* QRM Section - Next Cell and Routing */}
            <div className="p-4 border-b border-border bg-muted/20 space-y-3">
                {/* Next Cell Capacity */}
                {nextOperation && (
                    <NextCellInfo
                        nextCellName={nextOperation.cell?.name || 'Unknown Cell'}
                        metrics={nextCellMetrics}
                    />
                )}

                {/* Routing Visualization */}
                {job.jobId && (
                    <RoutingVisualization
                        jobId={job.jobId}
                        currentCellId={job.cellId}
                    />
                )}
            </div>

            {/* Main Content Tabs */}
            <div className="flex-1 min-h-0">
                <Tabs defaultValue={job.hasModel ? "3d" : job.hasPdf ? "pdf" : "ops"} className="h-full flex flex-col">
                    <div className="px-4 pt-2">
                        <TabsList className="w-full bg-muted text-muted-foreground">
                            {job.hasModel && (
                                <TabsTrigger value="3d" className="flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                    <Box className="w-4 h-4 mr-2" /> 3D View
                                </TabsTrigger>
                            )}
                            {job.hasPdf && (
                                <TabsTrigger value="pdf" className="flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                    <FileText className="w-4 h-4 mr-2" /> Drawing
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="ops" className="flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                Ops
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 p-4 min-h-0 overflow-hidden">
                        {job.hasModel && (
                            <TabsContent value="3d" className="h-full m-0 rounded-md overflow-hidden border border-border bg-background">
                                <STEPViewer url={stepUrl || ""} title={job.jobCode} />
                            </TabsContent>
                        )}

                        {job.hasPdf && (
                            <TabsContent value="pdf" className="h-full m-0 rounded-md overflow-hidden border border-border bg-background">
                                <PDFViewer url={pdfUrl || ""} title={job.jobCode} />
                            </TabsContent>
                        )}

                        <TabsContent value="ops" className="h-full m-0 overflow-auto">
                            <div className="space-y-2">
                                {operations.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8">No operations found</div>
                                )}
                                {operations.map((op) => (
                                    <div
                                        key={op.id}
                                        className={cn(
                                            "p-3 rounded border flex items-center justify-between transition-colors",
                                            op.status === 'in_progress'
                                                ? "bg-accent/10 border-primary/50 ring-1 ring-primary/20"
                                                : "bg-card border-border",
                                            op.status === 'completed' && "opacity-60 bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                op.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                                                    op.status === 'in_progress' ? "bg-primary text-primary-foreground animate-pulse" :
                                                        "bg-muted text-muted-foreground"
                                            )}>
                                                {op.sequence}
                                            </div>
                                            <div>
                                                <div className={cn(
                                                    "font-medium",
                                                    op.status === 'completed' ? "text-muted-foreground line-through" : "text-foreground"
                                                )}>
                                                    {op.operation_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>{op.cell?.name || 'Unknown Cell'}</span>
                                                    <span>•</span>
                                                    <span>{op.estimated_time}h est</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs">
                                            {op.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            {op.status === 'in_progress' && <Clock className="w-4 h-4 text-primary animate-spin-slow" />}
                                            {op.status === 'not_started' && <Circle className="w-4 h-4 text-muted-foreground" />}
                                            {op.status === 'on_hold' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Footer Warnings */}
            {job.warnings && job.warnings.length > 0 && (
                <div className="p-2 bg-amber-950/20 border-t border-amber-900/50">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                        <AlertTriangle className="w-4 h-4" />
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
        </div>
    );
}
