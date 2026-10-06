import DOMPurify from "dompurify";
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import { ModalPortal } from '../common/ModalPortal';
import { 
  User as UserIcon, 
  Phone, 
  MapPin, 
  Gamepad2, 
  ShieldCheck, 
  ShieldAlert,
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Check,
  Flame,
  Crosshair,
  Swords,
  Trophy,
  X,
  KeyRound,
  Shield,
  Copy,
  CheckCheck,
  QrCode,
  Smartphone,
  Loader2,
  AlertTriangle,
  RotateCw,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface AccountSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave?: (updatedData: {
    name: string;
    phone: string;
    district: string;
    city: string;
    address: string;
    gamer_id?: string;
    photoURL?: string;
  }) => Promise<void>;
}

const NEPAL_DISTRICTS = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kaski (Pokhara)', 'Chitwan', 
  'Morang (Biratnagar)', 'Rupandehi (Butwal)', 'Sunsari (Dharan)', 'Jhapa', 
  'Kavrepalanchok', 'Dhanusha (Janakpur)', 'Banke (Nepalgunj)', 'Kailali (Dhangadhi)', 
  'Makwanpur (Hetauda)', 'Gorkha', 'Tanahun', 'Parsa (Birgunj)', 'Nawalparasi', 
  'Surkhet', 'Dang'
];

const POPULAR_GAMES = [
  { id: 'free_fire', name: 'Free Fire', icon: Flame, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'pubg_mobile', name: 'PUBG Mobile', icon: Crosshair, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  { id: 'mlbb', name: 'Mobile Legends', icon: Swords, color: 'text-red-500 bg-red-50 border-red-200' },
  { id: 'general', name: 'Other Games', icon: Trophy, color: 'text-orange-500 bg-orange-50 border-orange-200' },
];

const GAMER_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=SamuraiPro',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=PhoenixCaptain',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=ValkyrieQueen',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=ApexTitan',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=ViperElite',
  'https://api.dicebear.com/9.x/bottts/svg?seed=CyberMecha',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=DragonNinja',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=ShadowMystic',
];

