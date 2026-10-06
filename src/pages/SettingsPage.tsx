import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Mail,
  Bell,
  ShieldCheck,
  BadgeCheck,
  LogOut,
  RefreshCw,
  Check,
  Copy,
  Download,
  QrCode,
  Laptop,
  ChevronRight,
  Sliders,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Users,
  Monitor,
  UserX,
  Phone,
  Share,
  PlusSquare,
  X,
} from 'lucide-react';
import { ActiveSessionsModal } from '../components/profile/ActiveSessionsModal';
import { TwoFactorBackupCodesModal } from '../components/profile/TwoFactorBackupCodesModal';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { fetchApi } from '../services/api';
import { getDisplayUserRole } from '../utils/formatters';
import { motion, AnimatePresence } from 'motion/react';

export const SettingsPage: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    changePassword,
    sendResetEmail,
    toggleTwoFactor,
    updateProfile,
    setSecurityPin,
    logout,
    enrollMfa,
    verifyMfaEnrollment,
    unenrollMfa,
    getMfaStatus,
    deleteMyAccount,
  } = useAuth();
  const { appSettings, goBack, showToast, setCurrentTab, setIsAdminView, setAdminTab } = useStore();

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Forgot password email state
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(
    Boolean(currentUser?.twoFactorEnabled ?? currentUser?.two_factor_enabled ?? false)
  );
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp'>('email');
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Security PIN state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Sessions state
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);
  const [confirmLogoutOthers, setConfirmLogoutOthers] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);

  // Notification preferences state (persisted to database)
  const initialPrefs = currentUser?.notification_preferences || {};
  const [orderNotifs, setOrderNotifs] = useState<boolean>(
    initialPrefs.orderNotifs !== undefined ? Boolean(initialPrefs.orderNotifs) : true
  );
  const [whatsappAlerts, setWhatsappAlerts] = useState<boolean>(
    initialPrefs.whatsappAlerts !== undefined ? Boolean(initialPrefs.whatsappAlerts) : true
  );
  const [promoAlerts, setPromoAlerts] = useState<boolean>(
    initialPrefs.promoAlerts !== undefined ? Boolean(initialPrefs.promoAlerts) : true
  );
  const [isSavingNotif, setIsSavingNotif] = useState<string | null>(null);

  // Self-Service Account Deletion states (Rule 75)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // PWA Prompt to Install state (triggers native beforeinstallprompt)
  const { isInstallable, isInstalled, isStandalone, isIOS, install: triggerPWAInstall } = usePWAInstall();
  const [showPWAInstallGuide, setShowPWAInstallGuide] = useState(false);
  const [isInstallingPWA, setIsInstallingPWA] = useState(false);

  const handlePromptToInstall = async () => {
    if (isInstalled || isStandalone) {
      showToast('info', 'Already Installed', 'Unx Games is already installed on this device.');
      return;
    }

    if (isIOS) {
      setShowPWAInstallGuide(true);
      return;
    }

    if (isInstallable) {
      setIsInstallingPWA(true);
      try {
        const accepted = await triggerPWAInstall();
        if (accepted) {
          showToast('success', 'App Installed!', 'Unx Games has been added to your home screen.');
        } else {
          showToast('info', 'Installation Canceled', 'You can install anytime from this Settings page.');
        }
      } catch (err: any) {
        console.warn('Install prompt error:', err);
        setShowPWAInstallGuide(true);
      } finally {
        setIsInstallingPWA(false);
      }
    } else {
      setShowPWAInstallGuide(true);
    }
  };

  const isMountedRef = React.useRef(true);

  // Clean up all modals and clear sensitive password/PIN inputs upon navigation away
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setIsSessionsModalOpen(false);
      setShowDeleteModal(false);
      setShowPWAInstallGuide(false);
      setIsInstallingPWA(false);
      setConfirmLogoutOthers(false);
      setIsChangingPass(false);
      setIsSavingPin(false);
      setIsDeletingAccount(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
      setDeleteConfirmText('');
    };
  }, []);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== 'DELETE ACCOUNT') {
      showToast('error', 'Confirmation Required', 'Please type DELETE ACCOUNT to confirm.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      const res = await deleteMyAccount(deleteConfirmText.trim());
      if (res.success) {
        showToast('info', 'Account Deleted', 'Your account has been deleted. Session closed.');
        setShowDeleteModal(false);
        setDeleteConfirmText('');
        setCurrentTab('home');
      } else {
        showToast('error', 'Deletion Failed', res.message || 'Could not delete your account.');
      }
    } catch (err: any) {
      showToast('error', 'Deletion Error', err?.message || 'Failed to process account deletion.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Keep in sync if currentUser updates
  useEffect(() => {
    if (currentUser?.notification_preferences) {
      const p = currentUser.notification_preferences;
      if (p.orderNotifs !== undefined) setOrderNotifs(Boolean(p.orderNotifs));
      if (p.whatsappAlerts !== undefined) setWhatsappAlerts(Boolean(p.whatsappAlerts));
      if (p.promoAlerts !== undefined) setPromoAlerts(Boolean(p.promoAlerts));
    }
    if (currentUser?.twoFactorEnabled !== undefined || currentUser?.two_factor_enabled !== undefined) {
      setIs2FAEnabled(Boolean(currentUser.twoFactorEnabled ?? currentUser.two_factor_enabled));
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="w-full flex-1 w-full bg-transparent">
        <div className="p-8 text-center text-slate-500 text-sm">
          Please log in to manage your account settings and security.
        </div>
      </div>
    );
  }

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, text: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 50, text: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, text: 'Good', color: 'bg-orange-500' };
      case 4:
        return { score: 100, text: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 20, text: 'Too short', color: 'bg-rose-400' };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast('error', 'Weak Password', 'New password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPass(false);

    if (res.success) {
      showToast('success', 'Password Changed', res.message || 'Your password was updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast('error', 'Failed', res.message || 'Could not update password. Please check your credentials.');
    }
  };

  const handleSendResetEmail = async () => {
    setIsSendingReset(true);
    const res = await sendResetEmail(currentUser.email);
    setIsSendingReset(false);
    if (res.success) {
      setResetEmailSent(true);
      showToast('success', 'Reset Link Sent', `Password reset instructions sent to ${currentUser.email}`);
    } else {
      showToast('error', 'Error', res.message || 'Failed to send reset email.');
    }
  };

  useEffect(() => {
    if (getMfaStatus) {
      getMfaStatus()
        .then((res) => {
          setIs2FAEnabled(Boolean(res.enrolled));
        })
        .catch(() => {});
    }
  }, [getMfaStatus]);

  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  const handleToggle2FA = () => {
    setIs2FAModalOpen(true);
  };

  const handleDisable2FADirect = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication (TOTP)?')) {
      return;
    }
    setIsToggling2FA(true);
    try {
      const res = await unenrollMfa();
      if (res.success) {
        setIs2FAEnabled(false);
        showToast('info', '2FA Deactivated', 'Authenticator app protection removed.');
      } else {
        showToast('error', 'Failed', res.message || 'Could not disable 2FA.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to remove authenticator.');
    } finally {
      setIsToggling2FA(false);
    }
  };

  const isPinConfigured = Boolean(currentUser?.has_pin || currentUser?.security_pin);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPinConfigured) {
      if (!oldPin || oldPin.length < 4 || oldPin.length > 6) {
        showToast('error', 'Old PIN Required', 'Please enter your current 4 to 6-digit Security PIN.');
        return;
      }
    }
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      showToast('error', 'Invalid PIN', 'New Security PIN must be 4 to 6 numeric digits.');
      return;
    }
    if (newPin !== confirmNewPin) {
      showToast('error', 'PIN Mismatch', 'New Security PINs do not match.');
      return;
    }
    if (isPinConfigured && oldPin === newPin) {
      showToast('error', 'Same PIN', 'New PIN cannot be the same as your old PIN.');
      return;
    }

    setIsSavingPin(true);
    const res = await setSecurityPin(newPin, isPinConfigured ? oldPin : undefined);
    setIsSavingPin(false);
    if (res.success) {
      showToast('success', isPinConfigured ? 'Security PIN Changed' : 'Security PIN Saved', res.message || 'Your security PIN has been updated.');
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
      showToast('error', 'PIN Update Failed', res.message || 'Failed to update Security PIN.');
    }
  };

  const handleLogoutOthers = async () => {
    if (!confirmLogoutOthers) {
      setConfirmLogoutOthers(true);
      return;
    }
    setConfirmLogoutOthers(false);
    setIsLoggingOutOthers(true);
    try {
      const res = await fetchApi('/api/sessions/revoke-others', { method: 'POST' });
      if (res.success) {
        showToast('success', 'Sessions Terminated', 'All other active sessions have been signed out.');
      } else {
        showToast('error', 'Error', res.message || 'Failed to revoke other sessions.');
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to communicate with server.');
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  const handleLogout = async () => {
    showToast('info', 'Signed Out', 'You have been logged out.');
    await logout();
    setCurrentTab(appSettings?.maintenanceMode ? 'home' : 'login');
  };

  const handleToggleNotification = async (key: 'orderNotifs' | 'whatsappAlerts' | 'promoAlerts') => {
    if (isSavingNotif) return;
    
    let nextOrder = orderNotifs;
    let nextWa = whatsappAlerts;
    let nextPromo = promoAlerts;

    if (key === 'orderNotifs') {
      nextOrder = !orderNotifs;
    } else if (key === 'whatsappAlerts') {
      nextWa = !whatsappAlerts;
    } else if (key === 'promoAlerts') {
      nextPromo = !promoAlerts;
    }

    setIsSavingNotif(key);
    const updatedPrefs = {
      orderNotifs: nextOrder,
      whatsappAlerts: nextWa,
      promoAlerts: nextPromo,
    };

    try {
      await updateProfile({
        notification_preferences: updatedPrefs,
      });
      // The useEffect listening to currentUser will automatically sync the local states (orderNotifs, etc.)
      const label =
        key === 'orderNotifs'
          ? 'Order updates'
          : key === 'whatsappAlerts'
          ? 'WhatsApp / SMS alerts'
          : 'Promo offers & discounts';
      const state = (key === 'orderNotifs' ? nextOrder : key === 'whatsappAlerts' ? nextWa : nextPromo)
        ? 'enabled'
        : 'disabled';
      showToast('success', 'Preferences Saved', `${label} ${state}.`);
    } catch {
      showToast('error', 'Update Failed', 'Could not sync notification settings.');
    } finally {
      setIsSavingNotif(null);
    }
  };

  return (
    <div className="w-full flex-1 w-full bg-transparent">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-1.5 pb-1 space-y-2">
        {/* User Quick Info */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-50 border border-orange-100 flex items-center justify-center text-red-600 font-black text-lg sm:text-xl shrink-0 overflow-hidden shadow-2xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser.name.charAt(0).toUpperCase()
              )}
            </div>
            {/* Verified badge on Photo */}
            {(currentUser.account_verified || currentUser.verification_status === 'verified') ? (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center shadow-xs border border-white"
                title="Verified Account"
              >
                <BadgeCheck size={20} className="text-blue-500 fill-blue-500 text-white shrink-0" />
              </div>
            ) : (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center shadow-xs"
                title="Account Active"
              >
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">{currentUser.name}</h2>
              {(currentUser.account_verified || currentUser.verification_status === 'verified') && (
                <span title="Verified Account">
                  <BadgeCheck size={18} className="text-blue-500 fill-blue-500 text-white shrink-0" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
              <Mail size={12} className="text-slate-400 shrink-0" />
              <span>{currentUser.email}</span>
            </p>
            {(currentUser.mobile || currentUser.phone) ? (
              <p className="text-xs text-slate-700 font-medium truncate flex items-center gap-1.5 mt-0.5">
                <Phone size={12} className="text-red-600 shrink-0" />
                <span className="font-semibold text-slate-900">{currentUser.mobile || currentUser.phone}</span>
              </p>
            ) : null}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {is2FAEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-black border border-orange-100">
                  <Shield size={11} /> 2FA Active
                </span>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-black border border-red-200">
                  <Sparkles size={11} /> {getDisplayUserRole(currentUser)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ADMIN QUICK ACCESS PANEL (IF ADMIN) */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 text-white rounded-2xl p-4 shadow-sm border border-red-500/30"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center border border-red-400/30">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">Admin Management Hub</h3>
                  <p className="text-[10px] sm:text-[11px] text-red-200/80 font-medium">
                    Database-synced store administration
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[9px] font-extrabold uppercase border border-emerald-400/30">
                Live DB Connected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdminView(true);
                  setAdminTab('orders');
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all text-left flex items-center justify-between border border-white/10 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingBag size={14} className="text-amber-300 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">Orders &amp; Top-Ups</span>
                </div>
                <ChevronRight size={13} className="text-white/60 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAdminView(true);
                  setAdminTab('users');
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all text-left flex items-center justify-between border border-white/10 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users size={14} className="text-indigo-300 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">User Accounts</span>
                </div>
                <ChevronRight size={13} className="text-white/60 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAdminView(true);
                  setAdminTab('payment_settings');
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all text-left flex items-center justify-between border border-white/10 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard size={14} className="text-emerald-300 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">Payment QR / Accounts</span>
                </div>
                <ChevronRight size={13} className="text-white/60 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAdminView(true);
                  setAdminTab('app_settings');
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all text-left flex items-center justify-between border border-white/10 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sliders size={14} className="text-red-300 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">System Controls</span>
                </div>
                <ChevronRight size={13} className="text-white/60 shrink-0" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ACCOUNT SECURITY RATING DASHBOARD */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden border border-red-900/30">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-orange-300 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Security Health Score</span>
                </div>
                <div className="text-xl font-black text-white mt-0.5">
                  {is2FAEnabled && isPinConfigured
                    ? '100% Maximum'
                    : is2FAEnabled || isPinConfigured
                    ? '85% Strong'
                    : '65% Standard'}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    is2FAEnabled && isPinConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  }`}
                >
                  {is2FAEnabled && isPinConfigured ? 'Fully Guarded' : 'Action Recommended'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  is2FAEnabled && isPinConfigured
                    ? 'w-full bg-emerald-400'
                    : is2FAEnabled || isPinConfigured
                    ? 'w-[85%] bg-orange-400'
                    : 'w-[65%] bg-amber-400'
                }`}
              />
            </div>

            {/* Checklist Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
              <div className="bg-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px]">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span className="truncate">Password Active</span>
              </div>
              <div className="bg-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px]">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span className="truncate">Email Verified</span>
              </div>
              <div
                className={`rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] ${
                  is2FAEnabled ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-slate-400'
                }`}
              >
                {is2FAEnabled ? (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={12} className="text-amber-400 shrink-0" />
                )}
                <span className="truncate">{is2FAEnabled ? '2FA Active' : '2FA Off'}</span>
              </div>
              <div
                className={`rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] ${
                  isPinConfigured ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-slate-400'
                }`}
              >
                {isPinConfigured ? (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={12} className="text-amber-400 shrink-0" />
                )}
                <span className="truncate">{isPinConfigured ? 'PIN Set' : 'PIN Needed'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. PASSWORD & SECURITY SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Change Password</h3>
                <p className="text-[11px] text-slate-500 font-medium">Update your login security credentials</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-4 sm:p-4.5 space-y-3">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white rounded-xl px-4 py-2.5 pr-10 text-xs font-medium text-slate-900 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white rounded-xl px-4 py-2.5 pr-10 text-xs font-medium text-slate-900 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className="font-bold text-slate-700">{strength.text}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white rounded-xl px-4 py-2.5 pr-10 text-xs font-medium text-slate-900 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={isChangingPass || !newPassword}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isChangingPass ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Lock size={14} />
                )}
                <span>{isChangingPass ? 'Updating...' : 'Save New Password'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isSendingReset}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSendingReset ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                <span>Forgot Password? Send Link</span>
              </button>
            </div>

            {resetEmailSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Password reset link sent to <strong>{currentUser.email}</strong>. Check your inbox or spam folder.
                </span>
              </div>
            )}
          </form>
        </div>

        {/* 2. TWO-STEP VERIFICATION (SUPABASE AUTH TOTP MFA) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Smartphone size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Two-Factor Authentication (TOTP)</h3>
                <p className="text-[11px] text-slate-500">Google Authenticator, Microsoft Authenticator, or Authy</p>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                is2FAEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {is2FAEnabled ? 'TOTP ACTIVE' : 'OFF'}
            </span>
          </div>

          <div className="p-4 space-y-3.5">
            {is2FAEnabled ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Authenticator App Protection Active</p>
                      <p className="text-[11px] text-emerald-700">
                        Logins require your standard credentials plus a 6-digit TOTP code.
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider shrink-0">
                    AAL2 SECURED
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleToggle2FA}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors cursor-pointer"
                  >
                    Manage Authenticator
                  </button>
                  <button
                    type="button"
                    onClick={handleDisable2FADirect}
                    disabled={isToggling2FA}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isToggling2FA ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-red-50/60 border border-red-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={18} className="text-red-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">Two-Factor Authentication is currently disabled</p>
                    <p className="text-[11px] text-slate-500">
                      Add an extra layer of protection to safeguard your wallet, orders, and gamer identity.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggle2FA}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <QrCode size={14} />
                  <span>Setup Authenticator</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. GAMER SECURITY PIN (QUICK LOGIN & TRANSACTIONS) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Lock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Gamer Security PIN</h3>
                <p className="text-[11px] text-slate-500">4 to 6-digit PIN for quick login &amp; wallet payments</p>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                isPinConfigured
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isPinConfigured ? 'PIN Active' : 'Not Set'}
            </span>
          </div>

          <form onSubmit={handleSavePin} className="p-4 space-y-3">
            {isPinConfigured && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <span>Current (Old) Security PIN</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-medium">Identity verification</span>
                </div>
                <div className="relative">
                  <input
                    type={showOldPin ? 'text' : 'password'}
                    maxLength={6}
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter current 4-6 digit PIN"
                    className="w-full bg-white border border-amber-300/80 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPin(!showOldPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-800 cursor-pointer"
                  >
                    {showOldPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {isPinConfigured ? 'New 4-6 Digit PIN' : 'Enter 4-6 Digit PIN'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter new 4-6 digits"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Confirm New PIN</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repeat new 4-6 digits"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPin || !newPin || newPin.length < 4 || (isPinConfigured && (!oldPin || oldPin.length < 4))}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              {isSavingPin ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
              <span>{isPinConfigured ? 'Change Security PIN' : 'Save Security PIN'}</span>
            </button>
          </form>
        </div>

        {/* 4. ACTIVE SESSIONS & DEVICE SECURITY */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Laptop size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Active Sessions &amp; Devices</h3>
                <p className="text-[11px] text-slate-500">Manage devices logged into this account</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-red-700 flex items-center justify-center">
                  <Smartphone size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">Mobile / Web Browser</span>
                    <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 text-[9px] font-black">
                      THIS DEVICE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Kathmandu, Nepal • Active now</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <button
              type="button"
              onClick={() => setIsSessionsModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-red-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Monitor size={13} />
              <span>View All Active Sessions & Devices</span>
            </button>

            <button
              type="button"
              onClick={handleLogoutOthers}
              disabled={isLoggingOutOthers}
              className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                confirmLogoutOthers
                  ? 'border-amber-400 bg-amber-500 text-white animate-pulse'
                  : 'border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-700'
              }`}
            >
              {isLoggingOutOthers ? <RefreshCw size={13} className="animate-spin" /> : <LogOut size={13} />}
              <span>{confirmLogoutOthers ? 'Click Again to Confirm Sign Out All Others' : 'Sign Out from All Other Devices'}</span>
            </button>
          </div>
        </div>

        {/* 5. APP INSTALLATION & PWA PROMPT (NATIVE-LIKE DISCOVERABILITY) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Smartphone size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Install Mobile App (PWA)</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Add Unx Games to your phone home screen for a fast native experience
                </p>
              </div>
            </div>
            {isStandalone || isInstalled ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 size={11} className="text-emerald-600" />
                <span>Installed</span>
              </span>
            ) : isInstallable ? (
              <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-violet-200 animate-pulse">
                <Sparkles size={11} className="text-violet-600" />
                <span>Ready</span>
              </span>
            ) : isIOS ? (
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider border border-sky-200">
                iOS Ready
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                Web App
              </span>
            )}
          </div>

          <div className="p-4 sm:p-4.5 space-y-3.5">
            {/* Benefits highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0 font-black">
                  ⚡
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">Instant Launch</p>
                  <p className="text-[10px] text-slate-500 truncate">Opens directly like an APK</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs shrink-0 font-black">
                  📱
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">Fullscreen View</p>
                  <p className="text-[10px] text-slate-500 truncate">No browser URL bar</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0 font-black">
                  🛡️
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">Offline Ready</p>
                  <p className="text-[10px] text-slate-500 truncate">Cached assets & safe data</p>
                </div>
              </div>
            </div>

            {/* Prompt to Install Button */}
            {isStandalone || isInstalled ? (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-bold">App is installed and running in native standalone mode</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700">Native PWA</span>
              </div>
            ) : (
              <button
                type="button"
                id="settings-prompt-to-install-btn"
                onClick={handlePromptToInstall}
                disabled={isInstallingPWA}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isInstallingPWA ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Prompting Browser...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} className="stroke-[2.5]" />
                    <span>Prompt to Install</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 6. NOTIFICATION PREFERENCES (DATABASE PERSISTED & ACCESSIBLE) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Notifications &amp; Alerts</h3>
              <p className="text-[11px] text-slate-500">Manage how you receive top-up updates</p>
            </div>
          </div>

          <div className="p-4 sm:p-4.5 divide-y divide-slate-100">
            {/* 1. Order Delivery Updates */}
            <div
              onClick={() => handleToggleNotification('orderNotifs')}
              className={`flex items-center justify-between pb-3.5 group select-none ${isSavingNotif === 'orderNotifs' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                  Order Delivery Updates
                </p>
                <p className="text-[11px] text-slate-500">Real-time alerts when top-up is completed</p>
              </div>
              <button
                type="button"
                aria-label="Toggle Order Delivery Updates"
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  orderNotifs ? 'bg-red-600' : 'bg-slate-300'
                } ${isSavingNotif === 'orderNotifs' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    orderNotifs ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {isSavingNotif === 'orderNotifs' && <RefreshCw size={10} className="animate-spin text-slate-400" />}
                </span>
              </button>
            </div>

            {/* 2. WhatsApp / SMS Alerts */}
            <div
              onClick={() => handleToggleNotification('whatsappAlerts')}
              className={`flex items-center justify-between py-3.5 group select-none ${isSavingNotif === 'whatsappAlerts' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                  WhatsApp / SMS Alerts
                </p>
                <p className="text-[11px] text-slate-500">
                  Notify order status to {currentUser.phone || 'registered mobile number'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Toggle WhatsApp & SMS Alerts"
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  whatsappAlerts ? 'bg-red-600' : 'bg-slate-300'
                } ${isSavingNotif === 'whatsappAlerts' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    whatsappAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {isSavingNotif === 'whatsappAlerts' && <RefreshCw size={10} className="animate-spin text-slate-400" />}
                </span>
              </button>
            </div>

            {/* 3. Promo Offers & Discounts (Last Toggle) */}
            <div
              id="settings-promo-alerts-toggle-row"
              onClick={() => handleToggleNotification('promoAlerts')}
              className={`flex items-center justify-between pt-3.5 group select-none ${isSavingNotif === 'promoAlerts' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="pr-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                    Promo Offers &amp; Discounts
                  </p>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase tracking-wider">
                    Deals
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Get notified of Free Fire &amp; PUBG discount events and voucher drops
                </p>
              </div>
              <button
                type="button"
                id="settings-promo-alerts-switch"
                aria-label="Toggle Promo Offers and Discounts"
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  promoAlerts ? 'bg-red-600' : 'bg-slate-300'
                } ${isSavingNotif === 'promoAlerts' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    promoAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {isSavingNotif === 'promoAlerts' && <RefreshCw size={10} className="animate-spin text-slate-400" />}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 6. DANGER ZONE - ACCOUNT DELETION */}
        <div className="bg-white rounded-2xl border border-rose-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <UserX size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Delete Account</h3>
                <p className="text-[11px] text-slate-500 font-medium">Permanently purge your account credentials</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-rose-100/70 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
              Permanent
            </span>
          </div>

          <div className="p-4 sm:p-4.5 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting your account immediately revokes login access and Supabase Auth credentials. In compliance with financial audit regulations, past order records are anonymized and retained.
            </p>

            {isAdmin ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Administrative Account:</span> Staff and administrator accounts are protected and cannot be self-deleted. Please contact the Store Owner for personnel changes.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText('');
                  setShowDeleteModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs cursor-pointer transition-colors flex items-center gap-2"
              >
                <UserX size={14} />
                <span>Delete My Account</span>
              </button>
            )}
          </div>
        </div>

        {/* 7. LOG OUT ACTION */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/90 hover:bg-rose-100 active:scale-[0.98] text-rose-600 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <LogOut size={16} className="stroke-[2.5]" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <UserX size={24} />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Permanently Delete Your Account?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action is permanent and cannot be undone. All active sessions, authentication tokens, and personal details will be deleted immediately.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 text-left space-y-1">
                  <p className="font-semibold text-slate-800">What happens:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                    <li>Your Supabase Auth account and password will be deleted</li>
                    <li>You will be immediately signed out on all devices</li>
                    <li>Past order histories are anonymized for tax &amp; audit records</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Type <span className="text-rose-600 font-mono font-black">DELETE ACCOUNT</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE ACCOUNT"
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all text-slate-900 placeholder:text-slate-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConfirmText.trim() === 'DELETE ACCOUNT' && !isDeletingAccount) {
                      e.preventDefault();
                      handleDeleteAccount();
                    }
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingAccount || deleteConfirmText.trim() !== 'DELETE ACCOUNT'}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeletingAccount ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA Install Guide Modal for iOS or manual instructions */}
      <AnimatePresence>
        {showPWAInstallGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setShowPWAInstallGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Install Unx Games App
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Add to your Phone Home Screen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPWAInstallGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 my-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        Tap the <strong className="text-slate-900 font-bold inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-slate-200/80 rounded text-[11px]"><Share size={12} /> Share</strong> icon in your Safari bottom bar.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        Scroll down and tap <strong className="text-slate-900 font-bold inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-slate-200/80 rounded text-[11px]"><PlusSquare size={12} /> Add to Home Screen</strong>.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        Tap <strong className="text-violet-600 font-bold">Add</strong> at top right to launch like a native iOS app!
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        In your browser (Chrome), tap the <strong className="text-slate-900 font-bold">Menu (⋮ 3 vertical dots)</strong> at top right.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        Select <strong className="text-violet-600 font-bold inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-violet-50 rounded text-[11px]"><Download size={12} /> Install app</strong> (or <em>Add to Home screen</em>).
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        Open Unx Games anytime from your home screen with zero browser bars!
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPWAInstallGuide(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ActiveSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
      />

      <TwoFactorBackupCodesModal
        isOpen={is2FAModalOpen}
        onClose={() => {
          setIs2FAModalOpen(false);
          getMfaStatus?.()
            .then((r) => setIs2FAEnabled(Boolean(r?.enrolled)))
            .catch(() => {});
        }}
        currentUser={currentUser}
      />
    </div>
  );
};
export default SettingsPage;
