import { db } from '../src/db/index.js';
import { security_incidents, notifications } from '../src/db/schema.js';
import crypto from 'crypto';

export interface CreateIncidentOptions {
  title: string;
  type: string; // FRAUD_DETECTED, BRUTE_FORCE, PAYMENT_ANOMALY, WALLET_ANOMALY, NEW_DEVICE, RATE_LIMIT, AUTH_FAILURE
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress?: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  riskScore?: number;
  metadata?: Record<string, any>;
}

export async function createSecurityIncident(options: CreateIncidentOptions) {
  try {
    if (false) return null;

    const id = `inc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const incidentNumber = `INC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const safeMetadata = { ...options.metadata };
    delete safeMetadata.password;
    delete safeMetadata.password_hash;
    delete safeMetadata.otp;
    delete safeMetadata.token;

    const [incident] = await db.insert(security_incidents).values({
      id,
      incident_number: incidentNumber,
      title: options.title,
      type: options.type,
      severity: options.severity,
      status: 'OPEN',
      user_id: options.userId || null,
      ip_address: options.ipAddress || null,
      resource_type: options.resourceType || 'SECURITY',
      resource_id: options.resourceId || null,
      description: options.description,
      risk_score: options.riskScore || 0,
      metadata: safeMetadata,
    }).returning();

    // If severity is HIGH or CRITICAL, send an admin notification
    if (options.severity === 'HIGH' || options.severity === 'CRITICAL') {
      try {
        await db.insert(notifications).values({
          id: `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          recipient_uid: 'admin',
          title: `[${options.severity}] Security Alert: ${options.title}`,
          message: `${options.description} (Incident #${incidentNumber})`,
          recipient_role: 'ADMIN',
          is_global: false,
          type: 'Security Alert',
          read: false,
        });
      } catch (err) {
        console.warn('Failed to dispatch admin incident notification:', err);
      }
    }

    return incident;
  } catch (err) {
    console.error('Failed to create security incident:', err);
    return null;
  }
}
