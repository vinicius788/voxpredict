import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../db/prisma';

// Load environment variables
dotenv.config();

export interface AuthenticatedUser {
  id?: string;
  email?: string;
  walletAddress?: string;
  role?: 'USER' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const extractBearerToken = (headerValue?: string) => {
  if (!headerValue) return null;
  if (!headerValue.startsWith('Bearer ')) return null;
  return headerValue.replace('Bearer ', '').trim();
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Simple API key authentication
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/auth')) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    return next();
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  next();
};

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const token = extractBearerToken(authorization);
  const secret = process.env.JWT_SECRET;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (secret) {
    try {
      const decoded = jwt.verify(token, secret) as AuthenticatedUser;
      req.user = decoded;
      return next();
    } catch {
      // Try Supabase token verification below.
    }
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const userEmail = data.user.email?.toLowerCase();
        const role = userEmail && adminEmail && userEmail === adminEmail ? 'ADMIN' : 'USER';

        if (data.user.email) {
          await prisma.user.upsert({
            where: { id: data.user.id },
            update: {
              email: data.user.email.toLowerCase(),
              role,
            },
            create: {
              id: data.user.id,
              email: data.user.email.toLowerCase(),
              role,
              username: (data.user.user_metadata?.username as string | undefined) || data.user.email.split('@')[0],
            },
          });
        }

        req.user = {
          id: data.user.id,
          email: data.user.email || undefined,
          role,
        };
        return next();
      }
    } catch {
      // Falls through to unauthorized.
    }
  }

  return res.status(401).json({ success: false, error: 'Invalid token' });
};

// Admin-only routes
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = req.headers['x-admin-key'] as string | undefined;
  const validAdminKey = process.env.ADMIN_KEY;
  
  if (!validAdminKey) {
    return res.status(500).json({ success: false, error: 'Admin authentication not configured' });
  }
  
  if (!adminKey || adminKey !== validAdminKey) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const userEmail = req.user?.email?.toLowerCase();

  if (userEmail && adminEmail && userEmail === adminEmail) {
    return next();
  }

  if (req.user?.role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({ success: false, error: 'Forbidden' });
};
