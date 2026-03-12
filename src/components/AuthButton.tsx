import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, History, LogOut, Settings, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export const AuthButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, user, signIn, signOut, signUp } = useAuth();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isSignedIn) {
    const initials = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();

    return (
      <div ref={wrapperRef} className="relative">
        <button
          onClick={() => setShowProfileMenu((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-[999px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="hidden max-w-[86px] truncate text-left text-xs font-medium sm:block">
            {user?.firstName || user?.email}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[200px] rounded-[10px] border border-[var(--border)] bg-[var(--brand-800)] p-2 shadow-xl">
            <button
              onClick={() => {
                navigate('/user-dashboard');
                setShowProfileMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
            >
              <User className="h-4 w-4" /> Meu Dashboard
            </button>
            <button
              onClick={() => {
                navigate('/user-dashboard');
                setShowProfileMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
            >
              <Settings className="h-4 w-4" /> Configurações
            </button>
            <button
              onClick={() => {
                navigate('/user-dashboard');
                setShowProfileMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
            >
              <History className="h-4 w-4" /> Histórico
            </button>
            <button
              onClick={() => {
                void signOut();
                setShowProfileMenu(false);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[#fca5a5] transition-colors hover:bg-[rgba(239,68,68,0.12)]"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            sessionStorage.setItem('redirect_after_login', location.pathname);
            setAuthMode('signin');
            setShowEmailModal(true);
          }}
          className="vp-btn-ghost px-4 py-2 text-sm font-semibold"
        >
          Entrar
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem('redirect_after_login', location.pathname);
            setAuthMode('signup');
            setShowEmailModal(true);
          }}
          className="vp-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Criar Conta
        </button>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[var(--border)] bg-[var(--brand-800)] p-6 shadow-xl">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {authMode === 'signin' ? 'Entrar na VoxPredict' : 'Criar conta na VoxPredict'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Use email e senha para continuar na plataforma.</p>

            <form
              className="mt-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const email = String(formData.get('email') || '').trim();
                const password = String(formData.get('password') || '').trim();
                const username = String(formData.get('username') || '').trim();

                if (!email || !password) {
                  toast.error('Informe email e senha válidos.');
                  return;
                }

                try {
                  if (authMode === 'signin') {
                    await signIn(email, password);
                    const redirect = sessionStorage.getItem('redirect_after_login') || '/';
                    sessionStorage.removeItem('redirect_after_login');
                    navigate(redirect);
                  } else {
                    await signUp(email, password, username || undefined);
                    const redirect = sessionStorage.getItem('redirect_after_login') || '/';
                    sessionStorage.removeItem('redirect_after_login');
                    navigate(redirect);
                  }
                  setShowEmailModal(false);
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Falha na autenticação.';
                  toast.error(message);
                }
              }}
            >
              {authMode === 'signup' && (
                <input
                  type="text"
                  name="username"
                  placeholder="Seu nome de usuário"
                  className="vp-input mb-3 h-11 px-3 text-sm"
                  minLength={2}
                />
              )}
              <input
                type="email"
                name="email"
                placeholder="voce@exemplo.com"
                className="vp-input h-11 px-3 text-sm"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Sua senha"
                className="vp-input mt-3 h-11 px-3 text-sm"
                minLength={6}
                required
              />

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="w-full rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <button type="submit" className="vp-btn-primary w-full px-4 py-2 text-sm font-semibold">
                  {authMode === 'signin' ? 'Entrar' : 'Criar Conta'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))}
                className="mt-3 w-full text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {authMode === 'signin' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
