import { EventEmitter } from 'events';
import { pool } from '../src/db/index.js';
import { getSupabaseAdmin } from './supabaseClient.js';

export const syncEventBus = new EventEmitter();
syncEventBus.setMaxListeners(500);

export interface GhnSyncEventPayload {
  eventType: string;
  entityType: string;
  entityId?: string;
  targetUserId?: string;
  userId?: string;
  targetRole?: string;
  safeMetadata?: Record<string, any>;
}

/**
 * Emits a safe metadata-only event to public.ghn_sync_events
 * in Supabase and broadcasts to local SSE syncEventBus.
 * This alerts all connected client instances (User App & Admin Panel)
 * in real-time to invalidate & refetch authoritative state instantly.
 */
export async function emitGhnSyncEvent(payload: GhnSyncEventPayload): Promise<boolean> {
  const {
    eventType,
    entityType,
    entityId,
    targetUserId,
    userId,
    targetRole,
    safeMetadata = {},
  } = payload;

  const resolvedUserId = targetUserId || userId || null;

  if (!eventType || !entityType) {
    return false;
  }

  // 1. Broadcast immediately to local in-memory SSE bus for sub-millisecond client sync
  try {
    syncEventBus.emit('sync_event', {
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId || null,
      target_user_id: resolvedUserId,
      target_role: targetRole || null,
      safe_metadata: safeMetadata,
      created_at: new Date().toISOString(),
    });
  } catch (_) {}

  // 2. Try direct PostgreSQL pool execution (persistent log & Supabase Realtime)
  try {
    await pool.query(
      `INSERT INTO public.ghn_sync_events (
        event_type,
        entity_type,
        entity_id,
        target_user_id,
        target_role,
        safe_metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        eventType,
        entityType,
        entityId || null,
        resolvedUserId,
        targetRole || null,
        JSON.stringify(safeMetadata),
      ]
    );
    return true;
  } catch (poolErr) {
    // 3. Fallback to Supabase JS admin client if pool had an issue
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.from('ghn_sync_events').insert({
          event_type: eventType,
          entity_type: entityType,
          entity_id: entityId || null,
          target_user_id: resolvedUserId,
          target_role: targetRole || null,
          safe_metadata: safeMetadata,
        });
        if (!error) {
          return true;
        }
      }
    } catch (_) {}
  }

  return true;
}

