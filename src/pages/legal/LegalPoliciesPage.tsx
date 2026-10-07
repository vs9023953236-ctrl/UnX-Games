import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import { COMPANY_CONFIG } from '../../components/common/CompanyDetails';
import {
  Truck,
  RotateCcw,
  CreditCard,
  FileText,
  Lock,
  Search,
  CheckCircle2,
  ShieldCheck,
  Zap,
  MessageCircle,
  Share2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  QrCode,
  Smartphone,
  Info,
  Check,
  Copy,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatNPR } from '../../utils/formatters';

export type PolicyCategory = 'all' | 'kyc' | 'delivery' | 'refund' | 'payment' | 'terms' | 'privacy' | 'security';

interface PolicyTab {
  id: PolicyCategory;
  label: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
}

const POLICY_TABS: PolicyTab[] = [
  { id: 'all', label: 'All Policies', icon: Layers, color: 'text-indigo-600' },
  { id: 'kyc', label: 'KYC & AML', icon: ShieldCheck, color: 'text-emerald-600', badge: '🇳🇵 Legal' },
  { id: 'delivery', label: 'Delivery', icon: Truck, color: 'text-sky-600', badge: '5-15 Mins' },
  { id: 'refund', label: 'Refund', icon: RotateCcw, color: 'text-rose-600', badge: '100% Safe' },
  { id: 'payment', label: 'Payment', icon: CreditCard, color: 'text-sky-600', badge: 'eSewa & Khalti' },
  { id: 'terms', label: 'Terms', icon: FileText, color: 'text-indigo-600' },
  { id: 'privacy', label: 'Privacy', icon: Lock, color: 'text-emerald-600', badge: 'SSL Safe' },
  { id: 'security', label: 'Security', icon: ShieldCheck, color: 'text-amber-600' },
];

interface LegalPoliciesPageProps {
  initialSection?: string;
}

