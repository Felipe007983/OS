import { OS_STATUS_COLORS, OS_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '../lib/constants';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment';
  className?: string;
}

export function StatusBadge({ status, type = 'order', className }: StatusBadgeProps) {
  const labels = type === 'payment' ? PAYMENT_STATUS_LABELS : OS_STATUS_LABELS;
  const colors = type === 'payment' ? PAYMENT_STATUS_COLORS : OS_STATUS_COLORS;

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', colors[status] || 'bg-slate-100 text-slate-700', className)}>
      {labels[status] || status}
    </span>
  );
}
