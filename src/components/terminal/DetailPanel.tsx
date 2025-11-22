import React, { useState, useMemo } from 'react';
import { TerminalJob } from '@/types/terminal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Square, FileText, Box, AlertTriangle, CheckCircle2, Clock, Circle, Maximize2, X } from 'lucide-react';
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
    const [fullscreenViewer, setFullscreenViewer] = useState<'pdf' | '3d' | null>(null);
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
        <div className="flex flex-col h-full bg-transparent text-card-foreground">

            {/* Header Card - More Compact */}
            <div className="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-xl font-bold text-foreground">{job.jobCode}</h2>
                            <span className="text-sm text-muted-foreground">• {job.description}</span>
                        </div>
                        <div className="text-base font-bold text-primary mt-1 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
                            {job.currentOp}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold text-primary">{job.quantity} <span className="text-xs text-muted-foreground font-normal">pcs</span></div>
                        <div className="text-xs text-muted-foreground font-medium">{new Date(job.dueDate).toLocaleDateString()}</div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {job.status !== 'in_progress' ? (
                        <Button onClick={onStart} className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all">
                            <Play className="w-4 h-4 mr-2" /> Start Operation
                        </Button>
                    ) : (
                        <Button onClick={onPause} variant="outline" className="flex-1 border-border/50 text-foreground hover:bg-primary/10 backdrop-blur-sm font-semibold">
                            <Pause className="w-4 h-4 mr-2" /> Pause
                        </Button>
                    )}
                    {job.status === 'in_progress' && (
                        <Button
                            onClick={onComplete}
                            variant="outline"
                            className="flex-1 border-emerald-600/50 text-emerald-600 hover:bg-emerald-600/20 backdrop-blur-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="border-warning/50 text-warning hover:bg-warning/20 backdrop-blur-sm"
                    >
                        <AlertTriangle className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* QRM Section - Next Cell and Routing */}
            <div className="p-4 border-b border-border/50 bg-surface-elevated/50 backdrop-blur-sm space-y-3">
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
                    <div className="px-3 pt-2 flex items-center gap-2">
                        <TabsList className="flex-1 bg-surface-elevated/70 backdrop-blur-sm text-muted-foreground border border-border/50">
                            {job.hasModel && (
                                <TabsTrigger value="3d" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                                    <Box className="w-4 h-4 mr-1" /> 3D
                                </TabsTrigger>
                            )}
                            {job.hasPdf && (
                                <TabsTrigger value="pdf" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                                    <FileText className="w-4 h-4 mr-1" /> PDF
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="ops" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                                Ops
                            </TabsTrigger>
                        </TabsList>
                        {(job.hasModel || job.hasPdf) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFullscreenViewer(job.hasModel ? '3d' : 'pdf')}
                                className="shrink-0"
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 p-3 min-h-0 overflow-hidden">
                        {job.hasModel && (
                            <TabsContent value="3d" className="h-full m-0 rounded-lg overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm shadow-lg">
                                <STEPViewer url={stepUrl || ""} title={job.jobCode} />
                            </TabsContent>
                        )}

                        {job.hasPdf && (
                            <TabsContent value="pdf" className="h-full m-0 rounded-lg overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm shadow-lg">
                                <PDFViewer url={pdfUrl || ""} title={job.jobCode} />
                            </TabsContent>
                        )}

                        <TabsContent value="ops" className="h-full m-0 overflow-auto">
                            <div className="space-y-2">
                                {operations.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8 font-medium">No operations found</div>
                                )}
                                {operations.map((op) => (
                                    <div
                                        key={op.id}
                                        className={cn(
                                            "p-3 rounded-lg border flex items-center justify-between transition-all duration-200 backdrop-blur-sm",
                                            op.status === 'in_progress'
                                                ? "bg-primary/20 border-primary/50 ring-2 ring-primary/30 shadow-md"
                                                : "bg-card/50 border-border/50 hover:bg-card/70",
                                            op.status === 'completed' && "opacity-60 bg-muted/30"
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
                <div className="p-3 bg-warning/20 backdrop-blur-sm border-t border-warning/50">
                    <div className="flex items-center gap-2 text-warning text-sm font-semibold">
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

            {/* Fullscreen Viewer Dialog */}
            <Dialog open={fullscreenViewer !== null} onOpenChange={() => setFullscreenViewer(null)}>
                <DialogContent className="max-w-[95vw] h-[95vh] p-0 gap-0">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-3 border-b">
                            <h3 className="font-semibold">
                                {fullscreenViewer === '3d' ? '3D Model' : 'PDF Drawing'} - {job.jobCode}
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFullscreenViewer(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {fullscreenViewer === '3d' && stepUrl && (
                                <STEPViewer url={stepUrl} title={job.jobCode} />
                            )}
                            {fullscreenViewer === 'pdf' && pdfUrl && (
                                <PDFViewer url={pdfUrl} title={job.jobCode} />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
