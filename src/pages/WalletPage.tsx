import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { formatNPR, formatDate } from '../utils/formatters';
import { Wallet, WalletTransaction } from '../types';
import {
  Wallet as WalletIcon,
  ShieldCheck,
  Zap,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  ArrowLeft,
  RotateCw,
  Sparkles,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
  AlertTriangle,
  FileText,
  Crown,
  Award,
  Shield,
  Send,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLoadingScreen } from '../components/common/AppLoadingScreen';

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

export const WalletPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { goBack, showToast, appSettings, paymentSettings, refreshWallet, walletBalance: storeWalletBalance } = useStore();

  const CACHE_KEY = `ghn_wallet_data_${currentUser?.id || 'guest'}`;

  const [wallet, setWallet] = useState<Wallet | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached).wallet || null;
    } catch {}
    return null;
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached).transactions || [];
    } catch {}
    return [];
  });
  
  // Only show initial loading if we don't have cached data
  const [loading, setLoading] = useState(() => !transactions.length);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'pending' | 'rejected'>('all');

  // Deposit Form state
  const [amount, setAmount] = useState<string>('500');
  const [paymentMethod, setPaymentMethod] = useState<'eSewa' | 'Khalti'>('eSewa');
  const [reference, setReference] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setShowQrModal(false);
      setIsSubmitting(false);
      setIsUploading(false);
      setCopiedKey(null);
      setLoading(false);
      setRefreshing(false);
    };
  }, []);

  const fetchWalletData = async (isRefresh = false) => {
    if (!isMountedRef.current) return;
    if (isRefresh) setRefreshing(true);
    else {
      // Only set loading true if we don't have any cached transactions yet
      setLoading(prev => transactions.length === 0 ? true : prev);
    }

    try {
      const res = await api.wallet.getMyWallet();
      if (!isMountedRef.current) return;
      if (res && res.success) {
        setWallet(res.wallet);
        setTransactions(res.transactions || []);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            wallet: res.wallet,
            transactions: res.transactions || []
          }));
        } catch {}
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error('Failed to load gamer wallet:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchWalletData();
    refreshWallet().catch(() => {});
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  useEffect(() => {
    const handleWalletUpdate = (e: any) => {
      fetchWalletData(true);
    };
    window.addEventListener('ghn_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('ghn_wallet_updated', handleWalletUpdate);
  }, []);

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast('success', 'Copied!', `${text} copied to clipboard.`);
    } catch {
      showToast('info', 'Copy', text);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Invalid File', 'Please select an image screenshot (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Screenshot must be under 8MB.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.storage.upload(file, 'wallet-receipts', `wallet_${Date.now()}_${file.name}`);
      if (res && res.url) {
        setProofUrl(res.url);
        showToast('success', 'Receipt Attached', 'Payment receipt uploaded to Cloudflare R2 successfully.');
      } else {
        throw new Error('Failed to obtain storage URL from R2');
      }
    } catch (err: any) {
      showToast('error', 'Upload Failed', err?.message || 'Could not upload payment receipt.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      showToast('error', 'Invalid Amount', 'Minimum deposit is NPR 10.');
      return;
    }
    if (!reference.trim()) {
      showToast('error', 'Reference ID Required', 'Please enter your payment Transaction/Reference ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.wallet.deposit({
        amount: numAmount,
        paymentMethod: paymentMethod.toLowerCase(),
        reference: reference.trim(),
        proofUrl: proofUrl || undefined,
      });

      if (res && res.success) {
        showToast('success', 'Deposit Request Submitted', 'Admin will verify and credit your balance within 5-15 mins.');
        setReference('');
        setProofUrl('');
        setActiveTab('history');
        fetchWalletData(true);
      } else {
        showToast('error', 'Deposit Failed', res?.message || 'Failed to submit deposit request.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to submit deposit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportPhone = appSettings?.whatsappNumber || appSettings?.supportPhone || '9768914027';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const appName = appSettings?.appName || 'Unx Games';

  const waHelpUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${appName} Support, I have a query regarding my Gamer Wallet deposit for account (${currentUser?.email || ''}).`
  )}`;

  const isVerifiedGamer = currentUser?.account_verified || currentUser?.verification_status === 'verified';
  const currentBalance = wallet?.balance ?? (storeWalletBalance !== null ? storeWalletBalance : 0);

  // Calculate stats from transactions safely
  const totalLoaded = transactions
    .filter(t => (t.type === 'deposit' || t.type === 'DEPOSIT') && t.status === 'COMPLETED')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalSpent = transactions
    .filter(t => (t.type === 'purchase' || t.type === 'PURCHASE') && t.status === 'COMPLETED')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const walletIdFormatted =
    (wallet as any)?.walletCode ||
    (wallet as any)?.code ||
    `GHN-${(currentUser?.id || currentUser?.uid || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || '0000'}-${(currentUser?.mobile || (currentUser as any)?.phone || '9800').replace(/\D/g, '').slice(-4) || '4027'}-WLT`;

  const activeMethodConfig =
    paymentMethod === 'eSewa'
      ? {
          name: 'eSewa Digital Wallet',
          badge: '0% Surcharge • Instant',
          accountName: paymentSettings?.esewaName || 'Unx Games',
          accountId: paymentSettings?.esewaId || '9768914027',
          qrUrl: paymentSettings?.esewaQr || '',
          instructions: paymentSettings?.esewaInstructions || 'Scan eSewa QR code or transfer funds directly to our merchant number.',
          accentColor: 'text-emerald-700',
          bgAccent: 'bg-emerald-50 border-emerald-200',
          badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        }
      : {
          name: 'Khalti Digital Wallet',
          badge: 'Instant QR • 0% Fee',
          accountName: paymentSettings?.khaltiName || 'Unx Games',
          accountId: paymentSettings?.khaltiId || '9768914027',
          qrUrl: paymentSettings?.khaltiQr || '',
          instructions: paymentSettings?.khaltiInstructions || 'Scan Khalti QR code or transfer funds to our verified Khalti wallet.',
          accentColor: 'text-purple-700',
          bgAccent: 'bg-purple-50 border-purple-200',
          badgeStyle: 'bg-purple-100 text-purple-800 border-purple-200',
        };

  const filteredTransactions = transactions.filter((tx) => {
    const statusUpper = (tx.status || '').toUpperCase();
    if (historyFilter === 'all') return true;
    if (historyFilter === 'completed') return statusUpper === 'COMPLETED';
    if (historyFilter === 'pending') return statusUpper === 'PENDING';
    if (historyFilter === 'rejected') return statusUpper === 'REJECTED' || statusUpper === 'FAILED';
    return true;
  });

  return (
    <div className="w-full min-h-0 bg-transparent text-slate-900 flex flex-col antialiased">
      <AnimatePresence>
        {isSubmitting && (
          <AppLoadingScreen
            fullScreen
            title="Submitting Top-Up..."
            message="Sending deposit verification request to admin..."
          />
        )}
      </AnimatePresence>
      <main className="flex-1 w-full max-w-2xl mx-auto px-2 sm:px-2 pb-1 pt-1 sm:pt-1.5 space-y-2">
        {/* ======================================================== */}
        {/* OFFICIAL DIGITAL GAMER WALLET PASS CARD (KYC DESIGN) */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Main Official Pass Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50/40 to-red-50/40 border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            {/* Top Tri-Color Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500" />

            {/* Card Header Row */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-3 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇳🇵</span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-700 leading-none">
                    OFFICIAL GAMER WALLET PASS
                  </div>
                  <div className="text-xs font-black text-slate-900 mt-0.5 tracking-tight">
                    {appName} Digital Vault
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-black shadow-2xs">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>100% SECURE</span>
              </div>
            </div>

            {/* Gamer Core Identity Row */}
            <div className="py-3.5 flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 shadow-xs">
                  <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center border border-white">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl font-black text-slate-800">
                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-xs text-white">
                  <CheckCircle2 size={12} className="stroke-[3]" />
                </div>
              </div>

              <div className="min-w-0 space-y-0.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                    {currentUser?.name || 'Verified Gamer'}
                  </h3>
                  {isVerifiedGamer ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                      KYC Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 text-[10px] font-black uppercase">
                      VIP Gamer
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {currentUser?.email || 'user@unxgames.np'}
                </p>
                <div className="flex items-center gap-2 pt-0.5 text-xs text-red-900 font-mono font-bold">
                  <ShieldCheck size={14} className="shrink-0 text-red-600" />
                  <span>{walletIdFormatted}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(walletIdFormatted, 'walletId')}
                    className="text-slate-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                    title="Copy Wallet ID"
                  >
                    {copiedKey === 'walletId' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* High-Definition Live Balance Display Block */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <WalletIcon size={14} className="text-red-600" />
                  <span>Available Gamer Balance</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ⚡ 1-Click Instant Use
                </span>
              </div>

              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {(loading && storeWalletBalance === null) ? (
                    <div className="h-8 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
                  ) : (
                    formatNPR(currentBalance)
                  )}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Nepali Rupees (NPR)
                </div>
              </div>

              {/* Sub-Metrics Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Lifetime Loaded</span>
                  {(loading && totalLoaded === 0 && !wallet) ? (
                    <div className="h-4 w-16 bg-slate-200 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-xs font-black text-emerald-700">{formatNPR(totalLoaded)}</span>
                  )}
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Lifetime Spent</span>
                  {(loading && totalSpent === 0 && !wallet) ? (
                    <div className="h-4 w-16 bg-slate-200 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-xs font-black text-slate-800">{formatNPR(totalSpent)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Security & Verification Metadata Footer */}
            <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500 font-medium flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-600" />
                <span>256-Bit Encrypted Balance Vault</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                Status: <span className="text-emerald-700 font-bold">Active &amp; Protected</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. VIP PERKS UNLOCKED GRID (4 BENTO CARDS - KYC STYLE) */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Gamer Wallet Perks &amp; Privileges
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <Sparkles size={12} />
                <span>100% Active</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-xs text-amber-900">
                  <Zap size={14} className="text-amber-600 shrink-0 fill-amber-500" />
                  <span>1-Click Checkout</span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-tight">
                  Instant top-up order placement with zero payment verification wait.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-orange-950 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-xs text-orange-900">
                  <Crown size={14} className="text-orange-600 shrink-0" />
                  <span>0% Gateway Fee</span>
                </div>
                <p className="text-[11px] text-orange-900/80 leading-tight">
                  Completely free wallet loading with eSewa &amp; Khalti QR.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-rose-950 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-xs text-rose-900">
                  <Shield size={14} className="text-rose-600 shrink-0" />
                  <span>Refund Shield</span>
                </div>
                <p className="text-[11px] text-rose-900/80 leading-tight">
                  Instant automatic money-back into wallet for unfulfilled orders.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-xs text-emerald-900">
                  <Award size={14} className="text-emerald-600 shrink-0" />
                  <span>VIP Cashback</span>
                </div>
                <p className="text-[11px] text-emerald-900/80 leading-tight">
                  Special bonus top-up rewards on qualifying deposits.
                </p>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. TAB NAVIGATION PILLS (DEPOSIT VS HISTORY) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('deposit')}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'deposit'
                  ? 'bg-white text-red-950 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard size={15} className={activeTab === 'deposit' ? 'text-red-600' : 'text-slate-500'} />
              <span>Load Balance (Top-Up)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-red-950 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock size={15} className={activeTab === 'history' ? 'text-red-600' : 'text-slate-500'} />
              <span>Passbook &amp; History ({transactions.length})</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* 5. TAB 1: LOAD WALLET DEPOSIT FORM (KYC FORM STYLE) */}
          {/* ======================================================== */}
          {activeTab === 'deposit' && (
            <motion.form
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleDepositSubmit}
              className="space-y-3"
            >
              {/* Payment Safety Notice */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-2.5 shadow-2xs">
                <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-black text-amber-950 block sm:inline">
                    Official Merchant Transfer Safeguard:
                  </span>{' '}
                  Always transfer to the official merchant details displayed below and enter your accurate Transaction ID. Average approval time is <strong>5 to 15 minutes</strong>.
                </div>
              </div>

              {/* Step 1: Select Deposit Method */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>Select Payment Gateway</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Required *</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* eSewa Option */}
                  <div
                    onClick={() => setPaymentMethod('eSewa')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 relative ${
                      paymentMethod === 'eSewa'
                        ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                        paymentMethod === 'eSewa' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      eS
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-black leading-tight ${paymentMethod === 'eSewa' ? 'text-emerald-950' : 'text-slate-800'}`}>
                          eSewa Digital Wallet
                        </span>
                        {paymentMethod === 'eSewa' && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                        0% Free • QR Supported
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Transfer to verified eSewa ID
                      </div>
                    </div>
                  </div>

                  {/* Khalti Option */}
                  <div
                    onClick={() => setPaymentMethod('Khalti')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 relative ${
                      paymentMethod === 'Khalti'
                        ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                        paymentMethod === 'Khalti' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      Kh
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-black leading-tight ${paymentMethod === 'Khalti' ? 'text-purple-950' : 'text-slate-800'}`}>
                          Khalti Digital Wallet
                        </span>
                        {paymentMethod === 'Khalti' && <CheckCircle2 size={14} className="text-purple-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] font-bold text-purple-700 mt-0.5">
                        Instant Scan • 0% Fee
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Transfer to verified Khalti ID
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Gateway Merchant Details Card */}
                <div className={`p-3.5 rounded-2xl border ${activeMethodConfig.bgAccent} space-y-2.5 shadow-2xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{activeMethodConfig.name}</span>
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${activeMethodConfig.badgeStyle}`}>
                      {activeMethodConfig.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/90 p-2.5 rounded-xl border border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Merchant Name:</span>
                      <span className="font-black text-slate-900">{activeMethodConfig.accountName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Account / Mobile ID:</span>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-black ${activeMethodConfig.accentColor}`}>{activeMethodConfig.accountId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeMethodConfig.accountId, 'payId')}
                          className="text-xs font-bold text-slate-600 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'payId' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copiedKey === 'payId' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {activeMethodConfig.instructions}
                    </p>
                    {activeMethodConfig.qrUrl && (
                      <button
                        type="button"
                        onClick={() => setShowQrModal(!showQrModal)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/90 text-xs font-black text-slate-800 hover:text-red-600 flex items-center gap-1 shrink-0 ml-2 shadow-2xs cursor-pointer"
                      >
                        <QrCode size={13} />
                        <span>{showQrModal ? 'Hide QR' : 'View QR'}</span>
                      </button>
                    )}
                  </div>

                  {/* Collapsible QR Code Display */}
                  {showQrModal && activeMethodConfig.qrUrl && (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                      <div className="max-w-[200px] mx-auto rounded-xl overflow-hidden border border-slate-200 p-2 bg-white shadow-2xs">
                        <img
                          src={activeMethodConfig.qrUrl}
                          alt="Payment QR"
                          className="w-full h-auto object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Scan with your {paymentMethod} app to pay
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Deposit Amount & Preset Chips */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">
                      2
                    </span>
                    <span>Deposit Amount (NPR)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Min: NPR 10</span>
                </div>

                {/* Preset Amount Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {PRESET_AMOUNTS.map((amt, aIdx) => {
                    const isSelected = amount === amt.toString();
                    return (
                      <button
                        key={`wallet-preset-amt-${amt}-${aIdx}`}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-600/25'
                            : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700'
                        }`}
                      >
                        रु {amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">
                    रु
                  </span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter deposit amount in NPR"
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs font-black text-slate-900 bg-white placeholder:text-slate-400 shadow-2xs transition-all"
                  />
                </div>
              </div>

              {/* Step 3: Transaction ID & Screenshot Proof */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span>Payment Verification Details</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-red-600">eSewa / Khalti Ref</span>
                </div>

                {/* Transaction Reference ID Input */}
                <div className="space-y-1">
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. 7X894102 or TXN98001234"
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs font-bold text-slate-900 bg-white placeholder:text-slate-400 placeholder:font-normal shadow-2xs transition-all"
                  />
                  <p className="text-[10px] text-slate-500 font-medium px-0.5">
                    Copy the Transaction / Reference ID from your payment slip and paste it above.
                  </p>
                </div>

                {/* Payment Screenshot Upload */}
                <div className="space-y-1.5 pt-0.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider px-0.5">
                    Attach Payment Screenshot (Optional but Recommended)
                  </label>

                  {proofUrl ? (
                    <div className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                          <img
                            src={proofUrl}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">Receipt Attached</span>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={11} /> Ready for verification
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProofUrl('')}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-4 text-center block cursor-pointer transition-all bg-slate-50/50 hover:bg-orange-50/30">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        </div>
                        <span className="text-xs font-black text-slate-800">
                          {isUploading ? 'Uploading screenshot...' : 'Click or Drag to Upload Screenshot'}
                        </span>
                        <span className="text-[10px] text-slate-400">PNG, JPG or JPEG up to 8MB</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Action Submit Button */}
              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !reference.trim() || !amount}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-600/25 hover:shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Submitting Deposit...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Deposit Request (रु {amount || 0})</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {/* ======================================================== */}
          {/* 6. TAB 2: PASSBOOK & TRANSACTION HISTORY */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* History Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(['all', 'completed', 'pending', 'rejected'] as const).map((filter, fIdx) => {
                  const isSelected = historyFilter === filter;
                  return (
                    <button
                      key={`wallet-hist-filter-${filter}-${fIdx}`}
                      type="button"
                      onClick={() => setHistoryFilter(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize shrink-0 transition-all cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-xs shadow-red-600/20'
                          : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700'
                      }`}
                    >
                      {filter === 'all' ? 'All Transactions' : filter}
                    </button>
                  );
                })}
              </div>

              {/* Transactions List */}
              {loading ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/90 space-y-2 shadow-2xs">
                  <Loader2 size={24} className="animate-spin text-red-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Loading passbook history...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/90 space-y-2 shadow-2xs">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">No Transactions Found</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    {historyFilter === 'all'
                      ? 'You have not made any deposits or wallet purchases yet.'
                      : `No transactions matching "${historyFilter}" status.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryFilter('all');
                      setActiveTab('deposit');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    Load Wallet Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((tx, txIdx) => {
                    const txType = (tx.type || '').toLowerCase();
                    const isCredit = txType === 'deposit' || txType === 'refund' || txType === 'bonus';
                    const statusUpper = (tx.status || '').toUpperCase();
                    const isCompleted = statusUpper === 'COMPLETED';
                    const isPending = statusUpper === 'PENDING';
                    const isRejected = statusUpper === 'REJECTED' || statusUpper === 'FAILED';

                    return (
                      <div
                        key={`wallet-tx-item-${tx.id || txIdx}-${txIdx}`}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-red-200 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {txType === 'deposit'
                                  ? 'Wallet Load Deposit'
                                  : txType === 'purchase'
                                  ? 'Order Payment'
                                  : txType === 'refund'
                                  ? 'Order Refund'
                                  : 'Loyalty Bonus'}
                              </span>

                              {isCompleted && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                                  Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 flex items-center gap-0.5">
                                  <Clock size={10} className="animate-spin" /> In Review
                                </span>
                              )}
                              {isRejected && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800">
                                  Declined
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium">
                              <span>{formatDate(tx.createdAt || '')}</span>
                              {tx.reference && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono font-bold text-slate-700">Ref: {tx.reference}</span>
                                </>
                              )}
                            </div>

                            {tx.adminNotes && (
                              <div className="text-[10px] text-rose-700 font-bold bg-rose-50/80 px-2 py-0.5 rounded-md mt-1">
                                Note: {tx.adminNotes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-black block ${
                              isCredit ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {isCredit ? '+' : '-'} {formatNPR(tx.amount)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {tx.paymentMethod || 'Wallet'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* 7. SUPPORT / WHATSAPP ASSISTANCE CARD */}
          {/* ======================================================== */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-4 shadow-2xs space-y-2.5 text-center">
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Need Urgent Balance Load?</h4>
                  <p className="text-[10px] text-slate-500">Contact compliance desk for fast-track verification.</p>
                </div>
              </div>

              <a
                href={waHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Enterprise Security Footer */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-2.5 text-[11px] text-slate-500 font-medium shadow-2xs">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              Unx Games protects your gamer wallet with 256-bit database encryption and automated ledger reconciliation.
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default WalletPage;
