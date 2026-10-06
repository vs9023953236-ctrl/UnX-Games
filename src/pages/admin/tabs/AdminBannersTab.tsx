import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { Banner, BannerType, BannerActionType } from '../../../types';
import { uploadImage } from '../../../services/api';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  MousePointerClick,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Check,
  Tag,
  ShoppingBag,
  Package,
  Globe,
  Newspaper,
  AlertCircle,
  X,
  ChevronRight,
  Play,
  Upload,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Master R2 Banners for quick selection
const PRESET_WALLPAPERS = [
  { name: 'Free Fire Master Banner', url: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/free%20fire%20Banner.png' },
  { name: 'PUBG Master Banner', url: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Pubg%20banner.png' },
  { name: 'Roblox Master Banner', url: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Roblox%20banner.png' },
  { name: 'Mobile Legends Master Banner', url: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Mobile%20legend%20banner.png' },
  { name: 'Steam Wallet Master Banner', url: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Stem%20Wallte%20banner.png' },
];

interface AdminBannersTabProps {
  initialSubTab?: BannerType;
}

export const AdminBannersTab: React.FC<AdminBannersTabProps> = ({ initialSubTab = 'hero' }) => {
  const {
    banners,
    products,
    news,
    addBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
    duplicateBanner,
    reorderBanners,
    showToast,
  } = useStore();

  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<BannerType>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewModalBanner, setPreviewModalBanner] = useState<Banner | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [togglingBanners, setTogglingBanners] = useState<Set<string>>(new Set());

  // Form State
  const [formType, setFormType] = useState<BannerType>('hero');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('HOT OFFER');
  const [formButtonText, setFormButtonText] = useState('Claim Offer');
  const [formActionType, setFormActionType] = useState<BannerActionType>('product');
  const [formActionTarget, setFormActionTarget] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formMobileImage, setFormMobileImage] = useState('');
  const [formDesktopImage, setFormDesktopImage] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadProgress(0);

    try {
      const downloadUrl = await uploadImage(file, 'banners', (pct) => {
        setUploadProgress(pct);
      });
      setFormImage(downloadUrl);
      setUploadProgress(null);
      showToast('success', 'R2 Uploaded', 'Banner image uploaded to Cloudflare R2 and synced.');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image.');
      setUploadProgress(null);
    }
  };

  // Filter banners by current active subtab
  const currentBanners = useMemo(() => {
    return banners
      .filter((b) => b.type === activeTab)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, activeTab]);

  const activeHeroCount = useMemo(() => banners.filter((b) => (b.type === 'hero' || (!b.type && !b.id?.includes('offer'))) && (b.status === 'active' || !b.status)).length, [banners]);
  const activeOfferCount = useMemo(() => banners.filter((b) => (b.type === 'offer' || b.id?.includes('offer')) && (b.status === 'active' || !b.status)).length, [banners]);

  const openAddModal = (type: BannerType) => {
    setEditingBanner(null);
    setFormType(type);
    setFormTitle('');
    setFormSubtitle('');
    setFormBadge(type === 'hero' ? 'TOP PICK' : 'SPECIAL DEAL');
    setFormButtonText(type === 'hero' ? 'Top Up Now' : 'Claim Offer');
    setFormActionType('product');
    setFormActionTarget(products[0]?.id || 'prod-free-fire');
    setFormImage(PRESET_WALLPAPERS[0].url);
    setFormMobileImage('');
    setFormDesktopImage('');
    setFormStatus('active');
    setFormSortOrder(currentBanners.length + 1);
    setFormStartDate('');
    setFormEndDate('');
    setModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormType(banner.type);
    setFormTitle(banner.title);
    setFormSubtitle(banner.subtitle);
    setFormBadge(banner.badge);
    setFormButtonText(banner.buttonText);
    setFormActionType(banner.actionType);
    setFormActionTarget(banner.actionTarget || '');
    setFormImage(banner.image);
    setFormMobileImage(banner.mobileImage || '');
    setFormDesktopImage(banner.desktopImage || '');
    setFormStatus(banner.status);
    setFormSortOrder(banner.sortOrder);
    setFormStartDate(banner.startDate ? banner.startDate.slice(0, 16) : '');
    setFormEndDate(banner.endDate ? banner.endDate.slice(0, 16) : '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('error', 'Title Required', 'Please enter a title for the banner.');
      return;
    }
    if (!formImage.trim()) {
      showToast('error', 'Image Required', 'Please provide an image URL.');
      return;
    }

    setIsSubmitting(true);
    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;

    const payload = {
      type: formType,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      badge: formBadge.trim() || 'PROMO',
      buttonText: formButtonText.trim() || 'Explore',
      actionType: formActionType,
      actionTarget: formActionTarget,
      image: formImage.trim(),
      mobileImage: formMobileImage.trim() || undefined,
      desktopImage: formDesktopImage.trim() || undefined,
      status: formStatus,
      sortOrder: Number(formSortOrder) || 1,
      startDate: formStartDate ? new Date(formStartDate).toISOString() : undefined,
      endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
    };

    let res;
    if (editingBanner) {
      res = await updateBanner(editingBanner.id, payload, adminInfo);
    } else {
      res = await addBanner(payload, adminInfo);
    }

    setIsSubmitting(false);

    if (res.success) {
      setModalOpen(false);
    } else {
      showToast('error', 'Save Error', res.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const list = [...currentBanners];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
    await reorderBanners(list.map((b) => b.id), adminInfo);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-amber-300 font-black text-[10px] uppercase tracking-wider mb-2">
            <Sparkles size={11} /> Realtime Sync Engine
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Banner Management
          </h1>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed font-medium">
            Manage main Hero Sliders and Special Offer Banners in real-time. Changes instantly sync to the User App without rebuilt code.
          </p>
        </div>

        <button
          onClick={() => openAddModal(activeTab)}
          className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Add New {activeTab === 'hero' ? 'Hero Banner' : 'Special Offer'}</span>
        </button>
      </div>

      {/* Main Tabs Header & Limits Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100/90 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('hero')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'hero'
                ? 'bg-white text-indigo-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={15} />
            <span>Hero Banners</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeHeroCount >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {activeHeroCount}/5 Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('offer')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'offer'
                ? 'bg-white text-indigo-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag size={15} />
            <span>Special Offers</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeOfferCount >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {activeOfferCount}/5 Active
            </span>
          </button>
        </div>

        {/* Limit Warning Note */}
        <div className="text-[11px] text-slate-500 font-medium px-2 flex items-center gap-1.5">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          <span>Maximum 5 active banners shown in User App slider at once.</span>
        </div>
      </div>

      {/* Banners List Grid */}
      {currentBanners.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🖼️
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No {activeTab === 'hero' ? 'Hero' : 'Offer'} Banners Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by adding your first banner. Active banners will automatically slide on the User App homepage.
          </p>
          <button
            onClick={() => openAddModal(activeTab)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-2xs hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Banner</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBanners.map((banner, index) => {
            const isScheduleActive =
              (!banner.startDate || new Date(banner.startDate) <= new Date()) &&
              (!banner.endDate || new Date(banner.endDate) >= new Date());

            return (
              <motion.div
                key={`admin-banner-card-${banner.id || index}-${index}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image Preview Banner Card Header */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      onError={(e) => {
                        const target = e.target as HTMLElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.img-error-fallback')) {
                          const fallback = document.createElement('div');
                          fallback.className = 'img-error-fallback absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center font-bold';
                          fallback.innerHTML = '<span class="text-2xl mb-1">🖼️</span><span>Image Preview Unavailable</span>';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Badge Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-xs">
                        {banner.badge}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={async () => {
                          if (togglingBanners.has(banner.id)) return;
                          setTogglingBanners(prev => new Set(prev).add(banner.id));
                          try {
                            const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
                            await toggleBannerStatus(banner.id, adminInfo);
                          } finally {
                            setTogglingBanners(prev => {
                              const next = new Set(prev);
                              next.delete(banner.id);
                              return next;
                            });
                          }
                        }}
                        disabled={togglingBanners.has(banner.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          banner.status === 'active' && isScheduleActive
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-rose-500/90 text-white'
                        }`}
                        title="Click to toggle status"
                      >
                        {togglingBanners.has(banner.id) ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" /> Updating
                          </>
                        ) : banner.status === 'active' && isScheduleActive ? (
                          <>
                            <CheckCircle2 size={12} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> Inactive
                          </>
                        )}
                      </button>
                    </div>

                    {/* Content overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h4 className="text-base font-black leading-tight line-clamp-1 drop-shadow-md">
                        {banner.title}
                      </h4>
                      <p className="text-[11px] text-slate-200 line-clamp-1 mt-0.5 font-medium opacity-90">
                        {banner.subtitle || 'No subtitle provided'}
                      </p>
                    </div>
                  </div>

                  {/* Card Info Details */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Action & Target Tag */}
                    <div className="flex items-center justify-between text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 font-medium">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Play size={12} className="text-indigo-600" /> Action:
                      </span>
                      <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {banner.actionType ? banner.actionType.toUpperCase() : 'PRODUCT'}: {banner.actionTarget || 'General'}
                      </span>
                    </div>

                    {/* Stats Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-center text-slate-600">
                      <div className="p-2 rounded-2xl bg-indigo-50/50 border border-indigo-100/60">
                        <span className="text-[10px] uppercase font-extrabold text-indigo-600 block flex items-center justify-center gap-1">
                          <Eye size={12} /> Views
                        </span>
                        <span className="text-sm font-black text-slate-900">{banner.views || 0}</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
                        <span className="text-[10px] uppercase font-extrabold text-emerald-600 block flex items-center justify-center gap-1">
                          <MousePointerClick size={12} /> Clicks
                        </span>
                        <span className="text-sm font-black text-slate-900">{banner.clicks || 0}</span>
                      </div>
                    </div>

                    {/* Schedule Dates */}
                    {(banner.startDate || banner.endDate) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                        <Calendar size={13} className="text-amber-600 shrink-0" />
                        <span className="truncate">
                          {banner.startDate ? new Date(banner.startDate).toLocaleDateString() : 'Start'} –{' '}
                          {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : 'Forever'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1">
                  {/* Ordering Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === currentBanners.length - 1}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewModalBanner(banner)}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-bold transition-all cursor-pointer"
                      title="Live Preview"
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      onClick={() => {
                        const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
                        duplicateBanner(banner.id, adminInfo);
                      }}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold transition-all cursor-pointer"
                      title="Duplicate Banner"
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      onClick={() => openEditModal(banner)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 size={13} /> Edit
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(banner.id)}
                      className="p-1.5 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT BANNER FORM */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl my-auto"
            >
              <div className="p-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingBanner ? 'Edit Banner' : `Create New ${formType === 'hero' ? 'Hero' : 'Offer'} Banner`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure banner image and tap actions. The User App renders the clean raw banner artwork directly.
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Banner Type Selection */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Banner Category Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('hero')}
                      className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        formType === 'hero'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Layers size={16} />
                      <span>Hero Slider Banner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('offer')}
                      className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        formType === 'offer'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Tag size={16} />
                      <span>Special Offer Banner</span>
                    </button>
                  </div>
                </div>

                {/* Text Fields: Title and Subtitle */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Banner Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Free Fire Master Banner"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-extrabold text-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Badge Text <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="e.g. LIMITED TIME, TOP PICK"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      CTA Button Text <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formButtonText}
                      onChange={(e) => setFormButtonText(e.target.value)}
                      placeholder="e.g. Claim Offer, Top Up Now"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Instant eSewa & Khalti QR verification within 5-15 mins"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Banner Graphic Image Upload/URL */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Banner Background Graphic URL *
                    </label>
                    <label className="cursor-pointer px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
                      <Upload size={13} />
                      <span>Upload R2 Image</span>
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-mono text-slate-800"
                    required
                  />

                  {uploadProgress !== null && (
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}

                  {/* Preset Wallpapers Picker */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Or Pick a Preset Gaming Graphic Wallpaper:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PRESET_WALLPAPERS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormImage(preset.url)}
                          className={`relative h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                            formImage === preset.url ? 'border-indigo-600 scale-95 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          title={preset.name}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                          {formImage === preset.url && (
                            <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center text-white">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Connection Type & Target */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Button Tap Action
                    </label>
                    <select
                      value={formActionType}
                      onChange={(e) => {
                        const val = e.target.value as BannerActionType;
                        setFormActionType(val);
                        if (val === 'product') setFormActionTarget(products[0]?.id || '');
                        else if (val === 'category') setFormActionTarget('Mobile');
                        else if (val === 'news') setFormActionTarget(news[0]?.id || '');
                        else if (val === 'external') setFormActionTarget('https://unxgames.np');
                        else setFormActionTarget('');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                    >
                      <option value="product">Open Specific Product Detail</option>
                      <option value="category">Open Product Category</option>
                      <option value="shop">Open Full Shop</option>
                      <option value="offer">Open Offers Section</option>
                      <option value="news">Open News Article</option>
                      <option value="orders">Open Orders History</option>
                      <option value="external">Open External Link</option>
                      <option value="none">No Action</option>
                    </select>
                  </div>

                  {/* Target Selector */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Action Target Selection
                    </label>
                    {formActionType === 'product' && (
                      <select
                        value={formActionTarget}
                        onChange={(e) => setFormActionTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                      >
                        {products.map((p, pIdx) => (
                          <option key={`banner-prod-opt-${p.id || pIdx}-${pIdx}`} value={p.id}>
                            {p.gameName} - {p.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {formActionType === 'category' && (
                      <select
                        value={formActionTarget}
                        onChange={(e) => setFormActionTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                      >
                        <option value="Mobile">Mobile Games</option>
                        <option value="PC">PC Games</option>
                        <option value="Console">Console</option>
                        <option value="Voucher">Gift Cards & Vouchers</option>
                        <option value="Special Offers">Special Offers</option>
                      </select>
                    )}

                    {formActionType === 'news' && (
                      <select
                        value={formActionTarget}
                        onChange={(e) => setFormActionTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                      >
                        {news.map((n, nIdx) => (
                          <option key={`banner-news-opt-${n.id || nIdx}-${nIdx}`} value={n.id}>
                            {n.title}
                          </option>
                        ))}
                      </select>
                    )}

                    {formActionType === 'external' && (
                      <input
                        type="url"
                        value={formActionTarget}
                        onChange={(e) => setFormActionTarget(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                      />
                    )}

                    {(formActionType === 'shop' || formActionType === 'offer' || formActionType === 'orders' || formActionType === 'none') && (
                      <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-500 italic">
                        Navigates to {formActionType ? formActionType.toUpperCase() : 'PRODUCT'} automatically
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduling & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Sort Order Position
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Schedule Start Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-600 text-[11px] font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingBanner ? 'Save Changes' : 'Create Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: LIVE PREVIEW MODAL */}
      <AnimatePresence>
        {previewModalBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} /> Mobile App Live Preview
                </span>
                <button
                  onClick={() => setPreviewModalBanner(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Rendered Mobile Card */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 aspect-[16/9] bg-slate-900 flex flex-col justify-end p-5 shadow-inner">
                <img
                  src={previewModalBanner.image}
                  alt={previewModalBanner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                <div className="relative z-10 space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                    {previewModalBanner.badge}
                  </span>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {previewModalBanner.title}
                  </h3>
                  <p className="text-xs text-indigo-200 line-clamp-2">
                    {previewModalBanner.subtitle}
                  </p>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs">
                      {previewModalBanner.buttonText} <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 font-medium pt-2">
                Action: <span className="text-indigo-300 font-bold">{previewModalBanner.actionType ? previewModalBanner.actionType.toUpperCase() : 'PRODUCT'}</span> ({previewModalBanner.actionTarget || 'Default'})
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Banner?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This banner will be permanently removed from the User App slider and database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
                    await deleteBanner(deleteConfirmId, adminInfo);
                    setDeleteConfirmId(null);
                  }}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Delete Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AdminBannersTab;
