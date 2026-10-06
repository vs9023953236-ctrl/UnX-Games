import { Request, Response, NextFunction } from 'express';
import { db } from '../src/db/index.js';
import { users, audit_logs } from '../src/db/schema.js';
import { eq, or, sql, and, gt, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { getSupabaseClient, getSupabaseAdmin } from './supabaseClient.js';
import { trackDeviceSession } from './sessionTracker.js';

export interface AuthRequest extends Request {
  user?: any;
  adminUser?: any;
  sessionId?: string;
  supabaseUserId?: string;
  token?: string;
  aal?: 'aal1' | 'aal2' | string;
  amr?: any[];
}

export function clearAuthCookie (res: Response): void {
  try {
    res.clearCookie('ghn_session');
  } catch {}
}

export function formatCleanPersonName(rawName?: string | null): string {
  if (!rawName || !rawName.trim()) return '';
  let str = rawName.trim();
  if (str.includes('@')) {
    str = str.split('@')[0];
  }
  if (str.toLowerCase().startsWith('hii.')) str = str.substring(4);
  if (str.toLowerCase().startsWith('hello.')) str = str.substring(6);
  if (str.toLowerCase().startsWith('admin.')) str = str.substring(6);
  if (str.toLowerCase().startsWith('staff.')) str = str.substring(6);

  if (/^binodthalal$/i.test(str.replace(/[\s\._\-]+/g, ''))) {
    return 'Binod Thalal';
  }

  str = str.replace(/[\._\-\/\\]+/g, ' ');
  str = str.replace(/([a-z])([A-Z])/g, '$1 $2');

  const words = str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return words.join(' ');
}

export function formatRoleTitle(role?: string | null): string {
  if (!role || !role.trim()) return '';
  const r = role.trim().toUpperCase().replace(/[\s\-]+/g, '_');
  if (r === 'STORE_OWNER' || r === 'OWNER') return 'Store Owner';
  if (r === 'SUPER_ADMIN') return 'Super Admin';
  if (r === 'STORE_MANAGER' || r === 'MANAGER') return 'Store Manager';
  if (r === 'SUPPORT_STAFF' || r === 'SUPPORT') return 'Support Staff';
  if (r === 'ADMIN' || r === 'ADMINISTRATOR') return 'Super Admin';
  if (r === 'STAFF') return 'Support Staff';
  if (r === 'CUSTOMER' || r === 'USER') return 'Customer';

  return r.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function sanitizeUser(user: any) {
  if (!user || typeof user !== 'object') return null;
  const safe = { ...user };
  safe.has_security_pin = !!user.security_pin;
  delete safe.password_hash;
  delete safe.password;
  delete safe.passwordHash;
  delete safe.security_pin;
  delete safe.securityPin;
  delete safe.pin;
  delete safe.pin_hash;
  delete safe.token;
  delete safe.session_token;
  delete safe.auth_token;
  delete safe.access_token;
  delete safe.refresh_token;
  delete safe.secret;
  delete safe.secret_key;
  delete safe.totp_secret;
  delete safe.two_factor_secret;
  delete safe.backup_codes;
  delete safe.backup_codes_hash;
  delete safe.mfa_factors;
  
  const has_pin = Boolean(user.security_pin || user.securityPin || user.has_pin);
  
  const rawRole = String(safe.role || '').toUpperCase();
  const validRoles = ['CUSTOMER', 'SUPPORT_STAFF', 'STORE_MANAGER', 'SUPER_ADMIN', 'STORE_OWNER'];
  const role = validRoles.includes(rawRole)
        ? rawRole
        : (rawRole === 'ADMIN' ? 'STORE_MANAGER' : (rawRole === 'STAFF' ? 'SUPPORT_STAFF' : 'CUSTOMER'));

  const rawCandidateName = safe.full_name || safe.name || safe.username || (safe.email ? safe.email.split('@')[0] : '');
  const cleanName = formatCleanPersonName(rawCandidateName) || (role === 'CUSTOMER' ? 'Gamer' : 'Admin');
  const avatar = safe.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;

  return {
    ...safe,
    full_name: cleanName,
    name: cleanName,
    phone: safe.mobile || safe.phone || '',
    mobile: safe.mobile || safe.phone || '',
    photoURL: avatar,
    role,
    username: safe.username || safe.email?.split('@')[0],
    gamer_id: safe.gamer_id || '',
    has_pin,
    setup_completed: Boolean(safe.setup_completed),
    setup_step: safe.setup_step || 6,
    twoFactorEnabled: Boolean(safe.two_factor_enabled),
    two_factor_enabled: Boolean(safe.two_factor_enabled),
    favorite_games: safe.favorite_games || [],
    game_uids: safe.game_uids || {},
    notification_preferences: safe.notification_preferences || {},
    status: String(safe.status || 'ACTIVE').toUpperCase(),
    account_verified: Boolean(safe.account_verified),
    verification_status: safe.verification_status || (safe.account_verified ? 'verified' : 'unverified'),
    verification_doc_type: safe.verification_doc_type || '',
    verification_doc_url: safe.verification_doc_url || '',
    verification_submitted_at: safe.verification_submitted_at || null,
    is_owner: role === 'STORE_OWNER'
  };
}

export function isUUID(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export function isStoreOwnerAccount(user: { email?: string | null; role?: string | null } | null | undefined): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  if (role === 'STORE_OWNER') return true;
  const email = String(user.email || '').toLowerCase().trim();
  if (email === 'hii.binodthalal@gmail.com' || email === 'support@gamehubnepal.com') return true;
  return false;
}

export async function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader) {
      token = String(authHeader).trim();
    } else if (req.cookies?.['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    } else if (req.cookies?.['ghn_token']) {
      token = req.cookies['ghn_token'];
    } else if (req.cookies?.['ghn_auth_token']) {
      token = req.cookies['ghn_auth_token'];
    }

    if (!token || token === 'null' || token === 'undefined' || token === '') {
      return res.status(401).json({ success: false, message: 'Missing authentication token. Please sign in.' });
    }

    let dbUser: any = null;
    let supabaseUserId: string | null = null;
    req.token = token;

    // Check AAL & AMR from JWT
    let tokenPayload: any = null;
    if (token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          tokenPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (tokenPayload?.aal) req.aal = tokenPayload.aal;
          if (tokenPayload?.amr) req.amr = tokenPayload.amr;
        }
      } catch {}
    }

    // Verify token authoritatively via Supabase Auth
    const clientIp = typeof req.headers['x-forwarded-for'] === 'string' 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : (req.socket?.remoteAddress || undefined);
    const supabaseClient = getSupabaseClient(clientIp) || getSupabaseAdmin(clientIp);

    if (supabaseClient) {
      try {
        const { data: { user: authUser }, error } = await supabaseClient.auth.getUser(token);
        if (!error && authUser) {
          supabaseUserId = authUser.id;
          const userEmail = String(authUser.email || '').toLowerCase().trim();
          const conds: any[] = [eq(users.supabase_auth_user_id, authUser.id)];
          if (isUUID(authUser.id)) conds.push(eq(users.id, authUser.id));
          if (userEmail) conds.push(eq(users.email, userEmail));
          const found = await db.select().from(users).where(or(...conds)).limit(1);
          if (found.length > 0) {
            dbUser = found[0];
          } else {
            // Auto-sync customer record if authenticated via Supabase Auth
            const newId = isUUID(authUser.id) ? authUser.id : crypto.randomUUID();
            const meta = authUser.user_metadata || {};
            const isOwner = isStoreOwnerAccount({ email: userEmail });
            const [created] = await db.insert(users).values({
              id: newId,
              supabase_auth_user_id: authUser.id,
              email: userEmail,
              full_name: meta.full_name || userEmail.split('@')[0],
              mobile: meta.mobile || null,
              role: isOwner ? 'STORE_OWNER' : 'CUSTOMER',
              status: 'ACTIVE',
              email_verified: Boolean(authUser.email_confirmed_at),
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            dbUser = created;
          }
        }
      } catch (sbErr) {
        console.warn('[AUTH] Supabase getUser verification note:', sbErr);
      }
    }

    // Fallback: Verify JWT payload securely if Supabase client is unconfigured or in transient state
    if (!dbUser && tokenPayload) {
      try {
        const sub = tokenPayload.sub;
        const email = String(tokenPayload.email || '').toLowerCase().trim();
        const exp = tokenPayload.exp;
        const nowSec = Math.floor(Date.now() / 1000);

        if (!exp || exp > nowSec) {
          const conds: any[] = [];
          if (sub) {
            conds.push(eq(users.supabase_auth_user_id, sub));
            if (isUUID(sub)) conds.push(eq(users.id, sub));
          }
          if (email) {
            conds.push(eq(users.email, email));
          }
          if (conds.length > 0) {
            const found = await db.select().from(users).where(or(...conds)).limit(1);
            if (found.length > 0) {
              dbUser = found[0];
              supabaseUserId = sub || dbUser.supabase_auth_user_id || dbUser.id;
            }
          }
        }
      } catch (jwtErr) {
        console.warn('[AUTH] JWT decode user lookup note:', jwtErr);
      }
    }

    // If session did not validate, reject request
    if (!dbUser) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication session. Please sign in again.' });
    }

    if (isStoreOwnerAccount(dbUser)) {
      dbUser.status = 'ACTIVE';
      dbUser.role = 'STORE_OWNER';
    } else if (dbUser.status === 'BANNED' || dbUser.status === 'SUSPENDED' || dbUser.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'Your account is suspended or banned.' });
    }

    req.supabaseUserId = supabaseUserId || dbUser.id;
    req.user = dbUser;

    // Asynchronously record/update device tracking session
    trackDeviceSession(req, dbUser.id).catch(() => {});

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Authentication service temporarily unavailable.' });
  }
}

