import { useEffect, useState } from 'react';
import { Plus, Search, Phone, MapPin } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import { PIX_TYPES } from '../lib/constants';
import type { ThirdParty } from '../types';

const emptyForm = {
  name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '',
  city: '', state: '', address: '', pixKey: '', pixType: 'CPF',
  bankInfo: '', notes: '', createLogin: false, loginPassword: '',
};

export function ThirdPartiesPage() {
  const [list, setList] = useState<ThirdParty[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ThirdParty | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/third-parties', { params: { search, status: statusFilter } })
      .then((res) => setList(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (tp: ThirdParty) => {
    setEditing(tp);
    setForm({
      name: tp.name, cpfCnpj: tp.cpfCnpj || '', phone: tp.phone || '',
      whatsapp: tp.whatsapp, email: tp.email || '', city: tp.city || '',
      state: tp.state || '', address: tp.address || '', pixKey: tp.pixKey || '',
      pixType: tp.pixType || 'CPF', bankInfo: tp.bankInfo || '', notes: tp.notes || '',
      createLogin: false, loginPassword: '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/third-parties/${editing.id}`, form);
      } else {
        await api.post('/third-parties', form);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tp: ThirdParty) => {
    const newStatus = tp.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    await api.put(`/third-parties/${tp.id}`, { ...tp, status: newStatus });
    load();
  };

  return (
    <div>
      <PageHeader
        title="Costureiras"
        subtitle="Gerencie terceiros e facções"
        action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Nova Costureira</button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, WhatsApp, cidade..." className="input-field pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field sm:w-40">
          <option value="TODOS">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : list.length === 0 ? (
        <div className="card py-12 text-center text-slate-400">Nenhuma costureira encontrada</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((tp) => (
            <div key={tp.id} className="card hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{tp.name}</h3>
                  {tp.city && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />{tp.city}{tp.state ? `, ${tp.state}` : ''}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tp.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {tp.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5" />{tp.whatsapp}
              </div>

              {tp.metrics && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-500">Em produção</p>
                    <p className="font-bold text-slate-900">{tp.metrics.inProductionOrders}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-500">Atrasadas</p>
                    <p className="font-bold text-red-600">{tp.metrics.delayedOrders}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-500">Peças produzidas</p>
                    <p className="font-bold text-slate-900">{tp.metrics.totalPiecesProduced}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-500">A pagar</p>
                    <p className="font-bold text-amber-600">{formatCurrency(tp.metrics.totalToPay)}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(tp)} className="btn-secondary flex-1 text-xs">Editar</button>
                <button onClick={() => toggleStatus(tp)} className="btn-secondary flex-1 text-xs">
                  {tp.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Costureira' : 'Nova Costureira'} size="lg">
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">WhatsApp *</label>
            <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CPF/CNPJ</label>
            <input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cidade</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estado</label>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field" maxLength={2} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Chave PIX</label>
            <input value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo PIX</label>
            <select value={form.pixType} onChange={(e) => setForm({ ...form, pixType: e.target.value })} className="input-field">
              {PIX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Endereço</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
          </div>
          {!editing && (
            <>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="createLogin" checked={form.createLogin} onChange={(e) => setForm({ ...form, createLogin: e.target.checked })} />
                <label htmlFor="createLogin" className="text-sm">Criar login de acesso para a costureira</label>
              </div>
              {form.createLogin && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Senha de acesso</label>
                  <input type="password" value={form.loginPassword} onChange={(e) => setForm({ ...form, loginPassword: e.target.value })} className="input-field" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.whatsapp} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
