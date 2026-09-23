import { DollarSign, CheckCircle, Clock, Wallet } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SituationBadge } from './SituationBadge';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Payment, PaymentSummary } from '../types';
import { cn } from '../lib/utils';

interface PaymentPanelProps {
  payment: Payment | PaymentSummary;
  situationLabel?: string;
  compact?: boolean;
  onMarkPaid?: () => void;
  onMarkPartial?: () => void;
  showActions?: boolean;
  className?: string;
}

export function PaymentPanel({
  payment,
  situationLabel,
  compact,
  onMarkPaid,
  onMarkPartial,
  showActions,
  className,
}: PaymentPanelProps) {
  const progress = payment.calculatedAmount > 0
    ? Math.min(100, Math.round((payment.paidAmount / payment.calculatedAmount) * 100))
    : 0;

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50', compact ? 'p-4' : 'p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Pagamento</p>
            <p className="text-xs text-slate-500">Situação financeira da OS</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={payment.status} type="payment" />
          {situationLabel && <SituationBadge situation={situationLabel} />}
        </div>
      </div>

      <div className={cn('mt-4 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Calculado</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(payment.calculatedAmount)}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Pago</p>
          <p className="mt-0.5 text-sm font-bold text-green-600">{formatCurrency(payment.paidAmount)}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Restante</p>
          <p className="mt-0.5 text-sm font-bold text-amber-600">{formatCurrency(payment.remainingAmount)}</p>
        </div>
        {payment.paidAt && (
          <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Último pgto.</p>
            <p className="mt-0.5 text-sm font-bold text-slate-700">{formatDate(payment.paidAt)}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Progresso do pagamento</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn('h-full rounded-full transition-all', payment.status === 'PAGO' ? 'bg-green-500' : 'bg-brand-500')}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {showActions && payment.status !== 'PAGO' && payment.status !== 'CANCELADO' && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {onMarkPaid && (
            <button onClick={onMarkPaid} className="btn-primary flex-1 text-xs sm:flex-none">
              <CheckCircle className="h-3.5 w-3.5" /> Marcar como pago
            </button>
          )}
          {onMarkPartial && payment.remainingAmount > 0 && (
            <button onClick={onMarkPartial} className="btn-secondary flex-1 text-xs sm:flex-none">
              <DollarSign className="h-3.5 w-3.5" /> Pago parcial
            </button>
          )}
        </div>
      )}

      {payment.status === 'PAGO' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          <CheckCircle className="h-4 w-4" /> Pagamento quitado
          {payment.paymentMethod && <span className="text-green-600">· {payment.paymentMethod}</span>}
        </div>
      )}

      {payment.status === 'PARCIAL' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <Clock className="h-4 w-4" /> Pagamento parcial — falta {formatCurrency(payment.remainingAmount)}
        </div>
      )}

      {situationLabel === 'ENTREGUE_PARCIAL_PAGO_PARCIAL' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
          <Clock className="h-4 w-4" /> Entrega parcial conferida com pagamento parcial proporcional às peças aprovadas
        </div>
      )}

      {situationLabel === 'ENTREGUE_PARCIAL_PENDENTE' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700">
          <Clock className="h-4 w-4" /> Entrega parcial conferida — pagamento pendente sobre as peças aprovadas
        </div>
      )}
    </div>
  );
}
