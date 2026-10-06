import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { ReviewModal } from '../components/reviews/ReviewModal';
import { MaintenanceModal } from '../components/common/MaintenanceModal';
import { AppBackButton } from '../components/common/AppBackButton';
import { formatNPR, formatTimeAgo } from '../utils/formatters';
import { handleImageError, getSafeGameImage } from '../utils/imageFallback';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  User,
  ShoppingBag,
  Star,
  MessageSquarePlus,
  Quote,
  Flame,
  ThumbsUp,
  ReceiptText,
  Mail,
  Ticket,
  Gamepad2,
  Copy,
  Check,
  ClipboardPaste,
  Globe,
  Info,
  ChevronDown,
  Layers,
  Crown,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProductDetailsPage: React.FC = () => {
  const {
    products,
    selectedProductId,
    setSelectedProductId,
    setCurrentTab,
    goBack,
    showToast,
    reviews,
    getUserOrders,
    openReviews,
    appSettings,
  } = useStore();
  const { currentUser, isAdmin } = useAuth();

  const isOrderingOpen = appSettings.orderingEnabled !== false && (appSettings as any).ordering_enabled !== false;

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  // Active packages filter (excludes legacy/inactive records from User App)
  const activePackages = React.useMemo(() => (product?.packages || []).filter((p) => p.active !== false), [product?.packages]);

  // Selected package state
  const [selectedPkgId, setSelectedPkgId] = useState<string>(() => {
    const popular = product?.packages?.find((p) => p.popular && p.active !== false);
    return popular ? popular.id : (product?.packages?.find((p) => p.active !== false)?.id || product?.packages?.[0]?.id || 'pkg-1');
  });

  // Keep package selection in sync when product or its package list changes
  React.useEffect(() => {
    if (activePackages.length > 0) {
      const exists = activePackages.some((p) => p.id === selectedPkgId);
      if (!exists) {
        const popular = activePackages.find((p) => p.popular) || activePackages[0];
        if (popular) setSelectedPkgId(popular.id);
      }
    }
  }, [product?.id, activePackages, selectedPkgId]);

  // Track recently visited products
  React.useEffect(() => {
    if (product && product.id) {
      try {
        const stored = localStorage.getItem('ghn_recently_visited');
        let list: string[] = stored ? JSON.parse(stored) : [];
        list = Array.from(new Set([product.id, ...list]));
        if (list.length > 10) {
          list = list.slice(0, 10);
        }
        localStorage.setItem('ghn_recently_visited', JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to save recently visited product', e);
      }
    }
  }, [product?.id]);

  // Helper to determine game key
  const getProductGameKey = (prod: any) => {
    const name = (prod?.gameName || prod?.category || prod?.name || '').toLowerCase();
    if (name.includes('free fire') || name.includes('freefire')) return 'free_fire';
    if (name.includes('pubg')) return 'pubg_mobile';
    if (name.includes('mobile legend') || name.includes('mlbb')) return 'mlbb';
    return 'general';
  };

  // Get UID from game_uids using direct key or aliases
  const getGameUidFromUser = (user: any, key: string) => {
    if (!user) return '';
    const uids = user.game_uids || {};
    
    if (key === 'free_fire') {
      return uids.free_fire || user.gamer_id || '';
    }
    
    if (key === 'pubg_mobile') {
      return uids.pubg_mobile || uids.pubg || '';
    }
    
    if (key === 'mlbb') {
      return uids.mlbb || uids.mobile_legends || '';
    }
    
    if (key === 'general') {
      return uids.general || uids.other || '';
    }
    
    return '';
  };

  const gameKey = product ? getProductGameKey(product) : 'general';
  const defaultGameUid = getGameUidFromUser(currentUser, gameKey);

  // User input fields
  const [gameUserId, setGameUserId] = useState<string>(() => defaultGameUid);
  const [zoneId, setZoneId] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string>(() => {
    return product?.requiredFields?.serverOptions?.[0] || '';
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showIdHelper, setShowIdHelper] = useState(false);

  // Sync gameUserId with currentUser's per-game UIDs when currentUser or product loads
  React.useEffect(() => {
    if (currentUser && product) {
      const k = getProductGameKey(product);
      const u = getGameUidFromUser(currentUser, k);
      if (u) {
        setGameUserId(u);
      }
    }
  }, [currentUser, product]);

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false);

  // Reset page-level modals and transient helper states on unmount
  React.useEffect(() => {
    return () => {
      setIsReviewModalOpen(false);
      setIsMaintenanceModalOpen(false);
      setShowIdHelper(false);
      setValidationError(null);
    };
  }, []);

  if (!product) {
    return (
      <div className="min-h-[80vh] flex flex-col bg-transparent">
        <div className="p-8 text-center bg-white border border-[#E5E4EE] rounded-2xl m-4 space-y-3 shadow-xs">
          <p className="text-[#5B5870] text-xs font-normal">Product not found.</p>
          <button
            onClick={() => setCurrentTab('shop')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  // Filter reviews matching this specific product or game (exclude hidden unless user's own)
  const productReviews = reviews.filter((r) => {
    if (r.status === 'hidden' && r.userId !== currentUser?.uid) return false;
    if (r.productId && r.productId === product.id) return true;
    const rName = (r.productName || '').toLowerCase();
    const pName = (product?.name || '').toLowerCase();
    const gName = (product?.gameName || '').toLowerCase();
    return (
      (pName && rName.includes(pName)) ||
      (rName && pName.includes(rName)) ||
      (gName && rName.includes(gName)) ||
      (gName && rName && gName.includes(rName))
    );
  });

  const totalProductReviews = productReviews.length;
  const productAvgRating =
    totalProductReviews > 0
      ? (productReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalProductReviews).toFixed(1)
      : '5.0';

  // Check if current user has placed and completed an order for this product
  const userOrders = currentUser ? getUserOrders(currentUser.uid, currentUser.email) : [];
  const completedOrderForThisProduct = userOrders.find((o) => {
    const oPName = (o.productName || '').toLowerCase();
    const pName = (product?.name || '').toLowerCase();
    const matchesId = Boolean(product?.id && o.productId === product.id);
    const matchesName = Boolean(pName && oPName && (oPName.includes(pName) || pName.includes(oPName)));
    const isDone = o.orderStatus === 'completed' || o.orderStatus === 'delivered' || o.status === 'completed' || o.status === 'delivered';
    return (matchesId || matchesName) && isDone;
  });
  const userExistingReview = currentUser
    ? productReviews.find((r) => r.userId === currentUser.uid)
    : null;

  const selectedPkg =
    activePackages.find((p) => p.id === selectedPkgId) || activePackages[0] || product.packages?.[0] || {
      id: 'pkg-1',
      name: 'Standard Package',
      price: product.price || 0,
    };

  const isCodeDelivery = 
    String(product?.category || '').toLowerCase().includes('voucher') ||
    String(product?.category || '').toLowerCase().includes('gift') ||
    String(product?.category || '').toLowerCase().includes('subscription') ||
    String(product?.categoryId || '').toLowerCase().includes('voucher') ||
    String(product?.categoryId || '').toLowerCase().includes('gift') ||
    String(product?.categoryId || '').toLowerCase().includes('subscription') ||
    String(product?.name || '').toLowerCase().includes('card') ||
    String(product?.name || '').toLowerCase().includes('code') ||
    String(product?.name || '').toLowerCase().includes('gift') ||
    String(product?.name || '').toLowerCase().includes('google play') ||
    String(product?.name || '').toLowerCase().includes('itunes') ||
    String(product?.name || '').toLowerCase().includes('apple') ||
    String(product?.name || '').toLowerCase().includes('steam') ||
    String(product?.name || '').toLowerCase().includes('xbox') ||
    String(product?.name || '').toLowerCase().includes('pass') ||
    (product?.requiredFields?.idFieldLabel || '').toLowerCase().includes('email') ||
    (product?.requiredFields?.idFieldLabel || '').toLowerCase().includes('phone') ||
    (product?.requiredFields?.idFieldLabel || '').toLowerCase().includes('contact');

  const requiredFields = React.useMemo(() => {
    const rf = product?.requiredFields;
    if (isCodeDelivery) {
      const isDefaultUidLabel = !rf?.idFieldLabel || rf.idFieldLabel.toLowerCase().includes('player id') || rf.idFieldLabel.toLowerCase().includes('uid');
      return {
        idFieldLabel: isDefaultUidLabel ? 'Delivery Email / Mobile Phone' : rf.idFieldLabel,
        idPlaceholder: isDefaultUidLabel ? 'e.g. yourname@gmail.com or 98XXXXXXXX' : (rf?.idPlaceholder || 'Enter delivery email or phone number'),
        idHelpText: rf?.idHelpText || 'Digital voucher code will be sent directly to your Email & WhatsApp/SMS.',
        requiresServer: false,
        requiresZoneId: false,
      };
    }
    return rf || {
      idFieldLabel: 'Player ID / UID',
      idPlaceholder: 'Enter numeric Player ID / Character UID',
      idHelpText: 'Find your User ID or Character ID in game settings.',
      requiresServer: false,
      requiresZoneId: false,
    };
  }, [product, isCodeDelivery]);

  const totalPrice = (selectedPkg?.price || product.price || 0) * quantity;

  // Format package title, subtag, and icons for 3-column portrait cards
  const formatPackageDisplay = (pkg: { name: string; amountValue?: string }) => {
    const rawName = (pkg.name || '').trim();
    const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    let mainTitle = rawName;
    let subTag = (pkg.amountValue || '').trim();

    if (parenMatch) {
      const partBefore = parenMatch[1].trim();
      const parenContent = parenMatch[2].trim();

      // Check if parenContent is a total unit like "(355 UC)" or "(330 💠)" and partBefore is "325 UC + 25 Bonus"
      if (/^\d+\s*[\w💎💠R$]+$/i.test(parenContent) && (partBefore.includes('+') || partBefore.toLowerCase().includes('bonus'))) {
        mainTitle = parenContent;
        subTag = partBefore;
      } else {
        mainTitle = partBefore;
        // If parenContent is a bonus calculation like "500 + 110 Bonus" or "78+8", preserve complete breakdown
        if (/^\d+\s*\+\s*\d+$/i.test(parenContent)) {
          subTag = `${parenContent.replace(/\s+/g, ' ').replace('+', ' + ')} Bonus`;
        } else {
          subTag = parenContent;
        }
      }
    }

    const lower = rawName.toLowerCase();
    const isPass = lower.includes('pass') || lower.includes('member') || lower.includes('vip') || lower.includes('card');
    const isVoucher = lower.includes('voucher') || lower.includes('gift') || lower.includes('code');
    const isSpecial = lower.includes('special') || lower.includes('starter') || lower.includes('event') || lower.includes('airdrop');

    if (subTag && (subTag.toLowerCase() === mainTitle.toLowerCase() || mainTitle.toLowerCase().includes(subTag.toLowerCase()))) {
      if (!pkg.amountValue || pkg.amountValue === mainTitle) {
        subTag = '';
      }
    }

    // Ensure all packages have a balanced, high-contrast badge without awkward empty gaps
    if (!subTag) {
      if (isVoucher) {
        subTag = 'Digital Code';
      } else if (isPass) {
        subTag = 'Official Pass';
      } else if (isSpecial) {
        subTag = 'Special Pack';
      } else {
        subTag = 'Direct Top-up';
      }
    }

    return { mainTitle, subTag, isPass, isVoucher, isSpecial };
  };

  // Handle paste from clipboard
  const handlePasteUID = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setGameUserId(text.trim());
          if (validationError) setValidationError(null);
          showToast('success', 'Pasted', 'Player ID pasted from clipboard');
        }
      }
    } catch {
      showToast('info', 'Clipboard', 'Please paste your ID manually.');
    }
  };

  const handleProceedToCheckout = () => {
    // Offline Ordering Guard
    if (!isOrderingOpen) {
      showToast('error', 'Orders Offline', 'Unx Games is currently not accepting new orders.');
      return;
    }

    // Maintenance Mode Guard
    if (appSettings.maintenanceMode && !isAdmin) {
      setIsMaintenanceModalOpen(true);
      return;
    }

    const fieldLabel = requiredFields.idFieldLabel || 'Player ID';
    if (!gameUserId.trim()) {
      setValidationError(`Please enter your ${fieldLabel}.`);
      showToast('error', 'Missing Information', `Please provide your ${fieldLabel}.`);
      return;
    }

    if (requiredFields.requiresZoneId && !zoneId.trim()) {
      setValidationError('Please enter your Zone ID.');
      showToast('error', 'Missing Zone ID', 'Zone ID is required.');
      return;
    }

    if (requiredFields.requiresServer && !selectedServer) {
      setValidationError('Please select your server / region.');
      showToast('error', 'Missing Server', 'Please pick a server.');
      return;
    }

    setValidationError(null);

    // Save temporary checkout session
    sessionStorage.setItem(
      'ghn_pending_checkout',
      JSON.stringify({
        productId: product.id,
        packageId: selectedPkg?.id || 'pkg-1',
        gameUserId: gameUserId.trim(),
        zoneId: zoneId.trim() || undefined,
        server: selectedServer || undefined,
        quantity,
      })
    );

    setCurrentTab('checkout');
  };

  return (
    <div className="flex flex-col bg-transparent w-full">
      <div className="space-y-2 px-2 sm:px-2 max-w-7xl mx-auto w-full pt-1 sm:pt-1.5 pb-1">
        
        {/* ========================================================================= */}
        {/* PRODUCT HERO CARD (NATIVE MOBILE APP APP-STORE BANNER)                    */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-5 shadow-xs overflow-hidden relative">
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* Product Game Icon with Glow & Level Frame */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-gradient-to-b from-[#1C1736] via-[#15122B] to-[#0E0C1C] border border-violet-200/80 shrink-0 relative shadow-md flex items-center justify-center group">
              <img
                src={getSafeGameImage(product)}
                alt={product.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                onError={(e) => handleImageError(e, product.name)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
            </div>

            {/* Product Metadata */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Gamepad2 size={11} />
                  <span>{product.gameName || 'Instant Top-Up'}</span>
                </span>
                {product.inStock === false && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-xl font-black text-slate-900 truncate leading-tight tracking-tight">
                {product.name}
              </h1>

              {/* Badges Summary */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-800 shadow-2xs">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span>{productAvgRating}</span>
                  <span className="text-amber-600 font-medium">({totalProductReviews})</span>
                </div>

                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Zap size={11} className="text-emerald-600 fill-emerald-600" />
                  <span>5-15 Min Auto Credit</span>
                </span>

                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  {isCodeDelivery ? <Mail size={11} /> : <ShieldCheck size={11} />}
                  <span>{isCodeDelivery ? 'Digital Voucher' : 'Direct In-Game UID'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: ENTER DELIVERY INFORMATION (MOBILE APP ADVANCED UI/UX)            */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Step Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                1
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  {isCodeDelivery ? 'Enter Delivery Information' : 'Enter Player Information'}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  {isCodeDelivery ? 'Instant delivery to your email or receipt' : 'Direct top-up into your game account'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowIdHelper(!showIdHelper)}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50/80 hover:bg-violet-100/80 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle size={13} />
              <span className="hidden sm:inline">How to find UID?</span>
              <span className="sm:hidden">Guide</span>
            </button>
          </div>

          {/* How to find ID Drawer Guide */}
          <AnimatePresence>
            {showIdHelper && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-violet-50/80 border border-violet-200/90 rounded-2xl p-3.5 space-y-2 text-xs text-violet-950 overflow-hidden"
              >
                <div className="flex items-center justify-between font-black text-[11px] uppercase tracking-wider text-red-900">
                  <span className="flex items-center gap-1.5">
                    <Info size={14} className="text-red-600" />
                    How to find your {requiredFields.idFieldLabel || 'Game UID'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIdHelper(false)}
                    className="text-red-500 hover:text-red-800 font-bold"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[11px] text-red-900/90 leading-relaxed font-medium">
                  1. Open <strong className="text-red-950 font-bold">{product.gameName || 'the game'}</strong> on your phone.<br />
                  2. Tap on your profile avatar at the top-left.<br />
                  3. Tap the copy icon next to your numerical <strong>{requiredFields.idFieldLabel || 'User ID'}</strong> and paste it below.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Offline / Maintenance Guards */}
          {!isOrderingOpen && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-1 shadow-2xs">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide text-rose-800">
                <ShieldCheck size={14} />
                <span>Orders Offline</span>
              </div>
              <p className="text-[11px] leading-relaxed font-medium text-rose-700">
                Store is temporarily closed for maintenance. Please check back shortly.
              </p>
            </div>
          )}

          {appSettings.maintenanceMode && !isAdmin && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-1 shadow-2xs">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide text-amber-800">
                <span>🚧 Service Under Maintenance</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-amber-700">
                Top-up service is temporarily unavailable. We're performing routine system maintenance.
              </p>
            </div>
          )}

          {/* Input Fields Section */}
          <div className="space-y-3.5">
            {/* Primary UID / Player ID Field with Mobile App Input styling */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  {isCodeDelivery ? <Mail size={14} className="text-violet-600" /> : <Gamepad2 size={14} className="text-violet-600" />}
                  <span>{requiredFields.idFieldLabel}</span>
                  <span className="text-[10px] text-rose-500 font-bold">*</span>
                </label>

                {currentUser && gameUserId && gameUserId === getGameUidFromUser(currentUser, gameKey) ? (
                  <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    <span>Auto-Linked UID</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isCodeDelivery ? 'Digital Voucher Delivery' : 'Numeric in-game ID'}
                  </span>
                )}
              </div>

              {/* Custom Input Box with Paste Button */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={gameUserId}
                  onChange={(e) => {
                    setGameUserId(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={requiredFields.idPlaceholder || 'Enter numeric Player ID / Character UID'}
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-violet-600 focus:bg-white rounded-2xl pl-4 pr-20 py-3 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:ring-3 focus:ring-violet-500/15 transition-all shadow-2xs font-mono"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {gameUserId ? (
                    <button
                      type="button"
                      onClick={() => setGameUserId('')}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                      title="Clear input"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePasteUID}
                      className="px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 border border-violet-200/80 cursor-pointer shadow-2xs"
                      title="Paste from clipboard"
                    >
                      <ClipboardPaste size={12} />
                      <span>Paste</span>
                    </button>
                  )}
                </div>
              </div>

              {requiredFields.idHelpText && (
                <p className="text-[10.5px] text-slate-500 font-medium pl-1">
                  {requiredFields.idHelpText}
                </p>
              )}
            </div>

            {/* Optional Zone ID / Server Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {requiredFields.requiresZoneId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-violet-600" />
                      <span>{requiredFields.zoneIdLabel || 'Zone ID / Server ID'}</span>
                    </span>
                    <span className="text-[10px] text-rose-500 font-bold">* Required</span>
                  </label>
                  <input
                    type="text"
                    value={zoneId}
                    onChange={(e) => {
                      setZoneId(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={requiredFields.zoneIdPlaceholder || 'e.g. 2048'}
                    className="w-full bg-slate-50/80 border border-slate-200 focus:border-violet-600 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-violet-500/15 transition-all shadow-2xs font-mono"
                  />
                </div>
              )}

              {/* Server / Region Dropdown */}
              {requiredFields.requiresServer &&
                requiredFields.serverOptions &&
                requiredFields.serverOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Globe size={13} className="text-violet-600" />
                      <span>{requiredFields.serverFieldLabel || 'Server / Region'}</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedServer}
                        onChange={(e) => setSelectedServer(e.target.value)}
                        className="w-full appearance-none bg-slate-50/80 border border-slate-200 focus:border-violet-600 focus:bg-white rounded-2xl pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-violet-500/15 transition-all shadow-2xs"
                      >
                        {requiredFields.serverOptions.map((opt, optIdx) => (
                          <option key={`server-opt-${opt}-${optIdx}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
            </div>

            {/* Validation Error Banner with Shake Animation */}
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 font-bold shadow-2xs"
              >
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </motion.div>
            )}

            {/* Quantity Stepper (Mobile App Native Stepper) */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-800 block leading-tight">Order Quantity</span>
                <span className="text-[10px] text-slate-500 font-medium">Multiplier for selected package</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 border border-slate-200/80 rounded-2xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-xl bg-white text-slate-800 font-black text-sm shadow-2xs hover:bg-slate-50 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-all"
                  >
                    -
                  </button>
                  <span className="text-xs sm:text-sm font-mono font-black text-slate-900 min-w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(20, quantity + 1))}
                    className="w-8 h-8 rounded-xl bg-white text-slate-800 font-black text-sm shadow-2xs hover:bg-slate-50 active:scale-90 flex items-center justify-center cursor-pointer transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 2: SELECT TOP-UP PACKAGE (MOBILE APP GAMING GRID)                    */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Step Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                2
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  Select Top-Up Package
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  {activePackages.length} Packages Available with Instant Delivery
                </p>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200/80 px-2 py-0.5 rounded-full">
              Nepal Instant Rate
            </span>
          </div>

          {/* High-End Mobile App Package Grid: 3 Compact Cards Per Row */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5 pt-1">
            {(activePackages || []).map((pkg, pkgIdx) => {
              const isSelected = pkg.id === selectedPkgId;
              const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.price;
              const discountPercent = hasDiscount
                ? Math.round(((pkg.originalPrice! - pkg.price) / pkg.originalPrice!) * 100)
                : 0;

              const { mainTitle, subTag } = formatPackageDisplay(pkg);

              return (
                <button
                  type="button"
                  key={`pkg-${pkg.id || pkgIdx}-${pkgIdx}`}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-xl sm:rounded-2xl border text-center transition-all relative flex flex-col justify-between items-center cursor-pointer group select-none active:scale-[0.96] min-h-[84px] sm:min-h-[94px] ${
                    isSelected
                      ? 'border-violet-600 bg-gradient-to-b from-violet-50/90 via-indigo-50/30 to-white shadow-xs ring-2 ring-violet-600/30'
                      : 'border-slate-200/90 bg-white hover:border-violet-300 hover:bg-slate-50/60 shadow-2xs'
                  }`}
                >
                  {/* Selected Active Check Bubble */}
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs ring-2 ring-white z-10">
                      <Check size={10} className="stroke-[3]" />
                    </span>
                  )}

                  {/* Hot / Popular Badge */}
                  {pkg.popular ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[7.5px] sm:text-[8.5px] uppercase tracking-wider shadow-xs flex items-center gap-0.5 z-10 whitespace-nowrap">
                      <Flame size={7.5} className="fill-white" />
                      <span>Hot</span>
                    </span>
                  ) : hasDiscount && discountPercent >= 12 ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-black text-[7.5px] sm:text-[8.5px] uppercase tracking-wider shadow-xs z-10 whitespace-nowrap">
                      {discountPercent}% OFF
                    </span>
                  ) : null}

                  {/* Top & Center: Main Title + SubTag */}
                  <div className="w-full flex flex-col items-center justify-center space-y-0.5 flex-1">
                    {/* Clean Parsed Main Title */}
                    <div className="w-full text-center px-0.5">
                      <p className="text-xs sm:text-[13px] font-black text-slate-900 leading-tight group-hover:text-violet-600 transition-colors line-clamp-2">
                        {mainTitle}
                      </p>
                    </div>

                    {/* Subtitle / Bonus / Amount Tag */}
                    {subTag && (
                      <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full border max-w-full truncate block leading-tight ${
                        subTag.toLowerCase().includes('bonus') || subTag.includes('+')
                          ? isSelected
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                            : 'bg-amber-50/90 text-amber-800 border-amber-200 font-bold'
                          : subTag.toLowerCase().includes('pass') || subTag.toLowerCase().includes('elite')
                            ? isSelected
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            : subTag.toLowerCase().includes('mega') || subTag.toLowerCase().includes('special')
                              ? isSelected
                                ? 'bg-orange-100 text-orange-800 border-orange-300 font-black'
                                : 'bg-orange-50 text-orange-700 border-orange-200 font-bold'
                              : isSelected
                                ? 'bg-violet-100/90 text-violet-700 border-violet-200 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200/80 font-medium'
                      }`}>
                        {subTag}
                      </span>
                    )}
                  </div>

                  {/* Bottom Section: Dedicated Price Card Footer */}
                  <div className="w-full pt-1 mt-1 border-t border-slate-100/90 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs sm:text-[13px] font-mono font-black text-slate-900 leading-none">
                      {formatNPR(pkg.price)}
                    </span>
                    {hasDiscount && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8.5px] sm:text-[9px] text-slate-400 line-through font-mono leading-none">
                          {formatNPR(pkg.originalPrice)}
                        </span>
                        {discountPercent > 0 && !pkg.popular && (
                          <span className="text-[7.5px] sm:text-[8px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded leading-none">
                            -{discountPercent}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Summary Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 font-medium truncate">
                Selected: <strong className="text-slate-900 font-black">{selectedPkg?.name}</strong>
              </span>
            </div>
            <span className="font-mono font-black text-violet-700 text-xs shrink-0">
              {formatNPR(selectedPkg?.price)} × {quantity}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUSTOMER REVIEWS DIRECT SCROLL SECTION                                    */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-2 sm:p-2 shadow-xs space-y-1.5">
          {/* Header Row: Title and Rating Summary */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span>Customer Reviews</span>
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-black text-slate-900 font-mono">{productAvgRating}</span>
                <span className="text-[11px] text-slate-400 font-medium">·</span>
                <span className="text-[11px] text-slate-500 font-bold">{totalProductReviews} Verified Gamer Reviews</span>
              </div>
            </div>

            {completedOrderForThisProduct && (
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
              >
                <Star size={12} className="fill-white" />
                <span>{userExistingReview ? 'Edit Review' : 'Write Review'}</span>
              </button>
            )}
          </div>

          {/* Complete Reviews List */}
          <div className="space-y-1.5">
            {productReviews.length === 0 ? (
              <div className="py-3 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-2 space-y-1">
                <Star size={18} className="mx-auto text-slate-300" />
                <h4 className="text-xs font-bold text-slate-700">No reviews yet for {product.name}</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Be the first verified gamer to rate after your top-up is completed!
                </p>
              </div>
            ) : (
              productReviews.slice(0, 5).map((rev, revIdx) => (
                <div
                  key={`prod-rev-${rev.id || revIdx}-${revIdx}`}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-2 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-black text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {rev.userPhoto ? (
                          <img
                            src={rev.userPhoto}
                            alt={rev.userName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          rev.userName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                          {rev.userName}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <ShieldCheck size={10} className="shrink-0" />
                          <span>Verified Purchase</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={`prod-detail-rev-star-${rev.id || revIdx}-${s}`}
                          size={10}
                          className={
                            s <= (rev.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-200 text-slate-200'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {rev.packageName && (
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      Package: <strong className="text-slate-700">{rev.packageName}</strong>
                    </div>
                  )}

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-200/60 font-mono">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-600" />
                      Delivered
                    </span>
                    <span>{formatTimeAgo(rev.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE BOTTOM CHECKOUT ACTION DOCK                                          */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-2 mt-1 sm:mt-1 mb-1.5">
        <div className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 sm:p-4 rounded-3xl shadow-sm">
          <div className="min-w-0 pl-1.5">
            <span className="text-[10px] text-slate-500 block font-black uppercase tracking-wider leading-none">
              Total ({quantity} {quantity === 1 ? 'item' : 'items'})
            </span>
            <span className="text-base sm:text-xl font-mono font-black text-violet-700 truncate block leading-tight mt-0.5">
              {formatNPR(totalPrice)}
            </span>
          </div>

          <button
            type="button"
            id="proceed-to-checkout-btn"
            onClick={handleProceedToCheckout}
            disabled={product.inStock === false || !isOrderingOpen}
            className={`flex-1 max-w-[260px] sm:max-w-md h-12 sm:h-13 px-4 sm:px-6 rounded-2xl ${
              product.inStock === false
                ? 'bg-slate-400 cursor-not-allowed'
                : !isOrderingOpen
                ? 'bg-rose-600 cursor-not-allowed text-white'
                : appSettings.maintenanceMode && !isAdmin
                ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.98] cursor-pointer'
                : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 active:scale-[0.98] cursor-pointer'
            } text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-600/25 transition-all whitespace-nowrap`}
          >
            {appSettings.maintenanceMode && !isAdmin ? (
              <>
                <AlertCircle size={18} className="shrink-0 text-amber-200 animate-pulse" />
                <span className="truncate">Service Maintenance</span>
              </>
            ) : !isOrderingOpen ? (
              <>
                <AlertCircle size={18} className="shrink-0 text-rose-200 animate-pulse" />
                <span className="truncate">Store Offline</span>
              </>
            ) : (
              <>
                <ShoppingBag size={18} className="shrink-0" />
                <span className="truncate">
                  {product.inStock === false ? 'Out of Stock' : 'Proceed to Checkout'}
                </span>
                <ArrowRight size={17} className="stroke-[2.5] shrink-0" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Review Modal for This Product */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        orderId={completedOrderForThisProduct?.id}
        productId={product.id}
        defaultProductName={product.name}
        defaultPackageName={selectedPkg?.name}
        defaultProductImage={product.image}
      />

      {/* Maintenance Mode Notice Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
      />
    </div>
  );
};

export default ProductDetailsPage;
