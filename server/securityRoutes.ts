import { Router, Response } from 'express';
import { AuthRequest, authenticateUser, optionalUser, requireStaff, requireAdmin, requireSuperAdmin, sanitizeUser } from './auth.js';
import { db } from '../src/db/index.js';
import { security_incidents, risk_scores, feature_flags, audit_logs, notifications, customers, users, sessions, activity_logs, system_events } from '../src/db/schema.js';
import { eq, and, gt, gte, desc, sql, ilike, or, isNull } from 'drizzle-orm';
import { evaluateRiskScore } from './riskEngine.js';
import { createSecurityIncident } from './securityIncidents.js';
import { checkSystemHealth } from './healthMonitor.js';
import { getFeatureFlags, clearFeatureFlagsCache } from './featureFlags.js';
import { logAdminAuditAction } from './auditLogger.js';
import { getClientIp } from './rateLimiter.js';
import { getSupabaseAdmin, getSupabaseClient } from './supabaseClient.js';
import crypto from 'crypto';

// Helper: Require Admin Re-Authentication for high sensitivity endpoints
export async function verifyAdminReauth(req: AuthRequest, res: Response): Promise<boolean> {
  const reauthHeader = (req.headers['x-admin-reauth'] as string) || req.body?.admin_password || req.body?.admin_pin;
  if (!reauthHeader) {
    res.status(403).json({
      success: false,
      requiresReauth: true,
      message: 'Re-authentication required: Please enter your Admin Password or Security PIN to perform this sensitive action.',
    });
    return false;
  }

  const adminEmail = String(req.user?.email || '').toLowerCase();
  
  // 1. Check user's security_pin
  const hashedPin = crypto.createHash('sha256').update(String(reauthHeader)).digest('hex');
  if (req.user?.security_pin && (String(req.user.security_pin) === String(reauthHeader) || String(req.user.security_pin) === hashedPin)) {
    return true;
  }

  // 2. Check with Supabase Auth
  try {
    const sb = getSupabaseClient() || getSupabaseAdmin();
    if (sb && adminEmail) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: adminEmail,
        password: String(reauthHeader),
      });
      if (data?.user && !error) {
        return true;
      }
    }
  } catch (err: any) {
    console.warn('[REAUTH] Supabase verification note:', err?.message);
  }

  res.status(403).json({
    success: false,
    requiresReauth: true,
    message: 'Invalid re-authentication credentials. Re-authentication failed.',
  });
  return false;
}

