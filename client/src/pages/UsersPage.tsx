import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, User } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { formatDateTime } from '../lib/utils';
import type { ThirdParty } from '../types';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COSTUREIRA';
  phone?: string | null;
  whatsapp?: string | null;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  thirdParty?: { id: string; name: string } | null;
}

const emptyForm = {
  name: '', email: '', password: '', role: 'COSTUREIRA' as 'ADMIN' | 'COSTUREIRA',
  phone: '', whatsapp: '', thirdPartyId: '', status: 'ATIVO',
};

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/users'),
      api.get('/third-parties'),
    ]).then(([usersRes, tpRes]) => {
      setUsers(usersRes.data);
      setThirdParties(tpRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, password: '', role: u.role,
      phone: u.phone || '', whatsapp: u.whatsapp || '',
      thirdPartyId: u.thirdParty?.id || '', status: u.status,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        status: form.status,
        thirdPartyId: form.role === 'COSTUREIRA' && form.thirdPartyId ? form.thirdPartyId : null,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
      } else {
        if (!form.password) { setError('Senha é obrigatória para novo usuário'); setSaving(false); return; }
        await api.post('/users', payload);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: AppUser) => {
    if (!confirm(`Excluir o usuário ${u.name}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Usuários"
        subtitle="Crie, edite e gerencie perfis de acesso ao sistema"
        action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Novo Usuário</button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {users.map((u) => (
            <div key={u.id} className="mobile-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                  <p className="text-sm text-slate-500 truncate">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {u.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}>
                  {u.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {u.role === 'ADMIN' ? 'Admin' : 'Costureira'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(u)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="py-12 text-center text-slate-400">Nenhum usuário cadastrado</p>}
        </div>

        <div className="card hidden overflow-hidden p-0 md:block">
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">E-mail</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Perfil</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Vínculo</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Último acesso</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}>
                      {u.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {u.role === 'ADMIN' ? 'Administrador' : 'Costureira'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.thirdParty?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Nunca'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="py-16 text-center text-slate-400">Nenhum usuário cadastrado</p>}
          </div>
        </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuário' : 'Novo Usuário'} size="lg">
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{editing ? 'Nova senha (opcional)' : 'Senha *'}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder={editing ? 'Deixe em branco para manter' : ''} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Perfil *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'COSTUREIRA' })} className="input-field">
              <option value="ADMIN">Administrador</option>
              <option value="COSTUREIRA">Costureira</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
          {form.role === 'COSTUREIRA' && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Vincular à costureira</label>
              <select value={form.thirdPartyId} onChange={(e) => setForm({ ...form, thirdPartyId: e.target.value })} className="input-field">
                <option value="">Nenhum vínculo</option>
                {thirdParties.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">WhatsApp</label>
            <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
