import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import { formatNPR, formatDate } from '../../../utils/formatters';
import { Wallet, WalletTransaction } from '../../../types';
import {
  Wallet as WalletIcon,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Check,
  X,
  User,
  ShieldCheck,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../context/AuthContext';

export const AdminWalletsTab: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useStore();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'wallets' | 'ledger'>('pending');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustCustomerId, setAdjustCustomerId] = useState('');
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const fetchWalletsData = async () => {
    setLoading(true);
    try {
      const [wRes, txRes] = await Promise.all([
        api.wallet.adminGetWallets().catch(() => ({ success: false, wallets: [] })),
        api.wallet.adminGetTransactions().catch(() => ({ success: false, transactions: [] })),
      ]);

      if (wRes.success) setWallets(wRes.wallets || []);
      if (txRes.success) setTransactions(txRes.transactions || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletsData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('info', 'Copied', text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApproveDeposit = async (txId: string) => {
    try {
      const res = await api.wallet.adminVerifyDeposit(txId, 'approve');
      if (res.success) {
        showToast('success', 'Deposit Approved', 'Customer wallet balance updated.');
        fetchWalletsData();
      }
    } catch (err: any) {
      showToast('error', 'Approval Error', err?.message);
    }
  };

  const handleRejectDeposit = async (txId: string) => {
    try {
      const res = await api.wallet.adminVerifyDeposit(txId, 'reject', 'Payment slip unverified');
      if (res.success) {
        showToast('info', 'Deposit Rejected', 'Customer notified.');
        fetchWalletsData();
      }
    } catch (err: any) {
      showToast('error', 'Rejection Error', err?.message);
    }
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustCustomerId || !adjustAmount || Number(adjustAmount) <= 0) {
      showToast('error', 'Form Error', 'Please enter a valid Customer ID and Amount.');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await api.wallet.adminAdjustWallet({
        customerId: adjustCustomerId,
        type: adjustType,
        amount: Number(adjustAmount),
        reason: adjustReason || 'Manual administrative adjustment',
      });

      if (res.success) {
        showToast('success', 'Balance Adjusted', `Successfully applied ${adjustType} of NPR ${adjustAmount}.`);
        setIsAdjustModalOpen(false);
        setAdjustCustomerId('');
        setAdjustAmount('');
        setAdjustReason('');
        fetchWalletsData();
      }
    } catch (err: any) {
      showToast('error', 'Adjustment Error', err?.message);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const pendingDeposits = transactions.filter(
    (tx) => tx.type === 'DEPOSIT' && String(tx.status).toUpperCase() === 'PENDING'
  );

  const totalSystemLiquidity = wallets.reduce(
    (sum, w) => sum + (Number(w.balance || (w as any).wallet_balance) || 0),
    0
  );

  const filteredWallets = wallets.filter((w) => {
    const cid = (w.customerId || (w as any).customer_id || '').toLowerCase();
    const name = ((w as any).customer_name || (w as any).name || '').toLowerCase();
    const email = ((w as any).customer_email || (w as any).email || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return cid.includes(q) || name.includes(q) || email.includes(q);
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Liquidity Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shrink-0">
            <WalletIcon size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Customer Wallets</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                NPR BALANCE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              In-system gamer liquidity: <strong className="text-white font-mono">{formatNPR(totalSystemLiquidity)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-orange-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusCircle size={14} />
            <span>Adjust Balance</span>
          </button>

          <button
            onClick={fetchWalletsData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Sub-Tab Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'pending', label: `Pending Top-Ups (${pendingDeposits.length})` },
          { id: 'wallets', label: `All Wallets (${wallets.length})` },
          { id: 'ledger', label: 'Transaction Ledger' },
        ].map((chip) => {
          const active = activeSubTab === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveSubTab(chip.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB: PENDING TOP-UPS */}
      {activeSubTab === 'pending' && (
        <div className="space-y-2.5">
          {pendingDeposits.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
              <p className="font-bold text-slate-800 text-sm">No Pending Wallet Top-Ups</p>
              <p className="text-xs text-slate-500 mt-0.5">All customer deposit requests have been processed.</p>
            </div>
          ) : (
            pendingDeposits.map((tx, idx) => (
              <div
                key={tx.id || idx}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                    <ArrowDownLeft size={16} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900 font-mono">
                        {formatNPR(Number(tx.amount || 0))}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                        {tx.paymentMethod || 'QR DEPOSIT'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium truncate">
                      {(tx as any).customer_name || (tx as any).customer_email || tx.customerId}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Ref: {(tx as any).payment_ref || tx.id}</span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleRejectDeposit(tx.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveDeposit(tx.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB: ALL WALLETS */}
      {activeSubTab === 'wallets' && (
        <div className="space-y-3">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search gamer ID, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredWallets.map((w, idx) => (
              <div key={w.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {(w as any).customer_name || (w as any).customer_email || w.customerId}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    ID: {w.customerId}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 font-mono text-sm">
                    {formatNPR(Number(w.balance || 0))}
                  </div>
                  <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB: LEDGER */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
          {transactions.map((tx, idx) => {
            const isCredit = tx.type === 'DEPOSIT' || tx.type === 'CREDIT';
            return (
              <div key={tx.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{tx.description || tx.type}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="font-black font-mono text-sm text-right shrink-0">
                  <span className={isCredit ? 'text-emerald-600' : 'text-slate-900'}>
                    {isCredit ? '+' : '-'}{formatNPR(Number(tx.amount || 0))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Balance Adjustment Modal */}
      <AnimatePresence>
        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <WalletIcon className="text-amber-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">Manual Balance Adjustment</h3>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleManualAdjust} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Customer UUID or Email</label>
                  <input
                    type="text"
                    required
                    value={adjustCustomerId}
                    onChange={(e) => setAdjustCustomerId(e.target.value)}
                    placeholder="Enter Customer ID or Email"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    className={`p-2.5 rounded-xl font-bold border text-xs transition-all ${
                      adjustType === 'CREDIT'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    + CREDIT (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    className={`p-2.5 rounded-xl font-bold border text-xs transition-all ${
                      adjustType === 'DEBIT'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    - DEBIT (Deduct)
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Amount (NPR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Adjustment Reason</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Compensation / Manual Topup"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdjust}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30 disabled:opacity-50"
                  >
                    {isSubmittingAdjust ? 'Submitting...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminWalletsTab;
