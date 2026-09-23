import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PenLine, CheckCircle, AlertTriangle, LogIn } from 'lucide-react';
import { Logo } from '../components/Logo';
import axios from 'axios';
import { API_BASE_URL } from '../lib/apiBase';
import { formatCurrency, formatDate } from '../lib/utils';
import type { PublicAcceptanceData } from '../types';

export function SignOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicAcceptanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/acceptance/public/${token}`)
      .then((res) => {
        setData(res.data);
        if (res.data.alreadyAccepted) setSigned(true);
      })
      .catch((err) => setError(err.response?.data?.error || 'Link inválido ou expirado'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigning(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/acceptance/public/${token}/sign-with-login`, { email, password });
      setSuccess('Ordem de serviço assinada com sucesso!');
      setSigned(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao assinar');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-lg font-bold">Link Inválido</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { order } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900">
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size="lg" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">Assinatura Digital</h1>
            <p className="text-xs text-brand-200">{order.companyName}</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</div>}

        <div className="card">
          <div className="text-center border-b border-slate-100 pb-4">
            <p className="text-sm text-slate-500">Ordem de Serviço</p>
            <h2 className="text-2xl font-bold text-slate-900">{order.formattedNumber}</h2>
            <p className="text-sm text-slate-500 mt-1">Destinada a: <strong>{order.seamstressName}</strong></p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Peças</p>
              <p className="text-xl font-bold">{order.totalPieces}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Valor</p>
              <p className="text-xl font-bold text-brand-600">{formatCurrency(order.totalAmount)}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Prazo de entrega</p>
              <p className="font-semibold">{formatDate(order.dueDate)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between rounded-lg border border-slate-100 p-3 text-sm">
                <span className="font-medium">{item.productName}</span>
                <span>{item.quantity} un · {formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>

          {signed ? (
            <div className="mt-6 rounded-xl bg-green-50 p-5 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
              <p className="mt-2 font-semibold text-green-800">OS Assinada com Sucesso</p>
              <p className="text-sm text-green-600">Sua assinatura foi registrada com evidência digital.</p>
            </div>
          ) : (
            <form onSubmit={handleSign} className="mt-6 space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <LogIn className="h-4 w-4" /> Entre com seu usuário e senha para assinar
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required placeholder="seu@email.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required placeholder="••••••••" />
              </div>
              <button type="submit" disabled={signing} className="btn-primary w-full py-3">
                <PenLine className="h-5 w-5" />
                {signing ? 'Assinando...' : 'Assinar Ordem de Serviço'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Ao assinar, você confirma que leu e concorda com os termos da ordem de serviço.
          IP e dados do dispositivo serão registrados como evidência jurídica.
        </p>
      </div>
    </div>
  );
}
