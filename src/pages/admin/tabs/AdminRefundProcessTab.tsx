import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR, formatDate, formatDisplayOrderId, getOrderAccountShortLabel } from '../../../utils/formatters';
import { ArrowLeft, RotateCcw, AlertCircle, CheckCircle, Clock, ShieldCheck, HelpCircle, Save, X, ExternalLink, MessageCircle } from 'lucide-react';

export const AdminRefundProcessTab: React.FC = () => {
  const {
    orders,
    adminSelectedOrderId,
    setAdminTab,
    updateRefundStatus,
    cancellationRequests,
    paymentSettings,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'STORE_MANAGER' || isSuperAdmin;
  const isStaffOnly = (uRole === 'SUPPORT_STAFF') && !isManager;

  const order = orders.find(
    (o) =>
      o.id === adminSelectedOrderId ||
      (o.order_code && o.order_code === adminSelectedOrderId) ||
      (o.orderCode && o.orderCode === adminSelectedOrderId) ||
      (o.orderNumber && o.orderNumber === adminSelectedOrderId)
  );

  const matchingCancelRequest = cancellationRequests.find(
    (cr) =>
      (order && (cr.orderId === order.id || cr.orderId === order.orderCode || cr.orderId === (order as any).order_code || cr.id === order.cancellationRequestId)) ||
      cr.orderId === adminSelectedOrderId ||
      cr.id === adminSelectedOrderId
  );

  // Redirect if no order selected
  useEffect(() => {
    if (!order) {
      showToast('error', 'Error', 'No active order selected for refund processing.');
      setAdminTab('orders');
    }
  }, [order, setAdminTab, showToast]);

  const displayOrderId = order ? formatDisplayOrderId(order) : '';

  // Form states
  const [refundStatusInput, setRefundStatusInput] = useState<'refund_pending' | 'processing' | 'refunded' | 'rejected'>('refund_pending');
  const [refundAmountInput, setRefundAmountInput] = useState<number>(0);
  const [refundMethodInput, setRefundMethodInput] = useState('eSewa');
  const [refundAccountNameInput, setRefundAccountNameInput] = useState('');
  const [refundAccountNumberInput, setRefundAccountNumberInput] = useState('');
  const [refundReferenceInput, setRefundReferenceInput] = useState('');
  const [refundProofUrlInput, setRefundProofUrlInput] = useState('');
  const [refundNoteInput, setRefundNoteInput] = useState('');
  const [refundRejectionInput, setRefundRejectionInput] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Sync state with order details
  useEffect(() => {
    if (order) {
      setRefundAmountInput(order.refundAmount || matchingCancelRequest?.refundAmount || order.amount || 0);
      setRefundStatusInput(
        (matchingCancelRequest?.refundStatus || order.refundStatus || 'refund_pending') as any
      );
      setRefundMethodInput(
        matchingCancelRequest?.refundMethod || order.refundMethod || order.paymentMethod || 'eSewa'
      );
      setRefundAccountNumberInput(
        matchingCancelRequest?.refundAccountNumber || order.refundAccountNumber || order.userPhone || ''
      );
      setRefundAccountNameInput(
        matchingCancelRequest?.refundAccountName || order.refundAccountName || order.userName || ''
      );
      setRefundReferenceInput(order.refundReference || matchingCancelRequest?.refundReference || '');
      setRefundProofUrlInput(order.refundProofUrl || matchingCancelRequest?.refundProofUrl || '');
      
      const lastNote = order.refundNote || matchingCancelRequest?.adminNote || '';
      if (order.refundStatus === 'rejected' || matchingCancelRequest?.status === 'REJECTED') {
        setRefundRejectionInput(lastNote);
      } else {
        setRefundNoteInput(lastNote);
      }
    }
  }, [order, matchingCancelRequest]);

  if (!order) return null;

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaffOnly) {
      showToast('error', 'Access Denied', 'Support Staff are not authorized to process refunds. Manager or Admin permission required.');
      return;
    }
    setIsSubmittingRefund(true);

    const adminInfo = currentUser || { uid: 'admin', name: 'Admin', email: 'hii.binodthalal@gmail.com' };
    const targetId = matchingCancelRequest?.id || order.cancellationRequestId || order.id;

    const result = await updateRefundStatus(
      targetId,
      refundStatusInput,
      Number(refundAmountInput) || order.amount,
      refundReferenceInput.trim(),
      refundNoteInput.trim() || refundRejectionInput.trim(),
      adminInfo,
      {
        refundMethod: refundMethodInput,
        refundProofUrl: refundProofUrlInput.trim(),
      }
    );

    setIsSubmittingRefund(false);

    if (result.success) {
      showToast(
        'success',
        'Refund Updated',
        `Order #${displayOrderId} refund status updated to ${refundStatusInput.toUpperCase()}. Customer notified.`
      );
      setAdminTab('order_detail');
    } else {
      showToast('error', 'Update Failed', result.message || 'Could not update refund status.');
    }
  };

  const handleBackToOrder = () => {
    setAdminTab('order_detail');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* 1. Header & Back Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/90 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToOrder}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
            title="Back to Order Details"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              Process &amp; Settle Refund (भुक्तानी फिर्ता)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Order: <span className="font-mono font-bold text-red-600">#{displayOrderId}</span> • {order.productName || 'Game Top-Up'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full uppercase shrink-0">
          Admin Action
        </span>
      </div>

      {/* 2. Form & Refund Target Summary Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 items-start">
        {/* Main Refund Action Form */}
        <form onSubmit={handleProcessRefundSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
            Fulfillment Details Form
          </h3>

          {/* Refund Status Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
              Refund Status *
            </label>
            <select
              value={refundStatusInput}
              onChange={(e) => setRefundStatusInput(e.target.value as any)}
              className="w-full h-11 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none transition-all cursor-pointer"
              required
            >
              <option value="refund_pending">⏳ refund_pending (Under Review / Queued)</option>
              <option value="processing">🔄 processing (Actively Transferring)</option>
              <option value="refunded">✅ refunded (Refund Settled &amp; Transferred)</option>
              <option value="rejected">❌ rejected (Decline Refund Request)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Refund Amount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                Refund Amount (NPR) *
              </label>
              <input
                type="number"
                required
                min={0}
                max={Math.max(order.amount, 100000)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(Number(e.target.value))}
              />
            </div>

            {/* Refund Wallet */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                Refund Wallet / Method *
              </label>
              <input
                type="text"
                required
                placeholder="eSewa, Khalti, or Gamer Wallet"
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
                value={refundMethodInput}
                onChange={(e) => setRefundMethodInput(e.target.value)}
              />
            </div>

            {/* Account Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                Customer Account / ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wallet mobile number or ID"
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
                value={refundAccountNumberInput}
                onChange={(e) => setRefundAccountNumberInput(e.target.value)}
              />
            </div>

            {/* Account Holder Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                Account Holder Name
              </label>
              <input
                type="text"
                placeholder="e.g. Full name on payment account"
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
                value={refundAccountNameInput}
                onChange={(e) => setRefundAccountNameInput(e.target.value)}
              />
            </div>
          </div>

          {/* Refund Transaction Reference */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide block">
              Refund Transaction Reference ID {refundStatusInput === 'refunded' ? '*' : '(Optional)'}
            </label>
            <input
              type="text"
              placeholder="e.g. eSewa/Khalti wallet transfer reference code"
              required={refundStatusInput === 'refunded'}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase tracking-wider text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:font-normal"
              value={refundReferenceInput}
              onChange={(e) => setRefundReferenceInput(e.target.value)}
            />
          </div>

          {/* Official Refund Transfer Receipt URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide block">
              Official Refund Transfer Receipt URL (Optional)
            </label>
            <input
              type="url"
              placeholder="e.g. link to screenshot image or receipt PDF"
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:bg-white focus:border-slate-400 focus:outline-none"
              value={refundProofUrlInput}
              onChange={(e) => setRefundProofUrlInput(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 font-medium">
              Customers can click &ldquo;View Official Refund Transfer Receipt&rdquo; in their app to verify payment proof.
            </p>
          </div>

          {/* Notes or decline reasons */}
          {refundStatusInput === 'rejected' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wide block">
                Reason for Declining Refund *
              </label>
              <textarea
                required
                className="w-full min-h-20 p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                value={refundRejectionInput}
                onChange={(e) => setRefundRejectionInput(e.target.value)}
                placeholder="Explain reason for declining cancellation/refund..."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide block">
                Refund Processing Note / Instructions (Optional)
              </label>
              <textarea
                className="w-full min-h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-violet-600 focus:outline-none"
                value={refundNoteInput}
                onChange={(e) => setRefundNoteInput(e.target.value)}
                placeholder="e.g. Settle balance into eSewa wallet. Processed by compliance desk."
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBackToOrder}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingRefund}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/10 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSubmittingRefund ? 'Saving Refund...' : 'Update Refund Status'}</span>
            </button>
          </div>
        </form>

        {/* Info & Target Order Details Card */}
        <div className="space-y-4">
          {/* Order Snapshot Summary */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Refund Target Order Snapshot
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-800">#{displayOrderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Product / Game:</span>
                <span className="font-bold text-slate-800">{order.productName || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Package Title:</span>
                <span className="font-bold text-slate-800">{order.packageName || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Player UID / ID:</span>
                <span className="font-mono font-bold text-violet-600">
                  {order.gameUserId || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Original Total Price:</span>
                <span className="font-bold text-slate-900">{formatNPR(order.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Order Placed On:</span>
                <span className="font-bold text-slate-800">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-slate-500">Original Payment Gateway:</span>
                <span className="font-extrabold uppercase text-slate-800">
                  {order.paymentMethod || 'Online Transfer'}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Request Snapshot (If exists) */}
          {matchingCancelRequest && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                Cancellation Request Details
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-500">Reason Preset:</span>
                  <span className="font-bold text-slate-800">{matchingCancelRequest.reason || 'N/A'}</span>
                </div>
                {(matchingCancelRequest.notes || matchingCancelRequest.userNote) && (
                  <div className="py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-500 block mb-0.5">User Explanation:</span>
                    <span className="text-slate-700 italic block">{matchingCancelRequest.notes || matchingCancelRequest.userNote}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-500">Claimed Refund Wallet:</span>
                  <span className="font-bold text-indigo-700">{matchingCancelRequest.refundMethod || 'eSewa'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-500">Account ID:</span>
                  <span className="font-mono font-bold text-slate-900">{matchingCancelRequest.refundAccountNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium text-slate-500">Account Name:</span>
                  <span className="font-bold text-slate-900">{matchingCancelRequest.refundAccountName || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Support Helpline Alert */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 text-white text-center space-y-2">
            <MessageCircle size={20} className="text-emerald-400 mx-auto" />
            <h4 className="text-xs font-black">Need assistance with this refund?</h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Verify the client bank ledger reference before completing the transfer. Contact senior compliance at Baitadi DAO.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRefundProcessTab;
