import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, CheckCircle, XCircle, Factory, Truck,
  ClipboardCheck, AlertTriangle, Copy, PenLine, Link2,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { SituationBadge } from '../components/SituationBadge';
import { PaymentPanel } from '../components/PaymentPanel';
import { Modal } from '../components/Modal';
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber } from '../lib/utils';
import { OS_STATUS_LABELS, PAYMENT_METHODS } from '../lib/constants';
import { computeSituationLabel } from '../lib/situation';
import type { ServiceOrderDetail } from '../types';

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isSeamstress } = useAuth();
  const [order, setOrder] = useState<ServiceOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [productionModal, setProductionModal] = useState(false);
  const [productionItemId, setProductionItemId] = useState('');
  const [productionQty, setProductionQty] = useState(1);
  const [productionNotes, setProductionNotes] = useState('');

  const [deliveryModal, setDeliveryModal] = useState(false);
  const [deliveryItems, setDeliveryItems] = useState<Record<string, number>>({});
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [conferenceModal, setConferenceModal] = useState(false);
  const [conferenceDeliveryId, setConferenceDeliveryId] = useState('');
  const [conferenceItems, setConferenceItems] = useState<Record<string, { approved: number; rejected: number; reason: string }>>({});

  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amountToPay: 0, paymentMethod: 'PIX', notes: '' });
  const [linkUrls, setLinkUrls] = useState<{ signUrl?: string; publicUrl?: string }>({});

  const load = () => {
    setLoading(true);
    api.get(`/service-orders/${id}`).then((res) => setOrder(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const showMsg = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const activePayment = order?.payments?.find((p) => p.status !== 'CANCELADO') || order?.payments?.[0];

  const totalApproved = order?.items.reduce((s, it) => s + it.quantityApproved, 0) ?? 0;
  const totalDelivered = order?.items.reduce((s, it) => s + it.quantityDelivered, 0) ?? 0;

  const getSituationLabel = () => {
    if (!order || !activePayment) return undefined;
    return computeSituationLabel(
      order.status,
      order.totalPieces,
      totalApproved,
      totalDelivered,
      activePayment.status
    );
  };

  const openPayModal = (fullAmount = true) => {
    if (!activePayment) return;
    setPayForm({
      amountToPay: fullAmount ? activePayment.remainingAmount : Math.round(activePayment.remainingAmount / 2 * 100) / 100,
      paymentMethod: 'PIX',
      notes: '',
    });
    setPayModal(true);
  };

  const handlePay = async () => {
    if (!activePayment) return;
    setActionLoading(true);
    try {
      await api.post(`/payments/${activePayment.id}/pay`, payForm);
      setPayModal(false);
      showMsg(payForm.amountToPay >= activePayment.remainingAmount ? 'Marcado como pago!' : 'Pagamento parcial registrado!');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showMsg('Link copiado!');
  };

  const handleGenerateLink = async (openWhatsapp = false) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post(`/acceptance/generate-link/${id}`);
      setLinkUrls({ signUrl: res.data.signUrl, publicUrl: res.data.publicUrl });
      if (openWhatsapp) window.open(res.data.whatsappUrl, '_blank');
      showMsg('Links de assinatura gerados!');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao gerar link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await api.post(`/acceptance/auth/${id}/accept`);
      showMsg('Ordem de serviço aceita com sucesso!');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao aceitar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Deseja cancelar esta OS?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/service-orders/${id}/status`, { nextStatus: 'CANCELADA', reason: 'Cancelada pelo administrador' });
      showMsg('OS cancelada');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cancelar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProduction = async () => {
    setActionLoading(true);
    try {
      await api.post('/production', { serviceOrderItemId: productionItemId, quantity: productionQty, notes: productionNotes || null });
      setProductionModal(false);
      showMsg('Produção registrada!');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar produção');
    } finally {
      setActionLoading(false);
    }
  };

  const openDeliveryModal = () => {
    const initial: Record<string, number> = {};
    order?.items.forEach((it) => {
      if (it.quantityRequested - it.quantityDelivered > 0) initial[it.id] = 0;
    });
    setDeliveryItems(initial);
    setDeliveryNotes('');
    setDeliveryModal(true);
  };

  const handleDelivery = async () => {
    const items = Object.entries(deliveryItems).filter(([, qty]) => qty > 0).map(([serviceOrderItemId, quantityDelivered]) => ({ serviceOrderItemId, quantityDelivered }));
    if (items.length === 0) { setError('Informe ao menos um item com quantidade'); return; }
    setActionLoading(true);
    try {
      await api.post('/deliveries', { serviceOrderId: id, notes: deliveryNotes || null, items });
      setDeliveryModal(false);
      showMsg('Entrega registrada!');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar entrega');
    } finally {
      setActionLoading(false);
    }
  };

  const openConferenceModal = (deliveryId: string) => {
    const delivery = order?.deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;
    const initial: Record<string, { approved: number; rejected: number; reason: string }> = {};
    delivery.items.forEach((it) => { initial[it.id] = { approved: it.quantityDelivered, rejected: 0, reason: '' }; });
    setConferenceDeliveryId(deliveryId);
    setConferenceItems(initial);
    setConferenceModal(true);
  };

  const handleConference = async () => {
    const items = Object.entries(conferenceItems).map(([deliveryItemId, data]) => ({
      deliveryItemId, quantityApproved: data.approved, quantityRejected: data.rejected, rejectionReason: data.reason || null,
    }));
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${conferenceDeliveryId}/conference`, { items, finalizeOrderIfComplete: true });
      setConferenceModal(false);
      showMsg('Conferência realizada!');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro na conferência');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  if (!order) return <div className="card py-12 text-center text-slate-400">OS não encontrada</div>;

  const canAccept = isSeamstress && ['AGUARDANDO_ACEITE', 'RECUSADA'].includes(order.status);
  const canProduce = ['ACEITA', 'EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE'].includes(order.status);
  const canDeliver = ['ACEITA', 'EM_PRODUCAO', 'PARCIALMENTE_ENTREGUE', 'CONFERENCIA'].includes(order.status);
  const canSendLink = isAdmin && ['RASCUNHO', 'RECUSADA', 'AGUARDANDO_ACEITE'].includes(order.status);
  const situationLabel = getSituationLabel();

  const totalProduced = order.items.reduce((s, it) => s + it.quantityProduced, 0);
  const progressProduction = order.totalPieces > 0 ? Math.min(100, Math.round((totalProduced / order.totalPieces) * 100)) : 0;
  const progressDelivery = order.totalPieces > 0 ? Math.min(100, Math.round((totalDelivered / order.totalPieces) * 100)) : 0;
  const progressPayment = activePayment && activePayment.calculatedAmount > 0
    ? Math.min(100, Math.round((activePayment.paidAmount / activePayment.calculatedAmount) * 100))
    : 0;

  return (
    <div className="page-container">
      <button onClick={() => navigate('/ordens')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Voltar para ordens
      </button>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Coluna principal */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card overflow-hidden p-0">
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">{formatOrderNumber(order.orderNumber)}</h1>
                    {order.isDelayed && <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold"><AlertTriangle className="h-3 w-3" /> Atrasada</span>}
                  </div>
                  <p className="mt-1 text-sm text-brand-100">Versão {order.version} · Criada em {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-sm text-brand-100">{order.totalPieces} peças · Prazo {formatDate(order.dueDate)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={order.status} />
                {situationLabel && <SituationBadge situation={situationLabel} />}
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div className="info-tile"><p className="info-tile-label">Costureira</p><p className="info-tile-value">{order.thirdParty.name}</p></div>
              <div className="info-tile"><p className="info-tile-label">Criada por</p><p className="info-tile-value">{order.createdByUser.name}</p></div>
              <div className="info-tile"><p className="info-tile-label">Precificação</p><p className="info-tile-value">{order.pricingModel === 'FIXED_PRICE' ? 'Preço Fechado' : 'Por Peça'}</p></div>
            </div>

            {order.notes && <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600"><strong>Obs:</strong> {order.notes}</div>}

            <div className="border-t border-slate-100 px-5 py-4 flex flex-wrap gap-2">
              {canSendLink && (
                <>
                  <button onClick={() => handleGenerateLink(false)} disabled={actionLoading} className="btn-primary text-xs"><Link2 className="h-3.5 w-3.5" /> Gerar links</button>
                  <button onClick={() => handleGenerateLink(true)} disabled={actionLoading} className="btn-secondary text-xs"><MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp</button>
                </>
              )}
              {canAccept && <button onClick={handleAccept} disabled={actionLoading} className="btn-primary text-xs"><CheckCircle className="h-3.5 w-3.5" /> Aceitar</button>}
              {canProduce && <button onClick={() => { setProductionItemId(order.items[0]?.id || ''); setProductionQty(1); setProductionModal(true); }} className="btn-secondary text-xs"><Factory className="h-3.5 w-3.5" /> Produção</button>}
              {canDeliver && <button onClick={openDeliveryModal} className="btn-secondary text-xs"><Truck className="h-3.5 w-3.5" /> Entrega</button>}
              {isAdmin && !['FINALIZADA', 'CANCELADA'].includes(order.status) && (
                <button onClick={handleCancel} disabled={actionLoading} className="btn-danger text-xs"><XCircle className="h-3.5 w-3.5" /> Cancelar</button>
              )}
            </div>

            {(linkUrls.signUrl || linkUrls.publicUrl) && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Links para a costureira</p>
                {linkUrls.signUrl && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <PenLine className="h-4 w-4 shrink-0 text-brand-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700">Assinar com login</p>
                      <p className="truncate text-xs text-slate-400">{linkUrls.signUrl}</p>
                    </div>
                    <button onClick={() => copyToClipboard(linkUrls.signUrl!)} className="btn-secondary text-xs px-2 py-1"><Copy className="h-3 w-3" /></button>
                  </div>
                )}
                {linkUrls.publicUrl && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700">Aceite direto (sem login)</p>
                      <p className="truncate text-xs text-slate-400">{linkUrls.publicUrl}</p>
                    </div>
                    <button onClick={() => copyToClipboard(linkUrls.publicUrl!)} className="btn-secondary text-xs px-2 py-1"><Copy className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3"><h3 className="font-semibold text-slate-900">Itens da OS</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-center">Solic.</th>
                    <th className="px-3 py-2 text-center">Prod.</th>
                    <th className="px-3 py-2 text-center">Entr.</th>
                    <th className="px-3 py-2 text-center">Aprov.</th>
                    <th className="px-3 py-2 text-center">Rej.</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium">{it.productName}</td>
                      <td className="px-3 py-2.5 text-center">{it.quantityRequested}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-indigo-600">{it.quantityProduced}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-purple-600">{it.quantityDelivered}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-green-600">{it.quantityApproved}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-red-600">{it.quantityRejected}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.deliveries.length > 0 && (
            <div className="card">
              <h3 className="mb-4 font-semibold">Remessas de Entrega</h3>
              {order.deliveries.map((d) => (
                <div key={d.id} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 last:mb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">Remessa #{d.deliveryNumber}</span>
                      <span className="ml-2 text-xs text-slate-500">{formatDateTime(d.deliveryDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status === 'CONFERIDO' ? 'FINALIZADA' : d.status === 'DIVERGENCIA' ? 'RECUSADA' : 'AGUARDANDO_ACEITE'} />
                      {isAdmin && d.status === 'AGUARDANDO_CONFERENCIA' && (
                        <button onClick={() => openConferenceModal(d.id)} className="btn-primary text-xs"><ClipboardCheck className="h-3.5 w-3.5" /> Conferir</button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {d.items.map((it) => (
                      <p key={it.id}>{it.serviceOrderItem?.productName}: {it.quantityDelivered} entregues{d.status !== 'AGUARDANDO_CONFERENCIA' && ` · ${it.quantityApproved} aprov. · ${it.quantityRejected} rej.`}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {order.statusHistory.length > 0 && (
            <div className="card">
              <h3 className="mb-4 font-semibold">Histórico</h3>
              <div className="space-y-3">
                {order.statusHistory.map((h) => (
                  <div key={h.id} className="flex gap-3 text-sm border-l-2 border-brand-200 pl-3">
                    <div>
                      <p className="font-medium">{OS_STATUS_LABELS[h.fromStatus] || h.fromStatus} → {OS_STATUS_LABELS[h.toStatus] || h.toStatus}</p>
                      <p className="text-xs text-slate-500">{h.changedBy} · {formatDateTime(h.createdAt)}</p>
                      {h.reason && <p className="text-xs text-slate-400">{h.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna lateral — pagamento */}
        <div className="space-y-4">
          {activePayment && (
            <PaymentPanel
              payment={activePayment}
              situationLabel={situationLabel}
              showActions={isAdmin}
              onMarkPaid={() => openPayModal(true)}
              onMarkPartial={() => openPayModal(false)}
            />
          )}

          <div className="card">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Resumo de progresso</h4>
            <div className="space-y-3">
              {[
                { label: 'Produção', pct: progressProduction, color: 'bg-indigo-500' },
                { label: 'Entrega', pct: progressDelivery, color: 'bg-purple-500' },
                { label: 'Pagamento', pct: progressPayment, color: 'bg-green-500' },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{bar.label}</span><span className="font-semibold">{bar.pct}%</span></div>
                  <div className="progress-bar"><div className={`progress-fill ${bar.color}`} style={{ width: `${bar.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title={payForm.amountToPay >= (activePayment?.remainingAmount || 0) ? 'Marcar como Pago' : 'Pagamento Parcial'}>
        {activePayment && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p>Restante: <strong className="text-amber-600">{formatCurrency(activePayment.remainingAmount)}</strong></p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valor</label>
              <input type="number" step="0.01" min="0.01" max={activePayment.remainingAmount} value={payForm.amountToPay} onChange={(e) => setPayForm({ ...payForm, amountToPay: parseFloat(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Forma</label>
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
          <button onClick={handlePay} disabled={actionLoading} className="btn-primary">{actionLoading ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      <Modal open={productionModal} onClose={() => setProductionModal(false)} title="Registrar Produção">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Item</label>
            <select value={productionItemId} onChange={(e) => setProductionItemId(e.target.value)} className="input-field">
              {order.items.map((it) => <option key={it.id} value={it.id}>{it.productName} (faltam {it.quantityRequested - it.quantityProduced})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Quantidade</label>
            <input type="number" min="1" value={productionQty} onChange={(e) => setProductionQty(parseInt(e.target.value) || 1)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Observações</label>
            <textarea value={productionNotes} onChange={(e) => setProductionNotes(e.target.value)} className="input-field" rows={2} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setProductionModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleProduction} disabled={actionLoading} className="btn-primary">{actionLoading ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </Modal>

      <Modal open={deliveryModal} onClose={() => setDeliveryModal(false)} title="Registrar Entrega" size="lg">
        <div className="space-y-4">
          {order.items.filter((it) => it.quantityRequested - it.quantityDelivered > 0).map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div><p className="font-medium text-sm">{it.productName}</p><p className="text-xs text-slate-500">Pendente: {it.quantityRequested - it.quantityDelivered}</p></div>
              <input type="number" min="0" max={it.quantityRequested - it.quantityDelivered} value={deliveryItems[it.id] || 0} onChange={(e) => setDeliveryItems({ ...deliveryItems, [it.id]: parseInt(e.target.value) || 0 })} className="input-field w-24" />
            </div>
          ))}
          <textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} className="input-field" rows={2} placeholder="Observações..." />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setDeliveryModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleDelivery} disabled={actionLoading} className="btn-primary">{actionLoading ? 'Salvando...' : 'Registrar Entrega'}</button>
        </div>
      </Modal>

      <Modal open={conferenceModal} onClose={() => setConferenceModal(false)} title="Conferência de Entrega" size="lg">
        <div className="space-y-4">
          {Object.entries(conferenceItems).map(([deliveryItemId, data]) => {
            const delivery = order.deliveries.find((d) => d.id === conferenceDeliveryId);
            const item = delivery?.items.find((i) => i.id === deliveryItemId);
            return (
              <div key={deliveryItemId} className="rounded-lg border border-slate-100 p-4">
                <p className="font-medium text-sm mb-2">{item?.serviceOrderItem?.productName} — Entregue: {item?.quantityDelivered}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs font-medium">Aprovadas</label><input type="number" min="0" value={data.approved} onChange={(e) => setConferenceItems({ ...conferenceItems, [deliveryItemId]: { ...data, approved: parseInt(e.target.value) || 0 } })} className="input-field" /></div>
                  <div><label className="mb-1 block text-xs font-medium">Rejeitadas</label><input type="number" min="0" value={data.rejected} onChange={(e) => setConferenceItems({ ...conferenceItems, [deliveryItemId]: { ...data, rejected: parseInt(e.target.value) || 0 } })} className="input-field" /></div>
                </div>
                {data.rejected > 0 && <div className="mt-2"><input value={data.reason} onChange={(e) => setConferenceItems({ ...conferenceItems, [deliveryItemId]: { ...data, reason: e.target.value } })} className="input-field" placeholder="Motivo da rejeição" /></div>}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setConferenceModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleConference} disabled={actionLoading} className="btn-primary">{actionLoading ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </Modal>
    </div>
  );
}
