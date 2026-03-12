import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoaded } = useAuth();
  const allowedAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'vm3441896@gmail.com').toLowerCase();

  if (!isLoaded) {
    return (
      <div className="section-shell py-10 text-center text-sm text-[var(--text-secondary)]">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/?login=true" replace />;
  }

  if (user.email.toLowerCase() !== allowedAdminEmail) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
