import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import { User } from '../../../types';
import { formatDate, formatTimeAgo } from '../../../utils/formatters';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Search,
  FileText,
  CreditCard,
  FileCheck,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Lock,
  Filter,
  Copy,
  Check,
  Eye,
  X,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Shield,
  MessageCircle,
  Scale,
  Sparkles,
  Building2,
  Crown,
  ArrowUpDown,
  Download,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const REJECTION_PRESETS = [
  'In-game Gamer ID or Player UID submitted. Official Nepal Government Document (Citizenship, NIN, Driver License, or Passport) is required.',
  'Document registration number is incomplete or could not be validated against government records.',
  'Full legal name on government document does not match the customer account holder name.',
  'Issuing District Administration Office (DAO) or document details are missing.',
  'Document photo or registration details are illegible, expired, or invalid. Please re-submit a clear document.',
];

const DOC_CHIPS = [
  { id: 'all', label: 'All Documents', icon: FileCheck },
  { id: 'citizenship', label: '🇳🇵 Citizenship', icon: FileText },
  { id: 'national', label: '🪪 NIN (10-Digit)', icon: CreditCard },
  { id: 'license', label: '🚗 Driving License', icon: CreditCard },
  { id: 'passport', label: '✈️ Passport', icon: FileCheck },
];

