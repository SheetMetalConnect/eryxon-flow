import React from 'react';
import { TerminalJob } from '@/types/terminal';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, FileText, Box, AlertTriangle } from 'lucide-react';
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
    if (name.includes('frezen') || name.includes('mill')) return 'bg-blue-500';
    if (name.includes('afbramen') || name.includes('deburr')) return 'bg-emerald-500';
    if (name.includes('assemblage') || name.includes('assembly')) return 'bg-amber-500';
    if (name.includes('lassen') || name.includes('weld')) return 'bg-red-500';
    if (name.includes('autorisatie') || name.includes('auth')) return 'bg-gray-400';
    return 'bg-primary';
};

export function JobRow({ job, isSelected, onClick, variant }: JobRowProps) {
    return (
        <tr
            onClick={onClick}
            className={cn(
                "cursor-pointer transition-colors border-b border-border hover:bg-accent/30",
                isSelected && "bg-accent/50 ring-1 ring-primary",
                variant === 'process' && "bg-emerald-500/5",
            )}
        >
            {/* PONr - Part Number */}
            <td className="px-2 py-1.5 text-sm font-medium text-foreground whitespace-nowrap">
                {job.description}
            </td>

            {/* Omschrijving - Job Description/Code */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {job.jobCode}
            </td>

            {/* Naar cel - Operation Badge */}
            <td className="px-2 py-1.5">
                <Badge 
                    className={cn(
                        "text-white text-xs font-semibold px-2 py-0.5 whitespace-nowrap",
                        getOperationBadgeColor(job.currentOp)
                    )}
                >
                    {job.currentOp}
                </Badge>
            </td>

            {/* Action Icon */}
            <td className="px-2 py-1.5 text-center">
                {variant === 'process' ? (
                    <Pause className="w-4 h-4 text-foreground inline" />
                ) : (
                    <Play className="w-4 h-4 text-foreground inline" />
                )}
            </td>

            {/* Uren - Remaining Hours */}
            <td className="px-2 py-1.5 text-sm font-mono text-foreground text-right whitespace-nowrap">
                {job.hours}
            </td>

            {/* Huidige bewerking - Cell/Workstation */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {job.cellName || '-'}
            </td>

            {/* Materiaaldikte - Material */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {job.material || '-'}
            </td>

            {/* Geplande einddatum - Due Date */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {new Date(job.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </td>

            {/* Backorder status - Icons & Badges */}
            <td className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 justify-center">
                    {job.hasPdf && (
                        <div title="PDF Available">
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                    )}
                    {job.hasModel && (
                        <div title="3D Model">
                            <Box className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                    )}
                    {job.warnings && job.warnings.length > 0 && (
                        <div title={job.warnings.join(', ')}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
