import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { RefundTrackerCard } from '../components/orders/RefundTrackerCard';
import { OrderReceipt } from '../components/orders/OrderReceipt';
import { AdvanceBillModal } from '../components/orders/AdvanceBillModal';
import { ModalPortal } from '../components/common/ModalPortal';
import { getOfficialGameImage } from '../utils/gameImageHelper';
import {
  formatNPR,
  formatDate,
  formatTimeAgo,
  formatCompactDateTime,
  getSanitizedTransactionId,
  formatPaymentGatewayName,
  formatDisplayOrderId,
  formatActorName,
  getOrderAccountLabel,
  getOrderAccountShortLabel,
} from '../utils/formatters';
import {
  ArrowLeft,
  Receipt,
  Gamepad2,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Package,
  Zap,
  XCircle,
  FileWarning,
  X,
  Star,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Wallet,
  Printer,
  History,
  Share2,
  RefreshCw,
  Download,
  Search,
  CheckCheck,
  BadgePercent,
  CircleDot,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';
import { ReviewModal } from '../components/reviews/ReviewModal';
import { api } from '../services/api';

export const OrderDetailsPage: React.FC = () => {
  const {
    selectedOrderId,
    setSelectedOrderId,
    setSelectedProductId,
    goBack,
    showToast,
    setCurrentTab,
    reviews,
    appSettings,
    cancellationRequests,
    requestOrderCancellation,
    orders,
    products,
    resubmitPayment,
  } = useStore();
  const { currentUser } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Track another order modal / search state
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchCodeInput, setSearchCodeInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Timeline collapsed state for mobile brevity
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Copy states
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedPlayerId, setCopiedPlayerId] = useState(false);
  const [copiedTxnId, setCopiedTxnId] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Cancellation & Refund Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [cancelNote, setCancelNote] = useState('');
  const [refundMethod, setRefundMethod] = useState('eSewa');
  const [refundAccountName, setRefundAccountName] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Review modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Resubmission states
  const [resubmitTxnId, setResubmitTxnId] = useState('');
  const [resubmitMethod, setResubmitMethod] = useState<'esewa' | 'khalti'>('esewa');
  const [resubmitNote, setResubmitNote] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Receipt Modal and Native Print Handlers
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handlePrintReceipt = useCallback(() => {
    setIsReceiptModalOpen(true);
  }, []);

  const handleTriggerNativePrint = useCallback(() => {
    try {
      window.print();
    } catch {
      showToast('info', 'Print Receipt', 'Please use your browser print menu (Ctrl+P / Cmd+P) to print or save as PDF.');
    }
  }, [showToast]);

  // Fetch or refresh order details
  const fetchOrderDetails = useCallback(async (targetId?: string | null, isSilent = false) => {
    const idToFind = targetId || selectedOrderId;
    if (!idToFind) {
      if (orders.length > 0 && isMountedRef.current) {
        setOrder(orders[0]);
      }
      if (isMountedRef.current) setLoading(false);
      return;
    }

    const sId = String(idToFind).trim().toLowerCase();
    
    // Check local memory first
    const found = orders.find(
      (o) =>
        (o.id && o.id.toLowerCase() === sId) ||
        (o.order_code && o.order_code.toLowerCase() === sId) ||
        (o.orderCode && o.orderCode.toLowerCase() === sId) ||
        (o.orderNumber && o.orderNumber.toLowerCase() === sId) ||
        (o.orderId && o.orderId.toLowerCase() === sId)
    );

    if (found && !isSilent && isMountedRef.current) {
      setOrder(found);
      setLoading(false);
    }

    try {
      if (!isSilent && isMountedRef.current) setRefreshing(true);
      const res: any = await api.orders.getById(sId);
      if (!isMountedRef.current) return;
      if (res && res.success && res.order) {
        setOrder(res.order);
      } else {
        const myRes: any = await api.orders.getMyOrders();
        if (!isMountedRef.current) return;
        if (myRes?.orders && Array.isArray(myRes.orders)) {
          const apiFound = myRes.orders.find(
            (o: any) =>
              (o.id && String(o.id).toLowerCase() === sId) ||
              (o.order_code && String(o.order_code).toLowerCase() === sId) ||
              (o.orderCode && String(o.orderCode).toLowerCase() === sId) ||
              (o.order_number && String(o.order_number).toLowerCase() === sId)
          );
          if (apiFound) {
            setOrder(apiFound);
          } else if (!found && !order) {
            const directMatch = myRes.orders.find((o: any) =>
              formatDisplayOrderId(o).toLowerCase().includes(sId)
            );
            if (directMatch) setOrder(directMatch);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to refresh order:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedOrderId, orders, order]);

  // Initial load
  useEffect(() => {
    fetchOrderDetails(selectedOrderId);
  }, [selectedOrderId]);

  // Real-Time Cross-Tab, Cross-Window & SSE sync for 0ms status updates
  useEffect(() => {
    const handleRealtimeUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const updated = detail.order;
      const targetId = detail.orderId || detail.orderCode;
      if (!order) return;

      const curId = String(order.id || '').toLowerCase();
      const curCode = String(order.orderCode || order.orderNumber || (order as any).order_code || '').toLowerCase();
      const tId = String(targetId || '').toLowerCase();

      if (
        (tId && (tId === curId || tId === curCode)) ||
        (updated && (
          String(updated.id || '').toLowerCase() === curId ||
          String(updated.orderCode || updated.order_code || '').toLowerCase() === curCode
        ))
      ) {
        if (updated) {
          setOrder((prev) => (prev ? { ...prev, ...updated } : updated));
        }
        if (order.id) {
          api.orders.getHistory(order.id).then((res: any) => {
            if (res && res.success && Array.isArray(res.history)) {
              setOrderHistory(res.history);
            }
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('ghn:order-updated', handleRealtimeUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('ghn_realtime_order_bus');
        bc.onmessage = (event) => {
          if (event.data) {
            handleRealtimeUpdate({ detail: event.data });
          }
        };
      }
    } catch (_) {}

    return () => {
      window.removeEventListener('ghn:order-updated', handleRealtimeUpdate);
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
    };
  }, [order]);

  // Sync state if StoreContext orders update
  useEffect(() => {
    if (!order) return;
    const curId = String(order.id || '').toLowerCase();
    const curCode = String(order.orderCode || order.orderNumber || (order as any).order_code || '').toLowerCase();

    const matched = orders.find(
      (o) =>
        (o.id && o.id.toLowerCase() === curId) ||
        (o.orderCode && curCode && o.orderCode.toLowerCase() === curCode) ||
        (o.order_code && curCode && o.order_code.toLowerCase() === curCode)
    );
    if (
      matched &&
      (matched.orderStatus !== order.orderStatus ||
        matched.paymentStatus !== order.paymentStatus ||
        matched.refundStatus !== order.refundStatus ||
        matched.cancellationStatus !== order.cancellationStatus ||
        matched.refundReference !== order.refundReference ||
        matched.refundAmount !== order.refundAmount ||
        matched.updatedAt !== order.updatedAt)
    ) {
      setOrder(matched);
    }
  }, [orders, order]);

  // Fetch real status history from PostgreSQL
  useEffect(() => {
    if (!order?.id) return;
    let isMounted = true;
    api.orders.getHistory(order.id)
      .then((res: any) => {
        if (isMounted && res && res.success && Array.isArray(res.history)) {
          setOrderHistory(res.history);
        }
      })
      .catch((err: any) => console.warn('Customer history fetch error:', err));

    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.status, order?.paymentStatus]);

  // Sync default resubmit method with order
  useEffect(() => {
    if (order?.paymentMethod) {
      const m = String(order.paymentMethod).toLowerCase();
      if (m.includes('khalti')) setResubmitMethod('khalti');
      else setResubmitMethod('esewa');
    }
  }, [order?.paymentMethod]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchCodeInput.trim();
    if (!query) return;

    setSearchLoading(true);
    try {
      const s = query.toLowerCase();
      let foundOrder = null;

      const singleRes: any = await api.orders.getById(s);
      if (singleRes && singleRes.success && singleRes.order) {
        foundOrder = singleRes.order;
      } else {
        const myRes: any = await api.orders.getMyOrders();
        if (myRes?.orders && Array.isArray(myRes.orders)) {
          foundOrder = myRes.orders.find(
            (o: any) =>
              (o.id && String(o.id).toLowerCase() === s) ||
              (o.order_code && String(o.order_code).toLowerCase() === s) ||
              (o.orderCode && String(o.orderCode).toLowerCase() === s) ||
              (formatDisplayOrderId(o).toLowerCase() === s) ||
              (o.gameUserId && String(o.gameUserId).toLowerCase() === s)
          );
        }
      }

      if (foundOrder) {
        setSelectedOrderId(foundOrder.id);
        setOrder(foundOrder);
        setShowSearchInput(false);
        setSearchCodeInput('');
        showToast('success', 'Order Located', `Viewing Order ${formatDisplayOrderId(foundOrder)}`);
      } else {
        showToast('error', 'Order Not Found', 'No order matched that Order ID or Player UID.');
      }
    } catch {
      showToast('error', 'Search Error', 'Unable to search orders right now.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'order' | 'player' | 'txn' | 'voucher') => {
    navigator.clipboard.writeText(text);
    if (type === 'order') {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } else if (type === 'player') {
      setCopiedPlayerId(true);
      setTimeout(() => setCopiedPlayerId(false), 2000);
    } else if (type === 'txn') {
      setCopiedTxnId(true);
      setTimeout(() => setCopiedTxnId(false), 2000);
    } else if (type === 'voucher') {
      setCopiedVoucher(true);
      setTimeout(() => setCopiedVoucher(false), 2000);
    }
    showToast('success', 'Copied', `${text} copied to clipboard.`);
  };

  const handleShareOrder = () => {
    if (!order) return;
    const shareText = `Track My Unx Games Order ${formatDisplayOrderId(order)} for ${order.productName} (${order.packageName}).`;
    if (navigator.share) {
      navigator.share({
        title: `Unx Games - Order ${formatDisplayOrderId(order)}`,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
      showToast('success', 'Link Copied', 'Order tracking link copied to clipboard.');
    }
  };

  const handleResubmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const cleanRefId = resubmitTxnId.trim();
    if (!cleanRefId) {
      showToast('error', 'Ref ID Required', 'Please enter your Transaction / Reference ID (Ref ID).');
      return;
    }

    if (cleanRefId === order.gameUserId || cleanRefId === order.playerId) {
      showToast('error', 'Invalid Reference ID', 'Do not enter your Player ID as the payment reference ID.');
      return;
    }

    setIsResubmitting(true);
    try {
      const result = await resubmitPayment(order.id, {
        transactionId: cleanRefId,
        paymentMethod: resubmitMethod,
        resubmitNote: resubmitNote.trim() || undefined,
      });

      if (result.success) {
        setResubmitTxnId('');
        setResubmitNote('');
        showToast('success', 'Ref ID Resubmitted', 'Payment details resubmitted for instant verification.');
        fetchOrderDetails(order.id, true);
      } else {
        showToast('error', 'Error', result.message || 'Failed to submit payment details.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to submit payment update.');
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsSubmittingCancel(true);
    const result = await requestOrderCancellation(order.id, cancelReason, cancelNote, {
      refundMethod,
      refundAccountName,
      refundAccountNumber,
    });
    setIsSubmittingCancel(false);
    if (result.success) {
      setIsCancelModalOpen(false);
      showToast('success', 'Request Sent', 'Cancellation and refund request submitted to admin.');
      fetchOrderDetails(order.id, true);
    }
  };

  // Derived state (null-safe)
  const rawStatus = (order?.orderStatus || order?.status || 'pending').toLowerCase();
  const isCompleted = rawStatus === 'completed' || rawStatus === 'delivered';
  const isProcessing = rawStatus === 'processing' || rawStatus === 'payment_verified';
  const isVerification = rawStatus === 'payment_verification' || rawStatus === 'pending_payment';
  const isRejected = rawStatus === 'rejected' || order?.paymentStatus === 'rejected' || (order?.paymentStatus as string) === 'failed';
  const isCancelled = rawStatus === 'cancelled' && !isRejected;

  // Stepper progress index (0 to 3)
  const currentStep = isCompleted ? 3 : isProcessing ? 2 : isVerification ? 1 : 0;

  // Resolve matching product and package from product catalog
  const matchingProduct = products.find(
    (p) =>
      p.id === order?.productId ||
      p.id === (order as any)?.product_id ||
      (p as any)?.slug === order?.productId ||
      (p as any)?.slug === (order as any)?.product_id ||
      (p.name && order?.productName && p.name.toLowerCase() === String(order.productName).toLowerCase()) ||
      (p.name && (order as any)?.product_name && p.name.toLowerCase() === String((order as any).product_name).toLowerCase())
  );

  const displayProductName =
    order?.productName ||
    (order as any)?.product_name ||
    (order as any)?.product_name_snapshot ||
    matchingProduct?.name ||
    'Game Top-up';

  const displayProductImage = getOfficialGameImage(
    order?.productId || (order as any)?.product_id,
    displayProductName,
    order?.productImage || (order as any)?.product_image || (order as any)?.product_image_url || matchingProduct?.image
  );

  const matchingPackage = matchingProduct?.packages?.find(
    (pkg) =>
      pkg.id === order?.packageId ||
      pkg.id === (order as any)?.package_id ||
      (pkg.name && order?.packageName && pkg.name.toLowerCase() === String(order.packageName).toLowerCase()) ||
      (pkg.name && (order as any)?.package_name && pkg.name.toLowerCase() === String((order as any).package_name).toLowerCase())
  );

  const displayPackageName =
    order?.packageName ||
    (order as any)?.package_name ||
    (order as any)?.package_name_snapshot ||
    matchingPackage?.name ||
    (order as any)?.package_id ||
    'Top-Up Package';

  const displayAmount = Number(
    order?.amount ??
    (order as any)?.total_amount ??
    (order as any)?.totalAmount ??
    (order as any)?.price ??
    matchingPackage?.price ??
    0
  );

  const displayZoneId =
    order?.gameZoneId ||
    (order as any)?.game_server ||
    (order as any)?.game_zone_id ||
    order?.zoneId ||
    order?.server ||
    (order as any)?.server ||
    '';

  const displayPlayerUid =
    order?.gameUserId ||
    (order as any)?.game_username ||
    (order as any)?.gameUsername ||
    (order as any)?.playerId ||
    (order as any)?.player_id ||
    (order as any)?.game_uid ||
    (order as any)?.game_user_id ||
    (order as any)?.player_uid ||
    (order as any)?.user_id ||
    'N/A';

  // Refund / Cancellation status
  const matchingCancelRequest = cancellationRequests.find(
    (cr) =>
      (order && (cr.orderId === order.id || cr.orderId === (order as any).order_code || cr.orderId === order.orderCode)) ||
      (order?.cancellationRequestId && cr.id === order.cancellationRequestId)
  );

  const isRefundCompleted =
    order?.refundStatus === 'refunded' ||
    order?.refundStatus === 'completed' ||
    matchingCancelRequest?.refundStatus === 'refunded' ||
    matchingCancelRequest?.refundStatus === 'completed' ||
    rawStatus === 'refunded';

  const isRefundRejected =
    !isRefundCompleted &&
    (order?.cancellationStatus === 'rejected' ||
      matchingCancelRequest?.status === 'REJECTED' ||
      order?.refundStatus === 'rejected' ||
      matchingCancelRequest?.refundStatus === 'rejected');

  const isCancellationRequested =
    !isRefundCompleted &&
    !isRefundRejected &&
    (order?.cancellationStatus === 'requested' ||
      matchingCancelRequest?.status === 'PENDING' ||
      rawStatus === 'cancellation_requested' ||
      rawStatus === 'refund_requested');

  const isRefundProcessing =
    !isRefundCompleted &&
    !isRefundRejected &&
    !isCancellationRequested &&
    (order?.cancellationStatus === 'approved' ||
      matchingCancelRequest?.status === 'APPROVED' ||
      order?.refundStatus === 'processing' ||
      matchingCancelRequest?.refundStatus === 'processing' ||
      rawStatus === 'refunding' ||
      rawStatus === 'refund_processing');

  const isRefundActive = isCancellationRequested || isRefundProcessing || isRefundCompleted || isRefundRejected;

  const hasRefundOrCancellation =
    Boolean(matchingCancelRequest) ||
    order?.cancellationStatus === 'requested' ||
    order?.cancellationStatus === 'approved' ||
    order?.cancellationStatus === 'rejected' ||
    isCancellationRequested ||
    isRefundProcessing ||
    isRefundCompleted ||
    isRefundRejected ||
    (Boolean(order?.refundStatus) && order?.refundStatus !== 'not_applicable');

  const isCancelEligible = !isCompleted && !isCancelled && !isRejected && !hasRefundOrCancellation;

  const sanitizedTxn = order ? getSanitizedTransactionId(order) : '';

  // WhatsApp Support Message Link
  const rawSupportPhone = String(appSettings?.whatsappNumber || appSettings?.supportPhone || '9768914027');
  const cleanPhone = rawSupportPhone.replace(/[^0-9]/g, '');
  const fullWaPhone = cleanPhone.startsWith('977') ? cleanPhone : `977${cleanPhone.replace(/^0+/, '')}`;
  const waMessage = encodeURIComponent(
    order
      ? `Hello Unx Games Support, I need help with my Order ${formatDisplayOrderId(order)} for ${displayProductName} (${displayPackageName}). ${getOrderAccountShortLabel(order, matchingProduct)}: ${displayPlayerUid}. Status: ${order.orderStatus || order.status || 'Pending'}`
      : 'Hello Unx Games Support, I need help with my order.'
  );
  const waUrl = `https://wa.me/${fullWaPhone}?text=${waMessage}`;

  const existingReview = reviews.find(
    (r) =>
      (order && r.orderId === order.id) ||
      (r.userId === currentUser?.uid &&
        r.productId === (order?.productId || (order as any)?.product_id) &&
        r.productName?.toLowerCase() === displayProductName.toLowerCase())
  );

  // Synthesize complete A to Z order history (Hook called unconditionally)
  const orderTimelineItems = useMemo(() => {
    if (!order) return [];
    const events: any[] = [];
    const seenSignatures = new Set<string>();

    const addEvent = (evt: {
      status?: string;
      new_status?: string;
      createdAt?: string;
      created_at?: string;
      timestamp?: string;
      changed_by?: string;
      adminName?: string;
      note?: string;
      message?: string;
    }) => {
      const st = String(evt.new_status || evt.status || '').toLowerCase().replace(/_/g, ' ').trim();
      const time = evt.createdAt || evt.created_at || evt.timestamp || '';
      const minuteKey = time ? new Date(time).toISOString().slice(0, 16) : 'now';
      const sig = `${st}_${minuteKey}_${(evt.note || evt.message || '').slice(0, 20)}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        events.push(evt);
      }
    };

    // 1. Ingest existing raw history & timeline from database
    const rawItems = (orderHistory && orderHistory.length > 0) ? [...orderHistory] : (order?.timeline ? [...order.timeline] : []);
    for (const item of rawItems) {
      addEvent(item);
    }

    // Matching cancellation request from store
    const matchingCancel = cancellationRequests.find(
      (cr) =>
        cr.orderId === order.id ||
        cr.orderId === (order as any).order_code ||
        cr.orderId === order.orderCode
    );

    // 2. Synthesize Milestone: Order Placed (Kab Aaya)
    const hasPlaced = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s.includes('placed') || s.includes('pending_payment') || s.includes('pending payment');
    });
    if (!hasPlaced && order.createdAt) {
      addEvent({
        status: 'order_placed',
        new_status: 'Order Placed',
        createdAt: order.createdAt,
        changed_by: order.userName || (order as any).customerName || 'Customer',
        note: `Order #${formatDisplayOrderId(order)} placed via ${formatPaymentGatewayName(order.paymentMethod)}. Package: ${displayPackageName || displayProductName || 'Game Top-Up'}. Total: ${formatNPR(order.amount)}`,
      });
    }

    // 3. Synthesize Milestone: Payment Verified / Order Accepted (Kab Accept Huwa)
    const wasAccepted =
      (order.paymentStatus as string) === 'paid' ||
      order.paymentStatus === 'verified' ||
      order.orderStatus === 'processing' ||
      order.orderStatus === 'delivered' ||
      order.orderStatus === 'completed' ||
      order.verifiedAt ||
      (order.timeline && order.timeline.some((t: any) => t.status === 'processing' || t.status === 'delivered' || t.status === 'completed'));

    const hasPaymentAccepted = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s.includes('payment_verified') || s.includes('payment verified') || s.includes('accepted');
    });

    if (wasAccepted && !hasPaymentAccepted) {
      const acceptTime = order.verifiedAt || (order.createdAt ? new Date(new Date(order.createdAt).getTime() + 60000).toISOString() : order.updatedAt);
      addEvent({
        status: 'payment_verified',
        new_status: 'Payment Accepted & Verified',
        createdAt: acceptTime,
        changed_by: order.verifiedBy || 'Store Owner (Verified)',
        note: `Payment of ${formatNPR(order.amount)} verified via ${formatPaymentGatewayName(order.paymentMethod)}${sanitizedTxn ? ` (Txn Ref: ${sanitizedTxn})` : ''}. Order accepted into live fulfillment queue.`,
      });
    }

    // 4. Synthesize Milestone: Top-up In Progress / Processing (Fulfillment)
    const isOrWasProcessing =
      order.orderStatus === 'processing' ||
      order.orderStatus === 'delivered' ||
      order.orderStatus === 'completed';

    const hasProcessing = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s === 'processing' || s === 'processing top-up';
    });

    if (isOrWasProcessing && !hasProcessing) {
      const procTime = order.processingAt || (order.verifiedAt ? new Date(new Date(order.verifiedAt).getTime() + 30000).toISOString() : order.updatedAt);
      addEvent({
        status: 'processing',
        new_status: 'Processing Top-Up',
        createdAt: procTime,
        changed_by: 'Unx Games Server (Automated Queue)',
        note: `Package ${displayPackageName || 'Diamonds'} dispatched to game server for player UID ${displayPlayerUid || 'provided'}.`,
      });
    }

    // 5. Synthesize Milestone: Cancellation Requested (Customer Request)
    const isCancelReq = matchingCancel || order.cancellationStatus === 'requested' || order.cancellationStatus === 'approved' || order.cancellationStatus === 'rejected';
    const hasCancelReq = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s.includes('cancellation requested') || s.includes('cancel_requested');
    });

    if (isCancelReq && !hasCancelReq) {
      const reqTime = matchingCancel?.requestedAt || (matchingCancel as any)?.createdAt || (order.createdAt ? new Date(new Date(order.createdAt).getTime() + 120000).toISOString() : order.updatedAt);
      addEvent({
        status: 'cancellation_requested',
        new_status: 'Cancellation Requested',
        createdAt: reqTime,
        changed_by: matchingCancel?.userName || order.userName || 'Customer',
        note: `Customer requested order cancellation. Reason: "${matchingCancel?.reason || order.cancellationReason || 'Customer requested cancellation'}"`,
      });
    }

    // 6. Synthesize Milestone: Cancellation Approved (Cancel Kiya Ho Ga O Vi)
    const isCancelledOrApproved =
      order.orderStatus === 'cancelled' ||
      order.status === 'cancelled' ||
      matchingCancel?.status === 'APPROVED' ||
      order.cancellationStatus === 'approved';

    const hasCancelApproved = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s === 'cancelled' || s.includes('cancellation approved');
    });

    if (isCancelledOrApproved && !hasCancelApproved) {
      const cancelTime = (matchingCancel as any)?.approvedAt || order.cancelledAt || order.updatedAt || new Date().toISOString();
      addEvent({
        status: 'cancelled',
        new_status: 'Cancellation Approved & Cancelled',
        createdAt: cancelTime,
        changed_by: (matchingCancel as any)?.approvedBy || order.cancelledBy || 'Binod Thalal (Store Owner)',
        note: `Order cancellation approved by store owner. Order marked cancelled and queued for customer refund.`,
      });
    }

    // 7. Synthesize Milestone: Refund In-Progress (Refund Queue)
    const isRefundInProg =
      order.refundStatus === 'processing' ||
      matchingCancel?.refundStatus === 'processing' ||
      order.refundStatus === 'refunded' ||
      matchingCancel?.refundStatus === 'refunded';

    const hasRefundProg = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s.includes('refund processing') || s.includes('refund initiated') || s.includes('refund_processing');
    });

    if (isRefundInProg && !hasRefundProg) {
      const refProgTime = (matchingCancel as any)?.refundInitiatedAt || (order.updatedAt ? new Date(new Date(order.updatedAt).getTime() - 60000).toISOString() : new Date().toISOString());
      const rAmount = order.refundAmount || matchingCancel?.refundAmount || order.amount;
      const rMethod = order.refundMethod || matchingCancel?.refundMethod || order.paymentMethod || 'eSewa';
      addEvent({
        status: 'refund_processing',
        new_status: 'Refund In-Progress',
        createdAt: refProgTime,
        changed_by: 'Refund Operations Desk',
        note: `Refund of ${formatNPR(rAmount)} initiated to customer's ${rMethod} wallet/account.`,
      });
    }

    // 8. Synthesize Milestone: Refund Completed & Settled (Refund Kab Huwa)
    const isRefundSettled =
      order.refundStatus === 'refunded' ||
      matchingCancel?.refundStatus === 'refunded' ||
      Boolean(order.refundDate);

    const hasRefundSettled = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s.includes('refund completed') || s.includes('refunded') || s.includes('refund settled');
    });

    if (isRefundSettled && !hasRefundSettled) {
      const refTime = order.refundDate || matchingCancel?.refundDate || order.updatedAt || new Date().toISOString();
      const rAmount = order.refundAmount || matchingCancel?.refundAmount || order.amount;
      const rMethod = order.refundMethod || matchingCancel?.refundMethod || order.paymentMethod || 'eSewa';
      const rRef = order.refundReference || matchingCancel?.refundReference || '';
      const rNote = order.refundNote || matchingCancel?.adminNote || 'Refund successfully settled and credited to your account.';

      addEvent({
        status: 'refund_completed',
        new_status: 'Refund Completed 💸',
        createdAt: refTime,
        changed_by: order.refundProcessedBy || matchingCancel?.refundProcessedBy || 'Binod Thalal (Store Owner)',
        note: `Refund of ${formatNPR(rAmount)} successfully credited to customer ${rMethod} account.${rRef ? ` (Txn Ref: ${rRef})` : ''} | Note: "${rNote}"`,
      });
    }

    // 9. Synthesize Milestone: Delivered / Completed
    const isDelivered = order.orderStatus === 'delivered' || order.orderStatus === 'completed' || order.status === 'completed';
    const hasDelivered = events.some((e) => {
      const s = String(e.new_status || e.status || '').toLowerCase();
      return s.includes('delivered') || s.includes('completed');
    });
    if (isDelivered && !hasDelivered) {
      addEvent({
        status: 'completed',
        new_status: 'Order Delivered & Completed',
        createdAt: order.completedAt || order.deliveredAt || order.updatedAt || new Date().toISOString(),
        changed_by: 'Unx Games Automated Delivery Engine',
        note: `Top-up diamonds successfully sent to player ID ${displayPlayerUid || 'provided'}.`,
      });
    }

    // Sort descending (newest first)
    events.sort((a: any, b: any) => {
      const tA = new Date(a.created_at || a.createdAt || a.timestamp || 0).getTime();
      const tB = new Date(b.created_at || b.createdAt || b.timestamp || 0).getTime();
      return tB - tA;
    });

    return events;
  }, [orderHistory, order, cancellationRequests, displayPackageName, displayProductName, displayPlayerUid, sanitizedTxn]);

  // Loading state guard
  if (loading) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded-md w-3/4" />
              <div className="h-3 bg-slate-200 rounded-md w-1/2" />
            </div>
          </div>
          <div className="h-24 bg-slate-100 rounded-2xl" />
          <div className="h-36 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not found state guard
  if (!order) {
    return (
      <div className="w-full min-h-[75vh] flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 mx-auto">
            <AlertCircle size={32} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Order Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              We couldn't locate this order. You can search with your Order ID or Player UID below.
            </p>
          </div>

          <form onSubmit={handleManualSearch} className="space-y-2 pt-1">
            <div className="relative">
              <input
                type="text"
                value={searchCodeInput}
                onChange={(e) => setSearchCodeInput(e.target.value)}
                placeholder="Enter GHN Order ID or Player UID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-slate-400 focus:bg-white outline-none focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                disabled={searchLoading || !searchCodeInput.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {searchLoading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                <span>Track</span>
              </button>
            </div>
          </form>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('orders')}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              My Orders
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs cursor-pointer transition-all shadow-sm shadow-violet-600/25 active:scale-95"
            >
              Go to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-0 bg-transparent pb-2 sm:pb-2 font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* MAIN MOBILE APP CONTENT CONTAINER                                         */}
      {/* ========================================================================= */}
      <div className="w-full max-w-lg sm:max-w-2xl mx-auto px-2 sm:px-2 pt-1 sm:pt-1.5 space-y-2">
        
        {/* ======================================================================= */}
        {/* HERO LIVE STATUS BANNER CARD (NATIVE APP STYLE)                         */}
        {/* ======================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative rounded-3xl p-3 sm:p-3.5 text-white shadow-md overflow-hidden ${
            isRefundCompleted
              ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 shadow-emerald-600/20'
              : isRefundProcessing
              ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 shadow-orange-600/25'
              : isCancellationRequested
              ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 shadow-amber-600/20'
              : isCompleted
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 shadow-emerald-600/20'
              : isProcessing
              ? 'bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 shadow-violet-600/25'
              : isRejected
              ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 shadow-rose-600/20'
              : isCancelled
              ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-slate-900/20'
              : 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 shadow-amber-600/20'
          }`}
        >
          {/* Subtle Ambient Glow Background Orbs */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

          {/* Top Bar inside Hero: Back Button + Order Code + Refresh / Total */}
          <div className="relative z-10 flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/15">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (goBack) goBack();
                  else setCurrentTab('orders');
                }}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shrink-0 shadow-2xs"
                title="Go Back to Orders"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-mono font-black text-white bg-black/25 px-2.5 py-1 rounded-lg border border-white/20 tracking-tight truncate">
                  {formatDisplayOrderId(order)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(formatDisplayOrderId(order), 'order')}
                  className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer"
                  title="Copy Order ID"
                >
                  {copiedOrderId ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchOrderDetails(order.id, false)}
                disabled={refreshing}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 disabled:opacity-50"
                title="Refresh Order Status"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={() => handlePrintReceipt()}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20"
                title="Download Receipt / Invoice"
              >
                <Receipt size={14} />
              </button>

              <button
                type="button"
                onClick={handleShareOrder}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20"
                title="Share Order"
              >
                {copiedShareLink ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
              </button>
            </div>
          </div>

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {/* Dynamic Animated Status Icon Badge */}
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
                {isRefundCompleted ? (
                  <CheckCheck size={26} className="text-white stroke-[2.5]" />
                ) : isRefundProcessing ? (
                  <RotateCcw size={24} className="text-white animate-spin" />
                ) : isCancellationRequested ? (
                  <Clock size={24} className="text-white animate-pulse" />
                ) : isCompleted ? (
                  <CheckCheck size={26} className="text-white stroke-[2.5]" />
                ) : isProcessing ? (
                  <Zap size={24} className="text-amber-300 fill-amber-300 animate-bounce" />
                ) : isRejected || isCancelled ? (
                  <XCircle size={26} className="text-white" />
                ) : (
                  <Clock size={24} className="text-white animate-pulse" />
                )}
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/25 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                    {isProcessing && !isRefundActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />}
                    <span>
                      {isRefundCompleted
                        ? 'Refund Settled'
                        : isRefundProcessing
                        ? 'Refunding'
                        : isCancellationRequested
                        ? 'Cancellation Requested'
                        : isCancelled
                        ? 'Cancelled'
                        : String(order.orderStatus || order.status || 'Pending').replace(/_/g, ' ')}
                    </span>
                  </span>
                  <span className="text-[11px] text-white/80 font-medium">
                    {formatTimeAgo(order.createdAt)}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                  {isRefundCompleted
                    ? 'Order Cancelled & Refunded ✅'
                    : isRefundProcessing
                    ? 'Refund In Progress 🔄'
                    : isCancellationRequested
                    ? 'Cancellation Under Review ⏳'
                    : isCompleted
                    ? 'Delivered Successfully! 🎉'
                    : isProcessing
                    ? 'Processing Top-Up Now ⚡'
                    : isRejected
                    ? 'Payment Ref Verification Needed ⚠️'
                    : isCancelled
                    ? 'Order Cancelled'
                    : 'Payment Verification In Queue ⏳'}
                </h2>

                <p className="text-xs text-white/85 font-medium leading-snug">
                  {isRefundCompleted
                    ? `Rs. ${order.refundAmount || order.amount} has been refunded to your ${order.refundMethod || order.paymentMethod || 'account'}.`
                    : isRefundProcessing
                    ? 'Admin approved your cancellation. Refund is currently being processed.'
                    : isCancellationRequested
                    ? 'Your cancellation and refund request is under review. Top-up delivery is paused.'
                    : isCompleted
                    ? `Package credited directly to ${getOrderAccountShortLabel(order, matchingProduct)}: ${displayPlayerUid}`
                    : isProcessing
                    ? 'Game account queue active. Delivery takes 3-10 minutes.'
                    : isRejected
                    ? 'Reference ID did not match. Resubmit your genuine Ref ID below.'
                    : isCancelled
                    ? 'This order has been cancelled and stopped.'
                    : 'Admin is verifying your payment. Top-up starts automatically.'}
                </p>
              </div>
            </div>

            {/* Total Amount Tag */}
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-white/70 block">Total</span>
              <span className="text-base sm:text-lg font-black font-mono text-white">
                {formatNPR(displayAmount)}
              </span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* NATIVE 4-STAGE HORIZONTAL STEPPER (MOBILE APP TRACKING TIMELINE)    */}
          {/* =================================================================== */}
          {!isCancelled && !isRejected && !isRefundActive && (
            <div className="mt-4 pt-3.5 pb-1 border-t border-white/20">
              <div className="relative">
                {/* Connecting Track Background */}
                <div className="absolute top-3.5 left-[12%] right-[12%] h-1 bg-white/20 rounded-full -z-0" />
                
                {/* Active Connecting Fill Track */}
                <div
                  className="absolute top-3.5 left-[12%] h-1 bg-white rounded-full transition-all duration-500 -z-0"
                  style={{
                    width:
                      currentStep === 3
                        ? '76%'
                        : currentStep === 2
                        ? '51%'
                        : currentStep === 1
                        ? '25%'
                        : '0%',
                  }}
                />

                <div className="grid grid-cols-4 gap-1 relative z-10">
                  {[
                    { step: 0, label: 'Order Placed', short: 'Placed' },
                    { step: 1, label: 'Payment Verifying', short: 'Verifying' },
                    { step: 2, label: 'Processing', short: 'Processing' },
                    { step: 3, label: 'Delivered', short: 'Delivered' },
                  ].map((s) => {
                    const isDone = s.step === 0 ? true : currentStep > s.step || (s.step === 3 && isCompleted);
                    const isCurrent = currentStep === s.step && !isCompleted;

                    return (
                      <div key={s.step} className="flex flex-col items-center text-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isDone || (s.step === 3 && isCompleted)
                              ? 'bg-white text-emerald-700 shadow-md font-black scale-105'
                              : isCurrent
                              ? 'bg-white text-slate-900 shadow-md font-black ring-4 ring-white/30 animate-pulse'
                              : 'bg-white/30 text-white/70 border border-white/40'
                          }`}
                        >
                          {isDone || (s.step === 3 && isCompleted) ? (
                            <Check size={13} className="stroke-[3]" />
                          ) : (
                            <span className="text-[10px] font-bold">{s.step + 1}</span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-black mt-1.5 tracking-tight leading-tight ${
                            isDone || isCurrent || (s.step === 3 && isCompleted) ? 'text-white' : 'text-white/60'
                          }`}
                        >
                          {s.short}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ======================================================================= */}
        {/* 2.5 DELIVERY ARRIVAL & GUARANTEED ETA ("KAB AAYEGA" SCHEDULE CARD)      */}
        {/* ======================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs space-y-3"
        >
          {/* Card Header with Status Badge */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isRefundCompleted
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : isRefundProcessing
                  ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : isCancellationRequested
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : isProcessing
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse'
                  : isRejected
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isCancelled
                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                {isRefundCompleted ? (
                  <CheckCircle2 size={18} />
                ) : isRefundProcessing || isCancellationRequested ? (
                  <RotateCcw size={18} />
                ) : isCompleted ? (
                  <CheckCircle2 size={18} />
                ) : isProcessing ? (
                  <Zap size={18} />
                ) : isRejected ? (
                  <AlertCircle size={18} />
                ) : (
                  <Clock size={18} />
                )}
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">
                  Delivery Schedule &amp; ETA (कहिले आइपुग्छ?)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {isRefundCompleted
                    ? 'Top-up cancelled — Refund settled'
                    : isRefundProcessing
                    ? 'Top-up paused — Refund transferring'
                    : isCancellationRequested
                    ? 'Top-up paused — Cancellation under review'
                    : isCompleted
                    ? 'Top-up successfully fulfilled'
                    : isProcessing
                    ? 'Active delivery queue in progress'
                    : isRejected
                    ? 'Verification halted: invalid transaction ID'
                    : isCancelled
                    ? 'Fulfillment stopped'
                    : 'Awaiting admin payment confirmation'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchOrderDetails(order.id, false)}
              disabled={refreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-violet-100 shrink-0"
              title="Check live delivery update"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-violet-600' : ''} />
            </button>
          </div>

          {/* Dynamic Timing & Queue Window */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border ${
            isRefundCompleted
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
              : isRefundProcessing
              ? 'bg-orange-50/70 border-orange-200/80 text-orange-950'
              : isCancellationRequested
              ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
              : isCompleted
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
              : isProcessing
              ? 'bg-violet-50/70 border-violet-200/80 text-violet-950'
              : isRejected
              ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
              : isCancelled
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white shadow-2xs">
                    {isRefundCompleted
                      ? 'Refunded'
                      : isRefundProcessing
                      ? 'Refunding'
                      : isCancellationRequested
                      ? 'Delivery Paused'
                      : isCompleted
                      ? 'Delivered'
                      : isProcessing
                      ? '⚡ Priority Queue'
                      : isRejected
                      ? 'Action Needed'
                      : isCancelled
                      ? 'Cancelled'
                      : 'Verification Queue'}
                  </span>
                  {isProcessing && !isRefundActive && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-violet-700">
                      <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                      In Progress
                    </span>
                  )}
                </div>

                <h4 className="text-base sm:text-lg font-black tracking-tight">
                  {isRefundCompleted
                    ? 'Order Cancelled & Payment Refunded'
                    : isRefundProcessing
                    ? 'Refund In Processing'
                    : isCancellationRequested
                    ? 'Delivery Paused: Cancellation Under Review'
                    : isCompleted
                    ? 'Top-Up Credited to Account'
                    : isProcessing
                    ? 'Estimated Delivery: 2 to 5 Minutes'
                    : isRejected
                    ? 'Payment Proof Re-submission Required'
                    : isCancelled
                    ? 'This Order Has Been Cancelled'
                    : 'Estimated Delivery: 5 to 10 Minutes'}
                </h4>

                <p className="text-xs leading-relaxed opacity-90 max-w-xl">
                  {isRefundCompleted
                    ? 'This order has been cancelled and the amount has been refunded back to your wallet or payment account.'
                    : isRefundProcessing
                    ? 'Your cancellation request was approved by the admin team. Funds are currently being transferred back to your payment account.'
                    : isCancellationRequested
                    ? 'Top-up delivery is on hold while our admin team reviews your cancellation and refund request. You can check the real-time refund status below.'
                    : isCompleted
                    ? 'Your game account has been topped up directly. Please launch your game or refresh your lobby to enjoy your new diamonds/coins.'
                    : isProcessing
                    ? 'Your order is currently with the automated recharge server. Please keep your game open or check your in-game mailbox in 2-5 minutes.'
                    : isRejected
                    ? 'The transaction reference ID submitted did not match the merchant statement. Please resubmit your correct Ref ID below to resume immediate delivery.'
                    : isCancelled
                    ? 'Order fulfillment was cancelled. Any deducted amount has been restored to your wallet or is pending support review.'
                    : 'Our payment verification team is confirming your transaction ID. Once approved, top-up begins automatically without any delay.'}
                </p>
              </div>
            </div>

            {/* Processing Progress Bar (if in queue and not in refund state) */}
            {!isRefundActive && !isCancelled && !isRejected && !isCompleted && (
              <div className="mt-3 pt-3 border-t border-black/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="opacity-80">Queue Progress</span>
                  <span className="font-mono">{isProcessing ? '85% (Fulfilling)' : '35% (Verifying)'}</span>
                </div>
                <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isProcessing ? 'bg-violet-600' : 'bg-amber-500'}`}
                    initial={{ width: '15%' }}
                    animate={{ width: isProcessing ? '85%' : '35%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assurance Guarantees */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
              <ShieldCheck size={16} className="text-emerald-600 mb-1" />
              <span className="text-[10px] font-black text-slate-800">100% UID Safe</span>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">No Password Required</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
              <Zap size={16} className="text-amber-600 mb-1" />
              <span className="text-[10px] font-black text-slate-800">Speed Guarantee</span>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">99.4% Under 10 Mins</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
              <RotateCcw size={16} className="text-violet-600 mb-1" />
              <span className="text-[10px] font-black text-slate-800">Refund Guarantee</span>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">Instant Wallet Refund</span>
            </div>
          </div>
        </motion.div>

        {/* ======================================================================= */}
        {/* 3. PRODUCT & GAMER PASS CARD                                            */}
        {/* ======================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs space-y-3"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Gamepad2 size={15} className="text-violet-600" />
              <span>Package &amp; Delivery Target</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              {formatCompactDateTime(order.createdAt) || formatDate(order.createdAt)}
            </span>
          </div>

          {/* Game Thumbnail & Name */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#1C1736] to-[#120F24] border border-violet-200/90 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
              <img
                src={displayProductImage}
                alt={displayProductName}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getOfficialGameImage(order?.productId, displayProductName);
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {displayProductName}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-black border border-violet-100">
                  {displayPackageName}
                </span>
                {displayZoneId && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                    Server: {displayZoneId}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Player UID Highlight Tile with 1-Tap Copy */}
          <div className="p-3 bg-gradient-to-r from-slate-50 to-violet-50/40 rounded-2xl border border-violet-100/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                {getOrderAccountLabel(order, matchingProduct)} (Target ID)
              </span>
              <span className="font-mono font-black text-sm text-violet-900 tracking-wider select-all block truncate">
                {displayPlayerUid}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(displayPlayerUid, 'player')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-violet-600 hover:text-white text-violet-700 font-bold text-xs border border-violet-200/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title={`Copy ${getOrderAccountShortLabel(order, matchingProduct)}`}
            >
              {copiedPlayerId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedPlayerId ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Game Voucher Code Box (If applicable) */}
          {order.voucherCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-inner space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>Digital Voucher Code</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Ready to Redeem</span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="font-mono font-black text-base text-amber-300 tracking-widest select-all truncate">
                  {order.voucherCode}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(order.voucherCode!, 'voucher')}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedVoucher ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedVoucher ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ======================================================================= */}
        {/* 4. PAYMENT & E-RECEIPT BREAKDOWN CARD                                    */}
        {/* ======================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs space-y-3"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Receipt size={15} className="text-violet-600" />
              <span>Official E-Receipt &amp; Payment</span>
            </span>
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200/60 transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>Download Bill</span>
            </button>
          </div>

          {/* Key-Value Breakdown Rows */}
          <div className="space-y-2 text-xs">
            {/* Order Code */}
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Order ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                  {formatDisplayOrderId(order)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(formatDisplayOrderId(order), 'order')}
                  className="text-slate-400 hover:text-violet-600 p-1 cursor-pointer"
                  title="Copy Order ID"
                >
                  {copiedOrderId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Payment Gateway</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 capitalize">
                <CreditCard size={14} className="text-violet-600" />
                <span>{formatPaymentGatewayName(order.paymentMethod)}</span>
              </div>
            </div>

            {/* Payment Ref ID */}
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Transaction / Ref ID</span>
              {sanitizedTxn ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {sanitizedTxn}
                  </span>
                  {sanitizedTxn !== 'Screenshot Uploaded' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(sanitizedTxn, 'txn')}
                      className="text-slate-400 hover:text-violet-600 p-1 cursor-pointer transition-colors"
                      title="Copy Ref ID"
                    >
                      {copiedTxnId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                  Pending / Not submitted
                </span>
              )}
            </div>

            {/* Price Line Items */}
            <div className="flex items-center justify-between py-1 text-slate-600 font-medium">
              <span>Package Subtotal</span>
              <span>{formatNPR(displayAmount)}</span>
            </div>

            <div className="flex items-center justify-between py-1 text-slate-600 font-medium">
              <span>Service &amp; Processing Fee</span>
              <span className="text-emerald-600 font-bold">FREE (Rs. 0)</span>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="font-black text-slate-900">Total Paid (NPR)</span>
              <span className="font-black font-mono text-base text-violet-700">
                {formatNPR(displayAmount)}
              </span>
            </div>
          </div>

          {/* Genuine Seal */}
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck size={13} /> 100% Genuine Direct Top-Up
            </span>
            <span>Unx Games Verified</span>
          </div>
        </motion.div>

        {/* ======================================================================= */}
        {/* 5. LIVE REFUND TRACKER (IF ACTIVE)                                      */}
        {/* ======================================================================= */}
        {hasRefundOrCancellation && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <RefundTrackerCard
              order={order}
              cancellationRequest={matchingCancelRequest}
              whatsappUrl={waUrl}
            />
          </motion.div>
        )}

        {/* ======================================================================= */}
        {/* 6. PAYMENT REF RESUBMISSION (IF REJECTED)                               */}
        {/* ======================================================================= */}
        {isRejected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50/90 rounded-3xl p-4 sm:p-5 border border-rose-200 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>Payment Verification Rejected</span>
            </div>

            {order.rejectionReason && (
              <div className="p-3 bg-white rounded-2xl border border-rose-200 text-xs text-rose-900 font-medium">
                <span className="text-[10px] font-black uppercase text-rose-600 block mb-0.5">Admin Note:</span>
                &ldquo;{order.rejectionReason}&rdquo;
              </div>
            )}

            <form onSubmit={handleResubmitSubmit} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  1. Payment Gateway Used
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResubmitMethod('esewa')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      resubmitMethod === 'esewa'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>eSewa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResubmitMethod('khalti')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      resubmitMethod === 'khalti'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Khalti</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  2. Correct Transaction / Reference ID (Ref ID) *
                </label>
                <input
                  type="text"
                  required
                  value={resubmitTxnId}
                  onChange={(e) => setResubmitTxnId(e.target.value)}
                  placeholder="e.g. 8X9Y7Z88A9"
                  className="w-full text-xs font-bold font-mono px-3.5 py-2.5 rounded-xl bg-white border border-rose-300 focus:border-rose-600 focus:outline-hidden text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isResubmitting || !resubmitTxnId.trim()}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {isResubmitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                <span>{isResubmitting ? 'Submitting...' : 'Re-Submit Ref ID'}</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* ======================================================================= */}
        {/* 7. ORDER ACTIVITY & STATUS TIMELINE                                     */}
        {/* ======================================================================= */}
        {orderTimelineItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History size={15} className="text-violet-600" />
                <span>Live Delivery Activity &amp; Logs</span>
              </span>
              <button
                type="button"
                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                className="text-[10px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{isTimelineExpanded ? 'Show Less' : `View All (${orderTimelineItems.length})`}</span>
                {isTimelineExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            <div className="relative pl-2 space-y-3.5 pt-1">
              {/* Vertical Stepper Connector Line */}
              <div className="absolute left-[19px] top-3.5 bottom-3.5 w-0.5 bg-slate-200 -z-0" />

              {(isTimelineExpanded ? orderTimelineItems : orderTimelineItems.slice(0, 3)).map(
                (item: any, idx: number) => {
                  const rawItemStatus = item.new_status || item.status || item.action || item.title || 'Update';
                  const s = String(rawItemStatus).toLowerCase().replace(/_/g, ' ').trim();
                  
                  const isRefund = s.includes('refund');
                  const isSuccess = (s.includes('completed') || s.includes('delivered')) && !isRefund;
                  const isRefundCompleted = s.includes('refund completed') || s.includes('refund settled') || s.includes('refunded');
                  const isRefundProg = s.includes('refund processing') || s.includes('refund in-progress') || s.includes('refund initiated');
                  const isProg = s.includes('processing') || s.includes('in progress');
                  const isCancelReq = s.includes('cancellation requested') || s.includes('cancel request');
                  const isCancelled = s.includes('cancelled') || s.includes('cancellation approved');
                  const isFail = s.includes('reject');
                  const isVerified = s.includes('verified') || s.includes('accepted');
                  const isPlaced = s.includes('placed');

                  const eventTime = item.createdAt || item.created_at || item.timestamp;

                  return (
                    <div key={`timeline-item-${idx}`} className="relative flex items-start gap-3 z-10">
                      {/* Stepper Dot */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                          isRefundCompleted
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                            : isRefundProg
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                            : isSuccess
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                            : isProg
                            ? 'bg-violet-600 text-white ring-4 ring-violet-100 animate-pulse'
                            : isCancelReq
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                            : isCancelled || isFail
                            ? 'bg-rose-500 text-white ring-4 ring-rose-100'
                            : isVerified
                            ? 'bg-violet-600 text-white ring-4 ring-violet-100'
                            : 'bg-slate-700 text-white ring-4 ring-slate-100'
                        }`}
                      >
                        {isRefundCompleted ? (
                          <span className="text-xs">💸</span>
                        ) : isSuccess || isVerified ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <CircleDot size={12} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight ${
                              isRefundCompleted
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : isRefundProg
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : isSuccess
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isProg
                                ? 'bg-violet-50 text-violet-800 border border-violet-200'
                                : isCancelReq
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : isCancelled || isFail
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : isVerified
                                ? 'bg-violet-50 text-violet-900 border border-violet-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {String(rawItemStatus || 'Update').replace(/_/g, ' ')}
                          </span>

                          {eventTime && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatCompactDateTime(eventTime) || formatDate(eventTime)}
                            </span>
                          )}
                        </div>

                        {(item.note || item.message) && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium">
                            <p>&ldquo;{item.note || item.message}&rdquo;</p>
                            {(() => {
                              const rawActor = item.changed_by || item.adminName;
                              if (!rawActor) return null;
                              const actor = formatActorName(rawActor);
                              const isSys = actor === 'System';
                              if (isSys) {
                                return <span className="text-[10px] text-violet-600 font-bold block mt-1">System</span>;
                              }
                              const st = String(rawItemStatus || '').toLowerCase();
                              let label = `Updated by: ${actor}`;
                              if (st === 'order_placed' || st === 'pending_payment' || st.includes('placed')) {
                                label = `Order placed by: ${actor}`;
                              } else if (st.includes('verified') || st.includes('accepted')) {
                                label = `Payment verified by: ${actor}`;
                              } else if (st.includes('refund')) {
                                label = `Refund processed by: ${actor}`;
                              } else if (st.includes('processing')) {
                                label = `Processed by: ${actor}`;
                              } else if (st.includes('delivered')) {
                                label = `Delivered by: ${actor}`;
                              } else if (st.includes('completed')) {
                                label = `Completed by: ${actor}`;
                              } else if (st.includes('reject')) {
                                label = `Rejected by: ${actor}`;
                              } else if (st.includes('cancel')) {
                                label = `Cancelled by: ${actor}`;
                              }
                              return (
                                <span className="text-[10px] text-violet-600 font-bold block mt-1">
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </motion.div>
        )}

        {/* ======================================================================= */}
        {/* 8. RATE & REVIEW SECTION (IF COMPLETED)                                 */}
        {/* ======================================================================= */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2"
          >
            {existingReview ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span>Your Review ({existingReview.rating}★)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatTimeAgo(existingReview.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-700 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100/60 italic leading-relaxed font-medium">
                  &ldquo;{existingReview.comment}&rdquo;
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">How was your delivery?</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Help other gamers with your genuine review</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Star size={13} className="fill-white" />
                  <span>Rate Order</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ======================================================================= */}
        {/* 9. CANCELLATION REQUEST BUTTON (IF ELIGIBLE)                            */}
        {/* ======================================================================= */}
        {isCancelEligible && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-rose-50 active:scale-[0.98] text-rose-600 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-200 shadow-2xs"
            >
              <FileWarning size={16} />
              <span>Cancel &amp; Request Refund</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 11. CANCEL & REFUND MODAL                                                 */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 11. CANCEL & REFUND REQUEST MODAL (PORTAL OVERLAY)                        */}
      {/* ========================================================================= */}
      <ModalPortal isOpen={isCancelModalOpen} onClose={() => !isSubmittingCancel && setIsCancelModalOpen(false)} zIndex={99999}>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[99999]">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => !isSubmittingCancel && setIsCancelModalOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 relative flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Cancel &amp; Refund Request</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Refund to your digital wallet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleCancelSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Select Reason *</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium outline-none focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="Wrong Player ID / UID">Wrong Player ID / UID entered</option>
                    <option value="Ordered by mistake">Ordered by mistake</option>
                    <option value="Delay in Top-Up delivery">Delay in Top-Up delivery</option>
                    <option value="Wrong Game / Package selected">Wrong Game / Package selected</option>
                    <option value="Other">Other reason</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Additional Details {cancelReason === 'Other' ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    required={cancelReason === 'Other'}
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    rows={2}
                    placeholder="Provide additional details..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium outline-none focus:outline-none focus:border-slate-400 resize-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Wallet size={14} className="text-slate-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      Refund Receiving Wallet
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700">Wallet Type</label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-medium outline-none focus:outline-none focus:border-slate-400 cursor-pointer"
                      >
                        <option value="eSewa">eSewa</option>
                        <option value="Khalti">Khalti</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="IME Pay">IME Pay</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700">Phone / Account *</label>
                      <input
                        type="text"
                        required
                        value={refundAccountNumber}
                        onChange={(e) => setRefundAccountNumber(e.target.value)}
                        placeholder="e.g. 98XXXXXXXX"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-mono font-medium outline-none focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700">Account Holder Name *</label>
                    <input
                      type="text"
                      required
                      value={refundAccountName}
                      onChange={(e) => setRefundAccountName(e.target.value)}
                      placeholder="Name on eSewa / Bank account"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-medium outline-none focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Pinned Action Buttons */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !refundAccountNumber.trim() || !refundAccountName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs shadow-rose-600/25 cursor-pointer disabled:opacity-60 transition-all active:scale-[0.98]"
                >
                  {isSubmittingCancel ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </ModalPortal>

      {/* ========================================================================= */}
      {/* 12. REVIEW MODAL                                                          */}
      {/* ========================================================================= */}
      {order && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          orderId={order.id}
          productId={order.productId}
          defaultProductName={order.productName}
          defaultPackageName={order.packageName}
          defaultProductImage={order.productImage}
        />
      )}
      
      {/* ========================================================================= */}
      {/* 13. ADVANCE OFFICIAL TAX INVOICE & BILL MODAL (MOBILE APP UI/UX)         */}
      {/* ========================================================================= */}
      {order && (
        <AdvanceBillModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={order}
          appSettings={appSettings}
          showToast={showToast}
        />
      )}

      {/* Media print container */}
      {order && (
        <div id="printable-order-receipt-root" className="hidden">
          <OrderReceipt order={order} appSettings={appSettings} />
        </div>
      )}
    </div>
  );
};
export default OrderDetailsPage;
