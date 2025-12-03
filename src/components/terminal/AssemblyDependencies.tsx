import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, Circle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ChildPart {
  id: string;
  part_number: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface AssemblyDependenciesProps {
  partId: string;
  className?: string;
}

/**
 * Compact assembly dependencies display for terminal DetailPanel
 * Shows status of child parts that need to be complete before assembly can start
 */
export function AssemblyDependencies({ partId, className }: AssemblyDependenciesProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [childParts, setChildParts] = useState<ChildPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(false);

  useEffect(() => {
    const fetchChildParts = async () => {
      if (!partId || !profile?.tenant_id) return;

      try {
        const { data, error } = await supabase
          .from('parts')
          .select('id, part_number, status')
          .eq('parent_part_id', partId)
          .eq('tenant_id', profile.tenant_id)
          .order('part_number');

        if (!error && data && data.length > 0) {
          setChildParts(data as ChildPart[]);
          setHasChildren(true);
        } else {
          setHasChildren(false);
        }
      } catch (error) {
        console.error('Error fetching child parts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildParts();
  }, [partId, profile?.tenant_id]);

  if (loading || !hasChildren) {
    return null;
  }

  const completedCount = childParts.filter(p => p.status === 'completed').length;
  const incompleteCount = childParts.length - completedCount;
  const allComplete = incompleteCount === 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="w-3 h-3 text-primary" />;
      default:
        return <Circle className="w-3 h-3 text-muted-foreground/50" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('terminal.assembly.partStatus.completed');
      case 'in_progress':
        return t('terminal.assembly.partStatus.inProgress');
      default:
        return t('terminal.assembly.partStatus.notStarted');
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={cn(
        "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium",
        allComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
      )}>
        {allComplete ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        {t('terminal.assembly.title')}
      </div>

      {!allComplete && (
        <div className="px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('terminal.assembly.warning')}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 ml-5">
            {t('terminal.assembly.componentsPending', { count: incompleteCount })}
          </div>
        </div>
      )}

      {allComplete && (
        <div className="px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('terminal.assembly.allComplete')}
          </div>
        </div>
      )}

      <div className="space-y-0.5 mt-1">
        {childParts.map((part) => (
          <div
            key={part.id}
            className={cn(
              "flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px]",
              part.status === 'completed'
                ? "bg-muted/20 text-muted-foreground"
                : "bg-muted/40"
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {getStatusIcon(part.status)}
              <span className={cn(
                "truncate",
                part.status === 'completed' && "line-through"
              )}>
                {part.part_number}
              </span>
            </div>
            <span className={cn(
              "text-[9px] shrink-0",
              part.status === 'completed'
                ? "text-emerald-600 dark:text-emerald-400"
                : part.status === 'in_progress'
                ? "text-primary"
                : "text-muted-foreground"
            )}>
              {getStatusLabel(part.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
