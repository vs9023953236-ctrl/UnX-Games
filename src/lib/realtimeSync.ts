import { getClientSupabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type SyncEventType =
  | 'user.updated'
  | 'user.status_changed'
  | 'customers.insert'
  | 'customers.update'
  | 'order.created'
  | 'order.updated'
  | 'order.status_changed'
  | 'orders.insert'
  | 'orders.update'
  | 'payment.updated'
  | 'payments.insert'
  | 'payments.update'
  | 'wallet.updated'
  | 'wallet_transactions.insert'
  | 'wallet_transactions.update'
  | 'kyc.updated'
  | 'kyc_verifications.insert'
  | 'kyc_verifications.update'
  | 'notification.created'
  | 'notifications.insert'
  | 'product.updated'
  | 'product.created'
  | 'product.deleted'
  | 'package.updated'
  | 'offer.updated'
  | 'coupon.updated'
  | 'banner.updated'
  | 'banner.created'
  | 'banner.deleted'
  | 'news.updated'
  | 'settings.updated'
  | 'payment_settings.updated'
  | 'database.synchronous_sync_completed'
  | 'support.updated'
  | string;

export interface SafeSyncPayload {
  event_type: SyncEventType;
  entity_type: string;
  entity_id?: string;
  target_user_id?: string;
  target_role?: string;
  safe_metadata?: Record<string, any>;
  created_at?: string;
}

export type SyncEventHandler = (payload: SafeSyncPayload) => void;

class RealtimeSyncManager {
  private channel: RealtimeChannel | null = null;
  private sseSource: EventSource | null = null;
  private listeners: Map<string, Set<SyncEventHandler>> = new Map();
  private globalListeners: Set<SyncEventHandler> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Initialized as a singleton
  }

  public init() {
    if (typeof window === 'undefined') return;
    this.subscribeToEventBus();
    this.subscribeToSSE();
  }

  public subscribe(eventType: string, handler: SyncEventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Ensure connection is active
    if (!this.isConnected) {
      this.subscribeToEventBus();
      this.subscribeToSSE();
    }

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  public subscribeAll(handler: SyncEventHandler): () => void {
    this.globalListeners.add(handler);
    if (!this.isConnected) {
      this.subscribeToEventBus();
      this.subscribeToSSE();
    }
    return () => {
      this.globalListeners.delete(handler);
    };
  }

  private subscribeToSSE() {
    if (typeof window === 'undefined' || this.sseSource) return;

    try {
      const sse = new EventSource('/api/realtime/stream');
      this.sseSource = sse;

      sse.onopen = () => {
        this.isConnected = true;
      };

      sse.onmessage = (e) => {
        try {
          if (!e.data || e.data.startsWith(':')) return;
          const parsed = JSON.parse(e.data);
          
          if (parsed.event_type || parsed.eventType) {
            const eventPayload: SafeSyncPayload = {
              event_type: parsed.event_type || parsed.eventType,
              entity_type: parsed.entity_type || parsed.entityType || 'general',
              entity_id: parsed.entity_id || parsed.entityId,
              target_user_id: parsed.target_user_id || parsed.targetUserId,
              target_role: parsed.target_role || parsed.targetRole,
              safe_metadata: parsed.safe_metadata || parsed.safeMetadata || {},
              created_at: parsed.created_at || new Date().toISOString(),
            };
            this.handleIncomingEvent(eventPayload);
          } else if (parsed.orderId || parsed.order_code) {
            this.handleIncomingEvent({
              event_type: 'order.updated',
              entity_type: 'orders',
              entity_id: parsed.orderId || parsed.id,
              safe_metadata: parsed,
            });
          }
        } catch (_) {}
      };

      sse.onerror = () => {
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
        // Auto-reconnect SSE after 4 seconds
        setTimeout(() => this.subscribeToSSE(), 4000);
      };
    } catch (_) {}
  }

  private subscribeToEventBus() {
    const supabase = getClientSupabase();
    if (!supabase) {
      setTimeout(() => this.subscribeToEventBus(), 2000);
      return;
    }

    try {
      if (this.channel) {
        supabase.removeChannel(this.channel);
        this.channel = null;
      }

      this.channel = supabase
        .channel('ghn_sync_event_bus')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ghn_sync_events',
          },
          (payload) => {
            const row = payload.new as SafeSyncPayload;
            this.handleIncomingEvent(row);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.reconnectAttempts = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isConnected = false;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
              setTimeout(() => this.subscribeToEventBus(), delay);
            }
          }
        });
    } catch (err) {
      console.warn('⚡ [GHN REALTIME SYNC] Subscription error:', err);
    }
  }

  public handleIncomingEvent(event: SafeSyncPayload) {
    try {
      if (!event || !event.event_type) return;

      const debounceKey = `${event.entity_type}:${event.entity_id || 'all'}`;
      if (this.debounceTimers.has(debounceKey)) {
        clearTimeout(this.debounceTimers.get(debounceKey)!);
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(debounceKey);
        this.dispatchSafeEvent(event);
      }, 100);

      this.debounceTimers.set(debounceKey, timer);
    } catch (err) {
      console.error('Error handling incoming event:', err);
    }
  }

  private dispatchSafeEvent(event: SafeSyncPayload) {
    // Notify specific event listeners
    const specificHandlers = this.listeners.get(event.event_type);
    if (specificHandlers) {
      specificHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in sync handler:', e);
        }
      });
    }

    // Notify entity group listeners (e.g. 'products.*')
    const entityGroup = `${event.entity_type}.*`;
    const entityHandlers = this.listeners.get(entityGroup);
    if (entityHandlers) {
      entityHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in entity group sync handler:', e);
        }
      });
    }

    // Notify global listeners
    this.globalListeners.forEach((handler) => {
      try {
        handler(event);
      } catch (e) {
        console.error('Error in global sync handler:', e);
      }
    });
  }

  public cleanup() {
    if (this.channel) {
      const supabase = getClientSupabase();
      if (supabase) {
        supabase.removeChannel(this.channel);
      }
      this.channel = null;
    }
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    this.listeners.clear();
    this.globalListeners.clear();
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

export const realtimeSync = new RealtimeSyncManager();
realtimeSync.init();