export const AccountSetupWizardModal: React.FC<AccountSetupWizardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const auth = useAuth();
  const saveAccountSetup = auth.saveAccountSetup;
  const setAuthSecurityPin = auth.setSecurityPin;
  const refreshUser = (auth as any).refreshUser;
  const { showToast } = useStore();

  const [step, setStep] = useState<number>(currentUser?.setup_step && currentUser.setup_step <= 6 ? currentUser.setup_step : 1);
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [phone, setPhone] = useState(currentUser?.phone || currentUser?.mobile || '');
  const [district, setDistrict] = useState(currentUser?.district || 'Kathmandu');
  const [city, setCity] = useState(currentUser?.city || 'Kathmandu');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || GAMER_AVATARS[0]);
  
  // Game UIDs per game
  const [selectedGame, setSelectedGame] = useState('free_fire');
  const [gameUids, setGameUids] = useState<Record<string, string>>(() => currentUser?.game_uids || (currentUser?.gamer_id ? { free_fire: currentUser.gamer_id } : {}));
  
  // Password Change System
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA Security System (Supabase Auth TOTP Authenticator)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(Boolean(currentUser?.two_factor_enabled || currentUser?.twoFactorEnabled));
  const [mfaStep, setMfaStep] = useState<'status' | 'enroll' | 'confirm_disable'>('status');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCodeSvg, setMfaQrCodeSvg] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Security PIN
  const isPinConfigured = Boolean(currentUser?.has_pin || currentUser?.security_pin);
  const [oldPin, setOldPin] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [wantsToChangePin, setWantsToChangePin] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setPhone(currentUser.phone || currentUser.mobile || '');
      setDistrict(currentUser.district || 'Kathmandu');
      setCity(currentUser.city || 'Kathmandu');
      setAddress(currentUser.address || '');
      setPhotoURL(currentUser.photoURL || GAMER_AVATARS[0]);
      setGameUids(currentUser.game_uids || (currentUser?.gamer_id ? { free_fire: currentUser.gamer_id } : {}));
      setTwoFactorEnabled(Boolean(currentUser?.two_factor_enabled || currentUser?.twoFactorEnabled));
      setMfaStep('status');
      setMfaFactorId(null);
      setMfaQrCodeSvg(null);
      setMfaSecret(null);
      setMfaVerificationCode('');
      setOldPin('');
      setSecurityPin('');
      setConfirmPin('');
      setShowOldPin(false);
      setShowPin(false);
      setWantsToChangePin(false);
      setValidationError(null);
    }
  }, [currentUser, isOpen]);

  // Proactively check and sync real-time Supabase MFA status from server
  useEffect(() => {
    if (isOpen) {
      auth.getMfaStatus?.()
        .then((res) => {
          if (res && res.success) {
            if (res.enrolled) {
              setTwoFactorEnabled(true);
            } else if (!currentUser?.two_factor_enabled && !currentUser?.twoFactorEnabled) {
              setTwoFactorEnabled(false);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, step, auth, currentUser?.two_factor_enabled, currentUser?.twoFactorEnabled]);

  if (!isOpen) return null;

  const validateCurrentStep = (): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!name.trim()) {
        setValidationError('Please enter your Display / Gamer Name.');
        return false;
      }
    } else if (step === 2) {
      if (!phone.trim()) {
        setValidationError('Please enter your Nepal Mobile Number.');
        return false;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        setValidationError('Please enter a valid 10-digit mobile number (e.g., 98XXXXXXXX).');
        return false;
      }
    } else if (step === 3) {
      // Game Player UID is optional
    } else if (step === 4) {
      if (newPassword.trim()) {
        if (!currentPassword.trim()) {
          setValidationError('Please enter your Current Password to change to a new password.');
          return false;
        }
        if (newPassword.trim().length < 6) {
          setValidationError('New password must be at least 6 characters long.');
          return false;
        }
        if (newPassword.trim() !== confirmNewPassword.trim()) {
          setValidationError('New Password and Confirm Password do not match.');
          return false;
        }
      }
    } else if (step === 5) {
      // 2FA step is optional, but if enrolling and code entered, ensure 6 digits
      if (mfaStep === 'enroll' && mfaVerificationCode.trim() && mfaVerificationCode.trim().length !== 6) {
        setValidationError('Authenticator TOTP code must be exactly 6 digits.');
        return false;
      }
    } else if (step === 6) {
      if (isPinConfigured) {
        if (securityPin.trim() || oldPin.trim() || wantsToChangePin) {
          if (!oldPin.trim() || !/^\d{4,6}$/.test(oldPin.trim())) {
            setValidationError('Please enter your Current (Old) 4-digit Security PIN to change it.');
            return false;
          }
          if (!securityPin.trim() || !/^\d{4,6}$/.test(securityPin.trim())) {
            setValidationError('Please enter your New 4-digit Security PIN.');
            return false;
          }
          if (confirmPin.trim() && securityPin.trim() !== confirmPin.trim()) {
            setValidationError('New PIN and Confirm PIN do not match.');
            return false;
          }
          if (oldPin.trim() === securityPin.trim()) {
            setValidationError('New PIN cannot be the same as your current PIN.');
            return false;
          }
        }
      } else {
        if (securityPin.trim()) {
          if (!/^\d{4,6}$/.test(securityPin.trim())) {
            setValidationError('Security PIN must be 4 numeric digits.');
            return false;
          }
          if (confirmPin.trim() && securityPin.trim() !== confirmPin.trim()) {
            setValidationError('PIN and Confirm PIN do not match.');
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleChangePasswordNow = async () => {
    if (!currentPassword.trim()) {
      setValidationError('Please enter your current password.');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setValidationError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setValidationError('New Password and Confirm Password do not match.');
      return;
    }

    setIsChangingPassword(true);
    setValidationError(null);
    try {
      const res = await api.auth.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      if (res && res.success) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        showToast('success', 'Password Updated!', 'Your account password has been changed securely.');
      } else {
        setValidationError(res?.message || 'Failed to change password. Please verify current password.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Error updating password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleStartMfaEnrollment = async () => {
    setMfaLoading(true);
    setValidationError(null);
    try {
      const res = await auth.enrollMfa();
      if (res && res.success && res.factorId) {
        setMfaFactorId(res.factorId);
        setMfaQrCodeSvg(res.qrCodeSvg || null);
        setMfaSecret(res.secret || null);
        setMfaVerificationCode('');
        setMfaStep('enroll');
        showToast('info', 'QR Code Ready', 'Scan the QR code with Google Authenticator or Authy.');
      } else {
        setValidationError(res?.message || 'Failed to generate 2FA QR code. Please try again.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Could not initiate 2FA enrollment.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfaCode = async () => {
    if (!mfaFactorId) {
      setValidationError('No active 2FA enrollment session found.');
      return;
    }
    const cleanCode = mfaVerificationCode.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setValidationError('Please enter the 6-digit code shown on your Authenticator App.');
      return;
    }

    setMfaLoading(true);
    setValidationError(null);
    try {
      const res = await auth.verifyMfaEnrollment(mfaFactorId, cleanCode);
      if (res && res.success) {
        setTwoFactorEnabled(true);
        setMfaStep('status');
        setMfaFactorId(null);
        setMfaQrCodeSvg(null);
        setMfaSecret(null);
        setMfaVerificationCode('');
        showToast('success', '2FA Activated!', 'Supabase TOTP Authenticator has been linked and activated.');
        if (refreshUser) refreshUser();
      } else {
        setValidationError(res?.message || 'Invalid 6-digit code. Please verify the code in your Authenticator app and try again.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to verify 2FA code.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setMfaLoading(true);
    setValidationError(null);
    try {
      const res = await auth.unenrollMfa();
      if (res && res.success) {
        setTwoFactorEnabled(false);
        setMfaStep('status');
        setMfaFactorId(null);
        setMfaQrCodeSvg(null);
        setMfaSecret(null);
        setMfaVerificationCode('');
        showToast('success', '2FA Disabled', 'Two-Factor Authentication has been turned off.');
        if (refreshUser) refreshUser();
      } else {
        setValidationError(res?.message || 'Failed to disable 2FA.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Error disabling 2FA.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!mfaSecret) return;
    navigator.clipboard.writeText(mfaSecret);
    setCopiedSecret(true);
    showToast('success', 'Copied!', '2FA Secret Key copied to clipboard.');
    setTimeout(() => setCopiedSecret(false), 3000);
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    if (step === 4 && newPassword.trim() && currentPassword.trim() && !passwordSuccess) {
      await handleChangePasswordNow();
    }

    const currentPrimaryUid = gameUids['free_fire'] || gameUids['pubg_mobile'] || Object.values(gameUids).find(u => u && typeof u === 'string' && u.trim()) || '';

    saveAccountSetup({
      step: Math.min(step + 1, 6),
      full_name: name,
      username: username || undefined,
      mobile: phone,
      district,
      city,
      address: address || `${city}, ${district}`,
      location: `${city}, ${district}, Nepal`,
      gamer_id: currentPrimaryUid,
      game_uids: gameUids,
      avatar_url: photoURL,
      two_factor_enabled: twoFactorEnabled,
      completed: false,
    }).catch(() => {});

    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const cleanPin = securityPin.trim();
      const primaryUid = gameUids['free_fire'] || gameUids['pubg_mobile'] || Object.values(gameUids).find(u => u && typeof u === 'string' && u.trim()) || '';
      
      const payload: any = {
        step: 6,
        full_name: name.trim(),
        username: username.trim() || undefined,
        mobile: phone.trim(),
        district: district.trim(),
        city: city.trim(),
        address: address.trim() || `${city.trim()}, ${district.trim()}`,
        location: `${city.trim()}, ${district.trim()}, Nepal`,
        gamer_id: primaryUid.trim(),
        game_uids: gameUids,
        avatar_url: photoURL,
        two_factor_enabled: twoFactorEnabled,
        completed: true,
      };

      if (isPinConfigured) {
        if (cleanPin && /^\d{4,6}$/.test(cleanPin) && oldPin.trim()) {
          const pinRes = await setAuthSecurityPin(cleanPin, oldPin.trim());
          if (!pinRes.success) {
            setValidationError(pinRes.message || 'Current (Old) Security PIN is incorrect. Please verify and try again.');
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        if (cleanPin && /^\d{4,6}$/.test(cleanPin)) {
          payload.security_pin = cleanPin;
          await setAuthSecurityPin(cleanPin).catch(() => {});
        }
      }

      await saveAccountSetup(payload);

      if (onSave) {
        await onSave({
          name: name.trim(),
          phone: phone.trim(),
          district: district.trim(),
          city: city.trim(),
          address: address.trim() || `${city.trim()}, ${district.trim()}`,
          gamer_id: primaryUid.trim(),
          photoURL,
        });
      }

      showToast('success', '6-Step Setup Complete!', 'Profile, Password, 2FA & Security PIN configured successfully.');
      onClose();
    } catch (err: any) {
      console.error('Wizard complete error:', err);
      showToast('error', 'Setup Error', err?.message || 'Failed to complete account setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <div 
        className="fixed inset-0 z-[99999] bg-slate-900/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header with Step Indicator */}
        <div className="bg-gradient-to-r from-red-50 via-white to-orange-50 p-4 sm:p-5 text-slate-900 relative shrink-0 border-b border-red-100">
          <button
            type="button"
            className="absolute top-4 right-4 bg-white hover:bg-slate-100 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all text-slate-600 border border-slate-200"
            onClick={onClose}
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs border border-amber-200">
              <Sparkles size={11} className="stroke-[2.5]" /> Step {step} of 6
            </span>
            <span className="text-xs text-slate-600 font-bold">6-Step Gamer &amp; Security Setup</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug text-slate-900">
            {step === 1 && '1. Gamer Identity & Avatar'}
            {step === 2 && '2. Region & Contact (Nepal)'}
            {step === 3 && '3. Primary Game UID Link'}
            {step === 4 && '4. Password Change System'}
            {step === 5 && '5. Two-Factor Authentication (2FA)'}
            {step === 6 && '6. Security PIN & Final Overview'}
          </h2>

          <p className="text-[11px] text-slate-600 mt-0.5">
            {step === 1 && 'Set your gamer handle and pick an elite profile avatar.'}
            {step === 2 && 'Enter Nepal mobile and district for instant verification.'}
            {step === 3 && 'Link your Free Fire or PUBG UID for 1-click top-up.'}
            {step === 4 && 'Update your password for maximum account security.'}
            {step === 5 && 'Protect your gamer account with Supabase Auth QR Authenticator (Google/Authy).'}
            {step === 6 && 'Set a 4-digit PIN and review complete gamer profile.'}
          </p>

          {/* Interactive Step Progress Bar (6 Steps) */}
          <div className="grid grid-cols-6 gap-1 mt-3.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={`setup-step-dot-${s}`}
                onClick={() => {
                  if (s < step) setStep(s);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step
                    ? 'bg-gradient-to-r from-amber-400 to-emerald-400 cursor-pointer shadow-xs'
                    : 'bg-slate-200'
                }`}
                title={`Step ${s}`}
              />
            ))}
          </div>
        </div>

        {/* Validation error banner if any */}
        {validationError && (
          <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 text-rose-700 text-xs font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Step Body Container */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          {/* STEP 1: GAMER IDENTITY & AVATAR */}
          {step === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Display / Gamer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 text-slate-400" size={17} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. ShadowAssassin99"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Gamer Handle / Username <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-black text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="gamer_nepal"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Choose Elite Gamer Avatar
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {GAMER_AVATARS.map((url, i) => (
                    <div
                      key={`wizard-avatar-option-${i}`}
                      onClick={() => setPhotoURL(url)}
                      className={`relative rounded-2xl p-1.5 cursor-pointer transition-all border-2 ${
                        photoURL === url
                          ? 'border-red-600 bg-red-50/70 ring-4 ring-red-100 scale-102 shadow-xs'
                          : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={url}
                        alt="Avatar"
                        className="w-full aspect-square rounded-xl object-cover bg-white"
                        referrerPolicy="no-referrer"
                      />
                      {photoURL === url && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REGION & LOCATION */}
          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Nepal Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 text-slate-400" size={17} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="98XXXXXXXX"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-mono font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Used for instant WhatsApp delivery notifications and payment verification.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    District / Region <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  >
                    {NEPAL_DISTRICTS.map((d, dIdx) => (
                      <option key={`wizard-dist-${d}-${dIdx}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pokhara, Thamel"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Local Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 text-slate-400" size={17} />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Ward No. 4, Lakeside"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: GAMER UID LINK */}
          {step === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Primary Game
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_GAMES.map((g, gIdx) => {
                    const Icon = g.icon;
                    const isSel = selectedGame === g.id;
                    return (
                      <button
                        type="button"
                        key={`setup-game-${g.id || gIdx}-${gIdx}`}
                        onClick={() => setSelectedGame(g.id)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                          isSel
                            ? 'border-red-600 bg-red-50 text-red-900 font-black shadow-2xs'
                            : 'border-slate-200/80 bg-slate-50/50 text-slate-700 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${g.color}`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-xs truncate">{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  In-Game Player ID / UID for <span className="text-red-600 capitalize">{selectedGame.replace('_', ' ')}</span> <span className="text-slate-400 font-normal font-sans lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3.5 top-3 text-slate-400" size={17} />
                  <input
                    type="text"
                    value={gameUids[selectedGame] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGameUids(prev => ({ ...prev, [selectedGame]: val }));
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={`e.g. 8472910492 (${selectedGame.replace('_', ' ')})`}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-mono font-black text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  This UID will be automatically pre-filled whenever you order {selectedGame.replace('_', ' ')} packages!
                </p>
              </div>

              <div className="bg-red-50/80 border border-red-200/70 rounded-2xl p-3.5 flex items-start gap-3">
                <Sparkles size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-950 space-y-0.5">
                  <span className="font-black block">1-Click Fast Top-Up Enabled</span>
                  <p className="text-red-800 text-[11px]">
                    Linking your primary UID guarantees instant delivery dispatch without manual re-entry on checkout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PASSWORD CHANGE SYSTEM */}
          {step === 4 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="bg-red-50/80 border border-red-200/70 rounded-2xl p-3.5 flex items-start gap-3">
                <KeyRound size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-950 space-y-0.5">
                  <span className="font-black block">Account Password Security</span>
                  <p className="text-red-800 text-[11px]">
                    Keep your gamer account protected. You can change your password now or keep your current password and click Continue.
                  </p>
                </div>
              </div>

              {passwordSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCheck size={22} className="stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-black">Password Changed Successfully!</span>
                  <p className="text-[11px] text-emerald-700">Your account is now secured with your new password.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                      New Password <span className="text-slate-400 font-normal">(Min. 6 chars)</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={handleChangePasswordNow}
                      disabled={isChangingPassword}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      {isChangingPassword ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={15} />
                          <span>Update Password Now</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 5: TWO-FACTOR AUTHENTICATION (SUPABASE TOTP QR CODE) */}
          {step === 5 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Active 2FA Status Card */}
              {twoFactorEnabled ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 size={22} className="stroke-[2.5]" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-950 block">
                            2FA Shield Active (Supabase TOTP)
                          </span>
                          <span className="text-[11px] text-emerald-700 font-bold">
                            Secured with Google / Microsoft Authenticator
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                        Protected
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Your account requires a 6-digit dynamic code generated by your Authenticator App whenever signing in from a new device or changing sensitive security settings.
                    </p>

                    <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleDisableMfa}
                        disabled={mfaLoading}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {mfaLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ShieldAlert size={14} />
                        )}
                        <span>Turn Off / Unlink Authenticator</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStartMfaEnrollment}
                        disabled={mfaLoading}
                        className="text-xs font-bold text-red-600 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <RotateCw size={13} />
                        <span>Re-pair / New Device</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : mfaStep === 'enroll' ? (
                /* QR Enrollment Flow */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                          <QrCode size={16} />
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          Scan QR with Authenticator App
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaStep('status');
                          setMfaFactorId(null);
                          setMfaQrCodeSvg(null);
                          setMfaSecret(null);
                          setMfaVerificationCode('');
                          setValidationError(null);
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-red-100 shadow-2xs">
                      <div className="w-36 h-36 bg-white rounded-lg p-1.5 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                        {mfaQrCodeSvg ? (
                          mfaQrCodeSvg.startsWith('data:') || mfaQrCodeSvg.startsWith('http') ? (
                            <img
                              src={mfaQrCodeSvg}
                              alt="2FA QR Code"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mfaQrCodeSvg) }}
                            />
                          )
                        ) : (
                          <div className="text-center p-2 text-slate-400 text-xs flex flex-col items-center">
                            <Loader2 size={20} className="animate-spin text-red-600 mb-1" />
                            <span>Loading QR...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2 text-left w-full">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                          Step 1: Scan with App
                        </span>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your phone and scan this QR code.
                        </p>

                        {mfaSecret && (
                          <div className="pt-1.5">
                            <span className="text-[10px] text-slate-500 font-bold block mb-0.5">
                              Or enter secret key manually:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <code className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-bold select-all break-all">
                                {mfaSecret}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopySecret}
                                className="p-1 rounded-md bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer transition-all shrink-0"
                                title="Copy Secret"
                              >
                                {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 2: Verification Input */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        Step 2: Enter 6-Digit Code from App
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaVerificationCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setMfaVerificationCode(val);
                            if (validationError) setValidationError(null);
                          }}
                          placeholder="000000"
                          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-black text-center text-lg tracking-widest focus:outline-hidden focus:ring-2 focus:ring-red-600 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyMfaCode}
                          disabled={mfaLoading || mfaVerificationCode.trim().length !== 6}
                          className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                        >
                          {mfaLoading ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          <span>Verify &amp; Activate</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Inactive / Recommended State */
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                        <Smartphone size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          Authenticator App (TOTP)
                        </span>
                        <span className="text-[11px] text-slate-500 font-bold">
                          Status: Not Linked
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Link your Google Authenticator, Microsoft Authenticator, or Authy app with a quick QR scan to enable time-based 6-digit security codes.
                    </p>

                    <button
                      type="button"
                      onClick={handleStartMfaEnrollment}
                      disabled={mfaLoading}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      {mfaLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <QrCode size={15} />
                      )}
                      <span>Set Up Authenticator App (QR Code)</span>
                    </button>
                  </div>

                  <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-amber-900 text-[11px] flex items-start gap-2">
                    <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      2FA protects your wallet balance, diamond top-ups, and game account access from unauthorized logins. You can set this up now or skip and configure it later in Profile Settings.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: SECURITY PIN & SETUP OVERVIEW */}
          {step === 6 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {isPinConfigured ? (
                /* EXISTING USER: PIN ALREADY ACTIVE */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">Security PIN Active</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider">
                            Configured
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">4-digit PIN is active for instant login &amp; wallet payments.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setWantsToChangePin(!wantsToChangePin);
                        setValidationError(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border shrink-0 ${
                        wantsToChangePin
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-white text-red-700 border-red-200 shadow-2xs hover:bg-red-50'
                      }`}
                    >
                      {wantsToChangePin ? 'Keep Current PIN' : 'Change PIN'}
                    </button>
                  </div>

                  {wantsToChangePin && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                          <KeyRound size={14} className="text-red-600" />
                          <span>Change Security PIN</span>
                        </span>
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Old PIN Required
                        </span>
                      </div>

                      {/* Current Old PIN input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Current (Old) Security PIN <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
                          <input
                            type={showOldPin ? 'text' : 'password'}
                            maxLength={6}
                            value={oldPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setOldPin(val);
                              if (validationError) setValidationError(null);
                            }}
                            placeholder="Enter current PIN"
                            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold tracking-widest text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 text-center"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPin(!showOldPin)}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                          >
                            {showOldPin ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* New PIN & Confirm PIN */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            New 4-Digit PIN <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPin ? 'text' : 'password'}
                              maxLength={4}
                              value={securityPin}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setSecurityPin(val);
                                if (validationError) setValidationError(null);
                              }}
                              placeholder="••••"
                              className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold tracking-widest text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 text-center"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                            >
                              {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Confirm New PIN <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type={showPin ? 'text' : 'password'}
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setConfirmPin(val);
                              if (validationError) setValidationError(null);
                            }}
                            placeholder="••••"
                            className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold tracking-widest text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* NEW USER: FIRST TIME PIN SETUP */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Set 4-Digit Security PIN
                    </label>
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      First Time Setup
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4}
                      value={securityPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setSecurityPin(val);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-black tracking-widest text-base focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 text-center">
                    Use this PIN for 1-second login &amp; wallet payments.
                  </p>

                  {securityPin.length > 0 && (
                    <div className="mt-3">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                        Confirm 4-Digit PIN
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                        <input
                          type={showPin ? 'text' : 'password'}
                          maxLength={4}
                          value={confirmPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setConfirmPin(val);
                            if (validationError) setValidationError(null);
                          }}
                          placeholder="••••"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 font-black tracking-widest text-base focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Setup Overview Card */}
              <div className="bg-gradient-to-r from-white via-red-50 to-orange-50 rounded-2xl p-4 text-slate-900 space-y-2.5 border border-red-100 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-emerald-700" />
                    Setup Summary
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                    6/6 COMPLETED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-600 block font-medium">Gamer Name:</span>
                    <span className="font-bold text-slate-900 truncate block">{name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block font-medium">Nepal Contact:</span>
                    <span className="font-bold text-slate-900 truncate block">{phone || 'N/A'} ({district})</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block font-medium">Primary Game UID:</span>
                    <span className="font-bold text-amber-800 truncate block font-mono">
                      {gameUids['free_fire'] || gameUids['pubg_mobile'] || Object.values(gameUids)[0] || 'Unlinked'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block font-medium">Security 2FA:</span>
                    <span className={`font-bold block ${twoFactorEnabled ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {twoFactorEnabled ? '✓ Enabled' : 'Optional'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="bg-slate-50 border-t border-slate-100 p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete &amp; Save</span>
                  <Check size={14} className="stroke-[3]" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  </ModalPortal>
  );
};
