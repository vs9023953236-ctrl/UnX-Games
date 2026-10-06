import { renderHook, act } from '@testing-library/react';
import { usePWAInstall, BeforeInstallPromptEvent } from '../../../src/hooks/usePWAInstall';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('usePWAInstall', () => {
  let originalUserAgent: string;
  let originalStandalone: any;
  let matchMediaMock: any;

  beforeEach(() => {
    // Save original values
    originalUserAgent = window.navigator.userAgent;
    originalStandalone = (window.navigator as any).standalone;

    // Clear global prompt event
    window.__pwaPromptEvent = undefined;

    // Default matchMedia mock
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    // Reset user agent getter
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true,
    });

    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      configurable: true,
    });

    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore navigator properties
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });

    Object.defineProperty(window.navigator, 'standalone', {
      value: originalStandalone,
      configurable: true,
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isStandalone).toBe(false);
    expect(result.current.isIOS).toBe(false);
    expect(result.current.isInstallable).toBe(false);
  });

  it('should detect standalone mode via matchMedia', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect standalone mode via navigator.standalone (iOS)', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect standalone mode via document.referrer (Android TWA)', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'android-app://com.example.app',
      configurable: true,
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect iOS devices', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isIOS).toBe(true);
  });

  it('should not detect iOS if MSStream is present', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });
    (window as any).MSStream = {};

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isIOS).toBe(false);

    delete (window as any).MSStream;
  });

  it('should handle beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstallable).toBe(false);

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(result.current.isInstallable).toBe(true);
    expect(window.__pwaPromptEvent).toBe(mockPromptEvent);
  });

  it('should handle appinstalled event', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
    expect(window.__pwaPromptEvent).toBeNull();
  });

  it('should handle successful installation via install()', async () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    let installResult;
    await act(async () => {
      installResult = await result.current.install();
    });

    expect(installResult).toBe(true);
    expect(mockPromptEvent.prompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
    expect(window.__pwaPromptEvent).toBeNull();
  });

  it('should handle dismissed installation via install()', async () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    let installResult;
    await act(async () => {
      installResult = await result.current.install();
    });

    expect(installResult).toBe(false);
    expect(mockPromptEvent.prompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isInstallable).toBe(true);
  });

  it('should return false from install() if no prompt event exists', async () => {
    const { result } = renderHook(() => usePWAInstall());

    let installResult;
    await act(async () => {
      installResult = await result.current.install();
    });

    expect(installResult).toBe(false);
  });

  it('should handle errors during installation', async () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn().mockRejectedValue(new Error('Prompt failed'));

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let installResult;
    await act(async () => {
      installResult = await result.current.install();
    });

    expect(installResult).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('PWA installation error:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should initialize correctly when window.__pwaPromptEvent is already set', () => {
    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    window.__pwaPromptEvent = mockPromptEvent;

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstallable).toBe(true);
  });
});
