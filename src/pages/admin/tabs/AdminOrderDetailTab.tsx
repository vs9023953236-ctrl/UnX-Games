import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR, formatDate, formatTimeAgo, getSanitizedTransactionId, formatPaymentGatewayName, formatDisplayOrderId, getOrderAccountLabel, formatActorName } from '../../../utils/formatters';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { OrderStatusBottomSheet } from '../../../components/common/OrderStatusBottomSheet';
import { ThreeActionSlider, ActionItem } from '../../../components/common/ThreeActionSlider';
import { getOfficialGameImage } from '../../../utils/gameImageHelper';
import { OrderStatus } from '../../../types';
import { AppBackButton } from '../../../components/common/AppBackButton';
import { ModalPortal } from '../../../components/common/ModalPortal';
import {
  ArrowLeft,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  User,
  Gamepad2,
  CreditCard,
  ZoomIn,
  MessageSquare,
  AlertTriangle,
  Save,
  X,
  Check,
  Copy,
  Zap,
  Truck,
  HelpCircle,
  History,
  Phone,
  MapPin,
  ChevronDown,
  Mail,
  MessageCircle,
  RotateCcw,
  Wallet,
  Sparkles,
  Eye,
  Database,
  Cloud,
  RefreshCw,
  Lock,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../services/api';

export const AdminOrderDetailTab: React.FC = () => {
  const {
    orders,
    paymentSettings,
    adminSelectedOrderId,
    setAdminTab,
    setAdminSelectedOrderId,
    setAdminSelectedUserId,
    updateOrderStatus,
    updateRefundStatus,
    deleteOrder,
    cancellationRequests,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'STORE_MANAGER' || uRole === 'STORE_MANAGER' || isSuperAdmin;
  const isStaffOnly = (uRole === 'SUPPORT_STAFF') && !isManager;

  const order = orders.find(
    (o) =>
      o.id === adminSelectedOrderId ||
      (o.order_code && o.order_code === adminSelectedOrderId) ||
      (o.orderCode && o.orderCode === adminSelectedOrderId) ||
      (o.orderNumber && o.orderNumber === adminSelectedOrderId)
  );
  const displayOrderId = order ? formatDisplayOrderId(order) : '';
  const matchingCancelRequest = cancellationRequests.find(
    (cr) =>
      (order && (cr.orderId === order.id || cr.orderId === order.orderCode || cr.orderId === (order as any).order_code || cr.id === order.cancellationRequestId)) ||
      cr.orderId === adminSelectedOrderId ||
      cr.id === adminSelectedOrderId
  );

  // Status History from database
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isStatusBottomSheetOpen, setIsStatusBottomSheetOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Fetch real status history from backend
  useEffect(() => {
    if (!order?.id) return;
    let isMounted = true;
    setIsLoadingHistory(true);
    api.orders.getHistory(order.id)
      .then((res: any) => {
        if (isMounted && res && res.success && Array.isArray(res.history)) {
          setOrderHistory(res.history);
        }
      })
      .catch((err: any) => console.warn('History fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    const handleLiveSync = () => {
      if (order?.id) {
        api.orders.getHistory(order.id).then((res: any) => {
          if (isMounted && res && res.success && Array.isArray(res.history)) {
            setOrderHistory(res.history);
          }
        }).catch(() => {});
      }
    };

    window.addEventListener('ghn:order-updated', handleLiveSync);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('ghn_realtime_order_bus');
        bc.onmessage = () => handleLiveSync();
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener('ghn:order-updated', handleLiveSync);
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
    };
  }, [order?.id, order?.orderStatus, order?.paymentStatus, order?.refundStatus, order?.cancellationStatus]);

  // Unified, 100% Reliable Audit Timeline based strictly on real DB history
  const auditTimeline = useMemo(() => {
    if (!order) return [];

    const timelineMap = new Map<string, any>();
    const creationTime = order.createdAt || (order as any).created_at || (order as any).timestamp || new Date().toISOString();

    // 1. If orderHistory from PostgreSQL has records, use them as the primary source of truth
    if (Array.isArray(orderHistory) && orderHistory.length > 0) {
      for (const item of orderHistory) {
        const rawStatus = item.new_status || item.status || 'UPDATE';
        const stLower = String(rawStatus).toLowerCase();
        let title = rawStatus.replace(/_/g, ' ').toUpperCase();
        if (stLower === 'order_placed' || stLower === 'pending_payment') title = 'Order Placed & Submitted';
        else if (stLower === 'payment_verified') title = 'Payment Verified';
        else if (stLower === 'processing') title = 'Top-Up Processing';
        else if (stLower === 'delivered') title = 'Order Delivered';
        else if (stLower === 'completed') title = 'Order Completed';
        else if (stLower === 'rejected') title = 'Payment / Order Rejected';
        else if (stLower === 'cancelled') title = 'Order Cancelled';

        const itemTime = item.created_at || item.createdAt || creationTime;
        const key = `db-${item.id || item.new_status}-${itemTime}`;
        timelineMap.set(key, {
          id: item.id || key,
          status: rawStatus,
          oldStatus: item.old_status || null,
          title,
          note: item.note || item.message || '',
          changedBy: item.changed_by || item.admin_name || item.adminName || 'Admin / System',
          timestamp: itemTime,
        });
      }

      // Ensure the initial order placement is included
      const hasPlaced = Array.from(timelineMap.values()).some(v => {
        const s = String(v.status).toLowerCase();
        return s === 'order_placed' || s === 'pending_payment';
      });
      if (!hasPlaced) {
        timelineMap.set('order_placed', {
          id: `init-${order.id}`,
          status: 'pending_payment',
          oldStatus: null,
          title: 'Order Placed & Submitted',
          note: `Order #${displayOrderId} placed for ${order.productName || 'Game Top-Up'}. Payment Method: ${order.paymentMethod || 'Online'}. Amount: Rs. ${order.totalAmount || (order as any).amount || 0}.`,
          changedBy: order.userName || (order as any).customerName || 'Customer',
          timestamp: creationTime,
        });
      }
    } else {
      // Fallback only when DB history is empty
      timelineMap.set('order_placed', {
        id: `init-${order.id}`,
        status: 'pending_payment',
        oldStatus: null,
        title: 'Order Placed & Submitted',
        note: `Order #${displayOrderId} placed for ${order.productName || 'Game Top-Up'}. Payment Method: ${order.paymentMethod || 'Online'}. Amount: Rs. ${order.totalAmount || (order as any).amount || 0}.`,
        changedBy: order.userName || (order as any).customerName || 'Customer',
        timestamp: creationTime,
      });

      if (order.verifiedAt) {
        timelineMap.set('payment_verified', {
          id: `ver-${order.id}`,
          status: 'payment_verified',
          oldStatus: 'pending_payment',
          title: 'Payment Verified',
          note: 'Payment reference code verified in merchant wallet statement.',
          changedBy: order.verifiedBy || (order as any).verified_by || 'Admin',
          timestamp: order.verifiedAt,
        });
      }

      if (order.processingAt && order.orderStatus === 'processing') {
        timelineMap.set('processing', {
          id: `proc-${order.id}`,
          status: 'processing',
          oldStatus: 'payment_verified',
          title: 'Top-Up Processing',
          note: `Processing top-up delivery for Player ID: ${order.gameUserId || (order as any).game_uid || 'UID'}.`,
          changedBy: (order as any).processingBy || 'Staff / Admin',
          timestamp: order.processingAt,
        });
      }

      if (order.deliveredAt && (order.orderStatus === 'delivered' || order.orderStatus === 'completed')) {
        timelineMap.set('delivered', {
          id: `deliv-${order.id}`,
          status: 'delivered',
          oldStatus: 'processing',
          title: 'Order Delivered',
          note: 'Game top-up items successfully credited to user game account.',
          changedBy: (order as any).deliveredBy || 'Staff / Admin',
          timestamp: order.deliveredAt,
        });
      }

      if (order.completedAt && order.orderStatus === 'completed') {
        timelineMap.set('completed', {
          id: `comp-${order.id}`,
          status: 'completed',
          oldStatus: 'delivered',
          title: 'Order Completed',
          note: 'Top-up completed and confirmed. Transaction closed.',
          changedBy: order.completedBy || (order as any).completed_by || 'Admin',
          timestamp: order.completedAt,
        });
      }

      if (order.rejectedAt && order.orderStatus === 'rejected') {
        timelineMap.set('rejected', {
          id: `rej-${order.id}`,
          status: 'rejected',
          oldStatus: 'pending_payment',
          title: 'Payment / Order Rejected',
          note: order.rejectionReason || 'Payment screenshot or reference ID rejected.',
          changedBy: (order as any).rejectedBy || 'Admin',
          timestamp: order.rejectedAt,
        });
      }
    }

    const result = Array.from(timelineMap.values());
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [order, orderHistory, displayOrderId]);

  // Modals state
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [aiOcrChecking, setAiOcrChecking] = useState(false);
  const [aiOcrResult, setAiOcrResult] = useState<any | null>(null);

  const handleRunAiOcr = async () => {
    const proofUrl = order.paymentScreenshot || order.paymentProofUrl;
    if (!proofUrl) return;
    setAiOcrChecking(true);
    setAiOcrResult(null);
    try {
      const res: any = await api.ai.verifyReceipt({
        imageUrl: proofUrl,
        expectedAmount: Number(order.totalAmount || (order as any).amount || 0),
        expectedOrderCode: displayOrderId,
        paymentMethod: order.paymentMethod,
      });
      if (res && res.success && res.result) {
        setAiOcrResult(res.result);
        showToast('success', 'AI OCR Verified', 'Payment receipt analyzed by AI engine.');
      } else {
        showToast('error', 'AI Notice', res?.message || 'Could not verify receipt.');
      }
    } catch (err: any) {
      showToast('error', 'AI OCR Error', err?.message || 'Failed to analyze receipt.');
    } finally {
      setAiOcrChecking(false);
    }
  };

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Payment reference could not be verified in wallet statement.');
  const [customRejection, setCustomRejection] = useState('');
  
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingNote, setProcessingNote] = useState('Top-up is currently being processed with game servers.');

  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('Game credits successfully credited to Player ID.');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [infoRequestMessage, setInfoRequestMessage] = useState('Please provide a clear screenshot or valid wallet transaction reference.');

  // Cancel Order Modal State
  const [cancelReasonPreset, setCancelReasonPreset] = useState('Customer Requested Cancellation');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelRefundMethod, setCancelRefundMethod] = useState('eSewa');
  const [cancelRefundAccountName, setCancelRefundAccountName] = useState('');
  const [cancelRefundAccountNumber, setCancelRefundAccountNumber] = useState('');
  const [cancelRefundAmount, setCancelRefundAmount] = useState<number>(0);
  const [cancelRefundStatus, setCancelRefundStatus] = useState<'refund_pending' | 'not_applicable' | 'refunded'>('refund_pending');
  const [cancelAdminNote, setCancelAdminNote] = useState('');

  // Refund Management Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
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

  // Admin internal note
  const [adminNote, setAdminNote] = useState(order?.adminNote || '');
  const [savingNote, setSavingNote] = useState(false);

  // Synchronize Refund & Cancel Modal Fields when order or matching request loads
  useEffect(() => {
    if (order) {
      setRefundAmountInput(order.refundAmount || matchingCancelRequest?.refundAmount || order.amount || 0);
      setRefundStatusInput(
        (matchingCancelRequest?.refundStatus || order.refundStatus || 'refund_pending') as any
      );
      setRefundMethodInput(
        matchingCancelRequest?.refundMethod || order.refundMethod || (order.paymentMethod ? String(order.paymentMethod) : 'eSewa')
      );
      setRefundAccountNameInput(
        matchingCancelRequest?.refundAccountName || order.refundAccountName || order.userName || order.customerName || ''
      );
      setRefundAccountNumberInput(
        matchingCancelRequest?.refundAccountNumber || order.refundAccountNumber || order.userPhone || ''
      );
      setRefundReferenceInput(order.refundReference || matchingCancelRequest?.refundReference || '');
      setRefundProofUrlInput(order.refundProofUrl || matchingCancelRequest?.refundProofUrl || '');
      setRefundNoteInput(order.refundNote || matchingCancelRequest?.adminNote || '');
      setRefundRejectionInput(order.rejectionReason || matchingCancelRequest?.rejectionReason || '');

      // Cancel modal state
      setCancelRefundMethod(matchingCancelRequest?.refundMethod || order.refundMethod || (order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'eSewa'));
      setCancelRefundAccountName(matchingCancelRequest?.refundAccountName || order.refundAccountName || order.customerName || order.userName || '');
      setCancelRefundAccountNumber(matchingCancelRequest?.refundAccountNumber || order.refundAccountNumber || order.customerPhone || order.userPhone || '');
      setCancelRefundAmount(order.refundAmount || matchingCancelRequest?.refundAmount || order.amount || 0);
      setCancelRefundStatus(
        order.paymentStatus === 'verified' || order.paymentStatus === 'pending_verification'
          ? 'refund_pending'
          : 'not_applicable'
      );
    }
  }, [order, matchingCancelRequest]);

  if (!order) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
          🔍
        </div>
        <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500">The selected order could not be loaded or was removed.</p>
        <button
          onClick={() => {
            setAdminSelectedOrderId(null);
            setAdminTab('orders');
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const adminInfo = currentUser
    ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email, role: currentUser.role }
    : undefined;

  // Status Action Handlers
  const handleVerifyPayment = async () => {
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        'payment_verified',
        'Payment verified by administrator.',
        undefined,
        adminInfo
      );
      if (res && res.success === false) {
        showToast('error', 'Update Failed', res.message || 'Failed to verify payment.');
        return;
      }
      showToast('success', 'Payment Verified', `Order #${displayOrderId} payment confirmed.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e?.message || 'Failed to verify payment.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleRejectPayment = async () => {
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const finalReason = customRejection.trim() || rejectionReason;
      const res = await updateOrderStatus(
        order.id,
        'rejected',
        `Payment rejected: ${finalReason}`,
        finalReason,
        adminInfo
      );
      if (res && res.success === false) {
        showToast('error', 'Update Failed', res.message || 'Failed to reject payment.');
        return;
      }
      setShowRejectModal(false);
      showToast('error', 'Payment Rejected', `Order #${displayOrderId} payment rejected.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e?.message || 'Failed to reject payment.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleStartProcessing = async () => {
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        'processing',
        'Order processing started.',
        undefined,
        adminInfo,
        { processingNote: processingNote.trim() }
      );
      if (res && res.success === false) {
        showToast('error', 'Update Failed', res.message || 'Failed to start processing.');
        return;
      }
      setShowProcessingModal(false);
      showToast('success', 'Processing Started', `Order #${displayOrderId} is now processing.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e?.message || 'Failed to start processing.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        'delivered',
        'Order top-up items delivered.',
        undefined,
        adminInfo,
        { deliveryNote: deliveryNote.trim() }
      );
      if (res && res.success === false) {
        showToast('error', 'Update Failed', res.message || 'Failed to mark delivered.');
        return;
      }
      setShowDeliveredModal(false);
      showToast('success', 'Order Delivered', `Order #${displayOrderId} marked as delivered.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e?.message || 'Failed to mark delivered.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        'completed',
        'Order completed.',
        undefined,
        adminInfo
      );
      if (res && res.success === false) {
        showToast('error', 'Update Failed', res.message || 'Failed to mark completed.');
        return;
      }
      setShowCompleteModal(false);
      showToast('success', 'Order Completed', `Order #${displayOrderId} has been completed.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e?.message || 'Failed to mark completed.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleCancelOrder = async () => {
    if (isStaffOnly) {
      showToast('error', 'Access Denied', 'Support Staff are not authorized to cancel orders. Manager or Admin permission required.');
      return;
    }
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const finalReason = cancelReasonPreset === 'Other'
        ? (cancelCustomReason.trim() || 'Cancelled by Administrator')
        : cancelReasonPreset;

      const res = await updateOrderStatus(
        order.id,
        'cancelled',
        `Order cancelled: ${finalReason}`,
        finalReason,
        adminInfo,
        {
          cancellationReason: finalReason,
          refundMethod: cancelRefundMethod,
          refundAccountName: cancelRefundAccountName.trim(),
          refundAccountNumber: cancelRefundAccountNumber.trim(),
          refundAmount: Number(cancelRefundAmount) || order.amount,
          refundStatus: cancelRefundStatus,
          adminNote: cancelAdminNote.trim(),
          cancelledAt: new Date().toISOString(),
          cancelledBy: adminInfo?.name || adminInfo?.email || 'Admin',
        }
      );
      if (res && res.success === false) {
        showToast('error', 'Update Failed', res.message || 'Failed to cancel order.');
        return;
      }
      setShowCancelModal(false);
      showToast('info', 'Order Cancelled', `Order #${displayOrderId} has been cancelled with refund destination details saved.`);
    } catch (e: any) {
      showToast('error', 'Update Failed', e?.message || 'Failed to cancel order.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleRequestInformation = async () => {
    if (isProcessingStatus) return;
    setIsProcessingStatus(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        'payment_verification',
        `Admin requested information: ${infoRequestMessage}`,
        undefined,
        adminInfo,
        { adminNote: infoRequestMessage }
      );
      if (res && res.success === false) {
        showToast('error', 'Request Failed', res.message || 'Failed to send request message.');
        return;
      }
      setShowRequestInfoModal(false);
      showToast('info', 'Info Requested', `Sent request message for Order #${displayOrderId}.`);
    } catch (e: any) {
      showToast('error', 'Request Failed', e?.message || 'Failed to send request message.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleSaveAdminNote = async () => {
    if (savingNote || isProcessingStatus) return;
    setSavingNote(true);
    try {
      await updateOrderStatus(
        order.id,
        order.orderStatus,
        'Updated administrator internal notes.',
        undefined,
        adminInfo,
        { adminNote }
      );
      showToast('success', 'Note Saved', 'Administrator notes updated successfully.');
    } catch (e: any) {
      showToast('error', 'Failed to Save Note', e?.message || 'Error occurred');
    } finally {
      setSavingNote(false);
    }
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaffOnly) {
      showToast('error', 'Access Denied', 'Support Staff are not authorized to process refunds. Manager or Admin permission required.');
      return;
    }
    setIsSubmittingRefund(true);

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
      setShowRefundModal(false);
      showToast(
        'success',
        'Refund Updated',
        `Order #${displayOrderId} refund status updated to ${refundStatusInput.toUpperCase()}. Customer notified.`
      );
    } else {
      showToast('error', 'Update Failed', result.message || 'Could not update refund status.');
    }
  };

  const pmLower = String(order.paymentMethod || order.payment?.method || '').toLowerCase().trim();
  const isWallet = pmLower === 'wallet' || pmLower.includes('gamer') || pmLower === 'gamer_wallet';

  const receivingAccount = isWallet
    ? 'Gamer Wallet Digital Vault'
    : pmLower.includes('esewa')
    ? (paymentSettings.esewaNumber || paymentSettings.esewaId || (paymentSettings as any).esewa_id || '9818000000')
    : pmLower.includes('khalti')
    ? (paymentSettings.khaltiNumber || paymentSettings.khaltiId || (paymentSettings as any).khalti_id || '9818000000')
    : (paymentSettings.bankAccountNumber || 'N/A');

  const sanitizedTxn = getSanitizedTransactionId(order) || (isWallet ? `GW-${displayOrderId.replace(/^GHN-/, '')}` : '');

  const hasCancellationOrRefund =
    Boolean(matchingCancelRequest) ||
    order.cancellationStatus === 'requested' ||
    order.cancellationStatus === 'approved' ||
    order.cancellationStatus === 'rejected' ||
    (Boolean(order.refundStatus) && order.refundStatus !== 'not_applicable');

  const orderActions: ActionItem[] = React.useMemo(() => {
    if (!order) return [];
    const actionsList: ActionItem[] = [];

    if (order.orderStatus === 'payment_verification') {
      actionsList.push({
        id: 'verify_payment',
        label: isProcessingStatus ? 'Verifying...' : 'Verify Payment',
        shortLabel: isProcessingStatus ? 'Verifying...' : 'Verify Pay',
        icon: <ShieldCheck size={14} />,
        onClick: handleVerifyPayment,
        variant: 'primary',
        disabled: isProcessingStatus,
      });
    }

    if (order.orderStatus === 'payment_verification' || order.orderStatus === 'pending_payment') {
      actionsList.push({
        id: 'reject_payment',
        label: 'Reject Payment',
        shortLabel: 'Reject Pay',
        icon: <XCircle size={14} />,
        onClick: () => setShowRejectModal(true),
        variant: 'danger',
        disabled: isProcessingStatus,
      });
    }

    if (order.orderStatus === 'payment_verified' || order.orderStatus === 'payment_verification' || order.orderStatus === 'pending_payment') {
      actionsList.push({
        id: 'start_processing',
        label: 'Start Processing',
        shortLabel: 'Processing',
        icon: <Zap size={14} />,
        onClick: () => setShowProcessingModal(true),
        variant: 'purple',
        disabled: isProcessingStatus,
      });
    }

    if (order.orderStatus === 'processing' || order.orderStatus === 'payment_verified') {
      actionsList.push({
        id: 'mark_delivered',
        label: 'Mark Delivered',
        shortLabel: 'Delivered',
        icon: <Truck size={14} />,
        onClick: () => setShowDeliveredModal(true),
        variant: 'blue',
        disabled: isProcessingStatus,
      });
    }

    if (order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && order.orderStatus !== 'rejected') {
      actionsList.push({
        id: 'mark_completed',
        label: 'Mark Completed',
        shortLabel: 'Complete',
        icon: <CheckCircle2 size={14} />,
        onClick: () => setShowCompleteModal(true),
        variant: 'success',
        disabled: isProcessingStatus,
      });
    }

    actionsList.push({
      id: 'process_refund',
      label: 'Process Refund',
      shortLabel: 'Refund',
      icon: <RotateCcw size={14} />,
      onClick: () => setAdminTab('refund_process'),
      variant: 'amber',
      disabled: isProcessingStatus,
    });

    actionsList.push({
      id: 'request_info',
      label: 'Request Info',
      shortLabel: 'Req Info',
      icon: <HelpCircle size={14} />,
      onClick: () => setShowRequestInfoModal(true),
      variant: 'outline',
      disabled: isProcessingStatus,
    });

    if (order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && order.orderStatus !== 'rejected') {
      actionsList.push({
        id: 'cancel_order',
        label: 'Cancel Order',
        shortLabel: 'Cancel',
        icon: <X size={14} />,
        onClick: () => setShowCancelModal(true),
        variant: 'slate',
        disabled: isProcessingStatus,
      });
    }

    return actionsList;
  }, [order, handleVerifyPayment, isProcessingStatus, isSuperAdmin, displayOrderId, setAdminTab, showToast]);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* 1. TOP ORDER OVERVIEW CARD */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
          <AppBackButton
            onClick={() => setAdminTab('orders')}
            label="Orders"
            showLabel={true}
            variant="pill"
            size="sm"
            title="Back to Orders"
          />
          <div className="h-8 px-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
            #{displayOrderId.slice(-4)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-sm text-slate-900 tracking-tight">Order #{displayOrderId}</span>
              {order.id && order.id !== displayOrderId && (
                <button
                  type="button"
                  className="text-[10px] font-mono text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors border border-slate-200 shrink-0"
                  title={`Click to copy database UUID: ${order.id}`}
                  onClick={() => {
                    navigator.clipboard.writeText(order.id);
                    showToast('info', 'UUID Copied', `Database UUID ${order.id.slice(0, 8)}... copied.`);
                  }}
                >
                  UUID: {order.id.slice(0, 8)}...
                </button>
              )}
              <StatusBadge status={order.orderStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {formatDate(order.createdAt)} ({formatTimeAgo(order.createdAt)})
            </p>
          </div>
        </div>
      </div>

      {/* 2. CUSTOMER CANCELLATION & REFUND PROCESSING CARD (IF ACTIVE) */}
      {hasCancellationOrRefund && (
        <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <RotateCcw size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Customer Refund &amp; Cancellation Management
                  </h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase border ${
                      matchingCancelRequest?.refundStatus === 'refunded' || order.refundStatus === 'refunded'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : matchingCancelRequest?.refundStatus === 'processing' || order.refundStatus === 'processing'
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                        : matchingCancelRequest?.status === 'REJECTED' || order.refundStatus === 'rejected'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : matchingCancelRequest?.status === 'APPROVED'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-orange-100 text-orange-900 border-orange-300'
                    }`}
                  >
                    Status:{' '}
                    {matchingCancelRequest?.refundStatus === 'refunded' || order.refundStatus === 'refunded'
                      ? 'Refund Settled / Completed'
                      : matchingCancelRequest?.refundStatus === 'processing' || order.refundStatus === 'processing'
                      ? 'Refund Processing'
                      : matchingCancelRequest?.status === 'REJECTED' || order.refundStatus === 'rejected'
                      ? 'Refund Rejected'
                      : matchingCancelRequest?.status === 'APPROVED'
                      ? 'Approved (Refund Queued)'
                      : matchingCancelRequest?.status === 'PENDING' || order.cancellationStatus === 'requested'
                      ? 'Review Requested'
                      : (matchingCancelRequest?.refundStatus || order.refundStatus || 'Pending Review').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Direct user refund tracking is linked in the User App
                </p>
              </div>
            </div>

            {!isStaffOnly ? (
              <button
                onClick={() => setAdminTab('refund_process')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Wallet size={14} />
                <span>Update / Settle Refund</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1.5 border border-slate-200">
                <Lock size={13} /> View Only Access
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reason</span>
              <p className="text-xs font-bold text-slate-900">
                {matchingCancelRequest?.reason || order.cancellationReason || 'User Cancellation'}
              </p>
              {matchingCancelRequest?.notes && (
                <p className="text-[10px] text-slate-500 italic mt-0.5">&ldquo;{matchingCancelRequest.notes}&rdquo;</p>
              )}
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Refund Destination</span>
              <p className="text-xs font-bold text-indigo-700">
                {matchingCancelRequest?.refundMethod || order.refundMethod || 'eSewa'} (
                {matchingCancelRequest?.refundAccountNumber || order.refundAccountNumber || order.userPhone || 'N/A'})
              </p>
              {(matchingCancelRequest?.refundAccountName || order.refundAccountName) && (
                <p className="text-[10px] text-slate-500 font-medium">
                  Name: {matchingCancelRequest?.refundAccountName || order.refundAccountName}
                </p>
              )}
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Amount &amp; Ref ID</span>
              <p className="text-xs font-mono font-bold text-slate-900">
                {formatNPR(order.refundAmount || matchingCancelRequest?.refundAmount || order.amount)}
              </p>
              {(order.refundReference || matchingCancelRequest?.refundReference) ? (
                <p className="text-[10px] font-mono text-emerald-700 font-bold">
                  Txn ID: {order.refundReference || matchingCancelRequest?.refundReference}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 italic">No Txn ID logged yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN ACTION BUTTONS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
          {isStaffOnly ? 'Support Staff Status View' : 'Admin Actions'}
        </span>
        {!isStaffOnly ? (
          <ThreeActionSlider actions={orderActions} title="Order Management Actions" />
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
            <span>Authorized Support Staff Access: Order details &amp; tracking timeline view only. Order status modifications &amp; refund operations are restricted.</span>
          </div>
        )}
      </div>

      {/* 4. ORDER INFORMATION SECTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product & Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* PRODUCT & ORDER SPECIFICATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 size={15} className="text-indigo-600" />
                <span>ORDER & ITEM SPECIFICATIONS</span>
              </h2>
              <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                {displayOrderId}
              </span>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-b from-[#1C1736] to-[#120F24] border border-purple-200/80 shrink-0 flex items-center justify-center">
                <img
                  src={getOfficialGameImage(order.productId, order.productName, order.productImage)}
                  alt={order.productName}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getOfficialGameImage(order.productId, order.productName);
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-bold text-slate-900">{order.productName}</div>
                <div className="text-xs text-slate-600 font-medium">Game: {order.gameName} · Package: {order.packageName}</div>
                <div className="text-xs font-mono font-bold text-indigo-600">{formatNPR(order.amount)} (Qty: {order.quantity || 1})</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Game</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{order.gameName || 'Unknown'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Package</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{order.packageName || 'Top-up Pack'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{getOrderAccountLabel(order)}</span>
                <p className="text-xs font-mono font-bold text-slate-900 select-all mt-0.5">{order.playerId || order.gameUserId}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Zone / Server</span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{order.zoneId || order.server || 'Global'}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Base Amount</span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                  {formatNPR((order.unitPrice ?? order.amount) * (order.quantity || 1))}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Discount</span>
                <p className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                  {order.couponDiscount ? `- ${formatNPR(order.couponDiscount)}` : 'Rs. 0'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Amount</span>
                <p className="text-xs font-mono font-black text-indigo-700 mt-0.5">{formatNPR(order.amount)}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Order Status</span>
                <p className="text-xs font-bold text-indigo-900 uppercase mt-0.5">{order.orderStatus}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Created Time</span>
                <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Updated Time</span>
                <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">
                  {order.updatedAt ? formatDate(order.updatedAt) : formatDate(order.createdAt)}
                </p>
              </div>

              {order.additionalInfo && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-2 md:col-span-4">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Customer Notes / Extra Instructions</span>
                  <p className="text-xs text-slate-800 mt-0.5">{order.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={15} className="text-emerald-600" />
                <span>PAYMENT INFORMATION</span>
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                order.paymentStatus === 'verified'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : order.paymentStatus === 'rejected' || (order.paymentStatus as string) === 'failed'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {order.paymentStatus || 'Pending Verification'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Payment Method</span>
                <p className="text-xs font-bold text-slate-900 uppercase mt-0.5">{formatPaymentGatewayName(order.paymentMethod || order.payment?.method)}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Amount Paid</span>
                <p className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                  {formatNPR(order.payment?.amount || order.amount)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Receiving Account</span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{receivingAccount}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-2 md:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Transaction / Ref ID</span>
                <p className="text-xs font-mono font-bold text-slate-900 select-all mt-0.5">
                  {sanitizedTxn || order.transactionId || 'None'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Submitted Time</span>
                <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">
                  {order.payment?.submitted_at ? formatDate(order.payment.submitted_at) : (order.createdAt ? formatDate(order.createdAt) : 'N/A')}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Verified Time</span>
                <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">
                  {order.verifiedAt || order.payment?.verified_at ? formatDate(order.verifiedAt || order.payment.verified_at) : 'Not verified'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Verified By</span>
                <p className="text-xs font-medium text-slate-800 mt-0.5">
                  {order.verifiedBy || order.payment?.verified_by || order.payment?.admin_verified_by || (order.paymentStatus === 'verified' || order.orderStatus === 'processing' || order.orderStatus === 'completed' || order.orderStatus === 'delivered' ? 'Administrator' : 'N/A')}
                </p>
              </div>

              {/* R2 Cloudflare Media Reference */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Cloud size={12} className="text-sky-600" />
                    <span>Cloudflare R2 Storage Reference</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                    {isWallet ? 'Direct Vault Transfer' : 'Encrypted S3 Media'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-600 truncate mt-1">
                  {isWallet
                    ? 'Gamer Wallet Direct Transfer (No Screenshot Required)'
                    : (order.paymentProofR2Key || order.paymentScreenshotR2Key || order.payment?.proof_r2_key || (order.paymentScreenshot || order.paymentProofUrl ? 'payment-proofs/' + displayOrderId + '.jpg' : 'No Screenshot Uploaded'))}
                </p>
              </div>
            </div>

            {/* Re-Submission Notice Banner if customer re-requested */}
            {(order.isResubmitted || (order.resubmissionCount && order.resubmissionCount > 0)) && (
              <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-amber-900 uppercase tracking-wider text-[11px]">
                    <Sparkles size={15} className="text-amber-600" />
                    <span>Payment Re-Submitted by Customer (Attempt #{order.resubmissionCount || 1})</span>
                  </div>
                  {order.resubmittedAt && (
                    <span className="text-[10px] font-mono text-amber-700 font-medium">
                      {formatDate(order.resubmittedAt)}
                    </span>
                  )}
                </div>

                {order.resubmitNote && (
                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-slate-800 space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      Customer Re-Request Note:
                    </span>
                    <p className="italic font-medium">&ldquo;{order.resubmitNote}&rdquo;</p>
                  </div>
                )}

                {order.previousRejectionReason && (
                  <div className="text-[11px] text-amber-800 font-medium">
                    <span className="font-bold">Prior Rejection Reason:</span> {order.previousRejectionReason}
                  </div>
                )}
              </div>
            )}

            {/* Rejection reason banner if rejected */}
            {(order.rejectionReason || order.payment?.customer_note || ((order.paymentStatus === 'rejected' || order.orderStatus === 'rejected') && order.adminNote)) && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle size={14} className="text-rose-600" />
                  <span>Payment Rejection Reason:</span>
                </div>
                <p className="text-rose-700 pl-5">
                  {order.rejectionReason || order.payment?.customer_note || order.adminNote}
                </p>
              </div>
            )}

            {/* Ref ID Verification & Proof */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700">Payment Reference Verification:</span>
              <div className="p-4 rounded-2xl bg-indigo-50/80 border-2 border-indigo-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-mono font-black text-xs">
                    #
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black tracking-wider text-indigo-900">
                      Transaction Reference ID (Ref ID)
                    </p>
                    <p className="text-sm font-mono font-black text-slate-900 select-all truncate">
                      {sanitizedTxn || order.transactionId || 'None'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (sanitizedTxn || order.transactionId) {
                      navigator.clipboard.writeText(sanitizedTxn || order.transactionId || '');
                      showToast('success', 'Copied!', 'Ref ID copied to clipboard.');
                    }
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 active:scale-95 transition-all"
                >
                  <Copy size={13} />
                  <span>Copy Ref ID</span>
                </button>
              </div>

              {/* Payment Proof Screenshot & AI OCR Preview Card */}
              {(order.paymentScreenshot || order.paymentProofUrl) && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setShowScreenshotModal(true)}
                      className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden cursor-pointer shrink-0 group relative shadow-2xs"
                    >
                      <img
                        src={order.paymentScreenshot || order.paymentProofUrl}
                        alt="Proof"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye size={16} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Payment Screenshot Attached
                      </span>
                      <p className="text-xs font-bold text-slate-800">Tap to inspect or run AI OCR verification</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowScreenshotModal(true)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      View Zoom
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScreenshotModal(true);
                        handleRunAiOcr();
                      }}
                      disabled={aiOcrChecking}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} />
                      <span>{aiOcrChecking ? 'Scanning...' : 'Run AI OCR'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ORDER METADATA & TIMELINE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <History size={16} />
                </div>
                <span>ORDER HISTORY &amp; STATUS AUDIT TRAIL</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                PostgreSQL · order_status_history
              </span>
            </div>

            {isLoadingHistory && auditTimeline.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading audit history...
              </div>
            ) : auditTimeline.length > 0 ? (
              <div className="relative pl-3 space-y-4 pt-1">
                {/* Vertical Stepper Connector Line */}
                <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-200/80 -z-0" />

                {auditTimeline.map((item: any, idx: number) => {
                  const rawStatus = item.status || item.new_status || 'UPDATE';
                  const s = String(rawStatus).toLowerCase().replace(/_/g, ' ').trim();

                  const nodeMeta = (() => {
                    if (s.includes('completed') || s.includes('delivered')) {
                      return {
                        nodeBg: 'bg-emerald-500 text-white ring-4 ring-emerald-100',
                        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        icon: <CheckCircle2 size={13} />,
                        accentColor: 'border-l-emerald-500 bg-emerald-50/40',
                      };
                    }
                    if (s.includes('processing') || s.includes('in progress')) {
                      return {
                        nodeBg: 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse',
                        badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                        icon: <Zap size={13} />,
                        accentColor: 'border-l-indigo-500 bg-indigo-50/40',
                      };
                    }
                    if (s.includes('verification') || s.includes('review') || s.includes('payment_verified')) {
                      return {
                        nodeBg: 'bg-purple-600 text-white ring-4 ring-purple-100',
                        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
                        icon: <ShieldCheck size={13} />,
                        accentColor: 'border-l-purple-500 bg-purple-50/40',
                      };
                    }
                    if (s.includes('cancel') || s.includes('reject')) {
                      return {
                        nodeBg: 'bg-rose-500 text-white ring-4 ring-rose-100',
                        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
                        icon: <XCircle size={13} />,
                        accentColor: 'border-l-rose-500 bg-rose-50/40',
                      };
                    }
                    return {
                      nodeBg: 'bg-slate-400 text-white ring-4 ring-slate-100',
                      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
                      icon: <Clock size={13} />,
                      accentColor: 'border-l-slate-400 bg-slate-50',
                    };
                  })();

                  return (
                    <div key={`order-hist-${item.id}-${idx}`} className="relative flex items-start gap-3 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${nodeMeta.nodeBg}`}>
                        {nodeMeta.icon}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.oldStatus && (
                              <>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] uppercase font-bold">
                                  {String(item.oldStatus).replace(/_/g, ' ')}
                                </span>
                                <span className="text-slate-400 text-xs font-bold">➔</span>
                              </>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[11px] font-extrabold font-mono uppercase tracking-tight ${nodeMeta.badgeBg}`}>
                              {item.title || item.status}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-500 font-mono font-medium bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                            <Clock size={10} className="text-slate-400" />
                            {formatDate(item.timestamp)}
                          </span>
                        </div>

                        {item.note && (
                          <div className={`p-3 rounded-r-xl rounded-l-xs border-l-4 border-y border-r border-slate-200/80 shadow-2xs text-xs font-medium text-slate-800 leading-relaxed ${nodeMeta.accentColor}`}>
                            <p>&ldquo;{item.note}&rdquo;</p>
                            {item.changedBy && (
                              <div className="mt-1.5 pt-1 border-t border-slate-200/50 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                                <ShieldCheck size={13} className="text-indigo-600 shrink-0" />
                                <span>Updated by: <strong className="text-indigo-950 font-black">{formatActorName(item.changedBy)}</strong></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-xs text-center font-medium">
                No recorded status transitions yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Info & Status Notes */}
        <div className="space-y-6">
          {/* CUSTOMER INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={15} className="text-indigo-600" />
                <span>CUSTOMER INFORMATION</span>
              </h2>
              {(order.userId || order.customerId || order.customer_id) && (
                <button
                  onClick={() => {
                    const cid = order.userId || order.customerId || order.customer_id;
                    setAdminSelectedUserId(cid);
                    setAdminTab("user_detail");
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  View Profile →
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-bold text-slate-900">{order.userName || order.customerName || "Customer"}</span>
              </div>

              {/* Mobile Phone Number */}
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" />
                  <span>Mobile:</span>
                </span>
                {(order.userPhone || order.customerPhone) ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {order.userPhone || order.customerPhone}
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${order.userPhone || order.customerPhone}`}
                        title="Call Customer"
                        className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      >
                        <Phone size={11} />
                      </a>
                      <a
                        href={`https://wa.me/${((order.userPhone || order.customerPhone) || "").replace(/[^0-9]/g, "").startsWith("977") ? ((order.userPhone || order.customerPhone) || "").replace(/[^0-9]/g, "") : "977" + ((order.userPhone || order.customerPhone) || "").replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        title="WhatsApp Customer"
                        className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      >
                        <MessageCircle size={11} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className="font-mono text-slate-400 italic">Not provided</span>
                )}
              </div>

              {/* Email Address */}
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  <span>Email:</span>
                </span>
                <a
                  href={`mailto:${order.userEmail || order.customerEmail}`}
                  className="font-mono text-indigo-600 hover:underline font-medium"
                >
                  {order.userEmail || order.customerEmail || "N/A"}
                </a>
              </div>

              {/* Location */}
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin size={12} className="text-rose-500" />
                  <span>Location:</span>
                </span>
                <span className="font-bold text-slate-800">
                  {order.userLocation || order.customerLocation || order.location || "Nepal"}
                </span>
              </div>

              {/* User UID */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">User UID:</span>
                <span className="font-mono text-[10px] text-slate-500">{order.userId || order.customerId || order.customer_id || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* STATUS NOTES SUMMARY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={15} className="text-slate-600" />
              ORDER STATUS DETAILS
            </h2>

            <div className="space-y-2 text-xs">
              {order.processingNote && (
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Processing Note</span>
                  <p className="text-purple-900 font-medium">{order.processingNote}</p>
                </div>
              )}

              {order.deliveryNote && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Delivery Note</span>
                  <p className="text-blue-900 font-medium">{order.deliveryNote}</p>
                </div>
              )}

              {order.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Rejection Reason</span>
                  <p className="text-rose-900 font-medium">{order.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Internal Administrator Note */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={15} className="text-amber-600" />
              Internal Admin Note
            </h2>

            <textarea
              rows={4}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Private notes for administrators..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
            />

            <button
              onClick={handleSaveAdminNote}
              disabled={savingNote}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 9. DANGER ZONE - ADVANCE DATABASE PERMANENT RECORDS CARD */}
      {isSuperAdmin && order && (
        <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950 flex items-center gap-2">
                  Database Records &amp; Danger Zone
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-200/80 text-rose-800">
                    Irreversible
                  </span>
                </h3>
                <p className="text-xs text-rose-900/80 font-medium mt-0.5">
                  Permanently erase this order from live database, Supabase, and User App history.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Trash2 size={15} />
              <span>Delete Order Permanently</span>
            </button>
          </div>
        </div>
      )}

      {/* Screenshot Zoom Modal */}
      <AnimatePresence>
        {showScreenshotModal && (order.paymentScreenshot || order.paymentProofUrl) && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-xl relative text-slate-900"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Payment Screenshot</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold border border-violet-200">
                    Order #{displayOrderId}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowScreenshotModal(false);
                    setAiOcrResult(null);
                  }}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[46vh] overflow-auto rounded-2xl bg-slate-900 p-1 flex items-center justify-center border border-slate-800">
                <img
                  src={order.paymentScreenshot || order.paymentProofUrl}
                  alt="Receipt"
                  className="max-h-[44vh] object-contain rounded-xl"
                />
              </div>

              {/* AI Receipt OCR Verification Box */}
              <div className="p-3 bg-violet-50/80 rounded-2xl border border-violet-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900">
                    <Sparkles size={14} className="text-violet-600 animate-pulse" />
                    <span>AI Payment Receipt OCR</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiOcr}
                    disabled={aiOcrChecking}
                    className="px-3 py-1 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                  >
                    {aiOcrChecking ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        <span>Run AI OCR</span>
                      </>
                    )}
                  </button>
                </div>

                {aiOcrResult && (
                  <div className="p-2.5 rounded-xl bg-white border border-violet-200 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Extracted Ref ID:</span>
                      <div className="flex items-center gap-1">
                        <strong className="font-mono text-indigo-700">
                          {aiOcrResult.extractedTransactionId || 'None'}
                        </strong>
                        {aiOcrResult.extractedTransactionId && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(aiOcrResult.extractedTransactionId);
                              showToast('success', 'Copied!', 'Ref ID copied to clipboard.');
                            }}
                            className="p-1 hover:text-indigo-600 text-slate-400 cursor-pointer"
                            title="Copy Ref"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Amount Match:</span>
                      <strong className={aiOcrResult.amountMatches ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                        Rs. {aiOcrResult.extractedAmount || 'N/A'}{' '}
                        {aiOcrResult.amountMatches ? '✅ (Matches Order Amount)' : '⚠️ (Please Verify)'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Fraud Risk:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          aiOcrResult.fraudRiskLevel === 'LOW'
                            ? 'bg-emerald-100 text-emerald-800'
                            : aiOcrResult.fraudRiskLevel === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {aiOcrResult.fraudRiskLevel} RISK ({aiOcrResult.confidenceScore}%)
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-100 leading-relaxed">
                      {aiOcrResult.analysisSummary}
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await updateOrderStatus(
                          order.id,
                          'processing',
                          `Payment verified via AI OCR. Ref: ${aiOcrResult.extractedTransactionId || order.transactionId || 'Verified'}`
                        );
                        if (ok) {
                          showToast('success', 'Verified', 'Payment verified and marked in processing.');
                          setShowScreenshotModal(false);
                          setAiOcrResult(null);
                        }
                      }}
                      className="w-full mt-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve Payment & Start Delivery</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900"
            >
              <h3 className="text-base font-bold text-slate-900">Reject Payment Proof</h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Select reason:</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                >
                  <option value="Payment reference could not be verified in wallet statement.">
                    Payment reference could not be verified in wallet statement.
                  </option>
                  <option value="Incorrect payment amount.">Incorrect payment amount.</option>
                  <option value="Unreadable screenshot.">Unreadable screenshot.</option>
                  <option value="Other">Other</option>
                </select>
                {rejectionReason === 'Other' && (
                  <input
                    type="text"
                    value={customRejection}
                    onChange={(e) => setCustomRejection(e.target.value)}
                    placeholder="Enter custom rejection reason..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                  />
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  disabled={isProcessingStatus}
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isProcessingStatus}
                  onClick={handleRejectPayment}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessingStatus ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Start Processing Modal */}
      <AnimatePresence>
        {showProcessingModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900"
            >
              <h3 className="text-base font-bold text-slate-900">Start Order Processing</h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Processing Note for Customer:</label>
                <input
                  type="text"
                  value={processingNote}
                  onChange={(e) => setProcessingNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  disabled={isProcessingStatus}
                  onClick={() => setShowProcessingModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isProcessingStatus}
                  onClick={handleStartProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessingStatus ? 'Processing...' : 'Confirm Processing'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark Delivered Modal */}
      <AnimatePresence>
        {showDeliveredModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900"
            >
              <h3 className="text-base font-bold text-slate-900">Mark Order Delivered</h3>
              <p className="text-xs text-slate-500">Are you sure this top-up has been delivered to the Player ID?</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Optional Delivery Note:</label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  disabled={isProcessingStatus}
                  onClick={() => setShowDeliveredModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isProcessingStatus}
                  onClick={handleMarkDelivered}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessingStatus ? 'Delivering...' : 'Confirm Delivered'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900"
            >
              <h3 className="text-base font-bold text-slate-900">Mark Order Completed</h3>
              <p className="text-xs text-slate-500">This will mark order #{displayOrderId} as completely fulfilled and closed.</p>
              <div className="flex gap-2 pt-2">
                <button
                  disabled={isProcessingStatus}
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isProcessingStatus}
                  onClick={handleMarkCompleted}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessingStatus ? 'Completing...' : 'Mark Completed'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comprehensive Cancel Order Modal with Full User & Refund Account Details */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-900 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/70 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <XCircle size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-rose-950">Cancel Order &amp; Settle Refund</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-900 border border-rose-200">
                        {String(order.orderStatus || (order as any).status || 'pending').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-600">Order #{displayOrderId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                
                {/* 1. Prominent Customer Details Box */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-indigo-600" /> Customer Information
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500">UID: {order.userId}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="flex justify-between bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 font-medium">Customer Name:</span>
                      <span className="font-bold text-slate-900">{order.customerName || order.userName || 'Customer'}</span>
                    </div>

                    <div className="flex justify-between bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 font-medium">Mobile Phone:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900">{order.customerPhone || order.userPhone || 'N/A'}</span>
                        {(order.customerPhone || order.userPhone) && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(order.customerPhone || order.userPhone || '');
                              showToast('success', 'Copied Phone', 'Phone copied to clipboard.');
                            }}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 font-medium">Email:</span>
                      <span className="font-mono text-slate-800 truncate max-w-[160px]">{order.customerEmail || order.userEmail || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 font-medium">Location:</span>
                      <span className="font-medium text-slate-800">{order.customerLocation || order.userLocation || 'Nepal (Online)'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Order & Item Specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Gamepad2 size={12} className="text-indigo-600" /> Item &amp; Amount
                    </span>
                    <p className="font-bold text-slate-900">{order.productName}</p>
                    <p className="text-indigo-600 font-medium text-[11px]">{order.packageName}</p>
                    <p className="font-mono font-black text-slate-900 text-sm pt-1">{formatNPR(order.amount)}</p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard size={12} className="text-emerald-600" /> Original Payment
                    </span>
                    <p className="font-bold text-slate-900 uppercase">{String(order.paymentMethod || 'Manual Transfer')}</p>
                    <p className="text-[11px] font-mono text-slate-600 truncate">
                      Ref ID: <span className="font-bold text-slate-900">{getSanitizedTransactionId(order) || order.transactionId || 'N/A'}</span>
                    </p>
                    <p className="text-[10px] font-bold capitalize text-slate-500">Status: {order.paymentStatus || 'Pending'}</p>
                  </div>
                </div>

                {/* 3. High Visibility Customer Refund Account Details Form */}
                <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-indigo-500/10 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                        <Wallet size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                          Customer Refund Account Details
                        </h4>
                        <p className="text-[10px] text-amber-900/80">
                          Account details where refund will be settled
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
                      Refund: {formatNPR(cancelRefundAmount || order.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Refund Wallet / Method</label>
                      <select
                        value={cancelRefundMethod}
                        onChange={(e) => setCancelRefundMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                      >
                        <option value="Gamer Wallet">🎮 Gamer Wallet (Auto-Credit)</option>
                        <option value="eSewa">eSewa</option>
                        <option value="Khalti">Khalti</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="IME Pay">IME Pay</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Customer Account / Phone</label>
                      <input
                        type="text"
                        value={cancelRefundAccountNumber}
                        onChange={(e) => setCancelRefundAccountNumber(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Account Holder Name</label>
                      <input
                        type="text"
                        value={cancelRefundAccountName}
                        onChange={(e) => setCancelRefundAccountName(e.target.value)}
                        placeholder="Account name"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Refund Amount (NPR)</label>
                      <input
                        type="number"
                        value={cancelRefundAmount}
                        onChange={(e) => setCancelRefundAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Initial Refund Settlement Status</label>
                      <select
                        value={cancelRefundStatus}
                        onChange={(e) => setCancelRefundStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                      >
                        <option value="refund_pending">⏳ refund_pending (Queued for Refund)</option>
                        <option value="refunded">✅ refunded (Transferred Right Away)</option>
                        <option value="not_applicable">🚫 not_applicable (Unpaid / No Money Received)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Cancellation Reason */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Cancellation Reason *</label>
                    <select
                      value={cancelReasonPreset}
                      onChange={(e) => setCancelReasonPreset(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900"
                    >
                      <option value="Customer Requested Cancellation">Customer Requested Cancellation</option>
                      <option value="Invalid Player UID / Zone Information">Invalid Player UID / Zone Information</option>
                      <option value="Game Server Out of Stock / Unfulfillable">Game Server Out of Stock / Unfulfillable</option>
                      <option value="Payment Mismatch / Verification Failed">Payment Mismatch / Verification Failed</option>
                      <option value="Duplicate Order Placed">Duplicate Order Placed</option>
                      <option value="Other">Other (Custom Reason)</option>
                    </select>
                  </div>

                  {cancelReasonPreset === 'Other' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Enter Custom Reason *</label>
                      <input
                        type="text"
                        required
                        value={cancelCustomReason}
                        onChange={(e) => setCancelCustomReason(e.target.value)}
                        placeholder="Explain cancellation reason..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Internal Admin Note for Customer (Optional)</label>
                    <input
                      type="text"
                      value={cancelAdminNote}
                      onChange={(e) => setCancelAdminNote(e.target.value)}
                      placeholder="e.g. Order cancelled upon customer request. Refund queued."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={isProcessingStatus}
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Keep Order Active
                </button>
                <button
                  type="button"
                  disabled={isProcessingStatus}
                  onClick={handleCancelOrder}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isProcessingStatus ? 'Cancelling...' : 'Confirm Cancellation & Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Information Modal */}
      <AnimatePresence>
        {showRequestInfoModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900"
            >
              <h3 className="text-base font-bold text-amber-600">Request Information from Customer</h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Message to Customer:</label>
                <textarea
                  rows={3}
                  value={infoRequestMessage}
                  onChange={(e) => setInfoRequestMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  disabled={isProcessingStatus}
                  onClick={() => setShowRequestInfoModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isProcessingStatus}
                  onClick={handleRequestInformation}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessingStatus ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Status Change Bottom Sheet */}
      {order && (
        <OrderStatusBottomSheet
          isOpen={isStatusBottomSheetOpen}
          onClose={() => setIsStatusBottomSheetOpen(false)}
          currentStatus={order.orderStatus}
          orderIdDisplay={displayOrderId}
          disabled={isProcessingStatus}
          onSelectStatus={async (newSt) => {
            if (isProcessingStatus) return;
            setIsProcessingStatus(true);
            try {
              setIsStatusBottomSheetOpen(false);
              const result = await updateOrderStatus(
                order.id,
                newSt,
                `Status updated to ${newSt.replace('_', ' ').toUpperCase()} by admin.`,
                undefined,
                adminInfo
              );
              if (result) {
                showToast('success', 'Order Status Updated', `Order #${displayOrderId} is now ${newSt.replace('_', ' ').toUpperCase()}.`);
              }
            } catch (err) {
              console.error('Failed to update status from bottom sheet:', err);
              showToast('error', 'Status Update Failed', 'Failed to update order status. Please try again.');
            } finally {
              setIsProcessingStatus(false);
            }
          }}
        />
      )}

      {/* ADVANCE MOBILE DELETE ORDER CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && order && (
          <ModalPortal isOpen={showDeleteModal} onClose={() => !isDeletingOrder && setShowDeleteModal(false)} zIndex={99999}>
            <div 
              className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => !isDeletingOrder && setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">Delete Order Permanently</h3>
                      <p className="text-[11px] text-rose-100 font-mono">Order #{displayOrderId}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isDeletingOrder}
                    onClick={() => setShowDeleteModal(false)}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Order Quick Summary Card */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={order.productImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'}
                        alt={order.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-black text-xs text-slate-900 truncate">{order.productName}</p>
                        <span className="font-mono font-black text-xs text-slate-900">
                          {formatNPR(Number(order.totalAmount || order.amount || (order as any).total_amount || 0))}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{order.packageName || 'Package'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-600">
                          Player: {order.playerId || (order as any).playerUid || 'N/A'}
                        </span>
                        <StatusBadge status={order.orderStatus} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Warning message */}
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs font-medium">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      This will permanently purge this order, its payment history, and cancellation requests from PostgreSQL, Supabase, and User App cache. This action cannot be reversed.
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                  <button
                    type="button"
                    disabled={isDeletingOrder}
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingOrder}
                    onClick={async () => {
                      setIsDeletingOrder(true);
                      try {
                        const adminUser = currentUser ? {
                          uid: currentUser.id || currentUser.uid || 'admin',
                          name: currentUser.name || 'Admin',
                          email: currentUser.email || ''
                        } : undefined;
                        const res = await deleteOrder(order.id, adminUser);
                        if (res && res.success) {
                          setShowDeleteModal(false);
                          setAdminTab('orders');
                        }
                      } catch (err: any) {
                        showToast('error', 'Delete Failed', err?.message || 'Could not delete order.');
                      } finally {
                        setIsDeletingOrder(false);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    <span>{isDeletingOrder ? 'Deleting Database...' : 'Yes, Delete Permanent'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AdminOrderDetailTab;
