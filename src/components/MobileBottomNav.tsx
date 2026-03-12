import React from 'react';
import { Home, LayoutDashboard, List, UserCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useAuth();

  if (!isSignedIn) return null;

  const items = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Mercados', path: '/dashboard', icon: List },
    { label: 'Dashboard', path: '/user-dashboard', icon: LayoutDashboard },
    { label: 'Perfil', path: '/user-dashboard', icon: UserCircle2 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[rgba(13,11,26,0.94)] px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <button
              key={`${item.label}-${item.path}`}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 rounded-[8px] px-2 py-2 text-[11px] font-medium ${
                active ? 'text-[var(--text-primary)] bg-[rgba(124,58,237,0.22)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
