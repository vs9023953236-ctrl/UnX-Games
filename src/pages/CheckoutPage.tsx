import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/messages';

import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MaintenanceScreen } from '../components/common/MaintenanceScreen';
import { AppLoadingScreen } from '../components/common/AppLoadingScreen';
import { formatNPR, formatDisplayOrderId, generateOrderId, getOrderAccountLabel } from '../utils/formatters';
import { PaymentMethod } from '../types';
import { ESEWA_DEFAULT_QR, KHALTI_DEFAULT_QR } from '../utils/branding';
import { WalletModal } from '../components/wallet/WalletModal';
import { ModalPortal } from '../components/common/ModalPortal';
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  X,
  ShoppingBag,
  Info,
  User,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Sparkles,
  MessageCircle,
  ZoomIn,
  Wrench,
  Ticket,
  Tag,
  Wallet as WalletIcon,
  RefreshCw,
  PlusCircle,
  Download,
  ExternalLink,
  Lock,
  Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getAccountAddress = (user: any): string => {
  if (!user) return '';
  if (user.location && user.location.trim()) return user.location.trim();
  if (user.address && user.address.trim()) {
    const parts = [user.address.trim(), user.city?.trim(), user.district?.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : user.address.trim();
  }
  if (user.city && user.city.trim()) {
    return user.district ? `${user.city.trim()}, ${user.district.trim()}` : user.city.trim();
  }
  return '';
};

export const CheckoutPage: React.FC = () => {
  const {
    products,
    paymentSettings,
    appSettings,
    createOrder,
    setCurrentTab,
    setSelectedOrderId,
    goBack,
    showToast,
    orders,
    walletBalance: storeWalletBalance,
    refreshWallet,
  } = useStore();
  const { currentUser, updateProfile, setRedirectAfterAuth, isAdmin } = useAuth();

  const isOrderingOpen = appSettings.orderingEnabled !== false && (appSettings as any).ordering_enabled !== false;

  // Retrieve saved pending session
  const [checkoutData] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('ghn_pending_checkout');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Wallet balance & modal state
  const [walletBalance, setWalletBalance] = useState<number | null>(() => storeWalletBalance);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    setWalletBalance(storeWalletBalance);
  }, [storeWalletBalance]);

  useEffect(() => {
    if (currentUser) {
      refreshWallet().then((bal) => setWalletBalance(bal)).catch(() => {});
    }
  }, [currentUser, refreshWallet]);

  useEffect(() => {
    const handleWalletUpdate = (e: any) => {
      if (e.detail?.balance !== undefined) {
        setWalletBalance(Number(e.detail.balance) || 0);
      }
    };
    window.addEventListener('ghn_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('ghn_wallet_updated', handleWalletUpdate);
  }, []);

  // Calculate available active payment methods from admin payment settings
  const availableMethods = useMemo(() => {
    const list: { id: PaymentMethod; name: string; icon: string; color: string; badge?: string }[] = [];

    list.push({ id: 'wallet', name: 'Gamer Wallet', icon: 'रु', color: 'violet', badge: 'Instant 1-Click' });

    if (paymentSettings?.esewaEnabled !== false) {
      list.push({ id: 'esewa', name: 'eSewa QR & ID', icon: 'eS', color: 'emerald', badge: 'Fastest' });
    }
    if (paymentSettings?.khaltiEnabled !== false) {
      list.push({ id: 'khalti', name: 'Khalti Wallet', icon: 'KH', color: 'purple', badge: 'Popular' });
    }

    return list;
  }, [paymentSettings]);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  // Keep selection aligned with available methods
  useEffect(() => {
    if (selectedMethod && availableMethods.length > 0) {
      const exists = availableMethods.some((m) => m.id === selectedMethod);
      if (!exists) {
        setSelectedMethod(null);
      }
    }
  }, [availableMethods, selectedMethod]);

  const [step, setStep] = useState<1 | 2>(1); // 1: Order Summary & Customer Info, 2: Payment & Verification

  // Customer Contact & Location Information State (Auto-Filled from User Account)
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || currentUser?.mobile || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerLocation, setCustomerLocation] = useState(() => getAccountAddress(currentUser) || 'Nepal');

  // Coupon / Promo Voucher State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Sync state when currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name || '');
      if (!customerPhone && (currentUser.phone || currentUser.mobile)) {
        setCustomerPhone(currentUser.phone || currentUser.mobile || '');
      }
      if (!customerEmail) setCustomerEmail(currentUser.email || '');
      const accountAddr = getAccountAddress(currentUser);
      if (accountAddr) {
        setCustomerLocation(accountAddr);
      }
    }
  }, [currentUser]);

  // Payment Verification Fields
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [tempOrderId] = useState(() => checkoutData?.orderCode || checkoutData?.tempOrderId || generateOrderId());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reset page-level modals and submission locks on unmount
  useEffect(() => {
    return () => {
      setIsWalletModalOpen(false);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setIsValidatingCoupon(false);
      setCopiedField(null);
    };
  }, []);

  // Maintenance Mode Guard for non-admin customers
  if (appSettings?.maintenanceMode && !isAdmin) {
    return <MaintenanceScreen />;
  }

  // If no checkout data is found or user went directly to /checkout
  if (!checkoutData) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 bg-transparent">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">No Pending Order</h2>
          <p className="text-slate-500 text-xs">Please select a product and package first.</p>
          <button
            onClick={() => goBack('shop')}
            className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-violet-600/20 active:scale-[0.98] transition-all cursor-pointer text-xs"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  // Look up product and package
  const product = products.find((p) => p.id === checkoutData.productId);
  const selectedPkg = product?.packages.find((p) => p.id === checkoutData.packageId);

  if (!product || !selectedPkg) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 bg-transparent">
        <p className="text-slate-500 text-xs">Product or package not found.</p>
        <button onClick={() => goBack('shop')} className="mt-4 text-violet-600 hover:text-violet-700 font-bold text-xs cursor-pointer">
          Back to Shop
        </button>
      </div>
    );
  }

  const quantity = checkoutData.quantity || 1;
  const totalPrice = selectedPkg.price * quantity;
  const finalPayablePrice = Math.max(0, totalPrice - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.coupons.validate({
        code: couponCodeInput.trim(),
        orderAmount: totalPrice,
        productId: product?.id,
        categoryId: product?.categoryId,
      });
      if (res.success && res.valid) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discountAmount || 0);
        showToast('success', SUCCESS_MESSAGES.COUPON_APPLIED.title, `You saved Rs. ${res.discountAmount}`);
      } else {
        setCouponError(res.message || 'Invalid coupon code.');
        showToast('error', ERROR_MESSAGES.COUPON_ERROR.title, res.message || 'Coupon could not be applied.');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Failed to validate coupon.');
      showToast('error', ERROR_MESSAGES.COUPON_ERROR.title, err.message || 'Failed to validate coupon.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCodeInput('');
    setCouponError(null);
    showToast('info', 'Coupon Removed', 'Discount voucher removed from order.');
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast('success', SUCCESS_MESSAGES.COPIED.title, `${field} copied to clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getResolvedLocation = () => {
    const loc = customerLocation.trim();
    if (loc) return loc;
    return getAccountAddress(currentUser) || 'Nepal';
  };

  const handleProceedToPayment = () => {
    if (!customerPhone.trim()) {
      showToast('error', VALIDATION_MESSAGES.MOBILE_REQUIRED.title, VALIDATION_MESSAGES.MOBILE_REQUIRED.message);
      return;
    }

    const loc = getResolvedLocation();
    if (!loc.trim()) {
      showToast('error', VALIDATION_MESSAGES.LOCATION_REQUIRED.title, VALIDATION_MESSAGES.LOCATION_REQUIRED.message);
      return;
    }

    if (availableMethods.length === 0) {
      showToast('error', ERROR_MESSAGES.PAYMENT_UNAVAILABLE.title, ERROR_MESSAGES.PAYMENT_UNAVAILABLE.message);
      return;
    }

    if (!selectedMethod) {
      showToast('error', 'Select Payment Method', 'Please select a payment method from the options before proceeding.');
      return;
    }

    // Save/Update user profile phone and location if logged in
    if (currentUser) {
      updateProfile({
        name: customerName.trim() || currentUser.name,
        phone: customerPhone.trim(),
        location: loc,
      }).catch((e) => console.warn('Profile background update:', e));
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPayment = async () => {
    if (isSubmitting || isSubmittingRef.current) return;

    if (!isOrderingOpen) {
      showToast('error', ERROR_MESSAGES.ORDERS_OFFLINE.title, ERROR_MESSAGES.ORDERS_OFFLINE.message);
      return;
    }

    const cleanTxnId = transactionId.trim();
    if (!cleanTxnId) {
      showToast('error', VALIDATION_MESSAGES.REF_ID_REQUIRED.title, VALIDATION_MESSAGES.REF_ID_REQUIRED.message);
      return;
    }

    const finalLocation = getResolvedLocation();
    const finalPhone = customerPhone.trim() || currentUser?.phone || '';
    const finalName = customerName.trim() || currentUser?.name || 'Customer';
    const finalEmail = customerEmail.trim() || currentUser?.email || '';

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        orderCode: tempOrderId,
        userId: currentUser?.uid || 'customer',
        userName: finalName,
        userEmail: finalEmail,
        userPhone: finalPhone,
        userLocation: finalLocation,
        customerLocation: finalLocation,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        packageId: selectedPkg.id,
        packageName: selectedPkg.name,
        quantity: quantity,
        amount: finalPayablePrice,
        gameUserId: checkoutData.gameUserId,
        zoneId: checkoutData.zoneId,
        server: checkoutData.server,
        paymentMethod: selectedMethod || 'esewa',
        transactionId: cleanTxnId,
        couponCode: appliedCoupon?.code,
      });

      // Also persist to profile if changed and logged in
      if (currentUser) {
        updateProfile({
          name: finalName,
          phone: finalPhone,
          location: finalLocation,
        }).catch(() => {});
      }

      // Brief delay so customer sees full-screen loading completion
      await new Promise(r => setTimeout(r, 600));

      // Clear pending session
      sessionStorage.removeItem('ghn_pending_checkout');

      // Update navigation
      showToast('success', SUCCESS_MESSAGES.ORDER_SUBMITTED.title, SUCCESS_MESSAGES.ORDER_SUBMITTED.message);
      setSelectedOrderId(order.id);
      setCurrentTab('order_detail');
      window.scrollTo(0, 0);
    } catch (err: any) {
      showToast('error', ERROR_MESSAGES.SUBMISSION_FAILED.title, err.message || 'Failed to submit payment.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const submitWalletPayment = async () => {
    if (isSubmitting || isSubmittingRef.current) return;

    if (!currentUser) {
      showToast('error', ERROR_MESSAGES.LOGIN_REQUIRED.title, ERROR_MESSAGES.LOGIN_REQUIRED.message);
      return;
    }

    const finalLocation = getResolvedLocation();
    const finalPhone = customerPhone.trim() || currentUser?.phone || '';
    const finalName = customerName.trim() || currentUser?.name || 'Customer';
    const finalEmail = customerEmail.trim() || currentUser?.email || '';

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        userId: currentUser?.uid || 'customer',
        userName: finalName,
        userEmail: finalEmail,
        userPhone: finalPhone,
        userLocation: finalLocation,
        customerLocation: finalLocation,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        packageId: selectedPkg.id,
        packageName: selectedPkg.name,
        quantity: quantity,
        amount: finalPayablePrice,
        gameUserId: checkoutData.gameUserId,
        zoneId: checkoutData.zoneId,
        server: checkoutData.server,
        paymentMethod: 'wallet',
        transactionId: `WALLET-${Date.now().toString(36).toUpperCase()}`,
        orderCode: tempOrderId,
        couponCode: appliedCoupon?.code,
      });

      // Also persist to profile if changed
      updateProfile({
        name: finalName,
        phone: finalPhone,
        location: finalLocation,
      }).catch(() => {});

      // Brief delay so customer sees full-screen loading completion
      await new Promise(r => setTimeout(r, 600));

      sessionStorage.removeItem('ghn_pending_checkout');
      showToast('success', SUCCESS_MESSAGES.ORDER_PAID.title, SUCCESS_MESSAGES.ORDER_PAID.message);
      setSelectedOrderId(order.id);
      setCurrentTab('order_detail');
      window.scrollTo(0, 0);
    } catch (err: any) {
      showToast('error', ERROR_MESSAGES.PAYMENT_FAILED.title, err.message || 'Failed to pay with wallet.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Determine actual payment credentials to display dynamically based on selectedMethod
  const isEsewa = selectedMethod === 'esewa';
  const isKhalti = selectedMethod === 'khalti';

  const paymentNumber = isEsewa
    ? paymentSettings?.esewaId || '9768914027'
    : paymentSettings?.khaltiId || '9768914027';

  const configuredEsewaName = paymentSettings?.esewaName && !paymentSettings.esewaName.toLowerCase().includes('game hub')
    ? paymentSettings.esewaName
    : 'BINOD THALAL (UNX GAMES)';

  const configuredKhaltiName = paymentSettings?.khaltiName && !paymentSettings.khaltiName.toLowerCase().includes('game hub')
    ? paymentSettings.khaltiName
    : 'UNX GAMES OFFICIAL';

  const accountName = isEsewa ? configuredEsewaName : configuredKhaltiName;

  const paymentQr = isEsewa
    ? paymentSettings?.esewaQR || ESEWA_DEFAULT_QR
    : paymentSettings?.khaltiQR || KHALTI_DEFAULT_QR;

  const paymentInstructions = isEsewa
    ? paymentSettings?.esewaInstructions || '1. Scan QR code in eSewa.\n2. Add Order ID in Remarks.\n3. Upload screenshot below.'
    : paymentSettings?.khaltiInstructions || '1. Scan QR in Khalti app.\n2. Add Order ID in Remarks.\n3. Upload receipt below.';

  const [isQrZoomed, setIsQrZoomed] = useState(false);

  const handleDownloadQr = () => {
    if (!paymentQr) return;
    try {
      const link = document.createElement('a');
      link.href = paymentQr;
      link.download = `UnxGames_${(selectedMethod || 'esewa').toUpperCase()}_QR_${tempOrderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('success', 'QR Saved to Device!', 'Open your payment app and upload from gallery to pay.');
    } catch {
      showToast('info', 'Download QR', 'Long press or tap QR to save image.');
    }
  };

  const handleOpenPaymentApp = () => {
    if (isEsewa) {
      window.location.href = 'esewa://';
      setTimeout(() => {
        window.open('https://esewa.com.np', '_blank');
      }, 700);
    } else if (isKhalti) {
      window.location.href = 'khalti://';
      setTimeout(() => {
        window.open('https://khalti.com', '_blank');
      }, 700);
    }
  };

  const handleCopyRemarks = () => {
    navigator.clipboard.writeText(tempOrderId);
    setCopiedField('Remarks');
    showToast('success', 'Order Ref Copied!', 'Paste this in the Remarks/Note field of your payment app.');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get user's latest transaction/order to show visual progress tracking
  const latestOrder = useMemo(() => {
    if (!currentUser || !orders) return null;
    const userOrders = orders.filter((o) => o.userId === currentUser.uid || o.customerId === currentUser.uid);
    if (userOrders.length === 0) return null;
    return [...userOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [orders, currentUser]);

  const trackerProgress = useMemo(() => {
    if (!latestOrder) return null;
    const status = latestOrder.status;
    
    let stepIndex = 0; // 0: Pending, 1: Verifying, 2: Delivered
    let isError = status === 'cancelled' || status === 'rejected';

    if (['payment_verified', 'processing'].includes(status)) {
      stepIndex = 1;
    } else if (['completed', 'delivered'].includes(status)) {
      stepIndex = 2;
    }

    return { stepIndex, isError, status };
  }, [latestOrder]);

  if (appSettings.maintenanceMode && !isAdmin) {
    return (
      <div className="flex-1 w-full bg-transparent flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full space-y-5">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200/80 rounded-3xl flex items-center justify-center text-amber-600 shadow-sm shadow-slate-200/40 animate-pulse">
            <Wrench size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">Checkout Temporarily Unavailable</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Top-up services are currently under maintenance. We are performing system improvements and will be back shortly.
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentTab('shop');
              window.scrollTo(0, 0);
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
          >
            <span>Back to Store</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent flex flex-col">
      <AnimatePresence>
        {isSubmitting && (
          <AppLoadingScreen
            fullScreen
            title="Processing Order..."
            message="Verifying payment details and creating your top-up order..."
          />
        )}
      </AnimatePresence>
      <div className="flex-1 px-2.5 sm:px-4 lg:px-6 pt-1 sm:pt-1.5 pb-1 sm:pb-1.5 space-y-2.5 max-w-lg mx-auto w-full">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* 1. Order Summary & Gaming Item Bento Card */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm space-y-3">
              {/* Header with Order Ref */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200/60 text-violet-600 flex items-center justify-center">
                    <ShoppingBag size={14} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xs sm:text-sm leading-none">Order Summary</h3>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">Review game &amp; package details</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(tempOrderId, 'Order Reference')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 text-[10.5px] font-mono font-bold text-slate-700 transition-all cursor-pointer"
                  title="Copy Order ID"
                >
                  <span>{tempOrderId}</span>
                  {copiedField === 'Order Reference' ? (
                    <Check size={11} className="text-emerald-600" />
                  ) : (
                    <Copy size={11} className="text-slate-400" />
                  )}
                </button>
              </div>

              {/* Product Info Block - Redesigned to Center and Span Full-Width beautifully */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 space-y-4 relative">
                {/* Top Row: Product Icon & Package Details side-by-side */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-2xs shrink-0 relative">
                    <img
                      src={product.image || '/free-fire.webp'}
                      alt={product.name}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/free-fire.webp';
                      }}
                    />
                    <div className="absolute top-1 left-1 bg-violet-600/90 text-white text-[8px] font-black uppercase px-1 py-0.2 rounded">
                      TOPUP
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">{product.name}</h4>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded-md">
                        <Sparkles size={9} />
                        <span>Instant</span>
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-violet-50 border border-violet-200/60 text-violet-700 font-extrabold text-[11px] rounded-lg">
                      <span>{selectedPkg.name}</span>
                    </div>
                  </div>
                </div>

                {/* Account / UID Row - Placed outside to take 100% full-width and centered beautifully */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3 text-xs">
                  {/* Full-width Spacious UID Container - Centered beautifully */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-violet-50/50 px-4 py-2.5 rounded-xl border border-violet-100 shadow-2xs text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-600 font-extrabold">
                      <User size={13} className="text-violet-600" />
                      <span>
                        {getOrderAccountLabel({ productName: product.name, category: product.category, gameUserId: checkoutData.gameUserId }, product)}
                      </span>
                    </div>
                    <span className="font-mono font-black text-sm sm:text-base text-violet-700 select-all tracking-wider break-all text-center sm:text-right">
                      {checkoutData.gameUserId}
                    </span>
                  </div>

                  {/* Badges Row - Centered beautifully */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-white text-slate-800 font-black px-3 py-1 rounded-lg border border-slate-200/80 text-[10px] uppercase shadow-2xs">
                      QUANTITY: {quantity}X
                    </span>
                    
                    {checkoutData.zoneId && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 font-mono font-black px-3 py-1 rounded-lg border border-blue-100 text-[10px] shadow-2xs">
                        Zone ID: {checkoutData.zoneId}
                      </span>
                    )}
                    
                    {checkoutData.server && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 font-black px-3 py-1 rounded-lg border border-amber-100 text-[10px] uppercase shadow-2xs">
                        Server: {checkoutData.server}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Promo Code / Voucher Row */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="checkout-coupon" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Ticket size={13} className="text-violet-600" />
                    <span>Promo / Discount Voucher</span>
                  </label>
                  {appliedCoupon && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                      Coupon Applied
                    </span>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Tag size={12} />
                      </div>
                      <div>
                        <span className="font-mono font-black text-emerald-900 uppercase text-xs">{appliedCoupon.code}</span>
                        <span className="text-emerald-700 text-[10.5px] block font-bold">Saved {formatNPR(couponDiscount)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-black text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 cursor-pointer active:scale-95 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <input
                        id="checkout-coupon"
                        type="text"
                        placeholder="Enter voucher code (e.g. SAVE10)"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-3 pr-2 text-sm font-mono font-bold uppercase transition-all placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponCodeInput.trim()}
                      className="min-h-11 shrink-0 cursor-pointer rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-2xs transition-all hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {isValidatingCoupon ? 'Verifying...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[10.5px] font-semibold text-rose-600">{couponError}</p>}
              </div>

              {/* Price Breakdown */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Package Subtotal</span>
                  <span className="font-bold text-slate-800">{formatNPR(totalPrice)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                    <span>Voucher Discount</span>
                    <span>-{formatNPR(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                  <div>
                    <span className="font-black text-slate-900 text-xs sm:text-sm block">Total Payable</span>
                    <span className="text-[10px] text-slate-400 font-medium">All taxes &amp; fees included</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-violet-700 tracking-tight">{formatNPR(finalPayablePrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer Contact & Location Information */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-violet-50 border border-violet-200/60 text-violet-600 flex items-center justify-center">
                    <User size={14} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xs sm:text-sm leading-none">Customer Information</h3>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">For instant order updates &amp; receipt</span>
                  </div>
                </div>
                {currentUser && (
                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Auto-Filled
                  </span>
                )}
              </div>

              <div className="space-y-2.5 pt-0.5">
                {/* Full Name */}
                <div>
                  <label htmlFor="checkout-name" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="checkout-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-9 pr-3.5 text-sm font-medium text-slate-900 transition-all focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                </div>

                {/* Mobile / WhatsApp Number with embedded +977 prefix */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="checkout-phone" className="block text-[11px] font-bold text-slate-700">
                      Mobile / WhatsApp Number <span className="text-violet-600">*</span>
                    </label>
                    <span className="text-[10px] font-extrabold text-violet-700 bg-violet-50 px-1.5 py-0.2 rounded">
                      Required for Delivery
                    </span>
                  </div>
                  <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200/80 focus-within:bg-white focus-within:border-violet-600 transition-all overflow-hidden">
                    <div className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100/90 border-r border-slate-200/80 text-xs font-bold text-slate-700 shrink-0 select-none">
                      <span>🇳🇵</span>
                      <span className="font-mono text-[11px]">+977</span>
                    </div>
                    <input
                      id="checkout-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      maxLength={15}
                      autoComplete="tel"
                      className="min-h-11 flex-1 bg-transparent px-3 text-sm font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="checkout-email" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Receipt &amp; Updates)</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="checkout-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. gamer@gmail.com"
                      autoComplete="email"
                      className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-9 pr-3.5 text-sm font-medium text-slate-900 transition-all focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                </div>

                {/* Auto Delivery Address / Location from User Account */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="checkout-location" className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <MapPin size={13} className="text-violet-600" />
                      <span>Delivery Address / Location</span>
                    </label>
                    <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>Auto from Account</span>
                    </span>
                  </div>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="checkout-location"
                      type="text"
                      value={customerLocation}
                      onChange={(e) => setCustomerLocation(e.target.value)}
                      placeholder="e.g. Kathmandu, Nepal"
                      autoComplete="address-level2"
                      className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-9 pr-3.5 text-sm font-medium text-slate-900 transition-all focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 pl-1 flex items-center gap-1">
                    <span>✨ Auto-filled from your registered user account profile.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Payment Method Selection (Mobile App Card Tiles) */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-violet-50 border border-violet-200/60 text-violet-600 flex items-center justify-center">
                    <QrCode size={14} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xs sm:text-sm leading-none">Select Payment Method</h3>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">Official verified Nepal gateways</span>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Instant Verification
                </span>
              </div>

              {availableMethods.length === 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <p className="font-bold text-amber-800">Online payment methods are currently being updated.</p>
                  <p className="text-amber-700 text-[11px]">
                    Please contact our 24/7 WhatsApp support for instant manual order processing and QR transfer.
                  </p>
                  <a
                    href={`https://wa.me/9779768914027?text=${encodeURIComponent(
                      `Hello Unx Games, I want to order ${product.name} (${selectedPkg.name}) for NPR ${finalPayablePrice}. Player ID: ${checkoutData.gameUserId}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-2xs"
                  >
                    <MessageCircle size={14} />
                    <span>Order via WhatsApp Direct</span>
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableMethods.map((m, mIdx) => {
                    const isSelected = selectedMethod === m.id;
                    const isWallet = m.id === 'wallet';
                    const isEsewaItem = m.id === 'esewa';
                    const isKhaltiItem = m.id === 'khalti';

                    return (
                      <button
                        key={`checkout-method-${m.id || mIdx}-${mIdx}`}
                        type="button"
                        onClick={() => setSelectedMethod(m.id)}
                        aria-pressed={isSelected}
                        className={`relative min-h-16 rounded-xl border-2 p-3 flex items-center gap-3 font-bold text-xs transition-all cursor-pointer text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                          isSelected
                            ? isEsewaItem
                              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                              : isKhaltiItem
                              ? 'border-purple-500 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                              : 'border-violet-500 bg-violet-50/70 text-violet-950 ring-2 ring-violet-500/20 shadow-xs'
                            : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {/* Gateway Icon Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                            isEsewaItem
                              ? 'bg-emerald-600 text-white'
                              : isKhaltiItem
                              ? 'bg-purple-600 text-white'
                              : 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white'
                          }`}
                        >
                          {isWallet ? <WalletIcon size={16} /> : m.icon}
                        </div>

                        {/* Title & Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate font-black text-xs">{m.name}</p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {m.badge && (
                              <span
                                className={`text-[9.5px] font-extrabold uppercase tracking-wide px-1.5 py-0.2 rounded ${
                                  isEsewaItem
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isKhaltiItem
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-violet-100 text-violet-800'
                                }`}
                              >
                                {m.badge}
                              </span>
                            )}
                            {isWallet && walletBalance !== null && (
                              <span className="text-[10px] font-bold text-slate-500">
                                (Bal: {formatNPR(walletBalance)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Checkmark indicator */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? isEsewaItem
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : isKhaltiItem
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'bg-violet-600 border-violet-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* In-flow Primary Action Button */}
            <div className="pt-1 pb-2">
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={availableMethods.length === 0 || isSubmitting}
                className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 disabled:opacity-50 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-1.5 justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>Proceed to Payment ({formatNPR(finalPayablePrice)})</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {selectedMethod === 'wallet' ? (
              /* Dedicated Gamer Wallet Checkout View */
              <div className="space-y-4">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/40 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                        Gamer Wallet
                      </span>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950">
                        Instant Delivery
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mt-2">{formatNPR(finalPayablePrice)}</h3>
                    <p className="text-violet-200 text-xs mt-0.5">Order Ref: {tempOrderId} &bull; 1-Click Instant Pay</p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="w-full space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Your Available Balance</span>
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {walletBalance !== null ? formatNPR(walletBalance) : (
                            <div className="h-4 w-16 bg-slate-200 animate-pulse rounded inline-block align-middle"></div>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Order Total</span>
                        <span className="font-mono font-black text-violet-700 text-sm">
                          {formatNPR(finalPayablePrice)}
                        </span>
                      </div>
                      {walletBalance !== null && (
                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                          <span className="text-slate-700 font-bold">Balance After Payment</span>
                          <span
                            className={`font-mono font-black text-sm ${
                              walletBalance >= finalPayablePrice ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatNPR(walletBalance - finalPayablePrice)}
                          </span>
                        </div>
                      )}
                    </div>

                    {walletBalance !== null && (
                      walletBalance >= finalPayablePrice ? (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2.5">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          <p className="leading-snug">
                            <strong>Sufficient funds available!</strong> Your order will be automatically verified and processed instantly upon clicking pay.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-600 shrink-0" />
                            <span className="font-bold">Insufficient balance for this order</span>
                          </div>
                          <p className="text-[11px] text-amber-800">
                            You need <strong>{formatNPR(finalPayablePrice - walletBalance)}</strong> more. Top up your wallet, or switch to eSewa/Khalti QR for instant checkout.
                          </p>
                          <div className="text-[10px] text-amber-700 bg-amber-100/60 p-2 rounded-xl border border-amber-200/60">
                            ℹ️ <strong>Note:</strong> Wallet load deposits require Admin approval (usually 5-15 mins) before appearing in your wallet balance.
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Customer Details Summary */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Ordering For:</span>
                    <span className="font-bold text-slate-900">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Mobile Contact:</span>
                    <span className="font-mono font-bold text-slate-900">{customerPhone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Location:</span>
                    <span className="font-medium text-slate-800">{getResolvedLocation()}</span>
                  </div>
                </div>

                {/* Wallet Actions */}
                {walletBalance !== null ? (
                  walletBalance >= finalPayablePrice ? (
                    <button
                      type="button"
                      onClick={submitWalletPayment}
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-black py-4 rounded-2xl shadow-lg shadow-violet-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>Confirm &amp; Pay {formatNPR(finalPayablePrice)} with Wallet</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsWalletModalOpen(true)}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                      >
                        <PlusCircle size={16} />
                        <span>Top-up Wallet Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMethod('esewa');
                        }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                      >
                        Or Switch to eSewa / Khalti QR
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-slate-100 text-slate-400 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm border border-slate-200"
                  >
                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                    <span>Checking Wallet Balance...</span>
                  </button>
                )}
              </div>
            ) : (
              <>
            {/* Advanced Mobile App QR Payment Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Sleek Gradient Header Banner */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-violet-600/20 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span>Payment Required</span>
                  </div>

                  {/* Order Ref with 1-Tap Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopy(tempOrderId, 'Order Reference')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-slate-300 text-[10px] font-mono font-bold cursor-pointer border border-white/10"
                    title="Click to copy Order ID"
                  >
                    <span>Ref: {tempOrderId}</span>
                    {copiedField === 'Order Reference' ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} className="text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="mt-3 relative z-10">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Exact Total Payable</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">{formatNPR(finalPayablePrice)}</span>
                  </div>
                </div>
              </div>

              {/* QR Code & Gateway Info Area */}
              <div className="p-4 sm:p-5 flex flex-col items-center">
                {/* Method Gateway Pill Selector / Badge */}
                <div className="w-full flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isEsewa ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-purple-500 shadow-sm shadow-purple-500/50'
                      }`}
                    />
                    <span className="uppercase font-black tracking-wide text-[11px]">
                      {isEsewa ? 'eSewa Direct QR' : 'Khalti Direct QR'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQrZoomed(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-600 hover:text-violet-700 active:scale-95 px-2.5 py-1 rounded-lg bg-violet-50/80 hover:bg-violet-100/80 transition-all cursor-pointer"
                  >
                    <ZoomIn size={13} />
                    <span>Fullscreen</span>
                  </button>
                </div>

                {/* Scannable QR Container */}
                {paymentQr ? (
                  <div
                    onClick={() => setIsQrZoomed(true)}
                    className="relative group p-3.5 bg-white rounded-2xl border-2 border-slate-200/90 shadow-md mb-3 cursor-pointer hover:border-violet-500 transition-all active:scale-[0.99] max-w-[220px] w-full aspect-square flex items-center justify-center"
                  >
                    <img src={paymentQr} alt="Payment QR Code" className="w-full h-full object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-slate-950/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-black gap-1 backdrop-blur-[1.5px]">
                      <ZoomIn size={22} />
                      <span className="text-[11px] tracking-wide">Tap to Enlarge</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl mb-3 flex flex-col items-center justify-center text-slate-400 w-full max-w-[220px]">
                    <QrCode size={40} className="mb-2 text-violet-400" />
                    <span className="text-xs font-bold text-slate-600">Scan &amp; Pay</span>
                  </div>
                )}

                {/* Clean Payment Credentials Native Card */}
                <div className="w-full bg-slate-50/90 rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5 text-xs mt-1">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-semibold text-[11px]">Account Name</span>
                    <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">{accountName}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
                    <span className="text-slate-500 font-semibold text-[11px]">
                      {isEsewa ? 'eSewa Number' : 'Khalti Number'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-slate-900 text-sm tracking-tight">{paymentNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentNumber, 'Account Number')}
                        className="px-2 py-1 bg-white rounded-lg shadow-2xs border border-slate-200 text-slate-700 hover:text-violet-600 active:scale-95 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                        title="Copy Number"
                      >
                        {copiedField === 'Account Number' ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-700 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
                    <span className="text-slate-500 font-semibold text-[11px]">Exact Amount</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-violet-700 text-sm">NPR {finalPayablePrice}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(finalPayablePrice.toString(), 'Amount')}
                        className="px-2 py-1 bg-white rounded-lg shadow-2xs border border-slate-200 text-slate-700 hover:text-violet-600 active:scale-95 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                        title="Copy Amount"
                      >
                        {copiedField === 'Amount' ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-700 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3-Step Native Payment Guide */}
                <div className="w-full mt-3 bg-gradient-to-r from-violet-50/80 via-indigo-50/60 to-purple-50/80 border border-violet-100 rounded-2xl p-3 space-y-2">
                  <span className="text-[11px] font-black text-slate-900 block flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-500" />
                    <span>Quick Steps to Complete:</span>
                  </span>
                  <div className="space-y-1.5 text-[11px] text-slate-700 font-medium">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-violet-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Scan QR code in {isEsewa ? 'eSewa' : 'Khalti'} or transfer to number above.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-violet-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Add Order Ref <strong className="font-mono text-slate-900">{tempOrderId}</strong> in Remarks.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-violet-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Copy the <strong>Ref ID / Transaction Code</strong> and enter it below.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Item & Customer Summary */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider">Item &amp; Target</span>
                <span className="font-bold text-violet-700 text-[11px]">{selectedPkg.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium text-[11px]">Player ID / Account:</span>
                <span className="font-mono font-black text-slate-900">{checkoutData.gameUserId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium text-[11px]">Ordering For:</span>
                <span className="font-bold text-slate-800">{customerName} ({customerPhone})</span>
              </div>
            </div>

            {/* Payment Verification Card - Ref ID Input */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="w-7 h-7 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-slate-900">Payment Verification</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Enter your Transfer Ref ID / Code</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase">
                  Instant Match
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                    <span>Transaction ID / Ref ID</span>
                    <span className="text-violet-600 font-black">*</span>
                  </label>
                  <span className="text-[10px] text-violet-700 font-bold">Required</span>
                </div>

                {/* High-Touch Mobile Input with Dedicated Paste Button */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder={isEsewa ? "E.G. 0005F9A OR 210984" : "E.G. KHLT-XXXX OR REF ID"}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-violet-600 focus:bg-white rounded-2xl pl-3.5 pr-20 py-3 text-sm font-mono font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden transition-all uppercase tracking-wider shadow-inner"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {transactionId ? (
                      <button
                        type="button"
                        onClick={() => setTransactionId('')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 cursor-pointer"
                        title="Clear input"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text && text.trim()) {
                              setTransactionId(text.trim().toUpperCase().replace(/\s+/g, ''));
                              showToast('success', SUCCESS_MESSAGES.PASTED.title, SUCCESS_MESSAGES.PASTED.message);
                            }
                          } catch {
                            showToast('info', 'Paste', 'Please tap the box to paste your Ref ID.');
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[11px] font-extrabold active:scale-95 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span>Paste</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Location Helper Guide */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Where to find your Ref ID:</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-slate-500 pl-4.5">
                    {isEsewa
                      ? "In eSewa: Open Statement / Transaction History → Tap this transfer → Copy 'Ref ID' / 'Transaction Code'."
                      : "In Khalti: Open Transactions → Tap this payment → Copy 'Transaction ID' / 'Ref ID'."}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile-First Sticky-Safe Submit CTA */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={submitPayment}
                disabled={isSubmitting || !transactionId.trim() || !isOrderingOpen}
                className={`w-full ${
                  !isOrderingOpen
                    ? 'bg-slate-400 cursor-not-allowed'
                    : transactionId.trim()
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 shadow-lg shadow-violet-600/30'
                    : 'bg-slate-300 text-slate-600 cursor-not-allowed'
                } text-white font-black py-3.5 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer border border-white/20`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : !isOrderingOpen ? (
                  <>
                    <AlertCircle size={17} />
                    <span>Store Offline</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    <span>
                      {transactionId.trim()
                        ? `Submit Order (Ref: ${transactionId.trim()})`
                        : 'Enter Ref ID to Submit Order'}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 text-center px-4">
                <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                <span>Verified by Unx Games &bull; Instant Processing</span>
              </div>
            </div>
            </>
            )}
          </motion.div>
        )}
      </div>

      {/* Fullscreen QR Zoom Modal */}
      <AnimatePresence>
        {isQrZoomed && (
          <ModalPortal isOpen={isQrZoomed} onClose={() => setIsQrZoomed(false)} zIndex={99999}>
            <div
              onClick={() => setIsQrZoomed(false)}
              className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative text-slate-900 cursor-default"
              >
                <button
                  type="button"
                  onClick={() => setIsQrZoomed(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider">
                    {isEsewa ? 'eSewa QR Code' : 'Khalti QR Code'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">Scan &amp; Pay {formatNPR(finalPayablePrice)}</h3>
                  <p className="text-xs text-slate-500 font-medium">Account: {accountName}</p>
                </div>

                <div className="p-4 bg-white border-2 border-slate-200/80 rounded-3xl shadow-inner flex items-center justify-center mx-auto max-w-[280px]">
                  <img src={paymentQr} alt="Payment QR Code Large" className="w-full h-auto object-contain rounded-2xl" />
                </div>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                  <span className="font-mono font-bold text-slate-700">{paymentNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentNumber, 'Account Number')}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer active:scale-95"
                  >
                    <Copy size={12} />
                    <span>Copy ID</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Wallet Modal for In-Checkout Top-up */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onBalanceUpdated={(b) => setWalletBalance(b)}
      />
    </div>
  );
};
export default CheckoutPage;
