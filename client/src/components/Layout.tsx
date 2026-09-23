import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  DollarSign,
  Shield,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { cn } from '../lib/utils';

const adminLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/costureiras', label: 'Costureiras', icon: Users },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/ordens', label: 'Ordens de Serviço', icon: ClipboardList },
  { to: '/pagamentos', label: 'Pagamentos', icon: DollarSign },
  { to: '/auditoria', label: 'Auditoria', icon: Shield },
  { to: '/usuarios', label: 'Usuários', icon: UserCog },
];

const seamstressLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ordens', label: 'Minhas Ordens', icon: ClipboardList },
  { to: '/pagamentos', label: 'Meus Pagamentos', icon: DollarSign },
];

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const links = isAdmin ? adminLinks : seamstressLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white via-brand-50/30 to-brand-100/20">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-brand-800 bg-brand-700 text-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 border-b border-brand-600/50 px-5 py-5">
          <Logo size="sm" className="shrink-0" />
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-brand-200" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-brand-600/50 p-4">
          <div className="mb-3 rounded-lg bg-brand-800/60 p-3">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-brand-200">{user?.company.tradeName || user?.company.name}</p>
            <span className="mt-1 inline-block rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-100">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Costureira'}
            </span>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur-md lg:px-8">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-brand-600" />
          </button>
          <div className="hidden sm:block">
            <Logo size="sm" />
          </div>
          <div className="flex-1" />
          <p className="hidden text-sm text-slate-500 sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
