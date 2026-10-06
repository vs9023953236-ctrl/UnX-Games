import React, { useState } from 'react';
import { User } from '../../types';
import { formatDate, getDisplayUserRole } from '../../utils/formatters';
import { useStore } from '../../context/StoreContext';
import { AccountVerificationModal } from './AccountVerificationModal';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Gamepad2,
  Lock,
  Sparkles,
  ShieldAlert,
  Clock,
  AlertCircle,
  BadgeCheck,
  Edit3,
  Copy,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileGamerHeaderProps {
  user: User;
  onEditClick?: () => void;
}

export const ProfileGamerHeader: React.FC<ProfileGamerHeaderProps> = ({
  user,
  onEditClick,
}) => {
  const { setIsAdminView, setAdminTab, setCurrentTab, showToast } = useStore();
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyGamerUid = () => {
    if (!user.gamer_id) return;
    try {
      navigator.clipboard.writeText(user.gamer_id);
      setCopiedUid(true);
      showToast('success', 'Gamer UID Copied', `${user.gamer_id} copied to clipboard!`);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {}
  };

  const isAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(user.role as string);
  const displayLocation = user.district
    ? `${user.district}, Nepal`
    : user.location || user.city || 'Nepal';

  const verificationStatus = user.verification_status || (user.account_verified ? 'verified' : 'unverified');

  const handleOpenAdminPanel = () => {
    setIsAdminView(true);
    setAdminTab('overview');
    setCurrentTab('admin');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full bg-white border border-slate-200/90 rounded-3xl p-3 sm:p-3.5 shadow-xs space-y-3 relative overflow-hidden"
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400" />

        {/* 1. Main Profile Identity Row */}
        <div className="flex items-center gap-3.5 pt-1">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-0.5 bg-gradient-to-tr from-red-500 via-orange-500 to-amber-400 shadow-sm">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 flex items-center justify-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xl font-black text-slate-700">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
                  </span>
                )}
              </div>
            </div>
            {/* Online Status Ring / Verified Badge */}
            {user.account_verified || user.verification_status === 'verified' ? (
              <div 
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-xs border border-white"
                title="Verified Account"
              >
                <BadgeCheck size={22} className="text-blue-500 fill-white fhd-vector" />
              </div>
            ) : (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center shadow-xs"
                title="Account Active"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate flex items-center gap-1">
                <span>{user.name}</span>
                {(user.account_verified || user.verification_status === 'verified') && (
                  <span title="Verified Account">
                    <BadgeCheck size={18} className="text-blue-500 fill-blue-500 text-white shrink-0" />
                  </span>
                )}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 font-extrabold text-[10px] uppercase tracking-wider shrink-0">
                <Sparkles size={11} className="text-red-600" />
                <span>{getDisplayUserRole(user)}</span>
              </span>
            </div>

            {/* Email & Phone Rows */}
            <div className="space-y-0.5 text-xs">
              <p className="text-slate-500 font-medium truncate flex items-center gap-1.5">
                <Mail size={12} className="shrink-0 text-slate-400" />
                <span className="truncate">{user.email}</span>
              </p>

              {(user.phone || user.mobile) ? (
                <p className="text-slate-800 font-mono font-bold truncate flex items-center gap-1.5">
                  <Phone size={12} className="shrink-0 text-red-600" />
                  <span>{user.phone || user.mobile}</span>
                </p>
              ) : onEditClick ? (
                <button
                  type="button"
                  onClick={onEditClick}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                >
                  <span>+ Add Mobile Number</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* 2. Primary Action Buttons Grid (Symmetrical, 100% Even Alignment) */}
        <div className={`grid gap-2.5 w-full pt-1 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="w-full h-10 sm:h-11 px-3.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200/90 active:scale-98 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 shadow-2xs transition-all cursor-pointer"
              title="Edit profile information"
            >
              <Edit3 size={15} className="text-slate-600 shrink-0" />
              <span>Edit Profile</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdminPanel}
              className="w-full h-10 sm:h-11 px-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/25 border border-red-500/40 transition-all cursor-pointer"
            >
              <ShieldAlert size={15} className="text-amber-200 shrink-0" />
              <span>Admin Console</span>
              <ChevronRight size={14} className="text-white shrink-0" />
            </button>
          )}
        </div>

        {/* 3. Security & Gamer Status Chips Row */}
        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-2.5 border-t border-slate-100 w-full">
          {(user.has_pin || user.security_pin) && (
            <div className="h-8 inline-flex items-center gap-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs shrink-0">
              <Lock size={12} className="text-emerald-600" />
              <span>PIN Active</span>
            </div>
          )}

          {user.gamer_id && (
            <button
              type="button"
              onClick={handleCopyGamerUid}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200/80 text-red-900 text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95 transition-all group shrink-0"
              title="Click to copy Gamer UID"
            >
              <Gamepad2 size={13} className="text-red-600" />
              <span>UID: {user.gamer_id}</span>
              {copiedUid ? (
                <Check size={12} className="text-emerald-600" />
              ) : (
                <Copy size={11} className="text-slate-400 group-hover:text-red-600" />
              )}
            </button>
          )}

          {verificationStatus === 'verified' ? (
            <button
              type="button"
              onClick={() => setCurrentTab('account_verification')}
              className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-900 text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer ring-1 ring-emerald-500/20 shrink-0"
              title="View Official Verified Digital Pass"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                ✓
              </div>
              <span className="tracking-tight">100% Verified Gamer Pass</span>
              <Sparkles size={11} className="text-amber-500 fill-amber-400" />
            </button>
          ) : verificationStatus === 'pending' ? (
            <button
              type="button"
              onClick={() => setCurrentTab('account_verification')}
              className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer ring-1 ring-amber-500/20 shrink-0"
              title="Verification In Review Queue"
            >
              <Clock size={12} className="text-amber-600 animate-pulse" />
              <span className="tracking-tight">Verification In Review</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </button>
          ) : verificationStatus === 'rejected' ? (
            <button
              type="button"
              onClick={() => setCurrentTab('account_verification')}
              className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 text-rose-950 text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer ring-1 ring-rose-500/20 shrink-0"
              title="Verification Rejected - Click to Retry"
            >
              <AlertCircle size={12} className="text-rose-600" />
              <span className="tracking-tight">Verification Rejected (Retry)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentTab('account_verification')}
              className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-300 text-red-950 text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer ring-1 ring-red-500/20 shrink-0"
              title="Verify Identity for Instant Top-ups"
            >
              <ShieldCheck size={12} className="text-red-600" />
              <span className="tracking-tight">Verify Identity (Instant Top-ups)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </button>
          )}
        </div>

        {/* Meta Footer Bar */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap text-slate-500 font-medium">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={13} className="text-rose-500 shrink-0" />
            <span className="truncate">{displayLocation}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
            <Calendar size={13} className="text-red-500 shrink-0" />
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>
        </div>
      </motion.div>

      {/* Account Verification Modal */}
      <AccountVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </>
  );
};
