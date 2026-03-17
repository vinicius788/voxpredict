import React from 'react';
import { Home, LayoutDashboard, List } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { isSignedIn } = useAuth();

  if (!isSignedIn) return null;

  const items = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Mercados', path: '/dashboard', icon: List },
    { label: 'Dashboard', path: '/user-dashboard', icon: LayoutDashboard },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[rgba(13,11,26,0.94)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={`${item.label}-${item.path}`}
              to={item.path}
              className={`relative flex flex-col items-center gap-1 rounded-[8px] px-2 py-2 text-[11px] font-medium transition-colors ${
                active ? 'text-[var(--text-primary)] bg-[rgba(124,58,237,0.22)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {active && <span className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--accent-glow)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