export const AdminKycTab: React.FC = () => {
  const { users, currentUser, adminVerifyUserAccount, refreshUsers } = useAuth();
  const { setAdminTab, setAdminSelectedUserId, showToast, setCurrentTab, appSettings } = useStore();

  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'ADMIN' || isSuperAdmin;
  const isStaffOnly = !isManager && uRole === 'SUPPORT_STAFF';

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'unverified'>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'pending_first' | 'newest' | 'name'>('pending_first');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectionModalUser, setRejectionModalUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [showPolicyDrawer, setShowPolicyDrawer] = useState<boolean>(false);

  // Sync users on load
  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUsers();
      showToast('info', 'Database Synced', 'Customer KYC records synchronized with PostgreSQL database.');
    } catch {
      showToast('error', 'Error', 'Failed to refresh customer records.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // KPI Counts
  const stats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.verification_status === 'pending').length;
    const verified = users.filter((u) => u.verification_status === 'verified' || u.account_verified).length;
    const rejected = users.filter((u) => u.verification_status === 'rejected').length;
    const unverified = users.filter(
      (u) => (!u.verification_status || u.verification_status === 'unverified') && !u.account_verified
    ).length;
    return { total, pending, verified, rejected, unverified };
  }, [users]);

  // Filtered & Sorted Users List
  const filteredUsers = useMemo(() => {
    const list = users.filter((u) => {
      // Determine effective verification status
      const effectiveStatus = u.verification_status || (u.account_verified ? 'verified' : 'unverified');

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified' && !u.account_verified && u.verification_status !== 'verified') {
          return false;
        }
        if (statusFilter === 'pending' && u.verification_status !== 'pending') {
          return false;
        }
        if (statusFilter === 'rejected' && u.verification_status !== 'rejected') {
          return false;
        }
        if (statusFilter === 'unverified' && (u.verification_status === 'verified' || u.account_verified || u.verification_status === 'pending' || u.verification_status === 'rejected')) {
          return false;
        }
      }

      // Doc Type Filter
      if (docTypeFilter !== 'all') {
        const uDoc = (u.verification_doc_type || '').toLowerCase();
        if (!uDoc.includes(docTypeFilter.toLowerCase())) {
          return false;
        }
      }

      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const phoneMatch = (u.phone || u.mobile || '').toLowerCase().includes(q);
        const docNumMatch = (u.verification_doc_number || '').toLowerCase().includes(q);
        const docTypeMatch = (u.verification_doc_type || '').toLowerCase().includes(q);
        const notesMatch = (u.verification_notes || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || docNumMatch || docTypeMatch || notesMatch;
      }

      return true;
    });

    // Sort list
    return list.sort((a, b) => {
      if (sortBy === 'pending_first') {
        const aPending = a.verification_status === 'pending' ? 1 : 0;
        const bPending = b.verification_status === 'pending' ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default / newest
      const dateA = new Date(a.verification_submitted_at || a.created_at || 0).getTime();
      const dateB = new Date(b.verification_submitted_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [users, statusFilter, docTypeFilter, searchTerm, sortBy]);

  // Handle Copy Document Number
  const handleCopyDoc = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDocId(id);
    showToast('info', 'Copied', 'Document number copied to clipboard.');
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  // WhatsApp 1-tap verification assistant
  const handleWhatsAppContact = (u: User) => {
    const rawPhone = (u.phone || u.mobile || '').replace(/[^0-9]/g, '');
    const targetPhone = rawPhone.startsWith('977') ? rawPhone : (rawPhone ? `977${rawPhone}` : '9779768914027');
    const status = u.verification_status || (u.account_verified ? 'verified' : 'unverified');
    const docType = u.verification_doc_type || 'Identity Document';

    let msg = `Hello ${u.name || 'Gamer'}, this is Unx Games Verification Desk regarding your KYC submission for ${docType}.`;
    if (status === 'pending') {
      msg = `Hello ${u.name || 'Gamer'}, this is Unx Games KYC Compliance Desk. We are currently reviewing your ${docType} (${u.verification_doc_number || ''}). We may require a quick confirmation to grant 100% Verified Pass.`;
    } else if (status === 'rejected') {
      msg = `Hello ${u.name || 'Gamer'}, your KYC submission for ${docType} was declined: "${u.verification_rejection_reason || 'Please submit a valid government document'}". Please re-submit via your profile.`;
    } else if (status === 'verified') {
      msg = `Hello ${u.name || 'Gamer'}, congratulations! Your Unx Games KYC Verification Pass is 100% APPROVED. You have unlimited daily top-up privileges.`;
    }

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Admin Actions (Manager / Store Owner only)
  const handleVerifyAction = async (targetUser: User, action: 'approve' | 'reject' | 'reset', reason?: string) => {
    if (!isManager) {
      showToast('error', 'Unauthorized', 'Manager or Store Owner role is required to modify KYC verification status.');
      return;
    }
    const uid = targetUser.id || targetUser.uid;
    if (processingUsers.has(uid)) return;

    setProcessingUsers(prev => new Set(prev).add(uid));
    try {
      const res = await adminVerifyUserAccount(uid, action, reason);

      if (res.success) {
        showToast(
          action === 'approve' ? 'success' : action === 'reject' ? 'warning' : 'info',
          action === 'approve' ? 'KYC Pass Approved' : action === 'reject' ? 'KYC Declined' : 'KYC Reset',
          res.message || `Customer KYC updated to ${action}.`
        );
        await refreshUsers();
        if (selectedUser?.uid === uid || selectedUser?.id === uid) {
          setSelectedUser((prev) => (prev ? { ...prev, ...(res.user || {}) } : null));
        }
        setRejectionModalUser(null);
        setRejectionReason('');
      } else {
        showToast('error', 'Action Failed', res.message || 'Could not update verification status.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to update KYC status.');
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  };

  const handleOpenUserDetail = (userId: string) => {
    setAdminSelectedUserId(userId);
    setAdminTab('user_detail');
  };

  const getDocIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('national') || t.includes('nin')) return <CreditCard size={15} className="text-indigo-600 shrink-0" />;
    if (t.includes('license')) return <CreditCard size={15} className="text-sky-600 shrink-0" />;
    if (t.includes('passport')) return <FileCheck size={15} className="text-purple-600 shrink-0" />;
    return <FileText size={15} className="text-emerald-600 shrink-0" />;
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5" id="admin-kyc-tab">
      {/* ======================================================== */}
      {/* 1. TOP ADVANCED HEADER BANNER (MOBILE APP FINTECH VIBE) */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-emerald-500/30 p-5 sm:p-7 text-white shadow-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheck size={28} className="stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  NEPAL GOV &amp; AML COMPLIANCE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Live PostgreSQL Sync
                </span>
                {stats.pending > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[10px] font-black animate-pulse flex items-center gap-1">
                    <Clock size={10} />
                    <span>{stats.pending} Needs Review</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                KYC &amp; Identity Verification Hub
              </h1>
              <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
                Verify official Nepal government documents (Citizenship, NIN 10-Digit, Smart Driver&apos;s License, Passport). Grant high-tier limits &amp; anti-fraud clearance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPolicyDrawer(true)}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Read official Nepal KYC & AML legal policy"
            >
              <Scale size={14} className="text-emerald-400" />
              <span>Legal Policy</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider border border-white/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95 shadow-sm"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff View Notice */}
      {isStaffOnly && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong className="font-black">Staff Read-Only View:</strong> You can inspect customer KYC details and document numbers. Approving or rejecting KYC requires Manager / Store Owner privileges.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] uppercase tracking-wider font-black shrink-0 border border-amber-300">
            Read-Only
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KPI OVERVIEW BENTO STRIP (TOUCH & MOBILE OPTIMIZED) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Total Customers */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-98 ${
            statusFilter === 'all'
              ? 'bg-indigo-50/90 border-indigo-300 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total Registered</span>
            <UserIcon size={14} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5 font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Platform accounts</div>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-98 relative overflow-hidden ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/90 hover:border-amber-300 shadow-xs'
          }`}
        >
          {stats.pending > 0 && (
            <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-full bg-amber-500" />
          )}
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>Pending Review</span>
            <Clock size={14} className={`text-amber-500 ${stats.pending > 0 ? 'animate-spin' : ''}`} />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1.5 flex items-center gap-2 font-mono">
            <span>{stats.pending}</span>
            {stats.pending > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500 text-white font-black animate-pulse">
                Needs Review
              </span>
            )}
          </div>
          <div className="text-[10px] text-amber-700/80 mt-0.5 font-medium">Awaiting decision</div>
        </div>

        {/* Verified Pass */}
        <div
          onClick={() => setStatusFilter('verified')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-98 ${
            statusFilter === 'verified'
              ? 'bg-emerald-50 border-emerald-300 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>100% Verified</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1.5 font-mono">{stats.verified}</div>
          <div className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">Full KYC Approved</div>
        </div>

        {/* Rejected */}
        <div
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-98 ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 border-rose-300 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/90 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Declined / Re-Kyc</span>
            <XCircle size={14} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1.5 font-mono">{stats.rejected}</div>
          <div className="text-[10px] text-rose-700/80 mt-0.5 font-medium">Requires accurate ID</div>
        </div>

        {/* Unverified */}
        <div
          onClick={() => setStatusFilter('unverified')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-98 col-span-2 sm:col-span-1 ${
            statusFilter === 'unverified'
              ? 'bg-slate-100 border-slate-400 shadow-md ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Unverified</span>
            <ShieldAlert size={14} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1.5 font-mono">{stats.unverified}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">No documents yet</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SEGMENTED FILTER BAR & DOCUMENT CHIPS */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, email, phone, document number, or district..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-bold text-slate-900 bg-slate-50/60 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent border-none outline-hidden text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="pending_first">Sort: Pending Review First</option>
                <option value="newest">Sort: Newest Submissions</option>
                <option value="name">Sort: Customer Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Touch-friendly Document Type Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">
            Document:
          </span>
          {DOC_CHIPS.map((chip) => {
            const active = docTypeFilter === chip.id;
            return (
              <button
                key={`chip-${chip.id}`}
                type="button"
                onClick={() => setDocTypeFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. CUSTOMER KYC DOSSIER LIST (MOBILE APP CARDS VIEW) */}
      {/* ======================================================== */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            🪪
          </div>
          <h3 className="text-sm font-black text-slate-900">No KYC records matching filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No verification records matching "${searchTerm}". Try searching a different document number or name.`
              : 'There are no customer verification records in this specific category.'}
          </p>
          {(searchTerm || statusFilter !== 'all' || docTypeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDocTypeFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredUsers.map((u, index) => {
            const userId = u.id || u.uid || `user-${index}`;
            const effectiveStatus = u.verification_status || (u.account_verified ? 'verified' : 'unverified');
            const docType = u.verification_doc_type || 'Unspecified';
            const docNumber = u.verification_doc_number || '-';
            const hasDocument = docNumber && docNumber !== '-';
            const isSelf = currentUser?.uid === userId;

            return (
              <div
                key={`kyc-card-${userId}-${index}`}
                className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden"
              >
                {/* Top Status Accent Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    effectiveStatus === 'verified'
                      ? 'bg-emerald-500'
                      : effectiveStatus === 'pending'
                      ? 'bg-amber-500 animate-pulse'
                      : effectiveStatus === 'rejected'
                      ? 'bg-rose-500'
                      : 'bg-slate-300'
                  }`}
                />

                {/* Card Header: User Avatar & Status Pill */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-2xl p-0.5 border flex items-center justify-center overflow-hidden font-black text-xs ${
                          effectiveStatus === 'verified'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : effectiveStatus === 'pending'
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : effectiveStatus === 'rejected'
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          (u.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      {effectiveStatus === 'verified' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-white">
                          <Check size={10} className="stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 text-xs sm:text-sm truncate">
                          {u.name || 'Customer'}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-black px-1.5 py-0.2 rounded-md">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{u.email}</p>
                      {(u.phone || u.mobile) && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.2">{u.phone || u.mobile}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 text-right">
                    {effectiveStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase shadow-2xs">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>Verified Pass</span>
                      </span>
                    )}
                    {effectiveStatus === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-black uppercase shadow-2xs animate-pulse">
                        <Clock size={11} className="text-amber-600" />
                        <span>Pending</span>
                      </span>
                    )}
                    {effectiveStatus === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase shadow-2xs">
                        <XCircle size={11} className="text-rose-600" />
                        <span>Declined</span>
                      </span>
                    )}
                    {effectiveStatus === 'unverified' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* Document Information Box */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      {getDocIcon(docType)}
                      <span className="truncate">{docType}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{userId.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-200/60">
                    <div className="font-mono text-xs font-black text-slate-900 truncate">
                      {docNumber}
                    </div>
                    {hasDocument && (
                      <button
                        type="button"
                        onClick={() => handleCopyDoc(docNumber, userId)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                        title="Copy Document Number"
                      >
                        {copiedDocId === userId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>

                  {/* Submission date or Rejection note */}
                  {u.verification_rejection_reason && (
                    <div className="text-[10px] text-rose-600 bg-rose-50/80 p-2 rounded-xl border border-rose-100 leading-snug font-medium">
                      <strong>Decline Reason:</strong> {u.verification_rejection_reason}
                    </div>
                  )}

                  {u.verification_submitted_at && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Submitted: {formatTimeAgo(u.verification_submitted_at)}</span>
                      {u.verification_verified_at && (
                        <span className="text-emerald-600 font-bold">Approved</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Row: 1-Tap Actions */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {/* View Dossier */}
                    <button
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Inspect Legal Dossier"
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>

                    {/* WhatsApp Customer */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppContact(u)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="WhatsApp Customer about Verification"
                    >
                      <MessageCircle size={13} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>

                  {/* Approve / Reject Controls for Managers */}
                  {isManager && (
                    <div className="flex items-center gap-1.5">
                      {effectiveStatus !== 'verified' && (
                        <button
                          type="button"
                          disabled={processingUsers.has(u.id || u.uid)}
                          onClick={() => handleVerifyAction(u, 'approve')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve 100% KYC Pass"
                        >
                          {processingUsers.has(u.id || u.uid) ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          <span>Approve</span>
                        </button>
                      )}

                      {effectiveStatus !== 'rejected' && (
                        <button
                          type="button"
                          disabled={processingUsers.has(u.id || u.uid)}
                          onClick={() => {
                            setRejectionModalUser(u);
                            setRejectionReason(REJECTION_PRESETS[0]);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Decline with reason"
                        >
                          <XCircle size={13} />
                          <span className="hidden sm:inline">Decline</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. FULL LEGAL DOSSIER INSPECTION MODAL (MOBILE-FIRST) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-900"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Customer KYC Legal Dossier
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ID #{selectedUser.id || selectedUser.uid} • Unx Games
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                {/* Holographic Verification Pass Preview */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-5 border border-emerald-500/40 shadow-lg">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🇳🇵</span>
                      <div>
                        <div className="text-[9px] font-black uppercase text-emerald-400">UNX GAMES NEPAL</div>
                        <div className="text-xs font-black text-white">Digital Identity Pass</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      {selectedUser.verification_status || (selectedUser.account_verified ? 'VERIFIED' : 'UNVERIFIED')}
                    </span>
                  </div>

                  <div className="py-3.5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-base font-black text-white shrink-0">
                      {selectedUser.photoURL ? (
                        <img src={selectedUser.photoURL} alt={selectedUser.name} className="w-full h-full object-cover" />
                      ) : (
                        (selectedUser.name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-sm text-white truncate">{selectedUser.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{selectedUser.email}</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                        {selectedUser.verification_doc_type || 'Government ID'}: {selectedUser.verification_doc_number || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statutory Checklist */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Scale size={14} className="text-indigo-600" />
                    <span>Statutory Compliance Checklist:</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Official Nepal Document Type: <strong>{selectedUser.verification_doc_type || 'Unspecified'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Document Registration Number: <strong className="font-mono">{selectedUser.verification_doc_number || 'Not Submitted'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Nepal Rastra Bank AML/CFT Anti-Fraud clearance eligible</span>
                    </div>
                  </div>
                </div>

                {/* Additional notes if rejected */}
                {selectedUser.verification_rejection_reason && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1">
                    <strong className="font-black block text-rose-900">Current Decline Reason:</strong>
                    <span>{selectedUser.verification_rejection_reason}</span>
                  </div>
                )}

                {/* Action Buttons in Modal */}
                {isManager && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={processingUsers.has(selectedUser.id || selectedUser.uid)}
                      onClick={() => handleVerifyAction(selectedUser, 'approve')}
                      className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingUsers.has(selectedUser.id || selectedUser.uid) ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>Approve KYC Pass</span>
                    </button>

                    <button
                      type="button"
                      disabled={processingUsers.has(selectedUser.id || selectedUser.uid)}
                      onClick={() => {
                        const u = selectedUser;
                        setSelectedUser(null);
                        setRejectionModalUser(u);
                        setRejectionReason(REJECTION_PRESETS[0]);
                      }}
                      className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle size={16} />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 6. REJECTION REASON PRESET MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {rejectionModalUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle size={18} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Decline KYC for {rejectionModalUser.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectionModalUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <label className="font-bold text-slate-700 block">
                  Select Presets or Custom Reason for Customer:
                </label>
                <div className="space-y-2">
                  {REJECTION_PRESETS.map((preset, idx) => (
                    <button
                      key={`preset-${idx}`}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-medium leading-relaxed transition-all cursor-pointer ${
                        rejectionReason === preset
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Custom decline note (displayed to gamer on their profile)..."
                  className="w-full p-3 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingUsers.has(rejectionModalUser.id || rejectionModalUser.uid) || !rejectionReason.trim()}
                  onClick={() => handleVerifyAction(rejectionModalUser, 'reject', rejectionReason)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  {processingUsers.has(rejectionModalUser.id || rejectionModalUser.uid) ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : null}
                  <span>Confirm Decline</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 7. SLIDE-OUT LEGAL KYC POLICY DRAWER FOR ADMINS */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showPolicyDrawer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-slate-900 text-white w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden border-l border-slate-800"
            >
              <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Scale size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Nepal KYC &amp; AML Policy</h3>
                    <p className="text-[10px] text-slate-400">Statutory Regulatory Directives</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPolicyDrawer(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>NRB &amp; DMLI Directives</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Unx Games mandates customer identification to eliminate money laundering via digital game currencies (Free Fire, PUBG, Steam). All transactions over NPR 5,000 require verified credentials.
                  </p>
                </div>

                <div className="space-y-2">
                  <strong className="text-white block text-xs uppercase tracking-wider">
                    Accepted Document Types:
                  </strong>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4">
                    <li><strong>Citizenship Certificate (नागरिकता):</strong> Issued by DAO with registration number.</li>
                    <li><strong>National ID (राष्ट्रिय परिचयपत्र / NIN):</strong> Valid 10-digit number.</li>
                    <li><strong>Smart Driving License:</strong> DOTM Smart card number.</li>
                    <li><strong>Passport (राहदानी):</strong> Machine-readable passport number.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] leading-relaxed">
                  <strong className="text-rose-300 block">Prohibition Rule:</strong>
                  In-game Gamer IDs, Free Fire UIDs, or Student IDs are strictly invalid and must be rejected immediately with Preset #1.
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPolicyDrawer(false);
                      setCurrentTab('kyc_policy');
                    }}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    <ExternalLink size={14} />
                    <span>Open Full Legal Policy Page</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminKycTab;
