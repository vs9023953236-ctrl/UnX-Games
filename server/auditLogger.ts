import { db } from '../src/db/index.js';
import { audit_logs } from '../src/db/schema.js';
import crypto from 'crypto';

export interface AuditLogOptions {
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function logAdminAuditAction(options: AuditLogOptions): Promise<void> {
  try {
    // Sanitize metadata to never include sensitive values
    const safeMetadata = { ...options.metadata };
    delete safeMetadata.password;
    delete safeMetadata.password_hash;
    delete safeMetadata.otp;
    delete safeMetadata.otp_code;
    delete safeMetadata.jwt;
    delete safeMetadata.token;
    delete safeMetadata.secret;
    delete safeMetadata.apiKey;
    delete safeMetadata.authorization;

    const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    await db.insert(audit_logs).values({
      id,
      actor_id: options.actorId || 'system',
      actor_role: options.actorRole || 'ADMIN',
      action: options.action,
      entity_type: options.entityType || 'SYSTEM',
      entity_id: options.entityId || null,
      metadata: safeMetadata,
    });
  } catch (err) {
    console.warn('Failed to record audit log:', err);
  }
}
