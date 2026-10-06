import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR, formatTimeAgo, formatDisplayOrderId } from '../../../utils/formatters';
import { CancellationRequest } from '../../../types';
import {
  Search,
  CheckCircle2,
  XCircle,
  FileWarning,
  Eye,
  AlertCircle,
  X,
  CreditCard,
  User,
  Clock,
  RefreshCw,
  Copy,
  ChevronRight,
  ShieldAlert,
  DollarSign,
  ArrowRight,
  Check,
  Building,
  Smartphone,
  Wallet,
  Receipt,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminCancellationsTab: React.FC = () => {
  const {
    cancellationRequests,
    orders,
    approveCancellation,
    rejectCancellation,
    updateRefundStatus,
    refreshCancellations,
    showToast,
    setAdminSelectedOrderId,
    setAdminTab,
  } = useStore();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'refunded' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [selectedRefundRequest, setSelectedRefundRequest] = useState<CancellationRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Refund Settlement Modal States
  const [refundStatus, setRefundStatus] = useState<string>('refund_pending');
  const [refundAmount, setRefundAmount] = useState<number | string>('');
  const [refundMethod, setRefundMethod] = useState<string>('eSewa');
  const [customerAccount, setCustomerAccount] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [refundReference, setRefundReference] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [refundNote, setRefundNote] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Center lock: disable background page scrolling when modal is open
  useEffect(() => {
    if (selectedRefundRequest || selectedRequest) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = originalOverflow || '';
        document.body.style.touchAction = originalTouchAction || '';
      };
    }
  }, [selectedRefundRequest, selectedRequest]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshCancellations();
    setIsRefreshing(false);
    showToast('success', 'Refreshed', 'Cancellation & refund requests updated.');
  };

  const adminInfo = {
    uid: currentUser?.id || 'admin',
    name: currentUser?.full_name || 'Administrator',
    email: currentUser?.email || 'admin@unx.com',
  };

  const filteredRequests = useMemo(() => {
    return cancellationRequests.filter((req) => {
      const status = (req.status || 'pending').toLowerCase();
      const rStatus = (req.refundStatus || '').toLowerCase();

      if (filter === 'pending' && status !== 'pending') return false;
      if (filter === 'processing' && rStatus !== 'processing' && status !== 'approved') return false;
      if (filter === 'refunded' && rStatus !== 'refunded') return false;
      if (filter === 'rejected' && status !== 'rejected' && rStatus !== 'rejected') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          req.orderId?.toLowerCase().includes(q) ||
          req.userName?.toLowerCase().includes(q) ||
          req.userEmail?.toLowerCase().includes(q) ||
          req.reason?.toLowerCase().includes(q) ||
          req.refundReference?.toLowerCase().includes(q) ||
          String(req.id).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cancellationRequests, filter, searchTerm]);

  const pendingCount = cancellationRequests.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length;
  const processingCount = cancellationRequests.filter(
    (r) => (r.refundStatus || '').toLowerCase() === 'processing' || ((r.status || '').toLowerCase() === 'approved' && (r.refundStatus || '').toLowerCase() !== 'refunded')
  ).length;
  const refundedCount = cancellationRequests.filter((r) => (r.refundStatus || '').toLowerCase() === 'refunded').length;

  const handleApprove = async (req: CancellationRequest) => {
    setProcessing(true);
    try {
      const ok = await approveCancellation(req.id, adminInfo);
      if (ok.success) {
        setSelectedRequest(null);
        setActionNotes('');
        // Automatically open the refund settlement modal so the admin can settle or adjust details
        openRefundModal(req);
      }
    } catch {
      // Handled
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(true);
    try {
      const ok = await rejectCancellation(id, actionNotes || 'Cancellation rejected as order is already fulfilled', adminInfo);
      if (ok.success) {
        setSelectedRequest(null);
        setActionNotes('');
      }
    } catch {
      // Handled
    } finally {
      setProcessing(false);
    }
  };

  const openRefundModal = (req: CancellationRequest) => {
    const matchedOrder = orders.find(
      (o) =>
        o.id === req.orderId ||
        o.orderCode === req.orderId ||
        (o as any).order_code === req.orderId ||
        o.id === req.id
    );

    setSelectedRefundRequest(req);
    const rawSt = (req.refundStatus || '').toLowerCase();
    setRefundStatus(
      rawSt === 'completed' || rawSt === 'refunded' ? 'refund_completed' :
      rawSt === 'processing' ? 'refund_processing' :
      rawSt === 'rejected' ? 'refund_rejected' : 'refund_pending'
    );
    setRefundAmount(req.refundAmount || matchedOrder?.totalAmount || matchedOrder?.amount || (matchedOrder as any)?.price || 0);
    setRefundMethod(req.refundMethod || (matchedOrder?.paymentMethod ? String(matchedOrder.paymentMethod) : 'eSewa'));
    setCustomerAccount(req.userPhone || matchedOrder?.customerPhone || (matchedOrder as any)?.phone || '');
    setAccountHolderName(req.userName || matchedOrder?.customerName || '');
    setRefundReference(req.refundReference || (matchedOrder as any)?.transactionId || '');
    setReceiptUrl((req as any).receiptUrl || '');
    setRefundNote(req.adminNote || 'Funds transferred back to your wallet.');
  };

  const handleSaveRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundRequest) return;

    setProcessing(true);
    try {
      const normalizedStatus = refundStatus.replace('refund_', '');
      await updateRefundStatus(
        selectedRefundRequest.id,
        normalizedStatus as any,
        Number(refundAmount) || 0,
        refundReference.trim() || undefined,
        refundNote.trim() || undefined,
        adminInfo,
        {
          refundMethod,
          customerAccount,
          accountHolderName,
          receiptUrl,
        }
      );

      showToast(
        'success',
        normalizedStatus === 'completed' || normalizedStatus === 'refunded' ? 'Refund Completed 💸' : 'Refund Status Updated',
        `Rs. ${refundAmount} updated to ${refundStatus} via ${refundMethod}.`
      );
      setSelectedRefundRequest(null);
    } catch (err: any) {
      showToast('error', 'Refund Update Failed', err?.message || 'Failed to update refund status');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Hero Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black shrink-0 shadow-inner">
            <FileWarning size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Order Cancellations &amp; Refunds</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {pendingCount} PENDING
              </span>
              {processingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {processingCount} IN REFUND
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Instant Mobile Refund Settlement Desk • 0ms Live Customer Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Quick Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-rose-600 block">Pending Review</span>
          <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">{pendingCount}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-amber-600 block">In Refund Queue</span>
          <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">{processingCount}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-emerald-600 block">Refunds Settled</span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono">{refundedCount}</span>
        </div>
      </div>

      {/* Filter Chips (Horizontal Touch Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Requests (${cancellationRequests.length})` },
          { id: 'pending', label: `Pending (${pendingCount})` },
          { id: 'processing', label: `In Refund (${processingCount})` },
          { id: 'refunded', label: `Completed (${refundedCount})` },
          { id: 'rejected', label: 'Rejected' },
        ].map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 scale-[1.02]'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order ref, customer name, email, txn ref or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Mobile-Native Cancellation Stream */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
            <p className="font-bold text-slate-800 text-sm">No Matching Requests</p>
            <p className="text-xs text-slate-500 mt-0.5">All cancellation and refund requests have been processed.</p>
          </div>
        ) : (
          filteredRequests.map((req, idx) => {
            const isPending = (req.status || 'pending').toLowerCase() === 'pending';
            const isApproved = (req.status || '').toLowerCase() === 'approved';
            const isRejected = (req.status || '').toLowerCase() === 'rejected';

            const rStatus = (req.refundStatus || (isApproved ? 'processing' : 'pending')).toLowerCase();
            const isRefunded = rStatus === 'refunded';
            const isRefundProg = rStatus === 'processing';

            const matchedOrder = orders.find(
              (o) =>
                o.id === req.orderId ||
                o.orderCode === req.orderId ||
                (o as any).order_code === req.orderId ||
                o.id === req.id
            );

            const displayAmount = req.refundAmount || matchedOrder?.amount || 0;
            const displayCode = (req as any).orderCode || (matchedOrder ? formatDisplayOrderId(matchedOrder) : req.orderId);

            return (
              <div
                key={req.id || idx}
                className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                {/* Top Row: Order Code, Amount, Status Badges */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded-xl font-mono font-black text-xs">
                      <span>#{displayCode}</span>
                      <button
                        onClick={() => handleCopy(displayCode, `req-code-${req.id}`)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy Code"
                      >
                        {copiedId === `req-code-${req.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>

                    {/* Cancellation Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                        isPending
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {req.status || 'PENDING'}
                    </span>

                    {/* Refund Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1 ${
                        isRefunded
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : isRefundProg
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>💸 Refund:</span>
                      <span>{isRefunded ? 'SETTLED' : isRefundProg ? 'PROCESSING' : req.refundStatus || 'PENDING'}</span>
                    </span>
                  </div>

                  {/* Order Amount */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Order Amount</span>
                    <span className="text-sm sm:text-base font-black font-mono text-violet-700">
                      {formatNPR(displayAmount)}
                    </span>
                  </div>
                </div>

                {/* Middle Info: Customer & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <User size={13} className="text-slate-400" />
                      <span>{req.userName || matchedOrder?.userName || 'Customer'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {req.userEmail || matchedOrder?.userEmail || 'No email provided'}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} />
                      <span>Requested: {formatTimeAgo(req.requestedAt || (req as any).createdAt || new Date().toISOString())}</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-rose-950 space-y-1">
                    <span className="text-[10px] font-black uppercase text-rose-700 block">Cancellation Reason</span>
                    <p className="font-medium text-xs line-clamp-2">
                      &ldquo;{req.reason || 'Customer requested order cancellation'}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Refund Settlement Info Bar (if processed) */}
                {(req.refundReference || req.refundMethod || isRefunded) && (
                  <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold uppercase text-[10px] bg-emerald-200/80 px-1.5 py-0.5 rounded text-emerald-900 font-mono">
                        {req.refundMethod || 'eSewa'}
                      </span>
                      {req.refundReference && (
                        <span className="font-mono font-bold text-[11px]">
                          Ref: {req.refundReference}
                        </span>
                      )}
                      {req.adminNote && (
                        <span className="text-slate-600 text-[11px] line-clamp-1">
                          • Note: {req.adminNote}
                        </span>
                      )}
                    </div>
                    {req.refundDate && (
                      <span className="text-[10px] text-emerald-700 font-mono">
                        Settled: {new Date(req.refundDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    {matchedOrder && (
                      <button
                        onClick={() => {
                          setAdminSelectedOrderId(matchedOrder.id);
                          setAdminTab('order_detail');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="View Full Order Info"
                      >
                        <Eye size={13} />
                        <span>View Order</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Settle / Update Refund Button (Direct Mobile App Action) */}
                    <button
                      onClick={() => openRefundModal(req)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        isRefunded
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      }`}
                    >
                      <DollarSign size={13} />
                      <span>{isRefunded ? 'Edit Refund' : 'Update / Settle Refund'}</span>
                    </button>

                    {/* Pending Decision Buttons */}
                    {isPending && (
                      <>
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm shadow-rose-600/30"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve / Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. PROCESS & UPDATE REFUND BOTTOM SHEET (MOBILE NATIVE APP STYLE)          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedRefundRequest && (
          <div 
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedRefundRequest(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative text-slate-900 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle bar */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Process &amp; Update Refund
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Synced with Customer&apos;s live Refund Tracker
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRefundRequest(null)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form id="refund-sheet-form" onSubmit={handleSaveRefund} className="p-5 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
                {/* Refund Status * */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Refund Status *
                  </label>
                  <select
                    value={refundStatus}
                    onChange={(e) => setRefundStatus(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="refund_pending">⏳ refund_pending (Under Review)</option>
                    <option value="refund_processing">🔄 refund_processing (In Progress / Bank Queue)</option>
                    <option value="refund_completed">✅ refund_completed (Refund Transferred 💸)</option>
                    <option value="refund_rejected">❌ refund_rejected (Declined)</option>
                  </select>
                </div>

                {/* 2-column: Refund Amount & Payment Wallet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Refund Amount (NPR) *
                    </label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      required
                      placeholder="195"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Payment Wallet
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    >
                      <option value="eSewa">eSewa</option>
                      <option value="Khalti">Khalti</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Fonepay">Fonepay</option>
                      <option value="IME Pay">IME Pay</option>
                      <option value="Cash / Other">Cash / Other</option>
                    </select>
                  </div>
                </div>

                {/* 2-column: Customer Account / Phone & Account Holder Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Customer Account / Phone
                    </label>
                    <input
                      type="text"
                      value={customerAccount}
                      onChange={(e) => setCustomerAccount(e.target.value)}
                      placeholder="976891881"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Binod Thalal"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Refund Transaction Reference ID */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Refund Transaction Reference ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                    placeholder="e.g.  ESW98234872394  /  KHLT-992384"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                {/* Official Refund Transfer Receipt URL */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Official Refund Transfer Receipt URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or receipt URL"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Customer can click &ldquo;View Official Refund Transfer Receipt&rdquo; in their app to verify payment proof.
                  </p>
                </div>

                {/* Admin Note for Customer */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Admin Note for Customer (Optional)
                  </label>
                  <input
                    type="text"
                    value={refundNote}
                    onChange={(e) => setRefundNote(e.target.value)}
                    placeholder="e.g. Funds transferred back to your eSewa wallet."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </form>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRefundRequest(null)}
                  className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="refund-sheet-form"
                  disabled={processing}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
                >
                  {processing ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{processing ? 'Saving...' : 'Confirm & Sync Refund'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. CANCELLATION APPROVE / REJECT MODAL                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedRequest && (
          <div 
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden touch-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedRequest(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header (Fixed) */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 flex-shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shadow-xs">
                    <FileWarning size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Review Cancellation Request</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Review customer dispute and resolve</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                <div className="space-y-2 text-xs font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Order Ref:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">#{(selectedRequest as any).orderCode || selectedRequest.orderId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Customer:</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.userName || selectedRequest.userEmail}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-rose-600 uppercase">{selectedRequest.status || 'PENDING'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Requested:</span>
                    <span className="text-slate-700">{new Date(selectedRequest.requestedAt || (selectedRequest as any).createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">Cancellation Reason</span>
                  <p className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono break-words shadow-inner leading-relaxed">
                    {selectedRequest.reason || 'No specific reason provided by customer.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Admin Resolution Note</label>
                  <input
                    type="text"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="e.g. Cancellation approved, refund initiated"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Action Buttons (Fixed Footer) */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/90 flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-rose-700 font-bold text-xs cursor-pointer transition-all"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {processing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{processing ? 'Processing...' : 'Approve & Queue Refund'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCancellationsTab;
