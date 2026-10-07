import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { AppLogo } from '../common/AppLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { Search, Bell, X, Sparkles, User, Zap, BadgeCheck } from 'lucide-react';
import { formatNPR } from '../../utils/formatters';

export const Header: React.FC = () => {
  const {
    products,
    searchQuery,
    setSearchQuery,
    unreadCount,
    setCurrentTab,
    setSelectedProductId,
    isAdminView,
    setIsAdminView,
  } = useStore();
  const { currentUser, isAuthenticated, isAdmin } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notifsCount = unreadCount(currentUser?.uid);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Give customers a fast, predictable way to search from every user-facing page.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }

      if (event.key === 'Escape' && isSearchFocused) {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused]);

  // Filtered search products with robust fuzzy alias & typo tolerance (e.g. Feee, Frr, FF, Free, Fire, UC, BGMI)
  const matchingProducts = searchQuery.trim()
    ? products
        .filter(p => p.active)
        .filter(p => {
          const rawQ = searchQuery.toLowerCase().trim();
          // Normalize repeated letters (e.g. "feee" -> "fee", "freee" -> "free")
          const normQ = rawQ.replace(/(.)\1{2,}/g, '$1$1');

          const gName = (p.gameName || p.name || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          const cat = (p.category || '').toLowerCase();
          const combined = `${gName} ${pName} ${cat}`;

          // Direct match
          if (combined.includes(rawQ) || combined.includes(normQ)) return true;

          // Game alias checks
          const isFF = combined.includes('free fire') || p.id === 'prod-free-fire';
          const isPUBG = combined.includes('pubg') || p.id === 'prod-pubg-mobile';
          const isMLBB = combined.includes('mobile legends') || combined.includes('mlbb') || p.id === 'prod-mlbb';
          const isRoblox = combined.includes('roblox') || p.id === 'prod-roblox';

          if (isFF) {
            if (
              /^(f|ff|fr|fre|free|fe|fee|feee|ffee|frefire|feefire|fire|diamond|diamonds|dm|d)$/i.test(rawQ) ||
              /^(f|ff|fr|fre|free|fe|fee|feee|ffee|frefire|feefire|fire|diamond|diamonds|dm|d)$/i.test(normQ) ||
              rawQ.startsWith('fe') || rawQ.startsWith('fr') || rawQ.startsWith('ff') || normQ.startsWith('fe')
            ) {
              return true;
            }
          }

          if (isPUBG) {
            if (/^(p|pb|pbg|pub|pubg|pubgm|bgmi|uc|u)$/i.test(rawQ) || rawQ.startsWith('pu') || rawQ.startsWith('bg')) {
              return true;
            }
          }

          if (isMLBB) {
            if (/^(m|ml|mlb|mlbb|legend|legends|mobile legends)$/i.test(rawQ) || rawQ.startsWith('ml')) {
              return true;
            }
          }

          if (isRoblox) {
            if (/^(r|rb|rbx|ro|rob|roblox|robux)$/i.test(rawQ) || rawQ.startsWith('ro') || rawQ.startsWith('rb')) {
              return true;
            }
          }

          return false;
        })
    : [];

  const handleSelectSearchedProduct = (productId: string) => {
    setSelectedProductId(productId);
    setSearchQuery('');
    setIsSearchFocused(false);
    setCurrentTab('product_detail');
  };

  return (
    <div className={`w-full h-[70px] sm:h-[78px] shrink-0 flex items-center relative transition-colors duration-200 select-none fhd-crisp z-30 ${isSearchFocused ? 'bg-white shadow-xs' : 'bg-transparent'}`}>
      <div className="w-full max-w-7xl mx-auto px-1.5 sm:px-2 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: App Logo Button */}
        <button
          type="button"
          onClick={() => {
            if (isAdminView) setIsAdminView(false);
            setCurrentTab('home');
            setSelectedProductId(null);
          }}
          className="flex items-center shrink-0 group focus:outline-hidden cursor-pointer active:scale-95 transition-transform duration-150"
          title="Unx Games - Home"
          aria-label="Home"
        >
          <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-2xl sm:rounded-[20px] overflow-hidden group-hover:scale-105 transition-all duration-200 flex items-center justify-center p-0 shadow-sm">
            <AppLogo
              size="custom"
              className="w-full h-full rounded-2xl sm:rounded-[20px] overflow-hidden p-0"
              glow={false}
              imageClassName="w-full h-full object-cover rounded-2xl sm:rounded-[20px]"
            />
          </div>
        </button>

        {/* Center: Search Input Bar */}
        <div ref={searchContainerRef} className="flex-1 max-w-lg min-w-0 relative">
          <div className="relative flex items-center group">
            <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-violet-600 transition-colors flex items-center gap-1">
              <Search
                size={19}
                className="stroke-[2.3] fhd-vector"
              />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search games, diamonds, UC..."
              aria-label="Search games and top-up packages"
              className="w-full bg-white/95 hover:bg-white focus:bg-white border border-slate-200/90 focus:border-slate-400 rounded-2xl pl-10 sm:pl-11.5 pr-10 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:truncate truncate outline-none focus:outline-none focus:ring-0 transition-all shadow-xs h-[46px] sm:h-[50px] fhd-crisp [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />

            {!searchQuery && (
              <span className="pointer-events-none absolute right-3.5 hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-black text-slate-400 sm:inline">/</span>
            )}

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-pointer bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-full transition-colors text-slate-500 hover:text-slate-800 active:scale-90 z-10"
                aria-label="Clear search"
              >
                <X size={13} className="stroke-[2.5] fhd-vector" />
              </button>
            )}
          </div>

          {/* Instant Search Results Panel - Anchored directly below search bar */}
          {(isSearchFocused || searchQuery.trim().length > 0) && searchQuery.trim().length > 0 && (
            <div
              className="fixed inset-x-3 top-[72px] sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 bg-white/98 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-[1000] max-h-[75vh] sm:max-h-[50vh] fhd-crisp ring-1 ring-black/10 flex flex-col"
            >
              {matchingProducts.length === 0 ? (
                <div className="p-6 text-center flex flex-col items-center justify-center min-h-[220px] gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <Search size={22} className="stroke-[2.2] fhd-vector" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      No exact matches for &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Try one of these top-rated Nepal games:
                    </p>
                  </div>
                  <div className="flex items-center justify-center flex-wrap gap-1.5 mt-1">
                    {[
                      { label: 'Free Fire', q: 'Free Fire' },
                      { label: 'PUBG UC', q: 'PUBG' },
                      { label: 'Google Play', q: 'Google' },
                      { label: 'MLBB', q: 'Mobile Legends' },
                    ].map((tag) => (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag.q);
                          searchInputRef.current?.focus();
                        }}
                        className="px-3 py-1 rounded-full bg-violet-50 hover:bg-violet-100 text-violet-700 font-extrabold text-xs border border-violet-200/60 cursor-pointer active:scale-95 transition-all"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  <div className="px-4 py-2.5 text-xs font-black text-slate-700 uppercase tracking-wider bg-slate-50/95 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-violet-600 fhd-vector" />
                      <span>Matching Games ({matchingProducts.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchFocused(false);
                        setSearchQuery('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer active:scale-95"
                    >
                      Dismiss
                    </button>
                  </div>

                  {matchingProducts.map((prod, idx) => (
                    <button
                      key={`header-search-${prod.id || idx}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSearchedProduct(prod.id)}
                      className="w-full text-left p-3.5 hover:bg-violet-50/80 flex items-center justify-between gap-3 transition-all group cursor-pointer border-b border-slate-100/60"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-2xs fhd-image bg-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors leading-tight">
                            {prod.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                            <span>{prod.gameName || prod.category || 'Game'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-violet-50 group-hover:bg-violet-100/90 px-3 py-1 rounded-xl border border-violet-100 transition-colors">
                        <span className="text-xs sm:text-sm font-black font-mono text-violet-800 block">
                          {formatNPR(prod.price)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Notifications & User Avatar / Login */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* PWA App Download Button */}
          <PWAInstallButton variant="pill" className="hidden lg:flex" />

          {/* Notification Bell */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative w-[46px] h-[46px] sm:w-[50px] sm:h-[50px] rounded-2xl bg-white text-slate-700 hover:text-violet-600 hover:bg-violet-50/50 flex items-center justify-center cursor-pointer shrink-0 border border-slate-200/90 shadow-xs transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={22} className="stroke-[2.2] fhd-vector text-slate-800" />
            {notifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in duration-300 fhd-crisp">
                {notifsCount > 9 ? '9+' : notifsCount}
              </span>
            )}
          </motion.button>

          {/* Profile or Login Button */}
          {isAuthenticated && currentUser ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                setIsAdminView(false);
                setCurrentTab('profile');
              }}
              className="relative w-[46px] h-[46px] sm:w-[50px] sm:h-[50px] rounded-2xl p-[2px] bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-500 shadow-xs hover:shadow-md transition-shadow cursor-pointer group shrink-0"
              title={currentUser.name || 'My Gamer Profile'}
              aria-label="My Profile"
            >
              <div className="w-full h-full rounded-[14px] sm:rounded-[15px] bg-slate-900 overflow-hidden flex items-center justify-center border border-white/25">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200 fhd-image"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-sm sm:text-base font-black text-white fhd-crisp">{(currentUser.name || 'G').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {/* Online Status Dot / Verified Badge */}
              {currentUser.account_verified || currentUser.verification_status === 'verified' ? (
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center shadow-xs border border-white">
                  <BadgeCheck size={16} className="text-blue-500 fill-white fhd-vector" />
                </div>
              ) : (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
              )}
            </motion.button>
            ) : (
              <motion.button
              whileHover={{ scale: 1.03, y: -0.5 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                if (isAdminView) setIsAdminView(false);
                setCurrentTab('login');
              }}
              className="group relative inline-flex items-center h-[46px] sm:h-[50px] rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 p-[1.5px] shadow-[0_3px_12px_rgba(124,58,237,0.25)] hover:shadow-[0_5px_18px_rgba(124,58,237,0.35)] cursor-pointer active:scale-95 shrink-0 transition-all duration-300"
              title="Sign In / Register Account"
              aria-label="Sign In"
            >
              <span className="flex items-center gap-1.5 sm:gap-2 rounded-[14px] sm:rounded-[15px] bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 px-3.5 sm:px-4.5 h-full text-white font-black text-xs sm:text-sm tracking-wide transition-all duration-200 group-hover:brightness-110">
                <User size={17} className="group-hover:scale-110 transition-transform stroke-[2.5] fhd-vector text-white" />
                <span>Login</span>
              </span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Notifications Popover */}
      <NotificationDropdown
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </div>
  );
};