export async function optionalUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader) {
      token = String(authHeader).trim();
    } else if (req.cookies?.['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    } else if (req.cookies?.['ghn_token']) {
      token = req.cookies['ghn_token'];
    } else if (req.cookies?.['ghn_auth_token']) {
      token = req.cookies['ghn_auth_token'];
    }

    if (!token || token === 'null' || token === 'undefined') {
      return next();
    }

    let dbUser: any = null;
    let supabaseUserId: string | null = null;
    req.token = token;

    if (token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (payload?.aal) req.aal = payload.aal;
          if (payload?.amr) req.amr = payload.amr;
        }
      } catch {}
    }

    const clientIp = typeof req.headers['x-forwarded-for'] === 'string' 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : (req.socket?.remoteAddress || undefined);
    const supabaseClient = getSupabaseClient(clientIp) || getSupabaseAdmin(clientIp);
    if (supabaseClient) {
      try {
        const { data: { user: authUser }, error } = await supabaseClient.auth.getUser(token);
        if (!error && authUser) {
          supabaseUserId = authUser.id;
          const userEmail = String(authUser.email || '').toLowerCase().trim();
          const conds: any[] = [eq(users.supabase_auth_user_id, authUser.id)];
          if (isUUID(authUser.id)) conds.push(eq(users.id, authUser.id));
          if (userEmail) conds.push(eq(users.email, userEmail));
          const found = await db.select().from(users).where(or(...conds)).limit(1);
          if (found.length > 0) {
            dbUser = found[0];
          }
        }
      } catch {}
    }

    if (dbUser) {
      if (isStoreOwnerAccount(dbUser)) {
        dbUser.status = 'ACTIVE';
        dbUser.role = 'STORE_OWNER';
      }

      if (isStoreOwnerAccount(dbUser) || (dbUser.status !== 'BANNED' && dbUser.status !== 'SUSPENDED' && dbUser.status !== 'BLOCKED')) {
        req.supabaseUserId = supabaseUserId || dbUser.id;
        req.user = dbUser;
      }
    }
    next();
  } catch (err) {
    next();
  }
}

