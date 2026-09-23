import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Logo } from '../components/Logo';
import axios from 'axios';
import { API_BASE_URL } from '../lib/apiBase';
import { formatCurrency, formatDate } from '../lib/utils';
import type { PublicAcceptanceData } from '../types';

export function AcceptancePublicPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicAcceptanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/acceptance/public/${token}`)
      .then((res) => {
        setData(res.data);
        if (res.data.alreadyAccepted) setAccepted(true);
      })
      .catch((err) => setError(err.response?.data?.error || 'Link inválido ou expirado'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/acceptance/public/${token}/accept`);
      setSuccess('Ordem de serviço aceita com sucesso!');
      setAccepted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao aceitar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 3) { setError('Informe o motivo da recusa'); return; }
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/acceptance/public/${token}/reject`, { reason: rejectReason });
      setSuccess('Recusa registrada com sucesso.');
      setRejecting(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao recusar');
    } finally {
      setActionLoading(false);
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
          <h2 className="mt-4 text-lg font-bold text-slate-900">Link Inválido</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { order } = data;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-50 to-white pb-safe">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size="lg" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-brand-700">Aceite Digital</h1>
            <p className="text-xs text-slate-500">Ordem de Serviço</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="card">
          <div className="text-center">
            <p className="text-sm text-slate-500">{order.companyName}</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{order.formattedNumber}</h2>
            <p className="mt-1 text-sm text-slate-500">Para: {order.seamstressName}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Peças</p>
              <p className="text-xl font-bold">{order.totalPieces}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Valor Total</p>
              <p className="text-xl font-bold text-brand-600">{formatCurrency(order.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Prazo</p>
              <p className="text-sm font-bold">{formatDate(order.dueDate)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Versão</p>
              <p className="text-sm font-bold">v{order.version}</p>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Observações:</strong> {order.notes}
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Itens da Ordem</h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                  </div>
                  <div className="text-right">
                    <p>{item.quantity} un × {formatCurrency(item.unitPrice)}</p>
                    <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!accepted && !success && (
            <div className="mt-6 space-y-3">
              {!rejecting ? (
                <>
                  <button onClick={handleAccept} disabled={actionLoading} className="btn-primary w-full py-3">
                    <CheckCircle className="h-5 w-5" />
                    {actionLoading ? 'Processando...' : 'Aceitar Ordem de Serviço'}
                  </button>
                  <button onClick={() => setRejecting(true)} className="btn-secondary w-full py-3">
                    <XCircle className="h-5 w-5" /> Recusar
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Informe o motivo da recusa..."
                    className="input-field"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setRejecting(false)} className="btn-secondary flex-1">Voltar</button>
                    <button onClick={handleReject} disabled={actionLoading} className="btn-danger flex-1">
                      {actionLoading ? 'Enviando...' : 'Confirmar Recusa'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {accepted && (
            <div className="mt-6 rounded-lg bg-green-50 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-green-600" />
              <p className="mt-2 font-semibold text-green-800">Ordem de Serviço Aceita</p>
              <p className="text-sm text-green-600">Seu aceite foi registrado com sucesso.</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Ao aceitar, você confirma que analisou os detalhes e concorda com os termos da ordem de serviço.
          Seu IP e dados do dispositivo serão registrados como evidência.
        </p>
      </div>
    </div>
  );
}
