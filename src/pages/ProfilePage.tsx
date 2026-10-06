import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { formatNPR } from '../utils/formatters';
import { LogOut, Sparkles, Wallet as WalletIcon, PlusCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

// Subcomponents
import { ProfileGuestView } from '../components/profile/ProfileGuestView';
import { ProfileGamerHeader } from '../components/profile/ProfileGamerHeader';
import { ProfileOrdersSummary } from '../components/profile/ProfileOrdersSummary';
import { ProfileQuickActions } from '../components/profile/ProfileQuickActions';
import { ProfileMenuSections } from '../components/profile/ProfileMenuSections';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { AccountSetupWizardModal } from '../components/profile/AccountSetupWizardModal';
import { LogoutConfirmModal } from '../components/profile/LogoutConfirmModal';
import { TwoFactorBackupCodesModal } from '../components/profile/TwoFactorBackupCodesModal';
import { ActiveSessionsModal } from '../components/profile/ActiveSessionsModal';
import { NotificationDropdown } from '../components/common/NotificationDropdown';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { WalletModal } from '../components/wallet/WalletModal';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile, logout } = useAuth();
  const { setCurrentTab, orders, reviews, showToast, appSettings, walletBalance: storeWalletBalance, refreshWallet } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isActiveSessionsModalOpen, setIsActiveSessionsModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(() => storeWalletBalance);

  const isMountedRef = React.useRef(true);

  // Close all page-specific modals and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setIsEditing(false);
      setIsWizardOpen(false);
      setShowLogoutConfirm(false);
      setIsNotifOpen(false);
      setIsWalletOpen(false);
      setIs2FAModalOpen(false);
      setIsActiveSessionsModalOpen(false);
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      setWalletBalance(storeWalletBalance);
    }
  }, [storeWalletBalance]);

  useEffect(() => {
    if (currentUser) {
      refreshWallet().then((bal) => {
        if (isMountedRef.current) {
          setWalletBalance(bal);
        }
      }).catch(() => {});
    }
  }, [currentUser, refreshWallet]);

  useEffect(() => {
    const handleWalletUpdate = (e: any) => {
      if (e.detail?.balance !== undefined && isMountedRef.current) {
        setWalletBalance(Number(e.detail.balance) || 0);
      }
    };
    window.addEventListener('ghn_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('ghn_wallet_updated', handleWalletUpdate);
  }, []);

  const is2FAActive = Boolean(
    currentUser?.twoFactorEnabled ?? currentUser?.two_factor_enabled ?? false
  );

  const reviewsCount = currentUser ? (reviews || []).filter(r => r.userId === currentUser.uid).length : 0;

  // Guest View
  if (!currentUser) {
    return <ProfileGuestView />;
  }

  // Order Metrics
  const completedOrders = orders.filter(
    (o) => o.orderStatus === 'completed' || o.orderStatus === 'delivered'
  ).length;
  const processingOrders = orders.filter(
    (o) =>
      o.orderStatus === 'processing' ||
      o.orderStatus === 'payment_verified' ||
      o.orderStatus === 'payment_verification' ||
      o.orderStatus === 'pending_payment'
  ).length;
  const totalOrders = orders.length;

  const handleSaveProfile = async (updatedData: {
    name: string;
    phone: string;
    district: string;
    city: string;
    address: string;
    gamer_id?: string;
    photoURL?: string;
  }) => {
    const fullLocationString = `${updatedData.address}${
      updatedData.city ? `, ${updatedData.city}` : ''
    }, ${updatedData.district}, Nepal`;

    const success = await updateProfile({
      name: updatedData.name,
      phone: updatedData.phone,
      district: updatedData.district,
      city: updatedData.city,
      address: updatedData.address,
      gamer_id: updatedData.gamer_id,
      location: fullLocationString,
      photoURL: updatedData.photoURL || currentUser.photoURL,
    });

    if (success) {
      showToast('success', 'Profile Updated', 'Your profile details have been saved.');
    } else {
      showToast('error', 'Update Failed', 'Unable to save profile changes.');
      throw new Error('Update failed');
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    showToast('info', 'Logged Out', 'You have been signed out.');
    await logout();
    setCurrentTab(appSettings?.maintenanceMode ? 'home' : 'login');
  };

  const supportPhone = appSettings?.whatsappNumber || appSettings?.supportPhone || '9768914027';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const waHelpUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello Unx Games Support, I need assistance with my gamer account (${currentUser.email}).`
  )}`;

  const isSetupDone = currentUser?.setup_completed;

  return (
    <div className="w-full bg-transparent text-slate-900 flex flex-col antialiased selection:bg-red-500 selection:text-white">
      {/* Main Centered Mobile Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-2 pb-1 space-y-2">
        {/* 1. Profile Card with Gradient Accent Line */}
        <ProfileGamerHeader
          user={currentUser}
          onEditClick={() => setIsEditing(true)}
        />

        {/* 6-Step Account Setup Wizard Banner */}
        <div 
          onClick={() => setIsWizardOpen(true)}
          className={`rounded-2xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group ${
            isSetupDone 
              ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border border-emerald-500/30'
              : 'bg-gradient-to-r from-slate-950 via-red-950 to-orange-950 border border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSetupDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-amber-300'
            }`}>
              {isSetupDone ? <ShieldCheck size={22} /> : <Sparkles size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                  {isSetupDone ? 'Account Setup: 100% Completed' : '6-Step Account Setup Wizard'}
                </h3>
                {isSetupDone ? (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase">
                    Verified
                  </span>
                ) : (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase">
                    Step {Math.min(Math.max(Number(currentUser?.setup_step) || 1, 1), 6)}/6
                  </span>
                )}
              </div>
              <p className="text-[11px] text-orange-200/90 truncate mt-0.5">
                {isSetupDone
                  ? `Gamer UID (${currentUser.gamer_id || 'Linked'}) • ${currentUser.district || 'Nepal'} • PIN Active`
                  : 'Configure Gamer UID, Region & Security PIN for 1-click top-up'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl group-hover:bg-white group-hover:text-red-700 transition-all shrink-0 ml-2">
            {isSetupDone ? 'Edit ⚙️' : 'Start →'}
          </span>
        </div>

        {/* Gamer Wallet Card (Navigates to Full Wallet Page) */}
        <div 
          onClick={() => setCurrentTab('wallet')}
          className="bg-gradient-to-br from-slate-900 via-red-950 to-orange-950 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white shadow-[0_4px_20px_rgba(23,19,41,0.12)] border border-red-900/50 relative overflow-hidden fhd-crisp cursor-pointer group hover:border-red-700/70 transition-all active:scale-[0.99]"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/15 text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                <WalletIcon size={20} className="stroke-[2.2] fhd-vector" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-orange-200 uppercase tracking-wider whitespace-nowrap">
                    Gamer Wallet
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black border border-emerald-400/30 shrink-0 whitespace-nowrap">
                    100% SECURE
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-white tracking-tight block truncate mt-0.5">
                  {walletBalance !== null ? formatNPR(walletBalance) : (
                    <div className="h-7 sm:h-8 w-24 bg-red-500/50 animate-pulse rounded-md"></div>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTab('wallet');
                }}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-[0_2px_10px_rgba(220,38,38,0.3)] flex items-center gap-1.5 transition-all cursor-pointer fhd-crisp whitespace-nowrap"
              >
                <PlusCircle size={14} className="stroke-[2.5] fhd-vector" />
                <span>
                  <span className="sm:hidden">Top-Up</span>
                  <span className="hidden sm:inline">Top-up &amp; Pass</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Order Statistics (4 Compact Cards) */}
        <ProfileOrdersSummary
          totalOrders={totalOrders}
          processingOrders={processingOrders}
          completedOrders={completedOrders}
          reviewsCount={reviewsCount}
        />

        {/* 3. Quick Actions (WhatsApp Direct Chat & Security / 2FA / Devices) */}
        <ProfileQuickActions
          waHelpUrl={waHelpUrl}
          onOpen2FAModal={() => setIs2FAModalOpen(true)}
          onOpenActiveSessionsModal={() => setIsActiveSessionsModalOpen(true)}
        />

        {/* PWA App Download Action */}
        <PWAInstallButton variant="full" />

        {/* 4. Profile Menu Sections (Non-duplicate, high value items) */}
        <ProfileMenuSections
          onEditClick={() => setIsEditing(true)}
          onOpenWizardClick={() => setIsWizardOpen(true)}
        />

        {/* 5. Account Logout Action */}
        <div className="pt-1 pb-0 px-0">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full h-11 sm:h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] border border-rose-200 text-rose-600 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <LogOut size={16} className="stroke-[2.5]" />
            <span>Log Out of Account</span>
          </button>
        </div>
      </main>

      {/* 6. Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        currentUser={currentUser}
        onSave={handleSaveProfile}
      />

      {/* 4-Step Wizard Modal */}
      <AccountSetupWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        currentUser={currentUser}
        onSave={handleSaveProfile}
      />

      {/* 2-Step Verification & Backup Codes Modal */}
      <TwoFactorBackupCodesModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Active Device Sessions Modal */}
      <ActiveSessionsModal
        isOpen={isActiveSessionsModalOpen}
        onClose={() => setIsActiveSessionsModalOpen(false)}
      />

      {/* 7. Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />

      {/* 8. Notification Dropdown Modal */}
      <NotificationDropdown
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      {/* 9. Wallet Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        onBalanceUpdated={(b) => setWalletBalance(b)}
      />
    </div>
  );
};
export default ProfilePage;