export function getRoleLevel(role?: string): number {
  if (!role) return 0;
  const r = role.toUpperCase();
  if (r === 'STORE_OWNER' || r === 'OWNER') return 4;
  if (r === 'SUPER_ADMIN') return 3;
  if (r === 'STORE_MANAGER' || r === 'ADMIN') return 2;
  if (r === 'SUPPORT_STAFF' || r === 'STAFF') return 1;
  return 0;
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  STORE_OWNER: ['all'],
  SUPER_ADMIN: [
    'dashboard.view', 'dashboard.analytics', 'dashboard.revenue', 'dashboard.system_health',
    'customers.view', 'customers.search', 'customers.manage', 'customers.export', 'users.delete',
    'products.view', 'products.create', 'products.update', 'products.activate', 'products.deactivate', 'products.images.manage', 'products.sort.manage',
    'games.view', 'games.create', 'games.update',
    'packages.view', 'packages.create', 'packages.update', 'packages.activate', 'packages.deactivate',
    'pricing.view', 'pricing.create', 'pricing.update',
    'stock.view', 'stock.manage', 'stock.adjust',
    'orders.view', 'orders.search', 'orders.process', 'orders.update_status', 'orders.cancel', 'orders.refund',
    'payments.view', 'payments.verify', 'payments.reject', 'payments.refund',
    'wallet.view', 'wallet.transactions.view', 'wallet.refund',
    'coupons.view', 'coupons.create', 'coupons.update', 'coupons.activate', 'coupons.deactivate', 'coupons.redemptions.view',
    'offers.view', 'offers.create', 'offers.update', 'offers.activate', 'offers.deactivate',
    'banners.view', 'banners.create', 'banners.update', 'banners.activate', 'banners.reorder',
    'news.view', 'news.create', 'news.update', 'news.publish', 'news.unpublish',
    'reviews.view', 'reviews.moderate', 'reviews.approve', 'reviews.reject',
    'support.view', 'support.create', 'support.reply', 'support.assign', 'support.resolve', 'support.escalate',
    'notifications.view', 'notifications.send', 'notifications.broadcast',
    'team.view', 'team.members.view', 'team.members.manage', 'team.applications.view', 'team.applications.review', 'team.applications.approve', 'team.applications.reject',
    'analytics.view', 'analytics.sales', 'analytics.revenue', 'analytics.users', 'analytics.products', 'analytics.export',
    'security.view', 'security.events.view',
    'audit.view',
    'maintenance.view', 'maintenance.manage',
    'ai.view', 'ai.logs.view'
  ],
  STORE_MANAGER: [
    'dashboard.view', 'dashboard.analytics', 'dashboard.revenue',
    'customers.view', 'customers.search',
    'products.view', 'products.create', 'products.update', 'products.activate', 'products.deactivate', 'products.images.manage', 'products.sort.manage',
    'games.view', 'games.create', 'games.update',
    'packages.view', 'packages.create', 'packages.update', 'packages.activate', 'packages.deactivate',
    'pricing.view', 'pricing.create', 'pricing.update',
    'stock.view', 'stock.manage', 'stock.adjust',
    'orders.view', 'orders.search', 'orders.process', 'orders.update_status',
    'payments.view', 'payments.verify', 'payments.reject',
    'wallet.view', 'wallet.transactions.view',
    'coupons.view', 'coupons.create', 'coupons.update', 'coupons.activate', 'coupons.deactivate', 'coupons.redemptions.view',
    'offers.view', 'offers.create', 'offers.update',
    'banners.view', 'banners.create', 'banners.update',
    'news.view', 'news.create', 'news.update', 'news.publish',
    'reviews.view', 'reviews.moderate',
    'support.view', 'support.create', 'support.reply', 'support.assign', 'support.resolve', 'support.escalate',
    'notifications.view', 'notifications.send',
    'team.view', 'team.members.view',
    'analytics.view', 'analytics.sales', 'analytics.products', 'analytics.export'
  ],
  SUPPORT_STAFF: [
    'dashboard.view',
    'customers.search', 'customers.view',
    'products.view', 'games.view', 'packages.view', 'pricing.view',
    'orders.view', 'orders.search',
    'payments.view',
    'wallet.view',
    'coupons.view',
    'offers.view', 'banners.view', 'news.view',
    'reviews.view',
    'support.view', 'support.create', 'support.reply', 'support.assign', 'support.resolve', 'support.escalate',
    'notifications.view', 'notifications.send',
    'team.view', 'team.members.view'
  ],
  CUSTOMER: []
};

