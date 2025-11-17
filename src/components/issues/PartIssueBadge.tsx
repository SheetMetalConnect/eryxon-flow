import { usePartIssues } from '@/hooks/usePartIssues';
import { IssueBadge } from './IssueBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface PartIssueBadgeProps {
  partId: string;
  showZero?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PartIssueBadge({ partId, showZero = false, size = 'md' }: PartIssueBadgeProps) {
  const { totalCount, highestSeverity, loading } = usePartIssues(partId);

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
