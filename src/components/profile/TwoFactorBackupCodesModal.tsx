import DOMPurify from 'dompurify';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ModalPortal } from '../common/ModalPortal';
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  X,
  Lock,
  KeyRound,
  AlertTriangle,
  QrCode,
  Smartphone,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

interface TwoFactorBackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const TwoFactorBackupCodesModal: React.FC<TwoFactorBackupCodesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { enrollMfa, verifyMfaEnrollment, unenrollMfa, getMfaStatus } = useAuth();
  const { showToast } = useStore();

  const [step, setStep] = useState<'status' | 'enroll' | 'confirm_disable'>('status');
  const [is2FAActive, setIs2FAActive] = useState(
    Boolean(currentUser?.twoFactorEnabled ?? currentUser?.two_factor_enabled ?? false)
  );
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Enrollment payload from Supabase Auth
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check live MFA status when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('status');
      setErrorMessage(null);
      setVerificationCode('');
      setLoading(true);

      getMfaStatus()
        .then((res) => {
          setIs2FAActive(Boolean(res.enrolled));
        })
        .catch(() => {
          setIs2FAActive(Boolean(currentUser?.twoFactorEnabled ?? currentUser?.two_factor_enabled ?? false));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, currentUser]);

  // Start TOTP Factor enrollment via Supabase Auth
  const handleStartEnrollment = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await enrollMfa();
      if (res.success && res.factorId) {
        setFactorId(res.factorId);
        setQrCodeSvg(res.qrCodeSvg || null);
        setSecret(res.secret || null);
        setStep('enroll');
      } else {
        setErrorMessage(res.message || 'Failed to initialize TOTP authenticator enrollment.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start authenticator setup.');
    } finally {
      setLoading(false);
    }
  };

  // Verify newly scanned TOTP Code
  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !verificationCode.trim()) {
      setErrorMessage('Please enter the 6-digit code shown in your authenticator app.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await verifyMfaEnrollment(factorId, verificationCode.trim());
      if (res.success) {
        setIs2FAActive(true);
        setStep('status');
        showToast('success', 'Two-Factor Activated', 'Authenticator app (TOTP) successfully connected to your account.');
      } else {
        setErrorMessage(res.message || 'Invalid or expired 6-digit code. Please check your authenticator clock.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Unenroll / Disable MFA Factor via Supabase Auth
  const handleDisableMfa = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await unenrollMfa();
      if (res.success) {
        setIs2FAActive(false);
        setStep('status');
        showToast('info', 'Two-Factor Deactivated', 'Authenticator app protection removed.');
      } else {
        setErrorMessage(res.message || 'Failed to disable Two-Factor Authentication.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while disabling 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    showToast('success', 'Key Copied', 'Setup key copied to clipboard.');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
          >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-red-50 via-white to-orange-50 text-slate-900 p-4 sm:p-5 overflow-hidden border-b border-slate-100">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white flex items-center justify-center border border-orange-200 text-orange-600 shrink-0 shadow-xs">
                  <Smartphone size={22} className="stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-snug">
                      Two-Factor Authentication
                    </h2>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        is2FAActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {is2FAActive ? 'ACTIVE (TOTP)' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                    Supabase Auth TOTP App Authenticator
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: STATUS OVERVIEW */}
            {step === 'status' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        is2FAActive
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {is2FAActive ? (
                        <ShieldCheck size={22} className="stroke-[2.2]" />
                      ) : (
                        <ShieldAlert size={22} className="stroke-[2.2]" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-slate-900 block">
                        {is2FAActive
                          ? 'Authenticator Protection Active'
                          : 'Authenticator Protection Disabled'}
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        {is2FAActive
                          ? '6-digit time-based code required at every login'
                          : 'Link Google Authenticator, Authy, or Microsoft Authenticator'}
                      </p>
                    </div>
                  </div>
                </div>

                {is2FAActive ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Secured with Supabase TOTP Authenticator</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Your account requires a 6-digit TOTP code generated by your mobile authenticator app whenever signing in from a new browser or session.
                    </p>
                    <div className="pt-2 border-t border-emerald-200/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep('confirm_disable')}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                      >
                        Disable Authenticator App
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50/60 border border-red-200/70 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-inner">
                      <Lock size={24} className="stroke-[2.2]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Set Up TOTP Authenticator</h4>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed mt-1">
                        Protect your gamer account and wallet with industry-standard 2FA. Works with Google Authenticator, Microsoft Authenticator, and Authy.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartEnrollment}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-700/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                      <span>{loading ? 'Starting Setup...' : 'Setup Authenticator App'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SCAN QR CODE & ENTER 6-DIGIT TOTP */}
            {step === 'enroll' && (
              <form onSubmit={handleVerifyEnrollment} className="space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-black text-slate-900">Scan QR Code</h4>
                  <p className="text-[11px] text-slate-500">
                    Open your Authenticator app (Google Authenticator, Microsoft Authenticator, Authy) and scan this QR code.
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-center">
                  {qrCodeSvg ? (
                    qrCodeSvg.startsWith('data:') || qrCodeSvg.startsWith('http') ? (
                      <img
                        src={qrCodeSvg}
                        alt="TOTP QR Code"
                        referrerPolicy="no-referrer"
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(qrCodeSvg) }}
                        className="w-44 h-44 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      />
                    )
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>

                {/* Secret Key for manual entry */}
                {secret && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Can't scan? Enter key manually:</span>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {copiedSecret ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-800 tracking-wider break-all bg-white px-2 py-1 rounded border border-slate-200 select-all">
                      {secret}
                    </div>
                  </div>
                )}

                {/* Enter 6-digit Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block text-center">
                    Enter the 6-digit code from your app:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center text-2xl font-mono font-bold tracking-[8px] py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-red-600 focus:ring-3 focus:ring-red-600/15 transition-all outline-none"
                    autoFocus
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('status');
                      setErrorMessage(null);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || verificationCode.trim().length !== 6}
                    className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-red-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>{loading ? 'Verifying...' : 'Verify & Activate'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: CONFIRM DISABLE */}
            {step === 'confirm_disable' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="text-sm font-black text-rose-950">Disable Two-Factor Authentication?</h4>
                <p className="text-xs text-rose-800 max-w-sm mx-auto leading-relaxed">
                  Your account will no longer require a 6-digit authenticator code to sign in. This decreases the security of your wallet and account.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('status')}
                    className="flex-1 py-2 px-3 rounded-xl bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Keep Protected
                  </button>
                  <button
                    type="button"
                    onClick={handleDisableMfa}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{loading ? 'Disabling...' : 'Yes, Disable 2FA'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              Done &amp; Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  </ModalPortal>
  );
};

export default TwoFactorBackupCodesModal;
