import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, AlertTriangle, Package, Truck, Wallet } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { SituationBadge } from '../components/SituationBadge';
import { formatCurrency, formatDate } from '../lib/utils';
import type { ServiceOrderListItem, ThirdParty } from '../types';

const SITUATION_FILTERS = [
  { value: 'TODOS', label: 'Todas situações' },
  { value: 'PENDENTE', label: 'Pendente pagamento', param: 'paymentStatus' },
  { value: 'PARCIAL', label: 'Pago parcial', param: 'paymentStatus' },
  { value: 'PAGO', label: 'Pago', param: 'paymentStatus' },
  { value: 'ENTREGUE_PARCIAL_PAGO_PARCIAL', label: 'Entregue parcial · pago parcial', param: 'situation' },
  { value: 'ENTREGUE_PARCIAL_PENDENTE', label: 'Entregue parcial · pendente', param: 'situation' },
  { value: 'ENTREGUE_E_PAGO', label: 'Entregue e pago', param: 'situation' },
  { value: 'ENTREGUE_PENDENTE', label: 'Entregue · pendente', param: 'situation' },
];

export function ServiceOrdersPage() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [situationFilter, setSituationFilter] = useState('TODOS');
  const [thirdPartyFilter, setThirdPartyFilter] = useState('TODAS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) api.get('/third-parties').then((res) => setThirdParties(res.data));
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    const filter = SITUATION_FILTERS.find((f) => f.value === situationFilter);
    const params: Record<string, string> = { search, status: statusFilter, thirdPartyId: thirdPartyFilter };
    if (filter && filter.value !== 'TODOS') {
      if (filter.param === 'paymentStatus') params.paymentStatus = filter.value;
      if (filter.param === 'situation') params.situation = filter.value;
    }
    api.get('/service-orders', { params }).then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, [search, statusFilter, situationFilter, thirdPartyFilter]);

  const stats = {
    total: orders.length,
    pendentes: orders.filter((o) => o.payment?.status === 'PENDENTE').length,
    parciais: orders.filter((o) => o.payment?.status === 'PARCIAL').length,
    entregueParcialPagoParcial: orders.filter((o) => o.situationLabel === 'ENTREGUE_PARCIAL_PAGO_PARCIAL').length,
    pagas: orders.filter((o) => o.payment?.status === 'PAGO').length,
    entreguePago: orders.filter((o) => o.situationLabel === 'ENTREGUE_E_PAGO').length,
  };

  return (
    <div className="page-container">
      <PageHeader
        title={isAdmin ? 'Ordens de Serviço' : 'Minhas Ordens'}
        subtitle="Acompanhe produção, entregas e pagamentos em um só lugar"
        action={isAdmin ? <Link to="/ordens/nova" className="btn-primary"><Plus className="h-4 w-4" /> Nova OS</Link> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="stat-pill"><span className="stat-pill-label">Total</span><span className="stat-pill-value">{stats.total}</span></div>
        <div className="stat-pill stat-pill-amber"><span className="stat-pill-label">Pendente</span><span className="stat-pill-value">{stats.pendentes}</span></div>
        <div className="stat-pill stat-pill-blue"><span className="stat-pill-label">Pago parcial</span><span className="stat-pill-value">{stats.parciais}</span></div>
        <div className="stat-pill border-l-4 border-l-indigo-400"><span className="stat-pill-label">Entreg. parcial</span><span className="stat-pill-value">{stats.entregueParcialPagoParcial}</span></div>
        <div className="stat-pill stat-pill-green"><span className="stat-pill-label">Pago</span><span className="stat-pill-value">{stats.pagas}</span></div>
        <div className="stat-pill stat-pill-emerald"><span className="stat-pill-label">Entregue e pago</span><span className="stat-pill-value">{stats.entreguePago}</span></div>
      </div>

      <div className="filter-bar">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número, costureira..." className="input-field pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-full sm:w-44">
          <option value="TODOS">Status da OS</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="AGUARDANDO_ACEITE">Aguardando Aceite</option>
          <option value="ACEITA">Aceita</option>
          <option value="EM_PRODUCAO">Em Produção</option>
          <option value="PARCIALMENTE_ENTREGUE">Parcialmente Entregue</option>
          <option value="CONFERENCIA">Conferência</option>
          <option value="FINALIZADA">Finalizada</option>
          <option value="CANCELADA">Cancelada</option>
          <option value="ATRASADA">Atrasadas</option>
        </select>
        <select value={situationFilter} onChange={(e) => setSituationFilter(e.target.value)} className="input-field w-full sm:w-48">
          {SITUATION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        {isAdmin && (
          <select value={thirdPartyFilter} onChange={(e) => setThirdPartyFilter(e.target.value)} className="input-field w-full sm:w-44">
            <option value="TODAS">Todas costureiras</option>
            {thirdParties.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : orders.length === 0 ? (
        <div className="card py-16 text-center text-slate-400">Nenhuma ordem de serviço encontrada</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((os) => (
            <Link key={os.id} to={`/ordens/${os.id}`} className="os-card group">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-slate-900 group-hover:text-brand-700 transition">{os.formattedNumber}</span>
                    <StatusBadge status={os.status} />
                    {os.situationLabel && <SituationBadge situation={os.situationLabel} />}
                    {os.isDelayed && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                        <AlertTriangle className="h-3 w-3" /> Atrasada
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{os.thirdParty.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(os.totalAmount)}</p>
                  <p className="text-xs text-slate-400">Prazo {formatDate(os.dueDate)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="metric-chip">
                  <Package className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{os.metrics.progressProduction}% prod.</span>
                </div>
                <div className="metric-chip">
                  <Truck className="h-3.5 w-3.5 text-purple-500" />
                  <span>{os.metrics.progressDelivery}% entrega</span>
                </div>
                <div className="metric-chip">
                  <Wallet className="h-3.5 w-3.5 text-green-500" />
                  <span>{os.payment ? (os.payment.status === 'PAGO' ? 'Pago' : formatCurrency(os.payment.remainingAmount)) : '—'}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="progress-row">
                  <span className="text-[10px] text-slate-400 w-14">Produção</span>
                  <div className="progress-bar"><div className="progress-fill bg-indigo-500" style={{ width: `${os.metrics.progressProduction}%` }} /></div>
                </div>
                <div className="progress-row">
                  <span className="text-[10px] text-slate-400 w-14">Entrega</span>
                  <div className="progress-bar"><div className="progress-fill bg-purple-500" style={{ width: `${os.metrics.progressDelivery}%` }} /></div>
                </div>
                {os.payment && (
                  <div className="progress-row">
                    <span className="text-[10px] text-slate-400 w-14">Pagamento</span>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${os.payment.status === 'PAGO' ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${os.payment.calculatedAmount > 0 ? Math.round((os.payment.paidAmount / os.payment.calculatedAmount) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
