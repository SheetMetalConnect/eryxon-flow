import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface IssueBadgeProps {
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  showZero?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IssueBadge({ count, severity, showZero = false, size = 'md' }: IssueBadgeProps) {
  if (count === 0 && !showZero) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  const severityColors = {
    low: 'bg-gray-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const bgColor = severity ? severityColors[severity] : 'bg-gray-400';

  return (
    <Badge
      variant="secondary"
      className={`${bgColor} text-white hover:${bgColor}/90 gap-1 ${textSizes[size]}`}
    >
      <AlertTriangle className={iconSizes[size]} />
      {count}
    </Badge>
  );
}
