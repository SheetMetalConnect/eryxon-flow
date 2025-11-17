import { useJobIssues } from '@/hooks/useJobIssues';
import { IssueBadge } from './IssueBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface JobIssueBadgeProps {
  jobId: string;
  showZero?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function JobIssueBadge({ jobId, showZero = false, size = 'md' }: JobIssueBadgeProps) {
  const { totalCount, highestSeverity, loading } = useJobIssues(jobId);

  if (loading) {
    return <Skeleton className="h-6 w-12" />;
  }

  return (
    <IssueBadge
      count={totalCount}
      severity={highestSeverity}
      showZero={showZero}
      size={size}
    />
  );
}
