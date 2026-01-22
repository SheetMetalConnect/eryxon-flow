import React, { useEffect, useState } from 'react';
import { Wrench, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  name: string;
  type: string;
  identifier?: string | null;
  location?: string | null;
  status?: string | null;
}

interface OperationResource {
  id: string;
  quantity?: number | null;
  notes?: string | null;
  resource: Resource;
}

interface OperationResourcesProps {
  operationId: string;
  className?: string;
}

/**
 * Compact resource display for terminal DetailPanel
 * Shows required resources for an operation in a minimal, touch-friendly format
 */
export function OperationResources({ operationId, className }: OperationResourcesProps) {
  const { t } = useTranslation();
  const [resources, setResources] = useState<OperationResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      if (!operationId) return;

      try {
        const { data, error } = await supabase
          .from('operation_resources')
          .select(`
            *,
            resource:resources(*)
          `)
          .eq('operation_id', operationId);

        if (!error && data) {
          setResources(data as unknown as OperationResource[]);
        }
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [operationId]);

  if (loading) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        {t('terminal.resources.loading')}
      </div>
    );
  }

  if (resources.length === 0) {
    return null;
  }

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'available':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'in_use':
        return 'text-amber-600 dark:text-amber-400';
      case 'maintenance':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'available':
        return t('terminal.resources.status.available');
      case 'in_use':
        return t('terminal.resources.status.inUse');
      case 'maintenance':
        return t('terminal.resources.status.maintenance');
      case 'retired':
        return t('terminal.resources.status.retired');
      default:
        return status || '';
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        <Wrench className="w-3 h-3 text-orange-500" />
        {t('terminal.resources.title')}
        <span className="text-[9px] text-muted-foreground/70">
          ({resources.length})
        </span>
      </div>

      <div className="space-y-1">
        {resources.map((opResource) => (
          <div
            key={opResource.id}
            className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/30 rounded border border-border/50 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Wrench className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">
                  {opResource.resource.name}
                  {opResource.quantity && opResource.quantity > 1 && (
                    <span className="ml-1 text-muted-foreground">
                      ×{opResource.quantity}
                    </span>
                  )}
                </div>
                {opResource.resource.location && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" />
                    {opResource.resource.location}
                  </div>
                )}
              </div>
            </div>

            {opResource.resource.status && (
              <span className={cn(
                "text-[9px] font-medium shrink-0",
                getStatusColor(opResource.resource.status)
              )}>
                {getStatusLabel(opResource.resource.status)}
              </span>
            )}
          </div>
        ))}
      </div>

      {resources.some(r => r.notes) && (
        <div className="mt-1.5 space-y-1">
          {resources.filter(r => r.notes).map(r => (
            <div
              key={`note-${r.id}`}
              className="flex items-start gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px]"
            >
              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-300">
                {r.notes}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
