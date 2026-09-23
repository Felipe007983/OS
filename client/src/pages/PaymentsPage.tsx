import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { PaymentPanel } from '../components/PaymentPanel';
import { formatCurrency, formatDate, formatOrderNumber } from '../lib/utils';
import { PAYMENT_METHODS } from '../lib/constants';
import type { Payment, PaymentDetail, ThirdParty } from '../types';

export function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [thirdPartyFilter, setThirdPartyFilter] = useState('TODAS');
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payForm, setPayForm] = useState({ amountToPay: 0, paymentMethod: 'PIX' as string, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/payments', { params: { status: statusFilter, thirdPartyId: thirdPartyFilter } })
      .then((res) => setPayments(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) api.get('/third-parties').then((res) => setThirdParties(res.data));
  }, [isAdmin]);

  useEffect(() => { load(); }, [statusFilter, thirdPartyFilter]);

  const openDetail = async (p: Payment) => {
    setSelectedPayment(p);
    setDetailLoading(true);
    setDetailModal(true);
    setError('');
    try {
      const res = await api.get(`/payments/${p.id}`);
      setPaymentDetail(res.data);
    } catch {
      setError('Erro ao carregar detalhes');
    } finally {
      setDetailLoading(false);
    }
  };

  const openPay = (p: Payment) => {
    setSelectedPayment(p);
    setPayForm({ amountToPay: p.remainingAmount, paymentMethod: 'PIX', notes: '' });
    setError('');
    setPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedPayment) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/payments/${selectedPayment.id}/pay`, payForm);
      setPayModal(false);
      if (detailModal) {
        const res = await api.get(`/payments/${selectedPayment.id}`);
        setPaymentDetail(res.data);
      }
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento');
    } finally {
      setSaving(false);
    }
  };

  const totalPending = payments.filter((p) => p.status !== 'CANCELADO' && p.status !== 'PAGO').reduce((s, p) => s + p.remainingAmount, 0);
  const totalPaid = payments.filter((p) => p.status !== 'CANCELADO').reduce((s, p) => s + p.paidAmount, 0);

  return (
    <div className="page-container">
      <PageHeader
        title={isAdmin ? 'Pagamentos' : 'Meus Pagamentos'}
        subtitle="Confirme se as OS estão pagas e valide os serviços realizados"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card border-l-4 border-l-amber-500">
          <p className="text-sm font-medium text-slate-500">Total Pendente</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-slate-500">Total Pago</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <div className="filter-bar mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-full sm:w-48">
          <option value="TODOS">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PARCIAL">Pago parcial</option>
          <option value="PAGO">Pago</option>
        </select>
        {isAdmin && (
          <select value={thirdPartyFilter} onChange={(e) => setThirdPartyFilter(e.target.value)} className="input-field w-full sm:w-48">
            <option value="TODAS">Todas costureiras</option>
            {thirdParties.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">OS</th>
                {isAdmin && <th className="px-4 py-3 text-left font-semibold text-slate-600">Costureira</th>}
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status OS</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Calculado</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Pago</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Restante</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Pagamento</th>
                {isAdmin && <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-brand-50/50 transition"
                  onClick={() => openDetail(p)}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-brand-700">{formatOrderNumber(p.serviceOrder.orderNumber)}</span>
                  </td>
                  {isAdmin && <td className="px-4 py-3 text-slate-600">{p.thirdParty.name}</td>}
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={p.serviceOrder.status} />
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.calculatedAmount)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(p.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-600">{formatCurrency(p.remainingAmount)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={p.status} type="payment" /></td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetail(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Validar serviços">
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.status !== 'PAGO' && p.status !== 'CANCELADO' && (
                          <button onClick={() => openPay(p)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                            Baixar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <p className="py-16 text-center text-slate-400">Nenhum pagamento encontrado</p>}
        </div>
      )}

      <p className="mt-3 text-center text-xs text-slate-400">Clique em qualquer linha para validar os serviços da OS</p>

      {/* Modal de validação / detalhes */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Validar Pagamento e Serviços" size="xl">
        {detailLoading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : paymentDetail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-lg font-bold">{formatOrderNumber(paymentDetail.serviceOrder.orderNumber)}</p>
                <p className="text-sm text-slate-500">{paymentDetail.thirdParty.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={paymentDetail.serviceOrder.status} />
                <StatusBadge status={paymentDetail.status} type="payment" />
              </div>
            </div>

            <PaymentPanel
              payment={paymentDetail}
              showActions={isAdmin}
              onMarkPaid={() => openPay(paymentDetail)}
              onMarkPartial={() => {
                setPayForm({ amountToPay: Math.min(paymentDetail.remainingAmount / 2, paymentDetail.remainingAmount), paymentMethod: 'PIX', notes: '' });
                setSelectedPayment(paymentDetail);
                setPayModal(true);
              }}
            />

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700">Serviços realizados — conferência</h4>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Produto</th>
                      <th className="px-3 py-2 text-center font-medium">Solicitado</th>
                      <th className="px-3 py-2 text-center font-medium">Produzido</th>
                      <th className="px-3 py-2 text-center font-medium">Entregue</th>
                      <th className="px-3 py-2 text-center font-medium">Aprovado</th>
                      <th className="px-3 py-2 text-center font-medium">Rejeitado</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentDetail.serviceOrder.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{it.productName}</td>
                        <td className="px-3 py-2 text-center">{it.quantityRequested}</td>
                        <td className="px-3 py-2 text-center text-indigo-600">{it.quantityProduced}</td>
                        <td className="px-3 py-2 text-center text-purple-600">{it.quantityDelivered}</td>
                        <td className="px-3 py-2 text-center font-semibold text-green-600">{it.quantityApproved}</td>
                        <td className="px-3 py-2 text-center text-red-600">{it.quantityRejected}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(it.quantityApproved * it.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-right text-sm font-semibold text-slate-600">Total conferido:</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">
                        {formatCurrency(paymentDetail.serviceOrder.items.reduce((s, it) => s + it.quantityApproved * it.unitPrice, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Link
                to={`/ordens/${paymentDetail.serviceOrder.id}`}
                className="btn-secondary"
                onClick={() => setDetailModal(false)}
              >
                <ExternalLink className="h-4 w-4" /> Ver OS completa
              </Link>
              {isAdmin && paymentDetail.status !== 'PAGO' && (
                <button onClick={() => openPay(paymentDetail)} className="btn-primary">
                  <CheckCircle className="h-4 w-4" /> Confirmar pagamento
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Registrar Pagamento">
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {selectedPayment && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1">
              <p>OS: <strong>{formatOrderNumber(selectedPayment.serviceOrder.orderNumber)}</strong></p>
              <p>Costureira: <strong>{selectedPayment.thirdParty.name}</strong></p>
              <p>Valor calculado: <strong>{formatCurrency(selectedPayment.calculatedAmount)}</strong></p>
              <p>Restante: <strong className="text-amber-600">{formatCurrency(selectedPayment.remainingAmount)}</strong></p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valor a pagar</label>
              <input type="number" step="0.01" min="0.01" max={selectedPayment.remainingAmount} value={payForm.amountToPay} onChange={(e) => setPayForm({ ...payForm, amountToPay: parseFloat(e.target.value) || 0 })} className="input-field" />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setPayForm({ ...payForm, amountToPay: selectedPayment.remainingAmount })} className="text-xs text-brand-600 hover:underline">Valor total</button>
                <button type="button" onClick={() => setPayForm({ ...payForm, amountToPay: Math.round(selectedPayment.remainingAmount / 2 * 100) / 100 })} className="text-xs text-brand-600 hover:underline">Metade</button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Forma de pagamento</label>
              <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })} className="input-field">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Observações</label>
              <textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="input-field" rows={2} />
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setPayModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handlePay} disabled={saving || payForm.amountToPay <= 0} className="btn-primary">
            {saving ? 'Salvando...' : payForm.amountToPay >= (selectedPayment?.remainingAmount || 0) ? 'Marcar como pago' : 'Registrar pago parcial'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
