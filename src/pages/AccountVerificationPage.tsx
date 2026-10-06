import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  FileCheck,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  Zap,
  Lock,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Crown,
  Award,
  Shield,
  Scale,
  RotateCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatVerifierName } from '../utils/formatters';

const DOCUMENT_TYPES = [
  {
    id: 'Citizenship',
    label: 'Citizenship Card (Nepal)',
    subLabel: 'नागरिकता प्रमाणपत्र',
    icon: FileText,
    badge: '🇳🇵 National',
    desc: 'Government issued citizenship document number',
    placeholder: 'e.g. 27-01-79-01234 or 12345/67',
  },
  {
    id: 'National ID',
    label: 'National Identity Card (NIN)',
    subLabel: 'राष्ट्रिय परिचयपत्र',
    icon: CreditCard,
    badge: '🪪 10-Digit NIN',
    desc: '10-digit National ID number issued by NID',
    placeholder: 'e.g. 10-digit National ID number',
  },
  {
    id: 'Driving License',
    label: 'Driving License (Nepal)',
    subLabel: 'सवारी चालक अनुमतिपत्र',
    icon: CreditCard,
    badge: '🚗 Smart Card',
    desc: 'Smart Driving License number from DOTM',
    placeholder: 'e.g. 01-06-00123456',
  },
  {
    id: 'Passport',
    label: 'Passport (Nepal / International)',
    subLabel: 'राहदानी',
    icon: FileCheck,
    badge: '✈️ Travel Doc',
    desc: 'Official government machine-readable passport number',
    placeholder: 'e.g. PA0123456 or PP number',
  },
];

