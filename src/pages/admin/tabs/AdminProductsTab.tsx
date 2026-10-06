import React, { useState, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR } from '../../../utils/formatters';
import { Product } from '../../../types';
import { getSafeGameImage, handleImageError } from '../../../utils/imageFallback';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  Gamepad2,
  Check,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminProductsTab: React.FC = () => {
  const {
    products,
    deleteProduct,
    toggleProductStatus,
    toggleProductStock,
    setAdminTab,
    setAdminSelectedProductId,
    showToast,
    categories,
  } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isSuperAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'ADMIN'].includes(uRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const activeCount = products.filter((p) => p.active).length;
  const inStockCount = products.filter((p) => p.inStock !== false).length;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'all') {
        const cat = (p.category || '').toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  const handleToggleActive = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleProductStatus(p.id);
    } catch {
      // Handled
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const ok = await deleteProduct(productToDelete.id);
      if (ok) {
        showToast('success', 'Product Removed');
        setProductToDelete(null);
      }
    } catch {
      // Handled
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Dark Product Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black shrink-0">
            <Gamepad2 size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Game Catalog & Products</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {products.length} GAMES
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Live Store: <strong className="text-emerald-400 font-bold">{activeCount} active</strong> • In-Stock: <strong className="text-white">{inStockCount}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminTab('product_new')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Game</span>
          </button>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Games (${products.length})` },
          { id: 'Mobile Games', label: 'Mobile Games' },
          { id: 'PC Games', label: 'PC Games' },
          { id: 'Console', label: 'Console' },
          { id: 'Gift Cards', label: 'Gift Cards' },
        ].map((chip) => {
          const active = categoryFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setCategoryFilter(chip.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search game name, category, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Product Cards Stream (Mobile-Native) */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">No Games Found</p>
          </div>
        ) : (
          filteredProducts.map((p, idx) => {
            const isAct = p.active !== false;
            const isStock = p.inStock !== false;

            return (
              <div
                key={`admin-prod-${p.id || idx}-${idx}`}
                onClick={() => {
                  setAdminSelectedProductId(p.id);
                  setAdminTab('product_edit');
                }}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-purple-400 transition-all group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={getSafeGameImage(p)}
                      alt={p.name}
                      onError={(e) => handleImageError(e, p.name)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-50 text-purple-700">
                        {p.category || 'Game'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {p.deliveryMethod === 'voucher_code' ? '🎫 Voucher Code' : p.deliveryMethod === 'account_login' ? '🔐 Login Topup' : p.deliveryMethod === 'whatsapp_direct' ? '📱 WhatsApp Direct' : '🎮 Direct UID'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isAct ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isAct ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <span>Packages: <strong className="font-bold text-slate-900">{p.packages?.length || 0}</strong></span>
                      <span>•</span>
                      <span>Input: {p.requiredFields?.requiresZoneId ? 'Player ID + Zone' : 'Player ID'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleToggleActive(p, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isAct ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isAct ? 'Live' : 'Hidden'}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminSelectedProductId(p.id);
                      setAdminTab('product_edit');
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(p);
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl relative text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={22} />
              </div>
              <h3 className="text-sm font-black text-slate-900">Delete Product?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-800">"{productToDelete.name}"</strong>?
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProductsTab;
