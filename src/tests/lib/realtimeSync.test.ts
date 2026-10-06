import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realtimeSync, SafeSyncPayload } from '../../lib/realtimeSync';

// Mock getClientSupabase
vi.mock('../../lib/supabase', () => ({
  getClientSupabase: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

describe('RealtimeSyncManager', () => {
  let originalWindow: typeof window;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    originalWindow = global.window;
    realtimeSync.cleanup();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalWindow !== undefined) {
      global.window = originalWindow;
    } else {
      // @ts-ignore
      delete global.window;
    }
    vi.restoreAllMocks();
  });

  describe('SSR Initialization Check', () => {
    it('should return early from init() when window is undefined (SSR mode)', () => {
      // @ts-ignore
      delete global.window;
      const subscribeToEventBusSpy = vi.spyOn(realtimeSync as any, 'subscribeToEventBus');
      realtimeSync.init();
      expect(subscribeToEventBusSpy).not.toHaveBeenCalled();
    });

    it('should call subscribeToEventBus from init() when window is defined (Client mode)', () => {
      global.window = {} as any;
      const subscribeToEventBusSpy = vi.spyOn(realtimeSync as any, 'subscribeToEventBus');
      realtimeSync.init();
      expect(subscribeToEventBusSpy).toHaveBeenCalled();
    });
  });

  describe('handleIncomingEvent', () => {
    it('should gracefully handle malformed payloads without throwing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      expect(() => {
        (realtimeSync as any).handleIncomingEvent(null as unknown as SafeSyncPayload);
        (realtimeSync as any).handleIncomingEvent({} as SafeSyncPayload);
        (realtimeSync as any).handleIncomingEvent({
          event_type: 'test_event',
        } as SafeSyncPayload);
      }).not.toThrow();

      const maliciousPayload = {} as SafeSyncPayload;
      Object.defineProperty(maliciousPayload, 'entity_type', {
        get: () => {
          throw new Error('Simulated error on access');
        },
      });
      Object.defineProperty(maliciousPayload, 'event_type', {
        get: () => 'valid_event',
      });

      expect(() => {
        (realtimeSync as any).handleIncomingEvent(maliciousPayload);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling incoming event:',
        expect.any(Error)
      );
    });

    it('should process and dispatch well-formed payloads correctly', () => {
      const handler = vi.fn();
      realtimeSync.subscribe('test_event', handler);

      const payload: SafeSyncPayload = {
        event_type: 'test_event',
        entity_type: 'test_entity',
        entity_id: '123',
      };

      (realtimeSync as any).handleIncomingEvent(payload);
      vi.advanceTimersByTime(200);
      expect(handler).toHaveBeenCalledWith(payload);
    });
  });
});
