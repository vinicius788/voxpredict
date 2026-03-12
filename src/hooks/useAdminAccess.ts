import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useAdminAccess = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const { user } = useAuth();
  
  // Dono exclusivo da plataforma
  const allowedAdminEmails = [(import.meta.env.VITE_ADMIN_EMAIL || 'vm3441896@gmail.com').toLowerCase()];

  useEffect(() => {
    // Admin access is owner-only and requires explicit admin flag
    if (user && user.isAdmin && allowedAdminEmails.includes(user.email)) {
      setIsAdmin(true);
      setAdminEmail(user.email);
    } else {
      setIsAdmin(false);
      setAdminEmail('');
    }
  }, [user]);

  return {
    isAdmin,
    adminEmail,
    allowedAdminEmails
  };
};
