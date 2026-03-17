import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    { path: '/leaderboard', label: 'Ranking' },
    { path: '/user-dashboard', label: 'Meu Dashboard', requiresAuth: true },
    { path: '/admin', label: 'Admin', requiresAuth: true, adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.requiresAuth && !isSignedIn) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminArea = isAdmin && isAdminRoute;
  const canShowWalletButton = isSignedIn && !isAdminRoute;
  const logoIconSrc = '/branding/voxpredict-icon.png';

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
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center transition-opacity hover:opacity-90 md:hidden" aria-label="VoxPredict">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(124,58,237,0.45)] bg-[rgba(255,255,255,0.03)] shadow-[var(--shadow-brand)]">
                <img
                  src={logoIconSrc}
                  alt="VoxPredict ícone"
                  className="h-8 w-8 object-contain"
                  loading="eager"
                  decoding="async"
                />
              </span>
            </Link>

            <Link to="/" className="hidden items-center gap-2.5 transition-opacity hover:opacity-90 md:flex" aria-label="VoxPredict">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(124,58,237,0.45)] bg-[rgba(255,255,255,0.03)] shadow-[var(--shadow-brand)]">
                <img
                  src={logoIconSrc}
                  alt="VoxPredict ícone"
                  className="h-8 w-8 object-contain"
                  loading="eager"
                  decoding="async"
                />
              </span>
              <span className="text-lg font-bold text-[var(--text-primary)]">VoxPredict</span>
            </Link>

            {isAdminArea && (
              <span className="vp-badge-pulse hidden animate-pulse rounded-[999px] border border-[#fbbf24] bg-[#f59e0b] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1f2937] md:inline-flex">
                Admin
              </span>
            )}
          </div>

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
            {canShowWalletButton && <ConnectWalletButton />}
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

      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside
            className="fixed bottom-0 right-0 top-0 z-50 flex w-72 max-w-[86vw] animate-slide-in-right flex-col border-l border-white/10 bg-[#0f0f1a] lg:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 p-4">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 transition-opacity hover:opacity-90"
                aria-label="VoxPredict"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[8px] border border-[rgba(124,58,237,0.45)] bg-[rgba(255,255,255,0.03)] shadow-[var(--shadow-brand)]">
                  <img
                    src={logoIconSrc}
                    alt="VoxPredict ícone"
                    className="h-6 w-6 object-contain"
                    loading="eager"
                    decoding="async"
                  />
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)]">VoxPredict</span>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-auto rounded-[8px] p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {visibleItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[rgba(124,58,237,0.24)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-white/10 p-4">
              {isSignedIn && (
                <p className="truncate px-1 text-xs text-[var(--text-muted)]">
                  {canShowWalletButton ? 'Conta autenticada' : 'Área administrativa'}
                </p>
              )}
              <AuthButton />
              <div className="flex items-center justify-between gap-2">
                {isSignedIn && <NotificationCenter />}
                {canShowWalletButton && <ConnectWalletButton />}
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
};
