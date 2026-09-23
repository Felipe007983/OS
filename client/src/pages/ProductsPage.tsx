import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import type { Product } from '../types';

const emptyForm = { name: '', sku: '', category: '', description: '', defaultUnitPrice: 0, active: true };

export function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/products').then((res) => setList(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku || '', category: p.category || '',
      description: p.description || '', defaultUnitPrice: p.defaultUnitPrice, active: p.active,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
      } else {
        await api.post('/products', form);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo de peças e serviços"
        action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Novo Produto</button>}
      />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {list.map((p) => (
            <div key={p.id} className="mobile-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">{p.category || 'Sem categoria'}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {p.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-bold text-brand-700">{formatCurrency(p.defaultUnitPrice)}</p>
                <button onClick={() => openEdit(p)} className="btn-secondary text-xs px-3 py-1.5">Editar</button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="py-12 text-center text-slate-400">Nenhum produto cadastrado</p>}
        </div>

        <div className="card hidden overflow-hidden p-0 md:block">
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Categoria</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Preço Unit.</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.defaultUnitPrice)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-sm font-medium text-brand-600 hover:text-brand-700">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="py-12 text-center text-slate-400">Nenhum produto cadastrado</p>}
          </div>
        </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Produto' : 'Novo Produto'}>
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Preço Unitário (R$) *</label>
            <input type="number" step="0.01" min="0" value={form.defaultUnitPrice} onChange={(e) => setForm({ ...form, defaultUnitPrice: parseFloat(e.target.value) || 0 })} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} id="active" />
            <label htmlFor="active" className="text-sm">Produto ativo</label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>
    </div>
  );
}
