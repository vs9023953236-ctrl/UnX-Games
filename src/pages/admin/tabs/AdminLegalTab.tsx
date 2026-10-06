import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import {
  Shield,
  FileText,
  Plus,
  RotateCcw,
  Edit3,
  Trash2,
  Save,
  Eye,
  Check,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Smartphone,
  Lock,
  Truck,
  CreditCard,
  Layers,
  X,
  RefreshCw,
  ExternalLink,
  Code,
  BookOpen,
} from 'lucide-react';

interface LegalPageItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished?: boolean;
  is_published?: boolean;
  version?: string;
  updated_at?: string;
  updatedAt?: string;
}

const POLICY_ICONS: Record<string, { icon: any; color: string; bg: string; badge: string }> = {
  terms: { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', badge: '📜 Agreement' },
  privacy: { icon: Lock, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', badge: '🔒 Privacy' },
  'refund-policy': { icon: RotateCcw, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', badge: '🔄 100% Refund' },
  'delivery-policy': { icon: Truck, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', badge: '⚡ 5-15 Mins' },
  'kyc-policy': { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', badge: '🇳🇵 KYC & AML' },
  'payment-policy': { icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', badge: '💳 eSewa/Khalti' },
  'security-policy': { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', badge: '🛡️ 256-Bit SSL' },
  'about-us': { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', badge: '🏢 About Unx' },
};

const DEFAULT_LEGAL_PAGES: LegalPageItem[] = [
  {
    id: 'lp_terms',
    title: 'Terms of Service',
    slug: 'terms',
    content: `# Terms of Service - Unx Games\n\n1. **Player UID Accuracy**: Customers bear full responsibility for correct Player UID.\n2. **Age & Payment Authority**: Must be 13+ or parental consent.\n3. **Anti-Fraud Enforcement**: Fake slips result in permanent ban.\n4. **Publisher Rights**: All trademarks belong to respective publishers.\n5. **Support Rules**: Professional customer support.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    content: `# Privacy Policy - Unx Games\n\n1. **Data We Collect**: Name, email, mobile number, UID.\n2. **Zero Password Sharing**: We never ask for MPIN/OTP.\n3. **256-Bit SSL**: All customer data encrypted.\n4. **Account Removal**: Email info@unxgames.np for deletion.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_refund',
    title: 'Refund & Cancellation Policy',
    slug: 'refund-policy',
    content: `# Refund & Cancellation Policy - Unx Games\n\n1. **100% Money-Back**: Full refund if order unfulfilled within 2 hours.\n2. **Duplicate Payment**: Instant refund of duplicate scan.\n3. **Wrong UID**: Orders sent to wrong user UID cannot be reversed.\n4. **Turnaround**: 5-30 minutes processing to eSewa/Khalti.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_delivery',
    title: 'Instant Delivery Guarantee',
    slug: 'delivery-policy',
    content: `# Instant Delivery Guarantee - Unx Games\n\n1. **5-15 Minute Delivery**: Over 98% completed instantly.\n2. **24/7 Automation**: Operating uninterrupted daily.\n3. **Live Status**: Real-time order tracking.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_kyc',
    title: 'KYC & Anti-Money Laundering (AML) Policy',
    slug: 'kyc-policy',
    content: `# KYC & AML Policy - Unx Games\n\n1. **Compliance**: High-volume transactions require one-time identity pass.\n2. **Fraud Prevention**: Protects gamer balances from theft.\n3. **Encrypted Storage**: Verification documents securely protected.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_payment',
    title: 'Payment Methods & Security Policy',
    slug: 'payment-policy',
    content: `# Payment Methods & Security - Unx Games\n\n1. **Channels**: eSewa QR, Khalti QR, Fonepay, Preloaded Wallet.\n2. **Remarks**: Put Order ID in transaction remarks.\n3. **Zero MPIN**: Staff never asks for your PIN/OTP.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_security',
    title: 'Account & Platform Security Policy',
    slug: 'security-policy',
    content: `# Account Security - Unx Games\n\n1. **2FA Protection**: Email OTP and Authenticator supported.\n2. **AI Sentinel**: Monitors suspicious logins and transactions.\n3. **TLS 1.3**: Military-grade database security.`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lp_about',
    title: 'About Unx Games',
    slug: 'about-us',
    content: `# About Unx Games\n\n**Unx Games** (intraX Pvt Ltd) is Nepal's premier verified digital gaming platform, registered in Deelasaini-6, Baitadi, Nepal.\n\n- **Phone**: 9768914027\n- **Email**: info@unxgames.np\n- **Hours**: 8:00 AM - 11:00 PM`,
    isPublished: true,
    version: '1.0',
    updatedAt: new Date().toISOString(),
  },
];

export const AdminLegalTab: React.FC = () => {
  const { showToast, appSettings } = useStore();
  const [pages, setPages] = useState<LegalPageItem[]>(DEFAULT_LEGAL_PAGES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'buyer-protection' | 'general'>('all');

  // Edit State
  const [selectedPage, setSelectedPage] = useState<LegalPageItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPublished, setEditPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete & Reset Modals
  const [pageToDelete, setPageToDelete] = useState<LegalPageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchPages = async () => {
    try {
      const res = await api.legal.getAll();
      if (res && res.success && Array.isArray(res.pages) && res.pages.length > 0) {
        const cleaned: LegalPageItem[] = res.pages.map((p: any) => {
          let pageTitle = p.title || '';
          if (p.slug === 'about-us' && (pageTitle.toLowerCase().includes('game hub') || pageTitle.toLowerCase().includes('gamehub'))) {
            pageTitle = 'About Unx Games';
          } else {
            pageTitle = pageTitle.replace(/game\s*hub\s*nepal/gi, 'Unx Games').replace(/game\s*hub/gi, 'Unx Games');
          }
          return {
            id: p.id || `lp_${p.slug}`,
            slug: p.slug,
            title: pageTitle,
            content: (p.content || '').replace(/game\s*hub\s*nepal/gi, 'Unx Games').replace(/game\s*hub/gi, 'Unx Games'),
            isPublished: p.isPublished ?? p.is_published ?? true,
            version: p.version || '1.0',
            updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
          };
        });

        const apiMap = new Map(cleaned.map((p) => [p.slug, p]));
        const merged: LegalPageItem[] = DEFAULT_LEGAL_PAGES.map((def) => {
          if (apiMap.has(def.slug)) {
            const fromApi = apiMap.get(def.slug)!;
            return {
              ...def,
              ...fromApi,
              title: fromApi.title || def.title,
              content: fromApi.content || def.content,
            };
          }
          return def;
        });

        for (const [slug, p] of apiMap.entries()) {
          if (!DEFAULT_LEGAL_PAGES.some((def) => def.slug === slug)) {
            merged.push(p);
          }
        }

        setPages(merged);
      }
    } catch (e) {
      console.warn('Using default legal pages fallback', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleEdit = (page: LegalPageItem) => {
    setSelectedPage(page);
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditPublished(page.isPublished !== false);
    setPreviewMode('editor');
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    if (!editTitle.trim()) {
      showToast('warning', 'Validation', 'Policy title cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.legal.updateBySlug(selectedPage.slug, {
        title: editTitle.trim(),
        content: editContent,
        is_published: editPublished,
      });

      if (res && res.success) {
        showToast('success', 'Database Synced', `${editTitle} updated and saved to PostgreSQL.`);
        setSelectedPage(null);
        fetchPages();
      } else {
        showToast('error', 'Update Failed', res.message || 'Failed to save policy.');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Error', e.message || 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSlug.trim()) {
      showToast('warning', 'Required Fields', 'Please enter both a title and unique slug.');
      return;
    }

    setCreating(true);
    try {
      const cleanSlug = newSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const res = await api.legal.create({
        title: newTitle.trim(),
        slug: cleanSlug,
        content: newContent.trim() || `# ${newTitle.trim()}\n\nOfficial policy details for Unx Games.`,
        is_published: true,
      });

      if (res && res.success) {
        showToast('success', 'Policy Created', `New policy "${newTitle}" created successfully.`);
        setShowCreateModal(false);
        setNewTitle('');
        setNewSlug('');
        setNewContent('');
        fetchPages();
      } else {
        showToast('error', 'Create Failed', res.message || 'Could not create policy page.');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Error', e.message || 'Failed to create policy page.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pageToDelete) return;
    setDeleting(true);
    try {
      const res = await api.legal.deleteBySlug(pageToDelete.slug);
      if (res && res.success) {
        showToast('success', 'Policy Deleted', `Policy "${pageToDelete.title}" removed.`);
        setPageToDelete(null);
        fetchPages();
      } else {
        showToast('error', 'Delete Failed', res.message || 'Failed to delete policy.');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Error', e.message || 'Failed to delete policy.');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    try {
      const res = await api.legal.resetDefaults();
      if (res && res.success) {
        showToast('success', 'Reset Complete', 'All 8 legal policies reset to official Unx Games templates.');
        setShowResetModal(false);
        fetchPages();
      } else {
        showToast('error', 'Reset Failed', res.message || 'Failed to reset legal pages.');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Error', e.message || 'Failed to reset legal pages.');
    } finally {
      setResetting(false);
    }
  };

  const insertSnippet = (snippet: string) => {
    setEditContent((prev) => prev + '\n' + snippet);
  };

  const buyerProtectionSlugs = ['refund-policy', 'delivery-policy', 'kyc-policy', 'payment-policy', 'security-policy'];
  const buyerCount = pages.filter((p) => buyerProtectionSlugs.includes(p.slug)).length;
  const generalCount = pages.filter((p) => !buyerProtectionSlugs.includes(p.slug)).length;

  const filteredPages = pages.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'buyer-protection') {
      return buyerProtectionSlugs.includes(p.slug);
    }
    if (selectedCategory === 'general') {
      return !buyerProtectionSlugs.includes(p.slug);
    }
    return true;
  });

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <Shield size={18} />
              </div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                Legal Policies &amp; Buyer Protection Manager
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                PostgreSQL Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Manage, edit, publish and customize all store policies, terms, refund guarantees, and buyer protection documents in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset all legal policies to official Unx Games templates"
            >
              <RotateCcw size={13} />
              <span>Reset Templates</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Add Policy</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Policies ({pages.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('buyer-protection')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'buyer-protection'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Buyer Protection ({buyerCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('general')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'general'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              General &amp; About ({generalCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search policies, slugs, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Policy Cards Grid (Modern Mobile App Layout) */}
      {loading && !pages.length ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span className="text-xs font-bold text-slate-600">Syncing legal pages with database...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <AnimatePresence>
            {filteredPages.map((page, index) => {
              const meta = POLICY_ICONS[page.slug] || {
                icon: FileText,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50 border-indigo-200',
                badge: '📄 Legal Doc',
              };
              const Icon = meta.icon;

              return (
                <motion.div
                  key={page.id || page.slug || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg}`}>
                          <Icon size={20} className={meta.color} />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                            {page.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                              /{page.slug}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              v{page.version || '1.0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          page.isPublished !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {page.isPublished !== false ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium line-clamp-3 leading-relaxed bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100">
                      {page.content.replace(/[#*`_]/g, '').slice(0, 140)}...
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-slate-400">
                      {page.updatedAt ? `Updated ${new Date(page.updatedAt).toLocaleDateString()}` : 'Synced'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Delete only custom policies */}
                      {!['terms', 'privacy', 'refund-policy', 'delivery-policy', 'kyc-policy', 'payment-policy', 'security-policy', 'about-us'].includes(page.slug) && (
                        <button
                          type="button"
                          onClick={() => setPageToDelete(page)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete Custom Policy"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(page)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 size={13} />
                        <span>Edit Policy</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ================= EDIT POLICY MODAL ================= */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    Edit: {editTitle || selectedPage.title}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Endpoint: /api/legal/{selectedPage.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Switch */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('editor')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      previewMode === 'editor' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('preview')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      previewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    <Smartphone size={12} />
                    <span>Mobile Preview</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPage(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Top Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Policy Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Publishing Status</label>
                  <button
                    type="button"
                    onClick={() => setEditPublished(!editPublished)}
                    className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      editPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {editPublished ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{editPublished ? 'Active & Published' : 'Draft / Hidden'}</span>
                  </button>
                </div>
              </div>

              {previewMode === 'editor' ? (
                <div className="space-y-2">
                  {/* Quick Format Snippet Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Quick Snippets:
                    </span>
                    <button
                      type="button"
                      onClick={() => insertSnippet('### 1. Section Title Here\nExplanation and guidelines for customers.')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      + Section
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('> **Important Warning**: Please verify your Game Player UID carefully before payment.')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      + Warning Box
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('- **Point 1**: Guaranteed 5-15 minute delivery.\n- **Point 2**: 24/7 automated queue.')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      + Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet(`- **Support Contact**: ${appSettings?.whatsappNumber || '9768914027'}\n- **Email**: ${appSettings?.supportEmail || 'info@unxgames.np'}`)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      + Contact Info
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Policy Content (Markdown / HTML)</label>
                    <textarea
                      rows={14}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed border border-slate-800"
                    />
                  </div>
                </div>
              ) : (
                /* Mobile App Live Preview Screen */
                <div className="bg-slate-100 p-4 rounded-3xl border border-slate-200 flex justify-center">
                  <div className="w-full max-w-sm bg-white rounded-3xl border-4 border-slate-800 p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Shield size={16} className="text-indigo-600" />
                        <span className="text-xs font-black text-slate-900">{editTitle}</span>
                      </div>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        Live Preview
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed max-h-80 overflow-y-auto pr-1">
                      {editContent.split('\n\n').map((paragraph, pIdx) => {
                        if (paragraph.startsWith('#')) {
                          return (
                            <h4 key={pIdx} className="font-black text-slate-900 text-xs mt-2 border-b border-slate-100 pb-1">
                              {paragraph.replace(/^#+\s*/, '')}
                            </h4>
                          );
                        }
                        if (paragraph.startsWith('>')) {
                          return (
                            <div key={pIdx} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] font-medium">
                              {paragraph.replace(/^>\s*/, '')}
                            </div>
                          );
                        }
                        return (
                          <p key={pIdx} className="text-slate-600">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedPage(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save &amp; Sync to Database</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ================= CREATE NEW POLICY MODAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 space-y-4 shadow-2xl my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Add Custom Policy Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Policy Title</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Gamer Rewards Policy"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Unique Slug (URL Identifier)</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-mono">/legal/</span>
                  <input
                    type="text"
                    placeholder="vip-rewards-policy"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Initial Content</label>
                <textarea
                  rows={6}
                  placeholder="Enter policy details..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Policy'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ================= RESET DEFAULTS CONFIRMATION MODAL ================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reset Standard Policies?</h3>
                <span className="text-[11px] font-bold text-amber-600">Unx Games Templates</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will reset all 8 standard policies (Terms, Privacy, Refund, Delivery, KYC, Payment, Security, About Us) to their official clean Unx Games templates.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDefaults}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Reset All'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {pageToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-xl bg-red-100 text-red-700">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Policy?</h3>
                <span className="text-[11px] font-bold text-red-600">/{pageToDelete.slug}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>{pageToDelete.title}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminLegalTab;