export const AccountVerificationPage: React.FC = () => {
  const { currentUser, submitUserVerification, refreshUsers } = useAuth();
  const { showToast, appSettings, setCurrentTab } = useStore();

  const initialDocType =
    currentUser?.verification_doc_type && currentUser.verification_doc_type !== 'Gamer Identity'
      ? currentUser.verification_doc_type
      : 'Citizenship';

  const [docType, setDocType] = useState<string>(initialDocType);
  const [docNumber, setDocNumber] = useState<string>(currentUser?.verification_doc_number || '');
  const [notes, setNotes] = useState<string>(currentUser?.verification_notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDocDetails, setShowDocDetails] = useState<boolean>(false);
  const [isUpdatingDoc, setIsUpdatingDoc] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setIsSubmitting(false);
      setShowDocDetails(false);
      setIsUpdatingDoc(false);
    };
  }, []);

  if (!currentUser) return null;

  const currentStatus = currentUser.verification_status || (currentUser.account_verified ? 'verified' : 'unverified');
  const selectedDocConfig = DOCUMENT_TYPES.find((d) => d.id === docType) || DOCUMENT_TYPES[0];

  const maskDocNumber = (num?: string) => {
    if (!num) return 'NEP-KYC-VERIFIED';
    if (num.length <= 4) return num;
    const start = num.slice(0, 3);
    const end = num.slice(-3);
    return `${start}••••${end}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      showToast('error', 'Missing ID Number', 'Please enter your official legal document number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitUserVerification({
        docType,
        docNumber: docNumber.trim(),
        notes: notes.trim(),
      });

      if (res.success) {
        showToast('success', 'Verification Submitted', res.message || 'Legal verification request sent to admin team.');
        if (refreshUsers) refreshUsers();
        if (isMountedRef.current) setIsUpdatingDoc(false);
      } else {
        showToast('error', 'Submission Failed', res.message || 'Could not submit verification request.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to submit verification request.');
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const supportPhone = appSettings?.whatsappNumber || appSettings?.supportPhone || '9768914027';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const waUrgentUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello Unx Games Support, I have submitted my KYC verification for account (${currentUser.email}). Please expedite verification for instant top-up access.`
  )}`;

  return (
    <div className="w-full min-h-0 bg-transparent text-slate-900 flex flex-col antialiased">
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-6 pb-1 sm:pb-1.5 pt-1 sm:pt-1.5 space-y-3">
        {/* ======================================================== */}
        {/* 1. VERIFIED STATE: CLEAN LIGHT LUXURY DIGITAL PASS CARD */}
        {/* ======================================================== */}
        {currentStatus === 'verified' && !isUpdatingDoc && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Official Compliance Pass Light Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-red-50/40 to-orange-50/40 border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              {/* Decorative subtle gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-red-600" />

              {/* Card Top Row */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇳🇵</span>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 leading-none">
                      OFFICIAL COMPLIANCE PASS
                    </div>
                    <div className="text-xs font-black text-slate-900 mt-0.5 tracking-tight">
                      Unx Games Digital Identity
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-black shadow-2xs">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>100% VERIFIED</span>
                </div>
              </div>

              {/* Gamer Info Core */}
              <div className="py-3.5 flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-red-600 shadow-xs">
                    <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center border border-white">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-lg sm:text-xl font-black text-slate-800">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-xs text-white">
                    <CheckCircle2 size={12} className="stroke-[3]" />
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                      {currentUser.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 text-[10px] font-black uppercase">
                      VIP Gamer
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {currentUser.email}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5 text-xs text-emerald-800 font-mono font-bold">
                    <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
                    <span>
                      {currentUser.verification_doc_type || 'National ID'}: {maskDocNumber(currentUser.verification_doc_number)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security & Verification Metadata Footer */}
              <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500 font-medium flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Lock size={12} className="text-emerald-600" />
                  <span>256-Bit Encrypted Record</span>
                </div>

                <div className="text-slate-500 text-[11px]">
                  Verified by: <span className="text-emerald-700 font-bold">{formatVerifierName(currentUser.verified_by, currentUser.name)}</span>
                </div>
              </div>
            </div>

            {/* VIP Perks Unlocked Grid (4 Bento Cards) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Verified Perks &amp; Privileges Unlocked
                </span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>All Active</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-900">
                    <Zap size={14} className="text-amber-600 shrink-0 fill-amber-500" />
                    <span>Instant Delivery</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-tight">
                    Priority queue top-ups with zero manual verification delays.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-orange-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-orange-900">
                    <Crown size={14} className="text-orange-600 shrink-0" />
                    <span>Unlimited Limits</span>
                  </div>
                  <p className="text-[11px] text-orange-900/80 leading-tight">
                    Maximum daily order volume unlocked (up to NPR 100,000+).
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-red-50/80 border border-red-200/80 text-red-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-red-900">
                    <Shield size={14} className="text-red-600 shrink-0" />
                    <span>Fraud Protection</span>
                  </div>
                  <p className="text-[11px] text-red-900/80 leading-tight">
                    100% dispute &amp; payment guarantee with enterprise shield.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-emerald-900">
                    <Award size={14} className="text-emerald-600 shrink-0" />
                    <span>Verified Badge</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 leading-tight">
                    Official verified checkmark on profile &amp; verified reviews.
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible Registered Document Details */}
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setShowDocDetails(!showDocDetails)}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-red-600" />
                  <span>View Registered Document Details</span>
                </div>
                {showDocDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {showDocDetails && (
                <div className="p-3.5 pt-1 space-y-2 text-xs border-t border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Document Type</span>
                    <span className="font-bold text-slate-800">{currentUser.verification_doc_type || 'Nepali Citizenship'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Document ID</span>
                    <span className="font-mono font-bold text-slate-900">{maskDocNumber(currentUser.verification_doc_number)}</span>
                  </div>
                  {currentUser.verification_notes && (
                    <div className="py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium block">Issuing Notes</span>
                      <span className="text-slate-700 mt-0.5 block italic">{currentUser.verification_notes}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">Compliance Authority</span>
                    <span className="font-bold text-emerald-700">{formatVerifierName(currentUser.verified_by, currentUser.name)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions for Verified State */}
            <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => setIsUpdatingDoc(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
              >
                <RotateCw size={13} />
                <span>Update / Re-verify Documents</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('profile')}
                className="w-full sm:flex-1 py-2.5 sm:py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-700 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={15} className="text-white" />
                <span>Done</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* 2. PENDING REVIEW STATE */}
        {/* ======================================================== */}
        {currentStatus === 'pending' && !isUpdatingDoc && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 border border-amber-200/90 text-amber-950 space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock size={22} className="animate-pulse text-amber-700" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    In Review Queue
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-amber-950">
                    Verification Request Pending
                  </h3>
                </div>
              </div>

              <p className="text-xs text-amber-900/90 leading-relaxed">
                Your official document details have been securely transmitted to the Unx Games compliance team. Verification takes approximately <strong>5 to 15 minutes</strong> during active business hours.
              </p>

              <div className="p-3 rounded-xl bg-white/90 border border-amber-200/90 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-900 font-medium">Document:</span>
                  <span className="font-bold text-slate-800">{currentUser.verification_doc_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-900 font-medium">Number:</span>
                  <span className="font-mono font-bold text-slate-800">{maskDocNumber(currentUser.verification_doc_number)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <a
                href={waUrgentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span>Need Urgent Verification? WhatsApp Us</span>
                <ExternalLink size={13} />
              </a>

              <button
                type="button"
                onClick={() => setIsUpdatingDoc(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              >
                Edit Details
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* 3. REJECTED STATE */}
        {/* ======================================================== */}
        {currentStatus === 'rejected' && !isUpdatingDoc && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/90 border border-rose-200/90 text-rose-950 space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle size={22} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                    Action Required
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-rose-950">
                    Verification Unsuccessful
                  </h3>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium">
                {currentUser.rejection_reason ||
                  'The legal document number or type provided could not be matched against official records. Please submit a clear, valid government document.'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsUpdatingDoc(true)}
              className="w-full py-2.5 sm:py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCw size={15} />
              <span>Re-Submit Legal Documents</span>
            </button>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* 4. FORM: UNVERIFIED OR RE-SUBMITTING */}
        {/* ======================================================== */}
        {(currentStatus === 'unverified' || isUpdatingDoc) && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Government Documents Only Warning Banner */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-black text-amber-950 block sm:inline">
                  Official Government Documents Only:
                </span>{' '}
                Only valid legal documents (Citizenship, NIN, Driver's License, or Passport) are approved. In-game gamer UIDs or game profiles are strictly rejected.
              </div>
            </div>

            {/* Step 1: Select Legal ID Type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  <span>Select Legal Document Type</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">Required *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map((dt, dtIdx) => {
                  const Icon = dt.icon;
                  const isSelected = docType === dt.id;
                  return (
                    <div
                      key={`page-verify-dt-${dt.id || dtIdx}-${dtIdx}`}
                      onClick={() => setDocType(dt.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 relative ${
                        isSelected
                          ? 'bg-red-50/90 border-red-600 ring-2 ring-red-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                      }`}
                    >
                      <div
                        className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-black leading-tight ${isSelected ? 'text-red-950' : 'text-slate-800'}`}>
                            {dt.label}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-red-600 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                          {dt.subLabel}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {dt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Document Number Input */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  <span>Official Document Number</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-red-600">
                  {selectedDocConfig.badge}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={selectedDocConfig.placeholder}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs font-bold text-slate-900 bg-white placeholder:text-slate-400 placeholder:font-normal shadow-2xs transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium px-0.5">
                Enter the exact legal ID number printed on your physical card or government pass.
              </p>
            </div>

            {/* Step 3: Additional Notes / Issue Details */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider px-0.5">
                Additional Notes / Issuing District (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional: Issue district (e.g. Kathmandu, Morang), issue date, or notes for admin"
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs text-slate-800 bg-white placeholder:text-slate-400 shadow-2xs transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end gap-2">
              {isUpdatingDoc && (
                <button
                  type="button"
                  onClick={() => setIsUpdatingDoc(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !docNumber.trim()}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-xs hover:shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>{isUpdatingDoc ? 'Submit Update' : 'Submit for Verification'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Official Legal Policy Quick-Link */}
        <button
          type="button"
          onClick={() => setCurrentTab('kyc_policy')}
          className="w-full py-2.5 px-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 text-[11px] font-bold text-emerald-900 transition-all flex items-center justify-between cursor-pointer active:scale-98 group shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
              <Scale size={11} />
            </span>
            <span>Read Official Unx Games KYC, AML &amp; Identity Legal Policy</span>
          </span>
          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>View</span>
            <ChevronRight size={11} />
          </span>
        </button>

        {/* Enterprise Security Footer */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-2.5 text-[11px] text-slate-500 font-medium shadow-2xs">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>
            Unx Games protects your identity with 256-bit database encryption. Compliance verification ensures 100% fraud safety and instant automated delivery.
          </span>
        </div>
      </main>
    </div>
  );
};
export default AccountVerificationPage;
