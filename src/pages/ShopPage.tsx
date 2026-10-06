import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { formatNPR } from '../utils/formatters';
import { AppImage } from '../components/common/AppImage';
import { preloadProductImages } from '../utils/imagePreloader';
import {
  ArrowRight,
  Flame,
  Smartphone,
  Monitor,
  Gamepad2,
  Ticket,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Trophy,
  Gift,
  Layers,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SortFilter = 'All' | 'In Stock' | 'Out of Stock' | 'Lowest Price' | 'Highest Price' | 'Popular';

export const ShopPage: React.FC = () => {
  const { activeProducts, setSelectedProductId, setCurrentTab, showToast, categories } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [shopSearch, setShopSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<SortFilter>('All');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Reset page-level filter sheet and search on unmount/navigation away
  useEffect(() => {
    return () => {
      setIsFilterSheetOpen(false);
      setShopSearch('');
      setActiveFilter('All');
    };
  }, []);

  const getCategoryIcon = (iconName?: string) => {
    switch ((iconName || '').toLowerCase()) {
      case 'smartphone':
      case 'mobile':
        return <Smartphone size={13} />;
      case 'monitor':
      case 'pc':
        return <Monitor size={13} />;
      case 'gamepad':
      case 'gamepad2':
        return <Gamepad2 size={13} />;
      case 'ticket':
      case 'voucher':
        return <Ticket size={13} />;
      case 'sparkles':
        return <Sparkles size={13} />;
      case 'trophy':
        return <Trophy size={13} />;
      case 'gift':
        return <Gift size={13} />;
      default:
        return <Flame size={13} />;
    }
  };

  const filterOptions: SortFilter[] = [
    'All',
    'In Stock',
    'Out of Stock',
    'Lowest Price',
    'Highest Price',
    'Popular',
  ];

  const handleProductSelect = (product: any) => {
    if (product.inStock === false) {
      showToast('error', 'Out of Stock', 'This product is currently unavailable.');
      return;
    }
    setSelectedProductId(product.id);
    setCurrentTab('product_detail');
    try {
      const mainEl = document.getElementById('app-main-content') || document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build category list dynamically from DB or defaults
  const categoryList = useMemo(() => {
    const list = [{ id: 'All', name: 'All Games', icon: 'all' }];
    if (categories && categories.length > 0) {
      categories.forEach((cat) => {
        list.push({
          id: cat.id || cat.slug || cat.name,
          name: cat.name,
          icon: cat.icon || 'gamepad2',
        });
      });
    } else {
      list.push(
        { id: 'mobile', name: 'Mobile Games', icon: 'smartphone' },
        { id: 'pc', name: 'PC & Console', icon: 'monitor' },
        { id: 'gift cards', name: 'Gift Cards', icon: 'gift' },
        { id: 'game vouchers', name: 'Vouchers', icon: 'ticket' }
      );
    }
    return list;
  }, [categories]);

  const processedProducts = useMemo(() => {
    let result = [...activeProducts];

    // Category
    if (selectedCategory !== 'All') {
      const q = selectedCategory.toLowerCase();
      result = result.filter((p) => {
        return (
          p.category === selectedCategory ||
          p.categoryId === selectedCategory ||
          p.category_id === selectedCategory ||
          p.categoryName?.toLowerCase() === q ||
          p.categorySlug?.toLowerCase() === q ||
          (q === 'mobile' &&
            (p.categoryId === 'cat-mobile' ||
              p.categorySlug === 'mobile' ||
              p.category?.toLowerCase().includes('mobile'))) ||
          (q === 'pc' &&
            (p.categoryId === 'cat-pc' ||
              p.categorySlug === 'pc-console' ||
              p.categorySlug === 'pc' ||
              p.category?.toLowerCase().includes('pc'))) ||
          (q === 'console' &&
            (p.categoryId === 'cat-console' ||
              p.categorySlug === 'console' ||
              p.category?.toLowerCase().includes('console'))) ||
          (q === 'gift cards' &&
            (p.categoryId === 'cat-giftcards' ||
              p.categorySlug === 'gift-cards' ||
              p.category?.toLowerCase().includes('gift'))) ||
          (q === 'game vouchers' &&
            (p.categoryId === 'cat-vouchers' ||
              p.categorySlug === 'vouchers' ||
              p.category?.toLowerCase().includes('voucher'))) ||
          (q === 'memberships' &&
            (p.categoryId === 'cat-subscriptions' ||
              p.categorySlug === 'subscriptions' ||
              p.category?.toLowerCase().includes('membership') ||
              p.category?.toLowerCase().includes('nitro')))
        );
      });
    }

    // Search
    if (shopSearch.trim()) {
      const q = shopSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.gameName.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }

    // Filter & Sort
    switch (activeFilter) {
      case 'In Stock':
        result = result.filter((p) => p.inStock !== false);
        break;
      case 'Out of Stock':
        result = result.filter((p) => p.inStock === false);
        break;
      case 'Lowest Price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'Highest Price':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'Popular':
        result.sort((a, b) => {
          const aHot = ['HOT', 'TOP PICK', 'BESTSELLER'].includes((a.badge || '').toUpperCase()) ? 1 : 0;
          const bHot = ['HOT', 'TOP PICK', 'BESTSELLER'].includes((b.badge || '').toUpperCase()) ? 1 : 0;
          return bHot - aHot;
        });
        break;
      default:
        break;
    }

    return result;
  }, [activeProducts, selectedCategory, shopSearch, activeFilter]);

  // Preload top shop products during idle moments for instantaneous image delivery
  useEffect(() => {
    if (processedProducts.length > 0) {
      preloadProductImages(processedProducts, 12);
    }
  }, [processedProducts]);

  return (
    <div className="w-full bg-transparent font-sans select-none space-y-2 sm:space-y-2">
      {/* 1. Mobile App Top Search Bar & Category Filters (Clean Flat Layout without marked banner) */}
      <div className="w-full bg-transparent pt-1 sm:pt-2">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
          {/* Search + Filter Inputs */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="Search games, diamonds, vouchers..."
                aria-label="Search games and products"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
              />
              {shopSearch && (
                <button
                  type="button"
                  onClick={() => setShopSearch('')}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className={`flex h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-xs font-extrabold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                activeFilter !== 'All'
                  ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white border-transparent shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-violet-600 border-slate-200/90 shadow-xs'
              }`}
              aria-label="Sort and filter games"
              aria-expanded={isFilterSheetOpen}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Sort</span>
              {activeFilter !== 'All' && (
                <span className="text-[10px] font-mono font-bold bg-white/20 px-1 rounded-sm">{activeFilter}</span>
              )}
            </button>
          </div>

          {/* Horizontal Category Carousel - Exactly 3 items visible per view on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto snap-x snap-mandatory scrollbar-none py-0.5 w-full">
            {categoryList.map((cat, idx) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={`shop-cat-${cat.id || idx}-${idx}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={isSelected}
                  className={`flex h-12 w-[calc((100%-12px)/3)] min-w-[calc((100%-12px)/3)] max-w-[calc((100%-12px)/3)] shrink-0 snap-start cursor-pointer items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-extrabold tracking-tight transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:h-11 sm:w-auto sm:min-w-0 sm:max-w-none sm:gap-1.5 sm:px-4 sm:text-xs ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-xs shadow-violet-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <span className="shrink-0 text-xs">
                    {cat.icon === 'all' ? (
                      <Zap size={13} className={isSelected ? 'text-cyan-300' : 'text-slate-400'} />
                    ) : (
                      getCategoryIcon(cat.icon)
                    )}
                  </span>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PRODUCT GRID SECTION */}
      <section aria-label="Game products" className="mx-auto w-full max-w-7xl px-2 pt-1 sm:px-2 lg:px-2 pb-2">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-600">Find your next top-up</p>
            <h1 className="mt-0.5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">Explore games</h1>
          </div>
          <span role="status" aria-live="polite" className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            {processedProducts.length} {processedProducts.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <AnimatePresence mode="wait">
          {processedProducts.length === 0 ? (
            /* EMPTY STATE */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-16 text-center bg-white border border-slate-200/80 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm"
            >
              <div className="w-14 h-14 rounded-3xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center text-2xl shadow-xs mb-3">
                🎮
              </div>
              <h3 className="text-base font-black text-slate-900">No games found</h3>
              <p className="text-xs text-slate-500 font-medium max-w-[240px] mt-1 leading-relaxed">
                No matching products found. Try adjusting your search or category filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setShopSearch('');
                  setActiveFilter('All');
                }}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white rounded-2xl text-xs font-extrabold active:scale-95 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
              >
                Reset All Filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-2.5 min-[390px]:gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5"
            >
              {processedProducts.map((product, idx) => {
                const isOutOfStock = product.inStock === false;

                return (
                  <div
                    key={`shop-prod-${product.id || idx}-${idx}`}
                    onClick={() => handleProductSelect(product)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleProductSelect(product);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${product.name}, starts at ${formatNPR(product.price)}${isOutOfStock ? ', out of stock' : ''}`}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:scale-[0.99] sm:rounded-3xl"
                  >
                    {/* Game Artwork Banner */}
                    <div className="relative aspect-square w-full bg-gradient-to-b from-[#1C1736] to-[#120F24] overflow-hidden border-b border-slate-100/90 flex items-center justify-center">
                      <AppImage
                        src={product.image || '/free-fire.webp'}
                        alt={product.name}
                        category={product.category || product.gameName}
                        enableBlurUp={true}
                        priority={idx < 4}
                        targetWidth={400}
                        className={`w-full h-full object-cover object-center transition-transform duration-500 ${
                          isOutOfStock ? 'opacity-40 grayscale' : 'group-hover:scale-105'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                      {/* Top Floating Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 shadow-xs">
                            Out of Stock
                          </span>
                        ) : product.badge ? (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 text-white shadow-xs flex items-center gap-0.5 border border-white/20">
                            <Flame size={10} className="fill-current text-cyan-300" />
                            {product.badge.replace(/[^a-zA-Z0-9 ]/g, '') || 'HOT'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                            Instant
                          </span>
                        )}
                      </div>

                      {/* Bottom Image Overlay Tag */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold pointer-events-none">
                        <span className="truncate max-w-[85%] text-white/90 drop-shadow-xs font-black">
                          {product.gameName || 'Unx Games'}
                        </span>
                      </div>
                    </div>

                    {/* Game Details Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h3
                          className={`text-xs sm:text-sm font-bold leading-snug line-clamp-2 transition-colors ${
                            isOutOfStock
                              ? 'text-slate-400'
                              : 'text-slate-900 group-hover:text-violet-600'
                          }`}
                        >
                          {product.name}
                        </h3>
                      </div>

                      {/* Price & Action Row */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                            Starts at
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-black font-mono tracking-tight ${
                              isOutOfStock ? 'text-slate-400 line-through' : 'text-violet-700'
                            }`}
                          >
                            {formatNPR(product.price)}
                          </span>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            isOutOfStock
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-violet-50 text-violet-600 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:text-white shadow-xs'
                          }`}
                        >
                          <ArrowRight size={13} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* FILTER BOTTOM SHEET */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterSheetOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-5 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] shadow-2xl max-w-lg mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-violet-600" />
                  Sort &amp; Filter Games
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-95"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {filterOptions.map((opt, optIdx) => (
                  <button
                    key={`filter-opt-${opt}-${optIdx}`}
                    type="button"
                    onClick={() => {
                      setActiveFilter(opt);
                      setIsFilterSheetOpen(false);
                    }}
                    className={`flex min-h-12 w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                      activeFilter === opt
                        ? 'bg-violet-50 text-violet-900 border border-violet-200 font-black'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt}</span>
                    {activeFilter === opt && (
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ShopPage;
