import { useEffect, useState } from 'react';
import {
  Users, ClipboardList, Clock, AlertTriangle, Factory, CheckCircle,
  DollarSign, Package, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { formatCurrency } from '../lib/utils';
import { OS_STATUS_LABELS } from '../lib/constants';
import type { AdminDashboard, SeamstressDashboard } from '../types';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export function DashboardPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AdminDashboard | SeamstressDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  if (data.role === 'COSTUREIRA') {
    const { cards } = data;
    return (
      <div>
        <PageHeader title="Meu Painel" subtitle="Acompanhe suas ordens de serviço e produção" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <KpiCard title="Aguardando Aceite" value={cards.awaitingAcceptance} icon={Clock} color="amber" />
          <KpiCard title="Em Produção" value={cards.inProduction} icon={Factory} color="indigo" />
          <KpiCard title="Atrasadas" value={cards.delayed} icon={AlertTriangle} color="red" />
          <KpiCard title="Finalizadas" value={cards.completed} icon={CheckCircle} color="green" />
          <KpiCard title="Peças Contratadas" value={cards.totalPieces} icon={Package} color="blue" />
          <KpiCard title="Peças Produzidas" value={cards.totalProduced} icon={TrendingUp} color="purple" />
          <KpiCard title="Peças Entregues" value={cards.totalDelivered} icon={ClipboardList} color="indigo" />
          <KpiCard title="A Receber" value={formatCurrency(cards.totalToReceive)} icon={DollarSign} color="amber" />
        </div>
      </div>
    );
  }

  const { kpis, charts } = data;
  const statusChart = charts.ordersByStatus.map((s) => ({
    name: OS_STATUS_LABELS[s.status] || s.status,
    value: s.count,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da operação" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard title="Costureiras Ativas" value={kpis.activeSeamstresses} icon={Users} color="green" />
        <KpiCard title="OS Abertas" value={kpis.openOrders} icon={ClipboardList} color="blue" />
        <KpiCard title="Aguardando Aceite" value={kpis.awaitingAcceptance} icon={Clock} color="amber" />
        <KpiCard title="Em Produção" value={kpis.inProductionOrders} icon={Factory} color="indigo" />
        <KpiCard title="Atrasadas" value={kpis.delayedOrders} icon={AlertTriangle} color="red" />
        <KpiCard title="Finalizadas" value={kpis.finishedOrders} icon={CheckCircle} color="green" />
        <KpiCard title="Peças em Produção" value={kpis.piecesInProduction} icon={Package} color="purple" />
        <KpiCard title="Pendente Pagamento" value={formatCurrency(kpis.totalPending)} icon={DollarSign} color="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Produção por Costureira</h3>
          {charts.seamstressProduction.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
              <BarChart data={charts.seamstressProduction} margin={{ left: -10, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pieces" fill="#22c55e" radius={[4, 4, 0, 0]} name="Peças" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">Nenhum dado de produção</p>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">OS por Status</h3>
          {statusChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {statusChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">Nenhuma ordem cadastrada</p>
          )}
        </div>
      </div>
    </div>
  );
}
