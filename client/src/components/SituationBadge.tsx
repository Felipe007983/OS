import { SITUATION_COLORS, SITUATION_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../lib/constants';
import { cn } from '../lib/utils';

interface SituationBadgeProps {
  situation?: string;
  paymentStatus?: string;
  className?: string;
}

export function SituationBadge({ situation, paymentStatus, className }: SituationBadgeProps) {
  const key = situation || paymentStatus || 'EM_ANDAMENTO';
  const labels = { ...SITUATION_LABELS, ...PAYMENT_STATUS_LABELS };
  const colors = { ...SITUATION_COLORS, ...PAYMENT_STATUS_COLORS };

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', colors[key] || 'bg-slate-100 text-slate-700', className)}>
      {labels[key] || key}
    </span>
  );
}
