import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import { formatNPR, formatDate } from '../../utils/formatters';
import { Wallet, WalletTransaction } from '../../types';
import {
  Wallet as WalletIcon,
  X,
  CreditCard,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  RotateCw,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  QrCode,
  Upload,
  Lock,
  Send,
  Loader2,
  Maximize2,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { ModalPortal } from '../common/ModalPortal';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onBalanceUpdated,
}) => {
  const { showToast, appSettings, paymentSettings, setCurrentTab, walletBalance: storeWalletBalance } = useStore();
  const { currentUser } = useAuth();

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
  const [loading, setLoading] = useState(() => !transactions.length);
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');

  // Deposit Form state
  const [amount, setAmount] = useState<string>('500');
  const [paymentMethod, setPaymentMethod] = useState<'eSewa' | 'Khalti'>('eSewa');
  const [reference, setReference] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<boolean>(false);

  const fetchWallet = async () => {
    if (!transactions.length) setLoading(true);
    try {
      const res = await api.wallet.getMyWallet();
      if (res && res.success) {
        setWallet(res.wallet);
        setTransactions(res.transactions || []);
        if (onBalanceUpdated && res.wallet) {
          onBalanceUpdated(res.wallet.balance);
        }
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            wallet: res.wallet,
            transactions: res.transactions || []
          }));
        } catch {}
      }
    } catch (err: any) {
      showToast('error', 'Wallet Error', err?.message || 'Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      setShowQr(false);
    }
  }, [isOpen]);

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
      showToast('error', 'Invalid File', 'Please select an image screenshot (PNG, JPG).');
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
        proofUrl: proofUrl.trim() || undefined,
      });

      if (res && res.success) {
        showToast('success', 'Deposit Submitted', 'Your deposit request has been submitted for admin verification.');
        setReference('');
        setProofUrl('');
        setActiveTab('history');
        fetchWallet();
      } else {
        showToast('error', 'Submission Failed', res?.message || 'Could not submit deposit request.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to submit deposit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const appName = appSettings?.appName || 'Unx Games';
  const esewaId = paymentSettings?.esewaId || appSettings?.esewaNumber || '9768914027';
  const khaltiId = paymentSettings?.khaltiId || appSettings?.khaltiNumber || '9768914027';
  const accountHolder = paymentSettings?.esewaName || appSettings?.storeName || 'Unx Games';

  const currentQrUrl =
    paymentMethod === 'Khalti'
      ? paymentSettings?.khaltiQr || appSettings?.khaltiQr
      : paymentSettings?.esewaQr || appSettings?.esewaQr;

  const activeMethodConfig =
    paymentMethod === 'eSewa'
      ? {
          name: 'eSewa Digital Wallet',
          badge: '0% Surcharge • Instant',
          accountName: accountHolder,
          accountId: esewaId,
          accentColor: 'text-emerald-700',
          bgAccent: 'bg-emerald-50/90 border-emerald-200',
          badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        }
      : {
          name: 'Khalti Digital Wallet',
          badge: 'Instant QR • 0% Fee',
          accountName: accountHolder,
          accountId: khaltiId,
          accentColor: 'text-purple-700',
          bgAccent: 'bg-purple-50/90 border-purple-200',
          badgeStyle: 'bg-purple-100 text-purple-800 border-purple-200',
        };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <div 
        className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
        {/* KYC Light Luxury Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/40 border-b border-slate-200/90 p-4 sm:p-5 shrink-0">
          {/* Top Tri-Color Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500" />

          {/* Top Header Actions */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇳🇵</span>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-700 leading-none">
                  OFFICIAL GAMER WALLET PASS
                </div>
                <div className="text-xs font-black text-slate-900 mt-0.5 tracking-tight">
                  {appName} Digital Vault
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentTab('wallet');
                }}
                className="text-slate-600 hover:text-violet-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Expand Full Page"
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-600 hover:text-rose-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Balance Banner & Refresh Row */}
          <div className="pt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Available Gamer Balance</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block truncate">
                {(loading && storeWalletBalance === null) ? (
                  <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-md mt-1"></div>
                ) : (
                  formatNPR(wallet?.balance ?? (storeWalletBalance !== null ? storeWalletBalance : 0))
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={fetchWallet}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RotateCw size={12} className={loading ? 'animate-spin text-red-600' : ''} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 border-b border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('deposit')}
            className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-white text-red-950 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard size={14} className={activeTab === 'deposit' ? 'text-red-600' : 'text-slate-500'} />
            <span>Load Balance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-red-950 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} className={activeTab === 'history' ? 'text-red-600' : 'text-slate-500'} />
            <span>Passbook ({transactions.length})</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {activeTab === 'deposit' ? (
            <form onSubmit={handleDepositSubmit} className="space-y-3">
              {/* Payment Safety Notice */}
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-2 shadow-2xs">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-amber-950">Official Merchant Transfer:</span> Transfer exact amount to official merchant ID below and submit reference ID.
                </div>
              </div>

              {/* Step 1: Method Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-black">1</span>
                    <span>Select Gateway</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Required *</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setPaymentMethod('eSewa')}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 ${
                      paymentMethod === 'eSewa'
                        ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      paymentMethod === 'eSewa' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      eS
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 leading-tight">eSewa</div>
                      <div className="text-[10px] font-bold text-emerald-700">0% Surcharge</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('Khalti')}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 ${
                      paymentMethod === 'Khalti'
                        ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      paymentMethod === 'Khalti' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
                    }`}>
                      Kh
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 leading-tight">Khalti</div>
                      <div className="text-[10px] font-bold text-purple-700">Instant QR</div>
                    </div>
                  </div>
                </div>

                {/* Merchant Details Box */}
                <div className={`p-3 rounded-2xl border ${activeMethodConfig.bgAccent} space-y-2 shadow-2xs`}>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Account Number:</span>
                      <span className={`font-mono font-black ${activeMethodConfig.accentColor}`}>{activeMethodConfig.accountId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(activeMethodConfig.accountId, 'payId')}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200/80 text-[10.5px] font-bold text-slate-700 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'payId' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedKey === 'payId' ? 'Copied' : 'Copy'}</span>
                      </button>
                      {currentQrUrl && (
                        <button
                          type="button"
                          onClick={() => setShowQr(!showQr)}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200/80 text-[10.5px] font-bold text-slate-700 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode size={11} />
                          <span>{showQr ? 'Hide' : 'QR'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {showQr && currentQrUrl && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <img
                        src={currentQrUrl}
                        alt="Payment QR"
                        className="w-36 h-36 mx-auto object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Amount */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-black">2</span>
                    <span>Deposit Amount</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Min: NPR 10</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {PRESET_AMOUNTS.map((amt, amtIdx) => {
                    const isSelected = amount === amt.toString();
                    return (
                      <button
                        key={`wallet-preset-amt-${amt}-${amtIdx}`}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs shadow-violet-600/25'
                            : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700'
                        }`}
                      >
                        रु {amt}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">रु</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter deposit amount in NPR"
                    required
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 focus:border-slate-400 outline-none focus:outline-none focus:ring-0 text-xs font-black text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Step 3: Reference & Screenshot */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-black">3</span>
                    <span>Transaction ID</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-600">eSewa/Khalti Ref</span>
                </div>

                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 7X894102 or TXN98001234"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-400 outline-none focus:outline-none focus:ring-0 text-xs font-bold text-slate-900 bg-white placeholder:text-slate-400"
                />

                {/* Optional Screenshot */}
                <div className="pt-0.5">
                  {proofUrl ? (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Receipt attached
                      </span>
                      <button
                        type="button"
                        onClick={() => setProofUrl('')}
                        className="text-rose-600 font-bold hover:underline cursor-pointer text-[11px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-2.5 text-center block cursor-pointer transition-all bg-slate-50/50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold">
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="text-violet-600" />}
                        <span>{isUploading ? 'Uploading...' : 'Attach Payment Receipt (Optional)'}</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !reference.trim() || !amount}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-violet-600/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit Deposit (रु {amount || 0})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <FileText size={20} className="text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">No Transactions Yet</div>
                  <p className="text-[10px] text-slate-500">Your deposits and wallet payments will appear here.</p>
                </div>
              ) : (
                transactions.map((tx, txIdx) => {
                  const txType = (tx.type || '').toLowerCase();
                  const isCredit = txType === 'deposit' || txType === 'refund' || txType === 'bonus';
                  const statusUpper = (tx.status || '').toUpperCase();
                  const isCompleted = statusUpper === 'COMPLETED';
                  const isPending = statusUpper === 'PENDING';

                  return (
                    <div
                      key={`modal-wallet-tx-${tx.id || txIdx}-${txIdx}`}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 truncate leading-tight">
                            {txType === 'deposit' ? 'Wallet Deposit' : 'Order Payment'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {formatDate(tx.createdAt || '')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-black text-xs block ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isCredit ? '+' : '-'} {formatNPR(tx.amount)}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase ${
                            isCompleted ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-rose-600'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
            <Lock size={12} className="text-emerald-600" />
            <span>256-Bit Encrypted Vault</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              setCurrentTab('wallet');
            }}
            className="text-xs font-black text-red-700 hover:text-red-900 cursor-pointer"
          >
            Open Full Passbook →
          </button>
        </div>
      </motion.div>
    </div>
  </ModalPortal>
  );
};
