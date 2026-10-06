import React, { useState, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { formatNPR, formatTimeAgo, isOrderAwaitingPaymentVerification } from '../../../utils/formatters';
import { Order } from '../../../types';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  Clock,
  ShieldCheck,
  X,
  Check,
  Copy,
  Search,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminPaymentsTab: React.FC = () => {
  const {
    orders,
    cancellationRequests,
    updateOrderStatus,
    setAdminTab,
    setAdminSelectedOrderId,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<{
    url: string;
    orderId: string;
    customerName: string;
    amount?: number;
    paymentMethod?: string;
    order?: Order;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'all' | 'esewa' | 'khalti' | 'qr'>('pending');

  // AI OCR Verification State
  const [aiCheckingProof, setAiCheckingProof] = useState(false);
  const [aiProofResult, setAiProofResult] = useState<any | null>(null);

  // Rejection modal
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Payment reference ID not found in merchant statement.');

  const handleRunAiReceiptCheck = async (
    url: string,
    orderCode: string,
    expectedAmount?: number,
    paymentMethod?: string
  ) => {
    setAiCheckingProof(true);
    setAiProofResult(null);
    try {
      const res: any = await api.ai.verifyReceipt({
        imageUrl: url,
        expectedAmount,
        expectedOrderCode: orderCode,
        paymentMethod,
      });
      if (res && res.success && res.result) {
        setAiProofResult(res.result);
        showToast('success', 'AI OCR Verified', 'Payment receipt analyzed by AI engine.');
      } else {
        showToast('error', 'AI Notice', res?.message || 'Could not verify receipt.');
      }
    } catch (err: any) {
      showToast('error', 'AI Error', err?.message || 'Failed to analyze receipt.');
    } finally {
      setAiCheckingProof(false);
    }
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRefId(id);
    showToast('info', 'Ref Copied', text);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  const handleVerifyPayment = async (order: Order) => {
    try {
      const ok = await updateOrderStatus(order.id, 'processing', 'Payment verified by admin. Processing in-game delivery.');
      if (ok) {
        showToast('success', 'Payment Verified', `Order #${order.orderCode || order.id.slice(0, 8)} marked verified.`);
      }
    } catch {
      // Handled
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectingOrder) return;
    try {
      const ok = await updateOrderStatus(
        rejectingOrder.id,
        'rejected',
        `Payment Re-Verification requested: ${rejectionReason}`,
        rejectionReason
      );
      if (ok) {
        showToast('info', 'Payment Rejected', 'Order marked for payment re-verification. Customer notified.');
        setRejectingOrder(null);
      }
    } catch {
      // Handled
    }
  };

  const pendingPayments = useMemo(() => {
    const activeCancelOrderIds = new Set(
      (cancellationRequests || [])
        .filter((r) => String(r.status).toLowerCase() !== 'rejected')
        .map((r) => r.orderId)
    );

    return orders.filter(
      (o) =>
        isOrderAwaitingPaymentVerification(o) &&
        !activeCancelOrderIds.has(o.id) &&
        !activeCancelOrderIds.has(o.orderCode || '') &&
        !activeCancelOrderIds.has((o as any).order_code || '')
    );
  }, [orders, cancellationRequests]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeFilter === 'pending') {
      list = pendingPayments;
    } else if (activeFilter === 'esewa') {
      list = orders.filter((o) => (o.paymentMethod || '').toLowerCase().includes('esewa'));
    } else if (activeFilter === 'khalti') {
      list = orders.filter((o) => (o.paymentMethod || '').toLowerCase().includes('khalti'));
    } else if (activeFilter === 'qr') {
      list = orders.filter((o) => (o.paymentMethod || '').toLowerCase().includes('qr') || (o.paymentMethod || '').toLowerCase().includes('bank'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter((o) => {
        const ref = (o.transactionId || o.paymentReference || (o as any).paymentRefId || '').toLowerCase();
        return (
          o.orderCode?.toLowerCase().includes(q) ||
          ref.includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [orders, pendingPayments, activeFilter, searchQuery]);

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Dark Payment Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shrink-0">
            <CreditCard size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Manual Payment Queue</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {pendingPayments.length} PENDING
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Verify eSewa, Khalti, IME Pay, & Bank QR deposit slips instantly
            </p>
          </div>
        </div>
      </div>

      {/* Filter Chips (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'pending', label: `Pending Verification (${pendingPayments.length})` },
          { id: 'all', label: `All Payments (${orders.length})` },
          { id: 'esewa', label: 'eSewa' },
          { id: 'khalti', label: 'Khalti' },
          { id: 'qr', label: 'Bank QR' },
        ].map((chip) => {
          const active = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
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
            placeholder="Search payment Ref ID, Order code, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Payment Cards Stream */}
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
            <p className="font-bold text-slate-800 text-sm">No Pending Verifications</p>
            <p className="text-xs text-slate-500 mt-0.5">All customer payment slips have been verified.</p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const isPending = isOrderAwaitingPaymentVerification(order);
            const proof = order.paymentProofUrl || (order as any).receiptUrl;

            return (
              <div
                key={`admin-payment-${order.id || idx}-${idx}`}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {proof ? (
                    <div className="flex flex-col gap-1 items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAiProofResult(null);
                          setViewingProofUrl({
                            url: proof,
                            orderId: order.orderCode || order.id,
                            customerName: order.customerName || 'Customer',
                            amount: Number(order.totalAmount || order.amount || (order as any).total_amount || 0),
                            paymentMethod: order.paymentMethod,
                            order,
                          });
                        }}
                        className="relative w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200 group cursor-pointer"
                      >
                        <img src={proof} alt="Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={14} className="text-white" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProofUrl({
                            url: proof,
                            orderId: order.orderCode || order.id,
                            customerName: order.customerName || 'Customer',
                            amount: Number(order.totalAmount || order.amount || (order as any).total_amount || 0),
                            paymentMethod: order.paymentMethod,
                            order,
                          });
                          handleRunAiReceiptCheck(
                            proof,
                            order.orderCode || order.id,
                            Number(order.totalAmount || order.amount || (order as any).total_amount || 0),
                            order.paymentMethod
                          );
                        }}
                        className="text-[9px] font-black text-violet-600 hover:text-violet-800 flex items-center gap-0.5 cursor-pointer"
                        title="Run AI OCR Scan"
                      >
                        <Sparkles size={9} />
                        <span>AI Scan</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                      <CreditCard size={20} />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900 font-mono">
                        {formatNPR(Number(order.totalAmount || order.amount || (order as any).total_amount || order.price || 0))}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700">
                        {order.paymentMethod || 'PAYMENT'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : String(order.orderStatus).toLowerCase().includes('cancel') || String(order.orderStatus).toLowerCase().includes('reject')
                            ? 'bg-rose-100 text-rose-800'
                            : String(order.orderStatus).toLowerCase().includes('refund')
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isPending ? 'AWAITING VERIFICATION' : order.orderStatus || 'COMPLETED'}
                      </span>
                    </div>

                    {(() => {
                      const txnRef = order.transactionId || order.paymentReference || (order as any).paymentRefId || (order as any).transaction_id || (order as any).transferId || '';
                      return (
                        <div className="flex items-center gap-2 text-xs text-slate-700 font-medium truncate">
                          <span>
                            Ref:{' '}
                            <strong className="font-mono text-slate-900">
                              {txnRef || (proof ? 'None (Screenshot Attached)' : 'None')}
                            </strong>
                          </span>
                          {txnRef && txnRef !== 'None' && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(txnRef, order.id, e)}
                              className="text-slate-400 hover:text-emerald-600 cursor-pointer"
                              title="Copy transaction ref"
                            >
                              {copiedRefId === order.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Order #{order.orderCode || order.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{order.customerName || order.customerEmail || 'Customer'}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => setRejectingOrder(order)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyPayment(order)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-colors cursor-pointer"
                      >
                        Verify &amp; Process
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setAdminSelectedOrderId(order.id);
                        setAdminTab('order_detail');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      View Order
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Proof Lightbox Modal */}
      <AnimatePresence>
        {viewingProofUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-4 space-y-3 shadow-2xl relative text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs">Receipt Voucher #{viewingProofUrl.orderId}</span>
                <button
                  onClick={() => setViewingProofUrl(null)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative aspect-3/4 max-h-[48vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                <img src={viewingProofUrl.url} alt="Receipt" className="max-w-full max-h-full object-contain" />
              </div>

              {/* AI OCR Verification Panel */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-400">
                    <Sparkles size={14} className="text-violet-400 animate-pulse" />
                    <span>AI Payment Receipt OCR</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleRunAiReceiptCheck(
                        viewingProofUrl.url,
                        viewingProofUrl.orderId,
                        viewingProofUrl.amount,
                        viewingProofUrl.paymentMethod
                      )
                    }
                    disabled={aiCheckingProof}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white text-[11px] font-bold shadow-md cursor-pointer transition-all flex items-center gap-1"
                  >
                    {aiCheckingProof ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        <span>Run AI OCR</span>
                      </>
                    )}
                  </button>
                </div>

                {aiProofResult && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Extracted Ref ID:</span>
                      <div className="flex items-center gap-1">
                        <strong className="font-mono text-emerald-400">
                          {aiProofResult.extractedTransactionId || 'Not detected'}
                        </strong>
                        {aiProofResult.extractedTransactionId && (
                          <button
                            type="button"
                            onClick={(e) => handleCopy(aiProofResult.extractedTransactionId, 'ocr-copy', e)}
                            className="p-1 hover:text-emerald-400 text-slate-400"
                            title="Copy Ref"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Extracted Amount:</span>
                      <strong className={aiProofResult.amountMatches ? 'text-emerald-400' : 'text-amber-400'}>
                        Rs. {aiProofResult.extractedAmount || 'N/A'}{' '}
                        {aiProofResult.amountMatches ? '✅ (Matches Order)' : '⚠️ (Check Statement)'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fraud Risk Level:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          aiProofResult.fraudRiskLevel === 'LOW'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : aiProofResult.fraudRiskLevel === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {aiProofResult.fraudRiskLevel} RISK ({aiProofResult.confidenceScore}%)
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed">
                      {aiProofResult.analysisSummary}
                    </p>

                    {viewingProofUrl.order && (
                      <button
                        type="button"
                        onClick={async () => {
                          const order = viewingProofUrl.order!;
                          const ok = await updateOrderStatus(
                            order.id,
                            'processing',
                            `Payment verified via AI OCR. Ref: ${aiProofResult.extractedTransactionId || order.transactionId || 'Verified'}`
                          );
                          if (ok) {
                            showToast('success', 'Approved', 'Payment verified and approved.');
                            setViewingProofUrl(null);
                          }
                        }}
                        className="w-full mt-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={13} />
                        <span>Quick Approve Order #{viewingProofUrl.orderId}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingProofUrl(null);
                  setAiProofResult(null);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Payment Modal */}
      <AnimatePresence>
        {rejectingOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <XCircle size={18} />
                  <h3 className="text-sm font-black text-slate-900">Reject Payment</h3>
                </div>
                <button
                  onClick={() => setRejectingOrder(null)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectPayment}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  Reject Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPaymentsTab;
