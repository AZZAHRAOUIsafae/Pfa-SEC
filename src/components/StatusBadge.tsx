import { cn } from '../lib/utils';

const variants: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  VALIDATION: 'bg-purple-100 text-purple-800',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', variants[status] ?? 'bg-muted', className)}>
      {label}
    </span>
  );
}
