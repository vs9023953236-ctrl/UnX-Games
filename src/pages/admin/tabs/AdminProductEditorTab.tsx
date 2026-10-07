import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { Product, ProductPackage } from '../../../types';
import { uploadImage, api } from '../../../services/api';

import { AppBackButton } from '../../../components/common/AppBackButton';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  Package,
  CheckCircle2,
  Lock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const SPACE_REGEX = /\s+/g;
const normalizePackageName = (n: string) => (n || '').trim().toLowerCase().replace(SPACE_REGEX, ' ');

export const AdminProductEditorTab: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    adminSelectedProductId,
    setAdminTab,
    setAdminSelectedProductId,
    showToast,
    categories,
  } = useStore();
  const { currentUser } = useAuth();

  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'STORE_MANAGER' || uRole === 'ADMIN' || isSuperAdmin;
  const isStaffOnly = !isManager && (uRole === 'SUPPORT_STAFF');

  const isEditing = Boolean(adminSelectedProductId);
  const existingProduct = products.find((p) => p.id === adminSelectedProductId);
  const activeCount = products.filter((p) => p.active && p.id !== adminSelectedProductId).length;

  // Form State
  const [name, setName] = useState('');
  const [gameName, setGameName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-mobile');
  const [category, setCategory] = useState<string>('Mobile');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [price, setPrice] = useState<number>(100);
  const [packageName, setPackageName] = useState('');
  const [badge, setBadge] = useState<string>('');
  const [active, setActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [stock, setStock] = useState<number>(99);

  // Packages list
  const [packages, setPackages] = useState<ProductPackage[]>([
    { id: 'pkg-1', name: '100 Diamonds', price: 130, amountValue: '100 Diamonds', popular: false },
    { id: 'pkg-2', name: '310 Diamonds', price: 380, amountValue: '310 Diamonds', popular: true },
    { id: 'pkg-3', name: '520 Diamonds', price: 620, amountValue: '520 Diamonds', popular: false },
  ]);

  // Delivery Method configuration
  const [deliveryMethod, setDeliveryMethod] = useState<'instant_id' | 'voucher_code' | 'account_login' | 'whatsapp_direct'>('instant_id');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Required Fields configuration
  const [idFieldLabel, setIdFieldLabel] = useState('Player ID / UID');
  const [idPlaceholder, setIdPlaceholder] = useState('e.g. 582910482');
  const [idHelpText, setIdHelpText] = useState('Found on your profile screen in-game.');
  const [requiresServer, setRequiresServer] = useState(false);
  const [serverFieldLabel, setServerFieldLabel] = useState('Zone ID / Server');
  const [serverPlaceholder, setServerPlaceholder] = useState('e.g. 2841');
  const [serverOptionsStr, setServerOptionsStr] = useState('');

  // Image Upload State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // AI Product Copywriter
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAiGenerateContent = async () => {
    if (!name.trim()) {
      showToast('info', 'Product Name Required', 'Please enter a product name first.');
      return;
    }
    setAiGenerating(true);
    try {
      const res: any = await api.ai.generateProductContent({
        name,
        category,
        gameName: gameName || name,
        price,
        packagesCount: packages.length,
      });
      if (res && res.success && res.content) {
        if (res.content.description) setDescription(res.content.description);
        if (res.content.suggestedBadges && res.content.suggestedBadges.length > 0 && !badge) {
          setBadge(res.content.suggestedBadges[0]);
        }
        if (res.content.topUpInstructions && !deliveryNote) {
          setDeliveryNote(res.content.topUpInstructions);
        }
        showToast('success', 'AI Copywriter', 'Generated high-converting product description and badges.');
      } else {
        showToast('error', 'AI Notice', res?.message || 'Could not generate content.');
      }
    } catch (err: any) {
      showToast('error', 'AI Error', err?.message || 'Failed to generate product copy.');
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setGameName(existingProduct.gameName);
      const catVal = existingProduct.category || existingProduct.categoryName || 'Mobile';
      setCategory(catVal);
      const foundCat = categories.find((c) =>
        c.id === existingProduct.categoryId ||
        c.id === existingProduct.category_id ||
        c.slug?.toLowerCase() === (existingProduct.categorySlug || '').toLowerCase() ||
        c.name.toLowerCase() === catVal.toLowerCase()
      );
      if (foundCat) {
        setSelectedCategoryId(foundCat.id);
      } else if (existingProduct.categoryId || existingProduct.category_id) {
        setSelectedCategoryId(existingProduct.categoryId || existingProduct.category_id || 'cat-mobile');
      } else if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
      setDescription(existingProduct.description || '');
      setImage(existingProduct.image);
      setGallery(existingProduct.gallery || []);
      setPrice(existingProduct.price);
      setPackageName(existingProduct.packageName || '');
      setBadge(existingProduct.badge || '');
      setActive(existingProduct.active);
      setInStock(existingProduct.inStock !== false);
      setStock((existingProduct as any).stock !== undefined ? Number((existingProduct as any).stock) : (existingProduct.inStock !== false ? 99 : 0));
      setPackages(
        existingProduct.packages && existingProduct.packages.length > 0
          ? existingProduct.packages
          : [{ id: 'pkg-1', name: existingProduct.packageName || 'Base Top-Up', price: existingProduct.price }]
      );
      setDeliveryMethod(existingProduct.deliveryMethod || 'instant_id');
      setDeliveryNote(existingProduct.deliveryNote || '');
      setIdFieldLabel(existingProduct.requiredFields?.idFieldLabel || 'Player ID / UID');
      setIdPlaceholder(existingProduct.requiredFields?.idPlaceholder || 'e.g. 582910482');
      setIdHelpText(existingProduct.requiredFields?.idHelpText || '');
      setRequiresServer(Boolean(existingProduct.requiredFields?.requiresServer));
      setServerFieldLabel(existingProduct.requiredFields?.serverFieldLabel || 'Zone ID / Server');
      setServerPlaceholder(existingProduct.requiredFields?.serverPlaceholder || 'e.g. 2841');
      setServerOptionsStr(
        existingProduct.requiredFields?.serverOptions ? existingProduct.requiredFields.serverOptions.join(', ') : ''
      );
    } else {
      // Defaults for new product
      setName('');
      setGameName('');
      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
        setCategory(categories[0].name);
      } else {
        setSelectedCategoryId('cat-mobile');
        setCategory('Mobile');
      }
      setDescription('');
      setImage('/free-fire.webp'); // Default to the uploaded Free Fire image!
      setGallery([]);
      setPrice(100);
      setPackageName('Diamonds Top-Up');
      setBadge('');
      setActive(true);
      setInStock(true);
      setStock(99);
    }
  }, [existingProduct, categories]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadProgress(0);

    try {
      const downloadUrl = await uploadImage(file, 'products', (pct) => {
        setUploadProgress(pct);
      });
      setImage(downloadUrl);
      setUploadProgress(null);
      showToast('success', 'Image Uploaded', 'Product image uploaded to Cloudflare R2 Storage.');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image.');
      setUploadProgress(null);
    }
  };

  const handleAddPackage = () => {
    const newId = `pkg-${Date.now()}`;
    const basePrice = price || 100;
    setPackages((prev) => [
      ...prev,
      {
        id: newId,
        name: 'New Tier Package',
        price: basePrice,
        originalPrice: Math.round(basePrice * 1.2),
        discount: 17,
        amountValue: '',
        popular: false,
      },
    ]);
  };

  const handleRemovePackage = (pkgId: string) => {
    if (packages.length <= 1) {
      showToast('warning', 'Package Required', 'A product must contain at least one package.');
      return;
    }
    setPackages((prev) => prev.filter((p) => p.id !== pkgId));
  };

  const handlePackageChange = (pkgId: string, field: keyof ProductPackage, value: any) => {
    setPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id === pkgId) {
          const updated = { ...pkg, [field]: value };
          // If originalPrice or price changed, auto-calculate discount
          if (field === 'price' || field === 'originalPrice') {
            const curPrice = field === 'price' ? Number(value) : Number(pkg.price);
            const origPrice = field === 'originalPrice' ? (value ? Number(value) : undefined) : pkg.originalPrice;
            if (origPrice && origPrice > curPrice && curPrice > 0) {
              updated.discount = Math.round(((origPrice - curPrice) / origPrice) * 100);
            } else if (!origPrice || origPrice <= curPrice) {
              updated.discount = undefined;
            }
          }
          return updated;
        }
        return pkg;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Validation Error', 'Product name is required.');
      return;
    }
    if (!gameName.trim()) {
      showToast('error', 'Validation Error', 'Game name is required.');
      return;
    }
    if (!image.trim()) {
      showToast('error', 'Validation Error', 'Product image URL or upload is required.');
      return;
    }
    if (packages.length === 0) {
      showToast('error', 'Validation Error', 'Please define at least one package for this product.');
      return;
    }

    setSaving(true);

    const minPrice = Math.min(...packages.map((p) => Number(p.price) || 0));

    const serverOptionsArray = serverOptionsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const matchingCat = categories.find(
      (c) => c.id === selectedCategoryId || c.name.toLowerCase() === (category || '').toLowerCase()
    );

    // Validate duplicate package names before saving
    const seenNames = new Set<string>();
    for (const p of packages) {
      const norm = normalizePackageName(p.name);
      if (!norm) {
        showToast('error', 'Validation Error', 'Package name cannot be empty.');
        setSaving(false);
        return;
      }
      if (seenNames.has(norm)) {
        showToast('error', 'Duplicate Package Name', `Package name "${p.name.trim()}" already exists for this product.`);
        setSaving(false);
        return;
      }
      seenNames.add(norm);
    }

    const isActuallyInStock = Boolean(inStock && Number(stock) > 0);
    const finalStockCount = isActuallyInStock ? (Number(stock) || 99) : 0;

    const productPayload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      slotNumber: existingProduct?.slotNumber || products.length + 1,
      name: name.trim(),
      gameName: gameName.trim(),
      category: matchingCat?.name || category,
      categoryId: matchingCat?.id || selectedCategoryId || 'cat-mobile',
      category_id: matchingCat?.id || selectedCategoryId || 'cat-mobile',
      categoryName: matchingCat?.name || category,
      categorySlug: matchingCat?.slug || (category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      categoryIcon: matchingCat?.icon || 'Gamepad2',
      description: description.trim(),
      image: image.trim(),
      gallery: gallery.filter(Boolean),
      price: minPrice,
      packageName: packageName.trim() || packages[0].name,
      badge: badge.trim() || undefined,
      deliveryMethod,
      deliveryNote: deliveryNote.trim() || undefined,
      active: Boolean(active),
      inStock: isActuallyInStock,
      stock: finalStockCount,
      packages: packages.map((p, idx) => {
        const pPrice = Number(p.price) || 0;
        const oPrice = p.originalPrice ? Number(p.originalPrice) : undefined;
        const disc = p.discount !== undefined
          ? Number(p.discount)
          : (oPrice && oPrice > pPrice ? Math.round(((oPrice - pPrice) / oPrice) * 100) : undefined);
        const amtVal = p.amountValue ? p.amountValue.trim() : p.name.trim();
        return {
          id: p.id,
          name: p.name.trim(),
          price: pPrice,
          originalPrice: oPrice,
          discount: disc,
          amount: amtVal,
          amountValue: amtVal,
          popular: Boolean(p.popular),
          active: p.active !== false,
          displayOrder: idx,
        };
      }),
      requiredFields: {
        idFieldLabel: idFieldLabel.trim() || 'Player ID / UID',
        idPlaceholder: idPlaceholder.trim() || 'e.g. 582910482',
        idHelpText: idHelpText.trim() || undefined,
        requiresServer: Boolean(requiresServer),
        serverFieldLabel: requiresServer ? serverFieldLabel.trim() : undefined,
        serverPlaceholder: requiresServer ? serverPlaceholder.trim() : undefined,
        serverOptions: serverOptionsArray.length > 0 ? serverOptionsArray : undefined,
      },
    };

    try {
      const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
      if (isEditing && adminSelectedProductId) {
        await updateProduct(adminSelectedProductId, productPayload, adminInfo);
      } else {
        await addProduct(productPayload, adminInfo);
      }
      setAdminTab('products');
      setAdminSelectedProductId(null);
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  if (isStaffOnly) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-5 bg-white border border-slate-200 rounded-3xl my-8">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center border border-amber-200">
          <Lock size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Product Management Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Creating or editing catalog products, prices, and diamond packages is locked for Staff accounts.
          </p>
        </div>
        <button
          onClick={() => setAdminTab('packages')}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Return to Packages Overview
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
        <AppBackButton
          onClick={() => {
            setAdminTab('products');
            setAdminSelectedProductId(null);
          }}
          label="Back to Products"
          showLabel={true}
          variant="pill"
          size="md"
          title="Back to Products"
        />

        <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate">
          {isEditing ? `Edit Product: ${existingProduct?.name}` : 'Add New Game Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Game Name *</label>
              <input
                type="text"
                required
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="e.g. Free Fire, PUBG Mobile, Mobile Legends"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Product / Package Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Free Fire Direct Diamonds Top-Up"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Device Category *</label>
                <button
                  type="button"
                  onClick={() => setAdminTab('categories')}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  Manage Categories
                </button>
              </div>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryId(val);
                  const chosen = categories.find((c) => c.id === val);
                  if (chosen) {
                    setCategory(chosen.name);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all font-semibold"
              >
                {categories.map((c, cIdx) => (
                  <option key={`prod-edit-cat-${c.id || c.slug || cIdx}-${cIdx}`} value={c.id}>
                    {c.name} ({c.slug}) {c.active === false ? '[Hidden]' : ''}
                  </option>
                ))}
                {categories.length === 0 && (
                  <>
                    <option value="cat-mobile">Mobile Games (cat-mobile)</option>
                    <option value="cat-pc">PC Games (cat-pc)</option>
                    <option value="cat-console">Console Games (cat-console)</option>
                    <option value="cat-gift-cards">Digital Vouchers (cat-gift-cards)</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Promo Badge (Optional)</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. HOT, POPULAR, 10% OFF"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Description & Instructions</label>
              <button
                type="button"
                onClick={handleAiGenerateContent}
                disabled={aiGenerating || !name.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Auto-generate gamer description, badges & instructions with AI"
              >
                {aiGenerating ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-violet-600" />
                    <span>AI Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-violet-600" />
                    <span>✨ AI Generate Description & Badges</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions for the gamer (e.g. Enter your numeric Player UID. Delivery takes 5-15 mins)."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
            />
          </div>
        </div>

        {/* Section 2: Product Image & Gallery Management */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Image & Gallery Management
              </h2>
              <p className="text-[11px] text-slate-500">Manage main thumbnail and additional carousel gallery images</p>
            </div>
          </div>

          {/* Quick Select Panel */}
          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/60 space-y-2">
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
              ⭐ Premium Uploaded Product Assets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const targetUrl = '/free-fire.webp';
                  if (image && image !== targetUrl) {
                    setGallery((prev) => [...prev, image]);
                  }
                  setImage(targetUrl);
                  showToast('success', 'Asset Added', 'Set Uploaded Free Fire Diamonds Image as Main.');
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <img src="/free-fire.webp" className="w-5 h-5 rounded-md object-cover border" />
                <span>Uploaded Free Fire Diamonds Image</span>
              </button>
            </div>
          </div>

          {/* Current Images Gallery Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase block">Active Images Catalog</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {/* Main Image */}
              {image && (
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-600 bg-slate-50 group">
                  <img src={image} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-indigo-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-md shadow-xs uppercase">
                    Main
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (gallery.length > 0) {
                          const nextMain = gallery[0];
                          setGallery((prev) => prev.slice(1));
                          setImage(nextMain);
                        } else {
                          setImage('');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery Images */}
              {gallery.map((imgUrl, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                  <img src={imgUrl} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-slate-800/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md">
                    #{idx + 1}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const oldMain = image;
                        setImage(imgUrl);
                        setGallery((prev) => prev.map((g, i) => i === idx ? oldMain : g).filter(Boolean));
                        showToast('success', 'Image Swapped', 'Selected image is now main product image.');
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold transition-colors cursor-pointer"
                    >
                      Set Main
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGallery((prev) => prev.filter((_, i) => i !== idx));
                        showToast('info', 'Image Removed', 'Removed from gallery.');
                      }}
                      className="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                      title="Delete Image"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Image Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Upload Image to Cloudflare R2
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
              {uploadProgress !== null && (
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
            </div>

            {/* Paste Link */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Or Paste Image Direct Web Address (URL)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newImageUrl.trim()) return;
                    if (!image) {
                      setImage(newImageUrl.trim());
                    } else {
                      setGallery((prev) => [...prev, newImageUrl.trim()]);
                    }
                    setNewImageUrl('');
                    showToast('success', 'Image Added', 'New image link added.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer shadow-2xs"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Package Tiers & Pricing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">3. Top-Up Packages & Pricing</h2>
              <p className="text-[11px] text-slate-500">Add different diamond / UC denominations</p>
            </div>
            <button
              type="button"
              onClick={handleAddPackage}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="space-y-3">
            {packages.map((pkg, pkgIndex) => {
              const currentPrice = Number(pkg.price) || 0;
              const original = pkg.originalPrice ? Number(pkg.originalPrice) : 0;
              const autoDiscount = original > currentPrice && original > 0 ? Math.round(((original - currentPrice) / original) * 100) : 0;
              const finalDiscount = pkg.discount !== undefined ? pkg.discount : autoDiscount;

              return (
                <div
                  key={`admin-pkg-editor-${pkg.id || pkgIndex}-${pkgIndex}`}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 transition-all"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Package Name */}
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Package Name *</label>
                      <input
                        type="text"
                        required
                        value={pkg.name}
                        onChange={(e) => handlePackageChange(pkg.id, 'name', e.target.value)}
                        placeholder="e.g. 100 Diamonds"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 font-semibold"
                      />
                    </div>

                    {/* Regular / Original MRP Price */}
                    <div className="sm:col-span-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">MRP / Regular (₨)</label>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={pkg.originalPrice ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          handlePackageChange(pkg.id, 'originalPrice', val);
                        }}
                        placeholder="e.g. 150 (MRP)"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-mono focus:outline-hidden focus:border-indigo-600 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Selling / Discount Price (The customer payable price) */}
                    <div className="sm:col-span-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-indigo-900 uppercase flex items-center gap-1">
                          <span>Selling Price (₨) *</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={pkg.price}
                        onChange={(e) => handlePackageChange(pkg.id, 'price', Number(e.target.value))}
                        placeholder="120 (Payable)"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-indigo-200 text-slate-900 text-xs font-mono font-black focus:outline-hidden focus:border-indigo-600"
                      />
                    </div>

                    {/* Delete Tier */}
                    <div className="sm:col-span-1 flex items-center justify-end pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemovePackage(pkg.id)}
                        disabled={packages.length <= 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors disabled:opacity-30 cursor-pointer"
                        title="Remove Tier"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-row: Discount breakdown pill and highlight check */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <div className="flex items-center gap-2">
                      {original > currentPrice && finalDiscount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                          <span>⚡ {finalDiscount}% OFF</span>
                          <span className="text-emerald-700 font-semibold font-mono">(Customer saves Rs. {original - currentPrice})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Optional: Put MRP higher than Selling Price to show crossed price &amp; discount badge.
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(pkg.popular)}
                        onChange={(e) => handlePackageChange(pkg.id, 'popular', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-bold text-[11px] text-slate-700">Highlight / Popular Badge</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Player ID & Server Requirements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900">
              4. Delivery Method & Gamer Input Configuration
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('instant_id');
                  setIdFieldLabel('Player ID / Character UID');
                  setIdPlaceholder('e.g. 582910482 or Character UID');
                  setIdHelpText('Find your numerical User ID in game profile settings.');
                  setRequiresServer(false);
                  showToast('info', 'Preset Loaded', 'Direct In-Game UID preset applied.');
                }}
                className="px-2 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[10px] rounded-lg border border-violet-200/80 cursor-pointer"
              >
                🎮 Direct In-Game UID
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('voucher_code');
                  setIdFieldLabel('Delivery Email / Mobile Phone');
                  setIdPlaceholder('e.g. yourname@gmail.com or 98XXXXXXXX');
                  setIdHelpText('Digital voucher code will be sent directly to your Email & WhatsApp/SMS.');
                  setRequiresServer(false);
                  showToast('info', 'Preset Loaded', 'Digital Voucher Email/Phone preset applied.');
                }}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200/80 cursor-pointer"
              >
                🎫 Digital Voucher / Gift Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('instant_id');
                  setIdFieldLabel('Player ID');
                  setIdPlaceholder('e.g. 12345678');
                  setIdHelpText('Enter Player ID and select Server / Zone ID.');
                  setRequiresServer(true);
                  setServerFieldLabel('Zone ID / Server ID');
                  setServerPlaceholder('e.g. 2841');
                  showToast('info', 'Preset Loaded', 'Zone ID / Server required preset applied.');
                }}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200/80 cursor-pointer"
              >
                🌐 In-Game ID + Server
              </button>
            </div>
          </div>

          {/* Explicit Delivery Method Options for this Product */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Select Product Delivery Method *</span>
              <span className="text-[11px] font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                Product Specific Delivery
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'instant_id',
                  icon: '🎮',
                  title: 'In-Game UID Direct',
                  desc: 'Player ID & Server ID top-up directly credited to game account',
                  badge: 'Direct Topup',
                },
                {
                  id: 'voucher_code',
                  icon: '🎫',
                  title: 'Voucher / Gift Card',
                  desc: 'Instant digital code / PIN delivered in customer order details',
                  badge: 'Voucher Code',
                },
                {
                  id: 'account_login',
                  icon: '🔐',
                  title: 'Account Login Topup',
                  desc: 'Game login credentials required for manual topup',
                  badge: 'Login Topup',
                },
                {
                  id: 'whatsapp_direct',
                  icon: '📱',
                  title: 'WhatsApp Direct',
                  desc: 'Order details and voucher delivered via WhatsApp & Email',
                  badge: 'WhatsApp Direct',
                },
              ].map((method) => {
                const isSelected = deliveryMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setDeliveryMethod(method.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-violet-50/80 border-2 border-violet-600 ring-2 ring-violet-500/20 text-slate-900 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">{method.icon}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {method.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{method.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">{method.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-slate-700">Custom Delivery Instructions / Note (Optional)</label>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="e.g. Delivered within 5-15 mins directly to your Free Fire ID."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Player ID Field Label</label>
              <input
                type="text"
                value={idFieldLabel}
                onChange={(e) => setIdFieldLabel(e.target.value)}
                placeholder="Player ID / UID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Input Placeholder</label>
              <input
                type="text"
                value={idPlaceholder}
                onChange={(e) => setIdPlaceholder(e.target.value)}
                placeholder="e.g. 582910482"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresServer}
                onChange={(e) => setRequiresServer(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>Requires Zone ID / Server Selection (e.g. Mobile Legends, Genshin Impact)</span>
            </label>
          </div>
        </div>

        {/* Section 5: Active Status, Stock Management & Save */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Active Switch */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">Make Product Active</p>
                <p className="text-[10px] text-slate-500">Visible on storefront (Max 10 slots)</p>
              </div>
            </label>

            {/* Boolean Stock Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={stock > 0}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setStock(isChecked ? 99 : 0);
                  setInStock(isChecked);
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">Instantly In Stock</p>
                <p className="text-[10px] text-slate-500">Toggles stock availability</p>
              </div>
            </label>

            {/* Numeric Stock Count */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Inventory Stock Quantity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setStock(val);
                    setInStock(val > 0);
                  }}
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
                />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setAdminTab('products');
                setAdminSelectedProductId(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default AdminProductEditorTab;
