import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, DollarSign, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

const items = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/ordens', label: 'Ordens', icon: ClipboardList, end: false },
  { to: '/pagamentos', label: 'Pagamentos', icon: DollarSign, end: false },
];

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur-md pb-safe lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-semibold transition',
                isActive ? 'text-brand-600' : 'text-slate-400'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-semibold text-slate-400 transition active:text-brand-600"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </div>
    </nav>
  );
}