export function registerSecurityRoutes(router: Router) {
  // -------------------------------------------------------------
  // 1. HEALTH MONITORING
  // -------------------------------------------------------------
  router.get(['/health', '/api/health'], async (_req, res) => {
    const health = await checkSystemHealth();
    const httpCode = health.overallStatus === 'DOWN' ? 503 : 200;
    const responsePayload = {
      status: health.overallStatus === 'DOWN' ? 'error' : 'ok',
      application: 'ok',
      database: health.services.database.status === 'HEALTHY' ? 'ok' : 'degraded',
      redis: health.services.redis.status === 'HEALTHY' ? 'ok' : 'degraded',
      overallStatus: health.overallStatus,
      checkedAt: health.checkedAt,
      services: health.services,
    };
    res.status(httpCode).json(responsePayload);
  });

  router.get('/admin/health', requireStaff, async (req: AuthRequest, res: Response) => {
    const health = await checkSystemHealth();
    res.json({
      success: true,
      health,
    });
  });

  // -------------------------------------------------------------
  // 2. FEATURE FLAGS
  // -------------------------------------------------------------
  router.get('/feature-flags', async (req, res) => {
    const flags = await getFeatureFlags();
    res.json({ success: true, flags });
  });

  router.get('/admin/feature-flags', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const flagsList = await db.select().from(feature_flags).orderBy(feature_flags.name);
      res.json({ success: true, flags: flagsList });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve feature flags.' });
    }
  });

  router.post('/admin/feature-flags/:id/toggle', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const [flag] = await db.select().from(feature_flags).where(eq(feature_flags.id, id)).limit(1);
      if (!flag) {
        return res.status(404).json({ success: false, message: 'Feature flag not found.' });
      }

      const newEnabled = !flag.enabled;
      await db.update(feature_flags).set({
        enabled: newEnabled,
        updated_by: req.user?.email || 'admin',
        updatedAt: new Date(),
      }).where(eq(feature_flags.id, id));

      clearFeatureFlagsCache();

      await logAdminAuditAction({
        actorId: req.user?.id,
        actorRole: req.user?.role || 'ADMIN',
        action: 'TOGGLE_FEATURE_FLAG',
        entityType: 'FEATURE_FLAG',
        entityId: flag.name,
        metadata: { flagName: flag.name, enabled: newEnabled },
      });

      res.json({
        success: true,
        message: `Feature flag '${flag.name}' ${newEnabled ? 'enabled' : 'disabled'} successfully.`,
        enabled: newEnabled,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to update feature flag.' });
    }
  });

  // -------------------------------------------------------------
  // 3. CUSTOMER DEVICE & SESSION MANAGEMENT
  // -------------------------------------------------------------
  router.get('/sessions', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const userSessions = await db.select().from(sessions)
        .where(and(eq(sessions.user_id, userId), isNull(sessions.revoked_at)))
        .orderBy(desc(sessions.last_activity_at))
        .limit(20);

      res.json({ success: true, sessions: userSessions });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to load sessions.' });
    }
  });

  router.post('/sessions/:id/revoke', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await db.update(sessions).set({
        revoked_at: new Date(),
      }).where(and(eq(sessions.id, id), eq(sessions.user_id, userId)));

      res.json({ success: true, message: 'Session revoked successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to revoke session.' });
    }
  });

  router.post('/sessions/revoke-others', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      await db.update(sessions).set({
        revoked_at: new Date(),
      }).where(and(eq(sessions.user_id, userId), isNull(sessions.revoked_at)));

      res.json({ success: true, message: 'All other device sessions signed out successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to revoke other sessions.' });
    }
  });

  // -------------------------------------------------------------
  // 4. ADMIN SECURITY CENTER & INCIDENT MANAGEMENT
  // -------------------------------------------------------------
  router.get('/admin/security/stats', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const now = new Date();
      const [incidentsList, activeSessionsCount, highRiskUsersCount, auditCount, activityCount, systemCount] = await Promise.all([
        db.select().from(security_incidents),
        db.select({ count: sql<number>`count(*)` }).from(sessions).where(and(isNull(sessions.revoked_at), gte(sessions.expires_at, now))),
        db.select({ count: sql<number>`count(*)` }).from(risk_scores).where(or(gt(risk_scores.score, 60), eq(risk_scores.level, 'HIGH'), eq(risk_scores.level, 'CRITICAL'))),
        db.select({ count: sql<number>`count(*)` }).from(audit_logs),
        db.select({ count: sql<number>`count(*)` }).from(activity_logs),
        db.select({ count: sql<number>`count(*)` }).from(system_events),
      ]);

      const totalIncidents = incidentsList.length;
      const openIncidents = incidentsList.filter(i => i.status === 'OPEN').length;
      const criticalIncidents = incidentsList.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN').length;
      const highIncidents = incidentsList.filter(i => i.severity === 'HIGH' && i.status === 'OPEN').length;

      const totalLoggedEvents = Number(auditCount[0]?.count || 0) +
        Number(activityCount[0]?.count || 0) +
        Number(systemCount[0]?.count || 0) +
        totalIncidents;

      res.json({
        success: true,
        stats: {
          totalIncidents,
          openIncidents,
          criticalIncidents,
          highIncidents,
          activeSessionsCount: Number(activeSessionsCount[0]?.count || 0),
          highRiskUsers: Number(highRiskUsersCount[0]?.count || 0),
          totalLoggedEvents,
        },
      });
    } catch (err: any) {
      console.error('[SECURITY_STATS_ERROR]', err);
      res.status(500).json({ success: false, message: 'Failed to load security stats.' });
    }
  });

  router.get('/admin/security/incidents', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { status, severity, search } = req.query;

      const conditions: any[] = [];
      if (status && status !== 'ALL') conditions.push(eq(security_incidents.status, String(status)));
      if (severity && severity !== 'ALL') conditions.push(eq(security_incidents.severity, String(severity)));
      if (search) {
        const searchTerm = `%${String(search).trim()}%`;
        conditions.push(or(
          ilike(security_incidents.title, searchTerm),
          ilike(security_incidents.incident_number, searchTerm),
          ilike(security_incidents.ip_address, searchTerm),
          ilike(security_incidents.user_id, searchTerm)
        ));
      }

      let incidentsList;
      if (conditions.length > 0) {
        incidentsList = await db.select().from(security_incidents).where(and(...conditions)).orderBy(desc(security_incidents.createdAt));
      } else {
        incidentsList = await db.select().from(security_incidents).orderBy(desc(security_incidents.createdAt));
      }

      res.json({ success: true, incidents: incidentsList });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch incidents.' });
    }
  });

  router.post('/admin/security/incidents/:id/resolve', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { resolutionNotes, status } = req.body || {};

      const [incident] = await db.select().from(security_incidents).where(eq(security_incidents.id, id)).limit(1);
      if (!incident) {
        return res.status(404).json({ success: false, message: 'Incident not found.' });
      }

      const newStatus = status || 'RESOLVED';
      await db.update(security_incidents).set({
        status: newStatus,
        resolution_notes: resolutionNotes || 'Resolved by Administrator.',
        resolved_by: req.user?.email || 'admin',
        resolved_at: new Date(),
        updatedAt: new Date(),
      }).where(eq(security_incidents.id, id));

      await logAdminAuditAction({
        actorId: req.user?.id,
        actorRole: req.user?.role || 'ADMIN',
        action: 'RESOLVE_SECURITY_INCIDENT',
        entityType: 'SECURITY_INCIDENT',
        entityId: incident.incident_number || id,
        metadata: { newStatus, resolutionNotes },
      });

      res.json({ success: true, message: `Incident #${incident.incident_number} updated to ${newStatus}.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to resolve incident.' });
    }
  });

  router.get('/admin/security/sessions', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const list = await db.select({
        id: sessions.id,
        user_id: sessions.user_id,
        user_name: customers.full_name,
        user_email: customers.email,
        user_phone: customers.mobile,
        ip_address: sessions.ip_address,
        user_agent: sessions.user_agent,
        device_type: sessions.device_type,
        browser: sessions.browser,
        os: sessions.os,
        location_approx: sessions.location_approx,
        createdAt: sessions.createdAt,
        last_activity_at: sessions.last_activity_at,
        expires_at: sessions.expires_at,
        revoked_at: sessions.revoked_at,
      })
      .from(sessions)
      .leftJoin(customers, sql`${sessions.user_id}::text = ${customers.id}::text OR ${sessions.user_id} = ${customers.supabase_auth_user_id} OR ${sessions.user_id} = ${customers.email}`)
      .orderBy(desc(sessions.last_activity_at))
      .limit(100);

      res.json({ success: true, sessions: list });
    } catch (err: any) {
      console.error('[SECURITY_SESSIONS_ERROR]', err);
      try {
        const rawList = await db.select().from(sessions).orderBy(desc(sessions.last_activity_at)).limit(100);
        res.json({ success: true, sessions: rawList });
      } catch (fErr) {
        res.status(500).json({ success: false, message: 'Failed to list active system sessions.' });
      }
    }
  });

  router.post('/admin/security/sessions/:id/revoke', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const [sess] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
      if (!sess) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }

      await db.update(sessions).set({
        revoked_at: new Date(),
      }).where(eq(sessions.id, id));

      await logAdminAuditAction({
        actorId: req.user?.id,
        actorRole: req.user?.role || 'ADMIN',
        action: 'REVOKE_USER_SESSION',
        entityType: 'SESSION',
        entityId: id,
        metadata: { targetUserId: sess.user_id, ipAddress: sess.ip_address },
      });

      res.json({ success: true, message: 'Device session revoked successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to revoke session.' });
    }
  });

  router.get('/admin/security/risk-scores', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const scores = await db.select({
        id: risk_scores.id,
        user_id: risk_scores.user_id,
        user_name: customers.full_name,
        user_email: customers.email,
        user_phone: customers.mobile,
        username: customers.username,
        ip_address: risk_scores.ip_address,
        score: risk_scores.score,
        level: risk_scores.level,
        signals: risk_scores.signals,
        last_evaluated_at: risk_scores.last_evaluated_at,
        createdAt: risk_scores.createdAt,
      }).from(risk_scores)
        .leftJoin(customers, sql`${risk_scores.user_id}::text = ${customers.id}::text OR ${risk_scores.user_id} = ${customers.supabase_auth_user_id} OR ${risk_scores.user_id} = ${customers.email}`)
        .orderBy(desc(risk_scores.score))
        .limit(100);

      res.json({ success: true, riskScores: scores });
    } catch (err: any) {
      console.error('Error fetching risk scores with user join:', err);
      try {
        const rawScores = await db.select().from(risk_scores).orderBy(desc(risk_scores.score)).limit(100);
        res.json({ success: true, riskScores: rawScores });
      } catch (fErr) {
        res.status(500).json({ success: false, message: 'Failed to load risk scores.' });
      }
    }
  });

  // -------------------------------------------------------------
  // 5. AUDIT LOGS
  // -------------------------------------------------------------
  router.get('/admin/audit-logs', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const logs = await db.select().from(audit_logs).orderBy(desc(audit_logs.createdAt)).limit(150);
      res.json({ success: true, auditLogs: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
    }
  });

  // -------------------------------------------------------------
  // 6. NOTIFICATIONS SYSTEM
  // -------------------------------------------------------------
  router.get('/notifications', optionalUser, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        const globalNotifs = await db.select().from(notifications)
          .where(eq(notifications.is_global, true))
          .orderBy(desc(notifications.createdAt))
          .limit(20);
        return res.json({ success: true, notifications: globalNotifs, unreadCount: 0 });
      }

      const userNotifs = await db.select().from(notifications)
        .where(or(
          eq(notifications.customer_id, req.user.id),
          eq(notifications.is_global, true)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      res.json({ success: true, notifications: userNotifs, unreadCount: userNotifs.filter(n => !n.read).length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
  });

  router.post('/notifications/read-all', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      await db.update(notifications).set({ read: true })
        .where(eq(notifications.customer_id, req.user!.id));

      res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to update notifications.' });
    }
  });

  router.get('/admin/notifications', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const adminNotifs = await db.select().from(notifications)
        .where(eq(notifications.recipient_role, 'ADMIN'))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      res.json({ success: true, notifications: adminNotifs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch admin notifications.' });
    }
  });
}
