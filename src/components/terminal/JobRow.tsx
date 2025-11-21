import React from 'react';
import { TerminalJob } from '@/types/terminal';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Box, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobRowProps {
    job: TerminalJob;
    isSelected: boolean;
    onClick: () => void;
    variant: 'process' | 'buffer' | 'expected';
}

export function JobRow({ job, isSelected, onClick, variant }: JobRowProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all duration-200 relative overflow-hidden group",
                // Selection state
                isSelected
                    ? "bg-accent/20 border-primary shadow-md ring-1 ring-primary"
                    : "bg-card border-border hover:border-primary/50 hover:bg-accent/5",
                // Variant specific styling (subtle tint)
                variant === 'process' && !isSelected && "border-l-4 border-l-emerald-500",
                variant === 'buffer' && !isSelected && "border-l-4 border-l-blue-500",
                variant === 'expected' && !isSelected && "border-l-4 border-l-amber-500 opacity-80"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "font-bold text-lg tracking-tight",
                            isSelected ? "text-primary" : "text-foreground"
                        )}>
                            {job.jobCode}
                        </span>
                        {job.quantity > 1 && (
                            <Badge variant="secondary" className="text-xs font-mono">
                                {job.quantity}x
                            </Badge>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">{job.description}</div>
                </div>
                <div className="text-right">
                    <div className={cn(
                        "text-xl font-bold font-mono",
                        job.hours <= 0 ? "text-emerald-500" : "text-foreground"
                    )}>
                        {job.hours}h
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Remaining</div>
                </div>
            </div>

            {/* Current Operation Highlight */}
            <div className="mb-3 p-2 rounded bg-accent/10 border border-accent/20">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Current Step</div>
                <div className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {job.currentOp}
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-3">
                    {job.hasPdf && (
                        <div className="flex items-center gap-1 text-blue-400" title="Drawing Available">
                            <FileText className="w-3 h-3" /> <span className="hidden sm:inline">PDF</span>
                        </div>
                    )}
                    {job.hasModel && (
                        <div className="flex items-center gap-1 text-purple-400" title="3D Model Available">
                            <Box className="w-3 h-3" /> <span className="hidden sm:inline">3D</span>
                        </div>
                    )}
                    {job.warnings && job.warnings.length > 0 && (
                        <div className="flex items-center gap-1 text-amber-500 font-medium">
                            <AlertTriangle className="w-3 h-3" /> <span>{job.warnings.length}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(job.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
            </div>
        </div>
    );
}
