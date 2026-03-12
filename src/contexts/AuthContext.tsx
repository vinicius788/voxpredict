import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const OWNER_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'vm3441896@gmail.com').trim().toLowerCase();
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapAuthUser = (input: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User | null => {
  if (!input.email) return null;
  const normalizedEmail = input.email.trim().toLowerCase();
  const userName = typeof input.user_metadata?.username === 'string' ? input.user_metadata.username : normalizedEmail.split('@')[0];

  return {
    id: input.id,
    firstName: userName,
    lastName: '',
    email: normalizedEmail,
    isAdmin: normalizedEmail === OWNER_EMAIL,
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const useUser = () => {
  const { user, isSignedIn, isLoaded } = useAuth();
  return { user, isSignedIn, isLoaded };
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
      }

      const sessionUser = data.session?.user;
      const mapped = sessionUser ? mapAuthUser(sessionUser) : null;
      setUser(mapped);

      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
      } else {
        localStorage.removeItem('auth_token');
      }

      setIsLoaded(true);
    };

    void syncSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      const mapped = sessionUser ? mapAuthUser(sessionUser) : null;
      setUser(mapped);

      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token);
      } else {
        localStorage.removeItem('auth_token');
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    toast.success('Login realizado com sucesso!');
  };

  const signUp = async (email: string, password: string, username?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        },
      },
    });

    if (error) {
      throw error;
    }

    toast.success('Conta criada. Verifique seu email para confirmar o cadastro.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    toast.success('Logout realizado com sucesso!');
  };

  const value = useMemo<AuthContextType>(
    () => ({
      isSignedIn: Boolean(user),
      isLoaded,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [isLoaded, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const SignInButton: React.FC<{ mode?: string; children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const SignUpButton: React.FC<{ mode?: string; children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const UserButton: React.FC<{ appearance?: unknown }> = () => {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <button
      type="button"
      className="h-10 w-10 cursor-pointer rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all hover:shadow-lg"
      onClick={() => {
        void signOut();
      }}
      title="Sign out"
    >
      {(user.firstName?.[0] || user.email[0] || 'U').toUpperCase()}
    </button>
  );
};
