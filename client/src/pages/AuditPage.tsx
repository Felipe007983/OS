import { useEffect, useState } from 'react';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../lib/utils';
import type { AuditLog } from '../types';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('TODAS');
  const [entityFilter, setEntityFilter] = useState('TODAS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/audit', { params: { action: actionFilter, entity: entityFilter } })
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, [actionFilter, entityFilter]);

  const actionLabels: Record<string, string> = {
    CREATE: 'Criação', UPDATE: 'Atualização', DELETE: 'Exclusão',
    LOGIN: 'Login', ACCEPT_OS: 'Aceite OS', REJECT_OS: 'Recusa OS',
    STATUS_CHANGE: 'Mudança Status', PAYMENT: 'Pagamento',
    RECORD_PRODUCTION: 'Produção', DELIVERY_CREATED: 'Entrega',
    CONFERENCE_DELIVERY: 'Conferência', CHANGE_PASSWORD: 'Senha',
  };

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Registros de ações e rastreabilidade do sistema" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input-field sm:w-48">
          <option value="TODAS">Todas ações</option>
          {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input-field sm:w-48">
          <option value="TODAS">Todas entidades</option>
          <option value="ServiceOrder">Ordem de Serviço</option>
          <option value="ThirdParty">Costureira</option>
          <option value="Payment">Pagamento</option>
          <option value="User">Usuário</option>
          <option value="Delivery">Entrega</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {actionLabels[log.action] || log.action}
                  </span>
                  <span className="text-xs text-slate-500">{log.entity}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {log.user ? `${log.user.name} (${log.user.role})` : 'Sistema'}
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>{formatDateTime(log.createdAt)}</p>
                {log.ipAddress && <p>IP: {log.ipAddress}</p>}
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="card py-12 text-center text-slate-400">Nenhum registro encontrado</div>}
        </div>
      )}
    </div>
  );
}