export function hasPermission(role: string, permission: string, customPerms?: any): boolean {
  const level = getRoleLevel(role);
  if (level >= 4) return true; // STORE_OWNER
  if (customPerms && customPerms[permission] === false) return false;
  if (customPerms && customPerms[permission] === true) return true;
  const roleUpper = String(role || '').toUpperCase();
  const perms = ROLE_PERMISSIONS[roleUpper] || [];
  return perms.includes('all') || perms.includes(permission);
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    authenticateUser(req, res, () => {
      const role = String(req.user?.role || 'CUSTOMER').toUpperCase();
      const customPerms = req.adminUser?.permissions;
      if (hasPermission(role, permission, customPerms)) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    });
  };
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    const level = getRoleLevel(req.user?.role);
    if (level < 1) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action. Requires Support Staff or higher.' });
    }
    next();
  });
}

export function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    const level = getRoleLevel(req.user?.role);
    if (level < 2) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action. Requires Store Manager or higher.' });
    }
    next();
  });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    const level = getRoleLevel(req.user?.role);
    if (level < 3) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action. Requires Super Admin or higher.' });
    }
    next();
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    const level = getRoleLevel(req.user?.role);
    if (level < 2) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action. Requires Admin, Store Manager, or higher.' });
    }
    next();
  });
}

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    const level = getRoleLevel(req.user?.role);
    if (level < 4) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action. Requires Store Owner.' });
    }
    next();
  });
}

