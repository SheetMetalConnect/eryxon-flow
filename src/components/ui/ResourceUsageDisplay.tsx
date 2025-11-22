import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wrench, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedMetadataDisplay } from '@/components/ui/EnhancedMetadataDisplay';
import { useTranslation } from 'react-i18next';

interface Resource {
  id: string;
  name: string;
  type: string;
  identifier?: string | null;
  location?: string | null;
  status?: string | null;
  metadata?: any;
}

interface OperationResource {
  id: string;
  quantity?: number | null;
  notes?: string | null;
  resource: Resource;
}

interface ResourceUsageDisplayProps {
  operationId: string;
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
}

/**
 * Displays resources required for an operation with full metadata
 * Following the design system with glass morphism and proper styling
 */
export function ResourceUsageDisplay({
  operationId,
  compact = false,
  showTitle = true,
  className = '',
}: ResourceUsageDisplayProps) {
  const { t } = useTranslation();
  const [resources, setResources] = useState<OperationResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      if (!operationId) return;

      try {
        const { data, error } = await supabase
          .from('operation_resources')
          .select(
            `
            *,
            resource:resources(*)
          `
          )
          .eq('operation_id', operationId);

        if (!error && data) {
          setResources(data as any);
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
    return compact ? null : (
      <div className="text-sm text-muted-foreground">
        {t('operations.loadingResources', 'Loading resources...')}
      </div>
    );
  }

  if (resources.length === 0) {
    return null;
  }

  if (compact) {
    // Compact view - just show count
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Wrench className="h-4 w-4 text-orange-600" />
        <span className="text-xs text-muted-foreground">
          {resources.length} {resources.length === 1 ? t('operations.resource', 'resource') : t('operations.resources', 'resources')}
        </span>
      </div>
    );
  }

  // Full view with metadata - following OperationDetailModal pattern
  return (
    <div className={className}>
      {showTitle && (
        <div className="text-sm font-medium mb-3 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-600" />
          {t('operations.requiredResources', 'Required Resources')}
        </div>
      )}
      <div className="space-y-3">
        {resources.map((opResource) => (
          <div
            key={opResource.id}
            className="border rounded-lg p-4 bg-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-orange-600" />
                  <p className="font-semibold text-base">
                    {opResource.resource.name}
                  </p>
                  {opResource.quantity && opResource.quantity > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('operations.qty', 'Qty')}: {opResource.quantity}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1 ml-6">
                  <p className="capitalize">
                    <span className="font-medium">{t('operations.type', 'Type')}:</span>{' '}
                    {opResource.resource.type.replace('_', ' ')}
                  </p>
                  {opResource.resource.identifier && (
                    <p>
                      <span className="font-medium">ID:</span>{' '}
                      {opResource.resource.identifier}
                    </p>
                  )}
                  {opResource.resource.location && (
                    <p>
                      <span className="font-medium">
                        {t('operations.location', 'Location')}:
                      </span>{' '}
                      {opResource.resource.location}
                    </p>
                  )}
                </div>
              </div>
              {opResource.resource.status && (
                <Badge
                  variant={
                    opResource.resource.status === 'available'
                      ? 'default'
                      : opResource.resource.status === 'in_use'
                      ? 'secondary'
                      : opResource.resource.status === 'maintenance'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="text-xs capitalize"
                >
                  {opResource.resource.status.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {/* Resource-specific instructions */}
            {opResource.notes && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                      Instructions:
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {opResource.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resource metadata */}
            {opResource.resource.metadata && (
              <div className="mt-3">
                <EnhancedMetadataDisplay
                  metadata={opResource.resource.metadata}
                  compact={true}
                  showTypeIndicator={false}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple inline resource count badge - for use in cards/lists
 */
export function ResourceCountBadge({ operationId }: { operationId: string }) {
  const { t } = useTranslation();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      if (!operationId) return;

      try {
        const { count: resourceCount, error } = await supabase
          .from('operation_resources')
          .select('*', { count: 'exact', head: true })
          .eq('operation_id', operationId);

        if (!error && resourceCount !== null) {
          setCount(resourceCount);
        }
      } catch (error) {
        console.error('Error fetching resource count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [operationId]);

  if (loading || count === 0) {
    return null;
  }

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Wrench className="h-3 w-3" />
      {count}
    </Badge>
  );
}