export const LegalPoliciesPage: React.FC<LegalPoliciesPageProps> = ({
  initialSection = 'all',
}) => {
  const { goBack, setCurrentTab, appSettings, paymentSettings, showToast } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory>(
    (initialSection as PolicyCategory) || 'all'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEsewa, setCopiedEsewa] = useState(false);
  const [copiedKhalti, setCopiedKhalti] = useState(false);

  // Accordion open states for Terms & Privacy
  const [openTerms, setOpenTerms] = useState<Record<string, boolean>>({
    term1: true,
    term2: false,
    term3: false,
    term4: false,
    term5: false,
    term6: false,
  });

  const [openPrivacy, setOpenPrivacy] = useState<Record<string, boolean>>({
    priv1: true,
    priv2: true,
    priv3: false,
    priv4: false,
    priv5: false,
  });

  const [dbPolicies, setDbPolicies] = useState<Record<string, { title: string; content: string; isPublished?: boolean }>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchDbPolicies = async () => {
      try {
        const res = await api.legal.getAll();
        if (res && res.success && res.pages && isMounted) {
          const map: Record<string, any> = {};
          for (const p of res.pages) {
            map[p.slug] = p;
          }
          setDbPolicies(map);
        }
      } catch (e) {
        console.warn('Could not sync dynamic legal policies:', e);
      }
    };
    fetchDbPolicies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Always reset scroll to top on section/category change
  useEffect(() => {
    if (initialSection && initialSection !== selectedCategory) {
      setSelectedCategory(initialSection as PolicyCategory);
    }
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, [initialSection]);

  const handleSelectTab = (category: PolicyCategory) => {
    setSelectedCategory(category);
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  };

  const supportPhone = appSettings?.whatsappNumber || appSettings?.supportPhone || COMPANY_CONFIG.phone || '9768914027';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const appName = appSettings?.appName || 'Unx Games';

  const handleCopyShare = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      showToast('success', 'Policy Link Copied', 'Store policies link copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('info', 'Unx Games', 'Viewing store policies and buyer protection.');
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello ${appName} Support, I have an inquiry regarding store policies (Delivery / Refund / Payment).`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleCopyText = (text: string, type: 'esewa' | 'khalti') => {
    navigator.clipboard.writeText(text);
    if (type === 'esewa') {
      setCopiedEsewa(true);
      setTimeout(() => setCopiedEsewa(false), 2000);
    } else {
      setCopiedKhalti(true);
      setTimeout(() => setCopiedKhalti(false), 2000);
    }
    showToast('success', 'Copied', `${text} copied to clipboard.`);
  };

  const toggleTerm = (key: string) => {
    setOpenTerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrivacy = (key: string) => {
    setOpenPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Search filtering logic
  const isSearchActive = searchQuery.trim().length > 0;
  const q = searchQuery.trim().toLowerCase();

  const filterMatches = (keywords: string) => {
    if (!isSearchActive) return true;
    return keywords.toLowerCase().includes(q);
  };

  const showDelivery = (selectedCategory === 'all' || selectedCategory === 'delivery') && filterMatches('delivery time instant uid diamonds uc robux voucher free fire pubg mlbb 5-15 mins operating hours');
  const showRefund = (selectedCategory === 'all' || selectedCategory === 'refund') && filterMatches('refund cancellation 100% money-back guarantee duplicate payment out-of-stock turnaround esewa khalti reverse wrong uid error');
  const showPayment = (selectedCategory === 'all' || selectedCategory === 'payment') && filterMatches('payment method esewa khalti qr code scan mpin otp reference transaction id manual verify');
  const showTerms = (selectedCategory === 'all' || selectedCategory === 'terms') && filterMatches('terms of service user agreement player uid accuracy age parental consent anti-fraud copyright rules account');
  const showPrivacy = (selectedCategory === 'all' || selectedCategory === 'privacy') && filterMatches('privacy policy player confidentiality data collection security ssl encryption mobile number no selling data delete');
  const showSecurity = (selectedCategory === 'all' || selectedCategory === 'security') && filterMatches('security 2fa two-factor authentication password encryption phishing safe payment safe store');
  const showKyc = (selectedCategory === 'all' || selectedCategory === 'kyc') && filterMatches('kyc identity verification citizenship national id nin smart driving license passport legal policy nepal aml fraud limits');

  return (
    <div className="w-full bg-transparent text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-2 pb-2 sm:pb-2 space-y-2 sm:space-y-2 flex-1">
        {/* ================= BUYER PROTECTION SUMMARY CARD ================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-3.5 sm:p-4 shadow-sm space-y-3 relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />

          {/* Header Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                <ShieldCheck size={20} className="stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  Buyer Protection &amp; Legal Policies
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Official terms, verification and delivery guarantees for {appName}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase shrink-0">
              Verified Store
            </span>
          </div>

          {/* Policy Category Filter Bar (Clean Grid Layout Without Slider) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 pb-0.5">
            {POLICY_TABS.map((tab, tIdx) => {
              const Icon = tab.icon;
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={`policy-tab-${tab.id || tIdx}-${tIdx}`}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs border text-center ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-600/20 ring-2 ring-indigo-200/60'
                      : 'bg-slate-50 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-white' : tab.color} />
                  <span className="truncate text-[11px] font-black">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 3. SEARCH BAR ================= */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search within policies (e.g. refund, delivery time, eSewa QR, UID, KYC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-white border border-slate-200/90 focus:border-indigo-600 focus:bg-white rounded-2xl pl-10 pr-9 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* ================= 4. MAIN POLICY SECTIONS (ALL TOGETHER) ================= */}
        <div className="space-y-3.5">
          {/* ======================= SECTION 1: DELIVERY POLICY ======================= */}
          {showDelivery && (
            <motion.section
              id="policy_delivery"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 scroll-mt-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Truck size={17} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      1. Delivery Policy
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Direct Player UID Deposit &amp; Digital Voucher Fulfillment
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full shrink-0">
                  ⚡ 5–15 Mins
                </span>
              </div>

              {/* Body */}
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                {/* Method Pill */}
                <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-start gap-2.5 text-sky-950">
                  <Zap size={16} className="text-sky-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-extrabold text-sky-900 block mb-0.5">Instant Electronic Top-Up System</strong>
                    All items on {appName} are delivered 100% digitally. Direct in-game items (Free Fire Diamonds, PUBG Mobile UC, MLBB Diamonds, Roblox Robux) are credited directly to your Player UID. Digital vouchers and gift codes appear instantly in your Order Details screen upon completion.
                  </div>
                </div>

                {/* Schedules */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Expected Delivery Time &amp; Operating Hours
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block flex items-center gap-1">
                        <Clock size={12} className="text-indigo-600" />
                        <span>Operating Hours</span>
                      </strong>
                      <span>7:00 AM – 11:30 PM Nepal Time (NPT), 7 days a week including holidays.</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block flex items-center gap-1">
                        <Zap size={12} className="text-amber-500" />
                        <span>Standard Speed</span>
                      </strong>
                      <span>5 to 15 minutes after payment verification is confirmed by our team.</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block">🌙 Off-Hours Queue</strong>
                      <span>Orders placed after 11:30 PM are safely queued and processed first at 7:00 AM.</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block">🎮 Delayed Order Handling</strong>
                      <span>During game updates or server rush peaks, deliveries may take 20–30 mins.</span>
                    </div>
                  </div>
                </div>

                {/* Incorrect UID Notice */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-amber-950 text-[11px] space-y-1">
                  <strong className="font-bold flex items-center gap-1 text-amber-900">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span>Player UID Accuracy Responsibility:</span>
                  </strong>
                  <p className="leading-relaxed text-amber-900">
                    Please double-check your Player UID, Zone ID, and Server before placing an order. Once credits are deposited by the publisher server, they cannot be reversed or transferred to another account.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* ======================= SECTION 2: REFUND POLICY ======================= */}
          {showRefund && (
            <motion.section
              id="policy_refund"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 scroll-mt-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <RotateCcw size={17} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      2. Refund &amp; Cancellation Policy
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      100% Money-Back Guarantee for Unfulfilled Orders
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full shrink-0">
                  🛡️ 100% Refund
                </span>
              </div>

              {/* Body */}
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                {/* 100% Safe Card */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-start gap-2.5 text-emerald-950">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-extrabold text-emerald-900 block mb-0.5">100% Full Money-Back Guarantee</strong>
                    If {appName} fails to deliver your top-up due to game publisher server maintenance, out-of-stock keys, or internal errors within 24 hours, you receive a 100% full refund directly to your eSewa or Khalti wallet.
                  </div>
                </div>

                {/* Eligibility List */}
                <div className="space-y-1.5 text-[11px]">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Eligible Situations for 100% Full Refund:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block">🔄 Duplicate Payment</strong>
                      <span>Accidentally sent payment twice for a single order. Extra amount refunded instantly.</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block">❌ Store Out of Stock</strong>
                      <span>If package is unexpectedly unavailable, full refund is credited immediately.</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block">⏱️ Publisher API Delay &gt; 24h</strong>
                      <span>If game publisher server downtime delays order beyond 24 hours without fulfillment.</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <strong className="text-slate-900 font-bold block">⚙️ Staff Error</strong>
                      <span>If staff delivered incorrect package despite accurate user UID input.</span>
                    </div>
                  </div>
                </div>

                {/* Non-Refundable Situations */}
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-950 text-[11px] space-y-1">
                  <strong className="font-bold flex items-center gap-1 text-rose-800">
                    <AlertCircle size={14} className="text-rose-600" />
                    <span>Non-Refundable Situations:</span>
                  </strong>
                  <p className="leading-relaxed text-rose-900">
                    • <strong>Wrong Player UID provided by user:</strong> If diamonds or UC are deposited into an incorrect UID entered during checkout, the transaction cannot be refunded.
                    <br />
                    • <strong>Completed &amp; Delivered Orders:</strong> Digital items already delivered to your game account are non-returnable.
                  </p>
                </div>

                {/* Refund Processing Time */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-slate-900 font-bold block">Refund Processing Turnaround:</strong>
                    <span className="text-slate-500">Approved refunds reach your eSewa/Khalti wallet within 15–60 minutes.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('contact')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    Request Refund
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* ======================= SECTION 3: PAYMENT POLICY ======================= */}
          {showPayment && (
            <motion.section
              id="policy_payment"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 scroll-mt-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <CreditCard size={17} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      3. Payment Policy
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Official Nepal Digital Wallets &amp; QR Details (Live Admin Synced)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full shrink-0">
                  💳 eSewa &amp; Khalti
                </span>
              </div>

              {/* Body */}
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                {/* 2 Payment Cards with Real Admin Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  {/* eSewa */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-emerald-900 font-black text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>eSewa Digital Wallet</span>
                      </strong>
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                        0% Fee
                      </span>
                    </div>

                    <div className="space-y-1 bg-white/90 p-2.5 rounded-xl border border-emerald-100/80">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Merchant Name:</span>
                        <span className="font-bold text-slate-900">
                          {paymentSettings?.esewaName || 'Unx Games'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">eSewa ID / Number:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(paymentSettings?.esewaId || '9768914027', 'esewa')}
                          className="font-mono font-bold text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>{paymentSettings?.esewaId || '9768914027'}</span>
                          {copiedEsewa ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight">
                      {paymentSettings?.esewaInstructions || 'Scan eSewa QR code during checkout or transfer directly to the merchant number.'}
                    </p>
                  </div>

                  {/* Khalti */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-sky-900 font-black text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span>Khalti Digital Wallet</span>
                      </strong>
                      <span className="text-[9px] font-black bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full">
                        Instant
                      </span>
                    </div>

                    <div className="space-y-1 bg-white/90 p-2.5 rounded-xl border border-sky-100/80">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Merchant Name:</span>
                        <span className="font-bold text-slate-900">
                          {paymentSettings?.khaltiName || 'Unx Games'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Khalti ID / Number:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(paymentSettings?.khaltiId || '9768914027', 'khalti')}
                          className="font-mono font-bold text-sky-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>{paymentSettings?.khaltiId || '9768914027'}</span>
                          {copiedKhalti ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight">
                      {paymentSettings?.khaltiInstructions || 'Scan Khalti QR code during checkout or transfer to our verified wallet.'}
                    </p>
                  </div>
                </div>

                {/* 5 Clear Payment Steps */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-[11px]">
                  <strong className="text-slate-900 font-bold block text-xs">
                    5-Step Easy Payment Process:
                  </strong>
                  <ol className="space-y-1.5 text-slate-700 list-decimal pl-4 leading-relaxed">
                    <li><strong>Pay exact order total:</strong> Make sure the transfer amount matches your package NPR price exactly.</li>
                    <li><strong>Use official store payment details:</strong> Scan the official store QR or use the verified eSewa / Khalti number above.</li>
                    <li><strong>Enter Transaction / Reference ID:</strong> Copy the Transaction ID from your payment slip and paste it in checkout.</li>
                    <li><strong>Upload payment screenshot:</strong> Attach screenshot of the transaction slip for fast automated matching.</li>
                    <li><strong>Wait 5–15 mins for verification:</strong> Our verification system will process and deliver your items.</li>
                  </ol>
                </div>

                {/* Security Warning */}
                <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-950 text-[11px] space-y-1">
                  <strong className="font-bold text-amber-900 flex items-center gap-1">
                    <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                    <span>Crucial Payment Security Warning</span>
                  </strong>
                  <p className="leading-relaxed text-amber-900">
                    <strong>NEVER share your eSewa / Khalti MPIN, OTP, or mobile banking passwords with anyone.</strong> Unx Games staff will NEVER call or message you asking for your passwords or PINs.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* ======================= SECTION 4: TERMS OF SERVICE ======================= */}
          {showTerms && (
            <motion.section
              id="policy_terms"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 scroll-mt-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText size={17} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      4. Terms of Service
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Store User Agreement &amp; Operating Guidelines
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full shrink-0">
                  📜 User Agreement
                </span>
              </div>

              {/* Accordion List */}
              <div className="space-y-2 text-xs">
                {/* 1. UID Accuracy */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => toggleTerm('term1')}
                    className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                  >
                    <span>1. Player UID Accuracy &amp; Order Responsibility</span>
                    {openTerms.term1 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </button>
                  {openTerms.term1 && (
                    <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      Customers bear full responsibility for ensuring the Player UID, Zone ID, and Server entered at checkout are correct. Once delivered to the provided UID, items cannot be retrieved or transferred.
                    </div>
                  )}
                </div>

                {/* 2. Age & Authority */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => toggleTerm('term2')}
                    className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                  >
                    <span>2. User Age &amp; Payment Authority</span>
                    {openTerms.term2 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </button>
                  {openTerms.term2 && (
                    <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      You must be at least 13 years old or have parent/guardian consent to use digital payment methods (eSewa, Khalti) on this platform.
                    </div>
                  )}
                </div>

                {/* 3. Anti-Fraud */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => toggleTerm('term3')}
                    className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                  >
                    <span>3. Payment Rules &amp; Anti-Fraud Enforcement</span>
                    {openTerms.term3 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </button>
                  {openTerms.term3 && (
                    <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      Any user submitting forged payment slips, edited screenshots, or fake transaction IDs will face immediate account ban and blacklisting across digital gaming networks.
                    </div>
                  )}
                </div>

                {/* 4. Digital Product Delivery */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => toggleTerm('term4')}
                    className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                  >
                    <span>4. Digital Goods &amp; Publisher Intellectual Property</span>
                    {openTerms.term4 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </button>
                  {openTerms.term4 && (
                    <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      All game titles, character names, and publisher trademarks (Free Fire, PUBG Mobile, MLBB, Roblox) belong to their respective copyright holders. We are an authorized digital distributor.
                    </div>
                  )}
                </div>

                {/* 5. Support Rules */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => toggleTerm('term5')}
                    className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                  >
                    <span>5. Customer Support &amp; Communication Rules</span>
                    {openTerms.term5 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </button>
                  {openTerms.term5 && (
                    <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      We treat all customers with respect and expect the same. Harassment or abusive behavior toward support agents on WhatsApp or ticket chat will result in immediate service termination.
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* ======================= SECTION 5: PRIVACY POLICY ======================= */}
          {showPrivacy && (
            <motion.section
              id="policy_privacy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 scroll-mt-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Lock size={17} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      5. Privacy Policy
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Player Confidentiality &amp; 256-Bit SSL Data Protection
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                  🔒 100% Private
                </span>
              </div>

              {/* Body */}
              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-[11px] text-emerald-950 space-y-1">
                  <strong className="text-emerald-900 font-extrabold block text-xs">
                    Our Privacy Commitment to Gamers:
                  </strong>
                  <p>
                    Your personal information, player IDs, and order history are securely stored in encrypted cloud databases and will <strong>NEVER</strong> be sold, shared, or rented to third parties.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Information Collected */}
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => togglePrivacy('priv1')}
                      className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                    >
                      <span>1. Information We Collect &amp; Why</span>
                      {openPrivacy.priv1 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>
                    {openPrivacy.priv1 && (
                      <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                        We collect Name, Email, 10-Digit Mobile Number, District, and Player UID strictly necessary to process your game top-ups and send order status notifications.
                      </div>
                    )}
                  </div>

                  {/* What We Never Collect */}
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => togglePrivacy('priv2')}
                      className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                    >
                      <span>2. What We NEVER Collect</span>
                      {openPrivacy.priv2 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>
                    {openPrivacy.priv2 && (
                      <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                        We NEVER collect or store your banking MPINs, OTP codes, ATM passwords, or private game account passwords.
                      </div>
                    )}
                  </div>

                  {/* Data Retention & Account Deletion */}
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => togglePrivacy('priv3')}
                      className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs"
                    >
                      <span>3. Data Retention &amp; Account Deletion</span>
                      {openPrivacy.priv3 ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>
                    {openPrivacy.priv3 && (
                      <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                        You have full control over your account. You can request data export or permanent account deletion anytime via support tickets.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ======================= SECTION 6: SECURITY POLICY ======================= */}
          {showSecurity && (
            <motion.section
              id="policy_security"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5 scroll-mt-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      6. Account Security &amp; Protection
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Multi-Layer Platform Security &amp; 2FA Protection
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full shrink-0">
                  🛡️ Secure
                </span>
              </div>

              {/* Body */}
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <strong className="text-slate-900 font-bold block flex items-center gap-1">
                      <Lock size={12} className="text-indigo-600" />
                      <span>2-Step Verification (2FA)</span>
                    </strong>
                    <span>Enable two-factor authentication in Settings for enhanced gamer account security.</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <strong className="text-slate-900 font-bold block flex items-center gap-1">
                      <ShieldAlert size={12} className="text-rose-600" />
                      <span>Phishing Protection</span>
                    </strong>
                    <span>Always verify that you are accessing the official Unx Games application.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-950 flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-indigo-900 font-bold block">Manage Security &amp; Password</strong>
                    <span className="text-indigo-700/80">Update password, recovery codes, or enable 2FA anytime.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('settings')}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shrink-0 shadow-xs"
                  >
                    Open Settings
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* ======================= SECTION 7: KYC & AML LEGAL POLICY ======================= */}
          {showKyc && (
            <motion.section
              id="policy_kyc"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-emerald-200/90 p-4 sm:p-5 shadow-sm space-y-4 scroll-mt-20 relative overflow-hidden"
            >
              {/* Emerald top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-100">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-black text-slate-900">
                        7. KYC &amp; Anti-Fraud Legal Policy
                      </h2>
                      <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                        ग्राहक पहिचान नीति
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Official Nepal Identity Verification, AML &amp; CFT Compliance Guidelines
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                  🇳🇵 Legal NRB &amp; AML
                </span>
              </div>

              {/* Body */}
              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <p className="text-slate-700 font-medium leading-relaxed">
                  In compliance with <strong>Nepal Rastra Bank (NRB)</strong> Digital Payment Directives, the <strong>Electronic Transactions Act, 2063</strong>, and the <strong>Department of Money Laundering Investigation (DMLI)</strong> rules, <strong>{appName}</strong> enforces structured customer identity verification (KYC) to prevent unauthorized payment gateway access, stolen digital wallet fraud, and unauthorized gaming currency laundering.
                </p>

                {/* 4 Accepted Document Types */}
                <div className="space-y-1.5">
                  <strong className="text-slate-900 font-bold block text-[11px] uppercase tracking-wider">
                    Accepted Official Government Documents (मान्य कानुनी कागजातहरू):
                  </strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-sm">🇳🇵</span>
                        <span>Nepali Citizenship (नागरिकता प्रमाणपत्र)</span>
                      </div>
                      <span className="text-slate-500 text-[10px] block leading-snug">
                        Official registration number and issuing District Administration Office (DAO).
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-sm">🪪</span>
                        <span>National Identity Card (NIN / राष्ट्रिय परिचयपत्र)</span>
                      </div>
                      <span className="text-slate-500 text-[10px] block leading-snug">
                        Valid 10-digit National Identity Number issued by the Government of Nepal.
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-sm">🚗</span>
                        <span>Smart Driving License (सवारी चालक अनुमतिपत्र)</span>
                      </div>
                      <span className="text-slate-500 text-[10px] block leading-snug">
                        DOTM Smart driving card number and issuance category.
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-sm">✈️</span>
                        <span>Machine-Readable Passport (राहदानी)</span>
                      </div>
                      <span className="text-slate-500 text-[10px] block leading-snug">
                        Valid e-Passport number issued by the Department of Passports, Nepal.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Strict Ban Callout */}
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex items-start gap-2.5">
                  <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="text-rose-950 font-bold block">Strict Prohibition of In-Game UIDs &amp; Student IDs:</strong>
                    Do NOT enter in-game Player IDs (e.g. Free Fire UID, PUBG UID) or school/college IDs as verification credentials. KYC strictly mandates official Nepal Government issued identity cards. Submitting invalid in-game numbers results in immediate rejection.
                  </div>
                </div>

                {/* Account Limits & Privileges Table */}
                <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2 text-[11px]">
                  <strong className="text-indigo-950 font-bold block">
                    Account Tiering &amp; Transaction Allowances:
                  </strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-0.5">
                      <div className="font-black text-slate-800 text-[10px] uppercase tracking-wider text-slate-400">Unverified Gamer</div>
                      <div className="font-bold text-slate-900">Standard Limit (Up to NPR 5,000 / day)</div>
                      <div className="text-[10px] text-slate-500">Standard manual queue review for high value items.</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 space-y-0.5">
                      <div className="font-black text-emerald-600 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Verified Gamer Pass</span>
                      </div>
                      <div className="font-black text-emerald-800">Unlimited Limit (NPR 100,000+ / day)</div>
                      <div className="text-[10px] text-slate-500">Instant automated voucher release &amp; VIP priority dispute shield.</div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Encryption */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock size={12} className="text-emerald-600" />
                    <span>Privacy &amp; 256-Bit Data Encryption (Individual Privacy Act, 2075)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    All document registration numbers and uploaded records are secured with 256-bit AES database encryption. We strictly enforce zero-resale of customer credentials. Records are exclusively reviewed by verified Unx Games compliance officers and are never disclosed to external advertising networks.
                  </p>
                </div>

                {/* Action Row: Open Verification Modal or Contact WhatsApp Compliance */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                  <div className="text-[11px] text-slate-500">
                    Average verification SLA: <strong>5 to 15 minutes</strong> during active support hours (7:00 AM – 11:30 PM NST).
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setCurrentTab('profile')}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck size={14} />
                      <span>Start KYC Verification</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageCircle size={14} />
                      <span>Ask Compliance Officer</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* No results message */}
          {isSearchActive && !showKyc && !showDelivery && !showRefund && !showPayment && !showTerms && !showPrivacy && !showSecurity && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2 shadow-sm">
              <AlertCircle size={28} className="text-slate-400 mx-auto" />
              <h3 className="text-xs font-bold text-slate-700">No matching policy found</h3>
              <p className="text-[11px] text-slate-500">Try searching for 'refund', 'delivery', 'kyc', or 'eSewa'.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* ================= 6. SUPPORT & HELP SECTION ================= */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm space-y-3.5 text-center relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-2xs">
            <MessageCircle size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
              Need help with an order or policy?
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-sm mx-auto">
              Our customer care desk is active 7:00 AM – 11:30 PM (Nepal Time) for instant assistance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-auto h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <MessageCircle size={16} />
              <span>WhatsApp Live Help ({supportPhone})</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('contact')}
              className="w-full sm:w-auto h-11 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Open Support Ticket</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-medium pt-1">
            {appName} • Official Digital Gaming Top-Up Platform • Nepal
          </p>
        </div>
      </main>
    </div>
  );
};
export default LegalPoliciesPage;