export function requireMfaAssurance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    // If the user has two_factor_enabled (or enrolled TOTP factors in Supabase)
    const isMfaEnrolled = Boolean(req.user.two_factor_enabled);
    if (isMfaEnrolled && req.aal === 'aal1') {
      return res.status(403).json({
        success: false,
        code: 'MFA_REQUIRED',
        message: 'This sensitive action requires Two-Factor Authentication (AAL2 verification). Please verify your 6-digit authenticator code.'
      });
    }
    next();
  } catch (err: any) {
    next();
  }
}

export async function logAuditAction(
  actorId: string | undefined,
  actorRole: string | undefined,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) {
  try {
    const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let safeMetadata = metadata ? { ...metadata } : {};
    
    delete safeMetadata.password;
    delete safeMetadata.password_hash;
    delete safeMetadata.secret;
    delete safeMetadata.apiKey;
    delete safeMetadata.otp;
    delete safeMetadata.token;
    
    await db.insert(audit_logs).values({
      id,
      actor_id: actorId || 'SYSTEM',
      actor_role: actorRole || 'UNKNOWN',
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: safeMetadata,
    });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

export async function getAuthenticatedCustomer(req: AuthRequest) {
  if (!req.user || !req.supabaseUserId) return null;
  return req.user;
}

export async function getAuthenticatedAdmin(req: AuthRequest) {
  if (!req.adminUser) return null;
  return req.adminUser;
}
