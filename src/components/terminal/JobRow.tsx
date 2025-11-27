import React from 'react';
import { TerminalJob } from '@/types/terminal';
import { Badge } from '@/components/ui/badge';
import { FileText, Box, AlertTriangle, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

    return (
        <tr
            onClick={onClick}
            className={cn(
                "cursor-pointer transition-colors border-b border-border hover:bg-accent/30",
                isSelected && "bg-accent/50 ring-1 ring-primary",
                variant === 'process' && "bg-status-active/5",
                job.isCurrentUserClocked && "bg-primary/10 ring-1 ring-primary/50",
            )}
        >
            {/* Job Number with clocking indicator */}
            <td className="px-2 py-1.5 text-sm font-medium text-foreground whitespace-nowrap">
                <div className="flex items-center gap-2">
                    {job.isCurrentUserClocked && (
                        <Badge
                            className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0 animate-pulse"
                            title={t('terminal.youAreClockedOn')}
                        >
                            <Clock className="w-2.5 h-2.5 mr-0.5" />
                            {t('terminal.you')}
                        </Badge>
                    )}
                    {job.activeTimeEntryId && !job.isCurrentUserClocked && (
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-muted-foreground/50"
                            title={job.activeOperatorName}
                        >
                            <User className="w-2.5 h-2.5 mr-0.5" />
                            {job.activeOperatorName?.split(' ')[0] || t('terminal.other')}
                        </Badge>
                    )}
                    {job.jobCode}
                </div>
            </td>

            {/* Part Number */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {job.description}
            </td>

            {/* Operation */}
            <td className="px-2 py-1.5">
                <Badge
                    className={cn(
                        "text-primary-foreground text-xs font-semibold px-2 py-0.5 whitespace-nowrap",
                        getOperationBadgeColor(job.currentOp)
                    )}
                >
                    {job.currentOp}
                </Badge>
            </td>

            {/* Cell (Next Cell) */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                        backgroundColor: job.cellColor ? `${job.cellColor}20` : 'transparent',
                        color: job.cellColor || 'inherit'
                    }}
                >
                    {job.cellName || '-'}
                </span>
            </td>

            {/* Material */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {job.material || '-'}
            </td>

            {/* Quantity */}
            <td className="px-2 py-1.5 text-sm text-foreground text-center whitespace-nowrap">
                {job.quantity}
            </td>

            {/* Remaining Hours */}
            <td className="px-2 py-1.5 text-sm font-mono text-foreground text-right whitespace-nowrap">
                {job.hours}h
            </td>

            {/* Due Date */}
            <td className="px-2 py-1.5 text-sm text-foreground whitespace-nowrap">
                {new Date(job.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </td>

            {/* Files - Icons & Badges */}
            <td className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 justify-center">
                    {job.hasPdf && (
                        <div title="PDF Available">
                            <FileText className="w-3.5 h-3.5 text-brand-primary" />
                        </div>
                    )}
                    {job.hasModel && (
                        <div title="3D Model">
                            <Box className="w-3.5 h-3.5 text-accent" />
                        </div>
                    )}
                    {job.warnings && job.warnings.length > 0 && (
                        <div title={job.warnings.join(', ')}>
                            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
