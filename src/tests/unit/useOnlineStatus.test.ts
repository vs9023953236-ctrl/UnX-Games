import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  let navigatorOnLineSpy: any;

  beforeEach(() => {
    navigatorOnLineSpy = vi.spyOn(navigator, 'onLine', 'get');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize as online by default', () => {
    navigatorOnLineSpy.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should initialize as offline if navigator.onLine is false', () => {
    navigatorOnLineSpy.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should handle offline and online events', () => {
    navigatorOnLineSpy.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    // wasOffline remains true once it has been offline
    expect(result.current.wasOffline).toBe(true);
  });

  it('should remove event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
