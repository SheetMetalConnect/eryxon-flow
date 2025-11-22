import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface IssuesSummarySectionProps {
  partId?: string;
  jobId?: string;
}

export function IssuesSummarySection({ partId, jobId }: IssuesSummarySectionProps) {
  const { t } = useTranslation();

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues-summary', partId, jobId],
    queryFn: async () => {
      let query = supabase
        .from('issues_with_context')
        .select('*')
        .order('created_at', { ascending: false });

      if (partId) {
        query = query.eq('part_id', partId);
      } else if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(partId || jobId),
  });

  if (!partId && !jobId) return null;

  const severityColors = {
    low: 'bg-severity-low',
    medium: 'bg-severity-medium',
    high: 'bg-severity-high',
    critical: 'bg-severity-critical',
  };

  const statusColors = {
    pending: 'bg-issue-pending',
    approved: 'bg-issue-approved',
    rejected: 'bg-issue-rejected',
    closed: 'bg-issue-closed',
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <Label className="text-lg flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5" />
          {t('issues.ncrs')}
        </Label>
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <Label className="text-lg flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5" />
          {t('issues.ncrsSummary', { count: 0 })}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('issues.noNcrsReported', { type: partId ? t('issues.part').toLowerCase() : t('issues.job').toLowerCase() })}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <Label className="text-lg flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5" />
        {t('issues.ncrsSummary', { count: issues.length })}
      </Label>

      <div className="space-y-3">
        {issues.map((issue: any) => (
          <div
            key={issue.id}
            className="border rounded-md p-3 bg-card"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex gap-2">
                <Badge
                  className={`${severityColors[issue.severity as keyof typeof severityColors]} text-white`}
                >
                  {t(`issues.severity.${issue.severity}`)}
                </Badge>
                <Badge
                  className={`${statusColors[issue.status as keyof typeof statusColors]} text-white`}
                >
                  {t(`issues.status.${issue.status}`)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(issue.created_at), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>

            <p className="text-sm mb-2">{issue.description}</p>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <span className="font-medium">{t('issues.operation')}:</span> {issue.operation_name}
              </div>
              {jobId && (
                <div>
                  <span className="font-medium">{t('issues.part')}:</span> {issue.part_number}
                </div>
              )}
              <div>
                <span className="font-medium">{t('issues.reportedBy')}:</span> {issue.creator_name}
              </div>
              {issue.resolution_notes && (
                <div className="mt-2 pt-2 border-t">
                  <span className="font-medium">{t('issues.resolution')}:</span> {issue.resolution_notes}
                  {issue.reviewer_name && (
                    <span className="ml-2">({issue.reviewer_name})</span>
                  )}
                </div>
              )}
            </div>

            {issue.image_paths && issue.image_paths.length > 0 && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {t('issues.photoAttached', { count: issue.image_paths.length })}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
