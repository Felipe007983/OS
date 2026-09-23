import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { formatCurrency } from '../lib/utils';
import type { Product, ThirdParty } from '../types';

interface OrderItem {
  productId: string;
  productName: string;
  description: string;
  quantityRequested: number;
  unitPrice: number;
}

export function ServiceOrderFormPage() {
  const navigate = useNavigate();
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [thirdPartyId, setThirdPartyId] = useState('');
  const [pricingModel, setPricingModel] = useState<'UNIT_PRICE' | 'FIXED_PRICE'>('UNIT_PRICE');
  const [fixedPriceAmount, setFixedPriceAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { productId: '', productName: '', description: '', quantityRequested: 1, unitPrice: 0 },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/third-parties').then((res) => setThirdParties(res.data.filter((tp: ThirdParty) => tp.status === 'ATIVO')));
    api.get('/products').then((res) => setProducts(res.data.filter((p: Product) => p.active)));
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', description: '', quantityRequested: 1, unitPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === 'productId' && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[idx].productName = product.name;
        updated[idx].unitPrice = product.defaultUnitPrice;
      }
    }

    setItems(updated);
  };

  const totalPieces = items.reduce((s, it) => s + it.quantityRequested, 0);
  const computedAmount = items.reduce((s, it) => s + it.quantityRequested * it.unitPrice, 0);
  const totalAmount = pricingModel === 'FIXED_PRICE' ? fixedPriceAmount : computedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/service-orders', {
        thirdPartyId,
        pricingModel,
        fixedPriceAmount: pricingModel === 'FIXED_PRICE' ? fixedPriceAmount : null,
        dueDate: new Date(dueDate).toISOString(),
        notes,
        items: items.map((it) => ({
          productId: it.productId || null,
          productName: it.productName,
          description: it.description || null,
          quantityRequested: it.quantityRequested,
          unitPrice: it.unitPrice,
        })),
      });
      navigate(`/ordens/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar OS');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate('/ordens')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <PageHeader title="Nova Ordem de Serviço" subtitle="Preencha os dados da nova OS" />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h3 className="mb-4 font-semibold text-slate-900">Dados Gerais</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Costureira *</label>
              <select value={thirdPartyId} onChange={(e) => setThirdPartyId(e.target.value)} className="input-field" required>
                <option value="">Selecione...</option>
                {thirdParties.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Prazo de Entrega *</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Modelo de Precificação</label>
              <select value={pricingModel} onChange={(e) => setPricingModel(e.target.value as any)} className="input-field">
                <option value="UNIT_PRICE">Preço por Peça</option>
                <option value="FIXED_PRICE">Preço Fechado</option>
              </select>
            </div>
            {pricingModel === 'FIXED_PRICE' && (
              <div>
                <label className="mb-1 block text-sm font-medium">Valor Fechado (R$)</label>
                <input type="number" step="0.01" min="0" value={fixedPriceAmount} onChange={(e) => setFixedPriceAmount(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Itens da OS</h3>
            <button type="button" onClick={addItem} className="btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> Adicionar Item</button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Produto</label>
                    <select value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} className="input-field">
                      <option value="">Manual</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Nome *</label>
                    <input value={item.productName} onChange={(e) => updateItem(idx, 'productName', e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Qtd *</label>
                    <input type="number" min="1" value={item.quantityRequested} onChange={(e) => updateItem(idx, 'quantityRequested', parseInt(e.target.value) || 1)} className="input-field" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Preço Unit.</label>
                    <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="input-field" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Subtotal: {formatCurrency(item.quantityRequested * item.unitPrice)}</p>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Total de peças: <strong className="text-slate-900">{totalPieces}</strong></p>
            <p className="text-lg font-bold text-slate-900">Valor total: {formatCurrency(totalAmount)}</p>
          </div>
          <button type="submit" disabled={saving || !thirdPartyId || items.some((it) => !it.productName)} className="btn-primary">
            {saving ? 'Criando...' : 'Criar Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
}
