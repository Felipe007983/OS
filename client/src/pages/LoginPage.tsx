import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh]">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-12 text-white lg:flex">
        <Logo size="lg" />

        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Controle completo das suas<br />ordens de serviço
          </h2>
          <p className="mt-4 max-w-md text-brand-100">
            Gerencie costureiras, acompanhe produção, registre entregas e controle pagamentos em um só lugar.
          </p>
        </div>
        <p className="text-sm text-brand-200">© 2026 Allianç@ SAFETY — Sistema de Gestão</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-4 pb-safe sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-brand-700">Bem-vindo de volta</h2>
          <p className="mt-1 text-sm text-slate-500">Entre com suas credenciais para acessar o sistema</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-brand-100 bg-brand-50 p-4">
            <p className="text-xs font-semibold uppercase text-brand-600">Acesso de demonstração</p>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p><strong>Admin:</strong> admin@oficio.com / admin123</p>
              <p><strong>Costureira:</strong> maria@costura.com / costura123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
