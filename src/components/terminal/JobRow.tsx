import React from 'react';
import { TerminalJob } from '@/types/terminal';
import { Badge } from '@/components/ui/badge';
import { FileText, Box, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobRowProps {
    job: TerminalJob;
    isSelected: boolean;
    onClick: () => void;
    variant: 'process' | 'buffer' | 'expected';
}

// Helper to get status badge colors based on operation/cell type
const getOperationBadgeColor = (opName: string) => {
    const name = opName.toLowerCase();
    if (name.includes('frezen') || name.includes('mill')) return 'bg-operation-milling';
    if (name.includes('afbramen') || name.includes('deburr')) return 'bg-status-completed';
    if (name.includes('assemblage') || name.includes('assembly')) return 'bg-status-on-hold';
    if (name.includes('lassen') || name.includes('weld')) return 'bg-operation-welding';
    if (name.includes('autorisatie') || name.includes('auth')) return 'bg-operation-default';
    return 'bg-operation-default';
};

export function JobRow({ job, isSelected, onClick, variant }: JobRowProps) {
    return (
        <tr
            onClick={onClick}
            className={cn(
                "cursor-pointer transition-all duration-200 border-b border-border/50 hover:bg-primary/10 hover:shadow-sm",
                isSelected && "bg-primary/20 ring-2 ring-primary/50 shadow-md",
                variant === 'process' && "bg-status-active/10",
            )}
        >
            {/* Job Number */}
            <td className="px-3 py-3 text-sm font-semibold text-foreground whitespace-nowrap">
                {job.jobCode}
            </td>

            {/* Part Number */}
            <td className="px-3 py-3 text-sm font-medium text-foreground/90 whitespace-nowrap">
                {job.description}
            </td>

            {/* Operation */}
            <td className="px-3 py-3">
                <Badge
                    className={cn(
                        "text-primary-foreground text-xs font-bold px-2.5 py-1 whitespace-nowrap shadow-sm",
                        getOperationBadgeColor(job.currentOp)
                    )}
                >
                    {job.currentOp}
                </Badge>
            </td>

            {/* Cell (Next Cell) */}
            <td className="px-3 py-3 text-sm text-foreground whitespace-nowrap">
                <span
                    className="inline-block px-2.5 py-1 rounded-md text-xs font-bold shadow-sm backdrop-blur-sm"
                    style={{
                        backgroundColor: job.cellColor ? `${job.cellColor}30` : 'hsl(var(--muted))',
                        color: job.cellColor || 'hsl(var(--foreground))',
                        border: `1px solid ${job.cellColor ? `${job.cellColor}50` : 'hsl(var(--border))'}`
                    }}
                >
                    {job.cellName || '-'}
                </span>
            </td>

            {/* Material */}
            <td className="px-3 py-3 text-sm font-medium text-foreground/80 whitespace-nowrap">
                {job.material || '-'}
            </td>

            {/* Quantity */}
            <td className="px-3 py-3 text-sm font-semibold text-foreground text-center whitespace-nowrap">
                <span className="inline-block px-2 py-0.5 rounded bg-muted/50">{job.quantity}</span>
            </td>

            {/* Remaining Hours */}
            <td className="px-3 py-3 text-sm font-mono font-bold text-primary text-right whitespace-nowrap">
                {job.hours}h
            </td>

            {/* Due Date */}
            <td className="px-3 py-3 text-sm font-medium text-foreground/80 whitespace-nowrap">
                {new Date(job.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </td>

            {/* Files - Icons & Badges */}
            <td className="px-3 py-3">
                <div className="flex items-center gap-2 justify-center">
                    {job.hasPdf && (
                        <div title="PDF Available" className="p-1 rounded bg-primary/20 backdrop-blur-sm">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                    )}
                    {job.hasModel && (
                        <div title="3D Model" className="p-1 rounded bg-accent/20 backdrop-blur-sm">
                            <Box className="w-4 h-4 text-accent" />
                        </div>
                    )}
                    {job.warnings && job.warnings.length > 0 && (
                        <div title={job.warnings.join(', ')} className="p-1 rounded bg-warning/20 backdrop-blur-sm">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
