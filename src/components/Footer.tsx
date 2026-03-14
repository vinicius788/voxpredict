import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Globe, Mail, Twitter } from 'lucide-react';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--brand-900)] py-12">
      <div className="section-shell">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(124,58,237,0.45)] bg-[rgba(255,255,255,0.03)] shadow-[var(--shadow-brand)]">
                <img
                  src="/branding/voxpredict-icon.png"
                  alt="VoxPredict ícone"
                  className="h-8 w-8 object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <img
                src="/branding/voxpredict-logo.png"
                alt="VoxPredict"
                className="h-8 w-auto max-w-[180px] object-contain sm:h-9 sm:max-w-[210px]"
                loading="lazy"
                decoding="async"
              />
            </div>

            <p className="mb-4 max-w-xl text-sm text-[var(--text-secondary)]">
              Plataforma baseada em contratos inteligentes na Polygon. Previsões entre usuários com liquidação transparente em blockchain.
            </p>

            <div className="inline-flex items-center gap-2 rounded-[999px] border border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.12)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
              <svg viewBox="0 0 38 33" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M27.879 10.426L21.629 6.824a1.438 1.438 0 00-1.44 0L13.94 10.426a1.44 1.44 0 00-.719 1.246v7.204c0 .514.275.989.719 1.246l6.249 3.602a1.438 1.438 0 001.44 0l6.25-3.602a1.44 1.44 0 00.718-1.246v-7.204a1.44 1.44 0 00-.718-1.246z" stroke="#A78BFA" strokeWidth="2"/>
                <path d="M13.94 10.426l6.969 4.023m6.969-4.023l-6.969 4.023m0 0v8.049" stroke="#A78BFA" strokeWidth="2"/>
              </svg>
              <span>Powered by Polygon</span>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Início</Link></li>
              <li><Link to="/dashboard" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Mercados</Link></li>
              <li><Link to="/user-dashboard" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Meu Dashboard</Link></li>
              <li><Link to="/admin" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Admin</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Legal</h3>
            <ul className="mb-5 space-y-2 text-sm">
              <li><Link to="/terms" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Termos de Uso</Link></li>
              <li><Link to="/privacy" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Política de Privacidade</Link></li>
              <li><Link to="/compliance" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">Compliance</Link></li>
            </ul>

            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text-primary)]"><Twitter className="h-4 w-4" /></a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text-primary)]"><Github className="h-4 w-4" /></a>
              <a href="mailto:contato@voxpredict.com" className="transition-colors hover:text-[var(--text-primary)]"><Mail className="h-4 w-4" /></a>
              <a href="https://voxpredict.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text-primary)]"><Globe className="h-4 w-4" /></a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
          <p>© {year} VoxPredict. Todos os direitos reservados.</p>
          <p>
            Aviso legal: VoxPredict não é casa de apostas. Os mercados refletem consenso entre usuários e podem envolver risco financeiro.
          </p>
        </div>
      </div>
    </footer>
  );
};
