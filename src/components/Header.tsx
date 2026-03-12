import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AuthButton } from './AuthButton';
import { ConnectWalletButton } from './ConnectWalletButton';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../contexts/AuthContext';
import { useAdminAccess } from '../hooks/useAdminAccess';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { isAdmin } = useAdminAccess();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { path: '/', label: 'Início' },
    { path: '/dashboard', label: 'Mercados' },
    { path: '/user-dashboard', label: 'Meu Dashboard', requiresAuth: true },
    { path: '/admin', label: 'Admin', requiresAuth: true, adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.requiresAuth && !isSignedIn) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const isAdminArea = isAdmin && location.pathname.startsWith('/admin');

  return (
    <header
      className={`relative sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-[20px] ${
        isAdminArea ? 'bg-[rgba(13,11,26,0.9)]' : 'bg-[rgba(13,11,26,0.85)]'
      }`}
    >
      {isAdminArea && (
        <>
          <div className="h-[3px] w-full bg-[linear-gradient(90deg,#D97706,#F59E0B,#D97706)]" />
          <div className="absolute inset-0 bg-[rgba(217,119,6,0.05)] pointer-events-none" />
        </>
      )}
      <div className="section-shell py-3">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(124,58,237,0.45)] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-[var(--shadow-brand)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </span>
            <div className="text-left">
              <div className="font-[var(--font-display)] text-lg font-semibold leading-none text-[var(--text-primary)]">
                VoxPredict
              </div>
              <div className="text-xs text-[var(--text-secondary)]">Mercados preditivos LATAM</div>
            </div>
            {isAdminArea && (
              <span className="vp-badge-pulse animate-pulse rounded-[999px] border border-[#fbbf24] bg-[#f59e0b] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1f2937]">
                Admin
              </span>
            )}
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {visibleItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`rounded-[8px] px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-[rgba(124,58,237,0.28)] text-[var(--text-primary)] shadow-[0_0_18px_rgba(124,58,237,0.25)]'
                      : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <AuthButton />
            {isSignedIn && <NotificationCenter />}
            {isSignedIn && <ConnectWalletButton />}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-2 text-[var(--text-primary)]"
              aria-label="Abrir menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-[rgba(0,0,0,0.45)] backdrop-blur-sm transition-opacity lg:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <aside
          className={`absolute right-0 top-0 h-full w-[82%] max-w-[340px] border-l border-[var(--border)] bg-[var(--brand-800)] p-5 transition-transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-secondary)]">Navegação</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-[8px] border border-[var(--border)] p-1.5 text-[var(--text-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-2">
            {visibleItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full rounded-[8px] px-3 py-3 text-left text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[rgba(124,58,237,0.24)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
            <AuthButton />
            {isSignedIn && (
              <div className="flex items-center justify-between gap-2">
                <NotificationCenter />
                <ConnectWalletButton />
              </div>
            )}
          </div>
        </aside>
      </div>
    </header>
  );
};
