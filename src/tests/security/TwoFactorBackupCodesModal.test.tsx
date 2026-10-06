import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, describe, vi } from 'vitest';
import TwoFactorBackupCodesModal from '../../components/profile/TwoFactorBackupCodesModal';
import { AuthProvider } from '../../context/AuthContext';
import { StoreProvider } from '../../context/StoreContext';
import * as AuthContextObj from '../../context/AuthContext';

// Mock lucide-react to prevent issues rendering SVGs in tests
vi.mock('lucide-react', () => {
  const Icon = () => <span>Icon</span>;
  return {
    ShieldCheck: Icon,
    ShieldAlert: Icon,
    Copy: Icon,
    Check: Icon,
    X: Icon,
    Lock: Icon,
    KeyRound: Icon,
    AlertTriangle: Icon,
    QrCode: Icon,
    Smartphone: Icon,
    Loader2: Icon,
    RefreshCw: Icon,
    CheckCircle2: Icon,
  };
});

const mockCurrentUser = {
  id: 'user-123',
  email: 'test@example.com',
  twoFactorEnabled: false
};

const mockAuthContext = {
  currentUser: mockCurrentUser,
  enrollMfa: vi.fn().mockResolvedValue({
    success: true,
    factorId: 'factor-123',
    qrCodeSvg: '<svg id="legit-svg"></svg><script>alert("XSS")</script><img src="x" onerror="alert(1)">'
  }),
  verifyMfaEnrollment: vi.fn(),
  unenrollMfa: vi.fn(),
  getMfaStatus: vi.fn().mockResolvedValue({ enrolled: false }),
  loading: false,
  authStatus: 'authenticated',
  isAuthenticated: true,
  isAdmin: false,
  user: null,
  session: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  checkSession: vi.fn(),
  syncUser: vi.fn()
};

describe('TwoFactorBackupCodesModal XSS vulnerability', () => {
  it('sanitizes qrCodeSvg before rendering to prevent XSS', async () => {
    // Override the AuthContext hook
    vi.spyOn(AuthContextObj, 'useAuth').mockReturnValue(mockAuthContext as any);

    render(
      <StoreProvider>
        <TwoFactorBackupCodesModal isOpen={true} onClose={() => {}} currentUser={mockCurrentUser as any} />
      </StoreProvider>
    );

    // Check for "Setup Authenticator App" button
    const setupButton = await screen.findByText('Setup Authenticator App');
    expect(setupButton).toBeTruthy();

    // Click to start enrollment which triggers enrollMfa
    setupButton.click();

    // Wait for the form to appear with the instruction text
    await waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeTruthy();
    });

    // Now verify the script tags were removed from the DOM
    const scriptTags = document.querySelectorAll('script');
    let xssFound = false;
    scriptTags.forEach(script => {
      if (script.innerHTML.includes('alert("XSS")')) {
        xssFound = true;
      }
    });
    expect(xssFound).toBe(false);

    // Ensure the img tag with onerror was sanitized
    const imgTags = document.querySelectorAll('img');
    let onerrorFound = false;
    imgTags.forEach(img => {
      if (img.getAttribute('onerror')) {
        onerrorFound = true;
      }
    });
    expect(onerrorFound).toBe(false);

    // Make sure legit content is still rendered
    // SVG tag might be sanitized or changed by DOMPurify but basic structure is there
    const modalContainer = screen.getByText('Scan QR Code').closest('div')?.parentElement;
    expect(modalContainer?.innerHTML).not.toContain('<script>alert("XSS")</script>');
    expect(modalContainer?.innerHTML).not.toContain('onerror="alert(1)"');
  });
});
