import React, { useState, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR } from '../../../utils/formatters';
import { Layers, Search, Filter, Edit, Star, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminPackagesTab: React.FC = () => {
  const { products, setAdminTab, setAdminSelectedProductId } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'popular' | 'lowest' | 'highest'>('all');

  const allPackages = useMemo(() => {
    return products.flatMap((prod) =>
      (prod.packages || []).map((pkg) => ({
        ...pkg,
        productName: prod.name,
        productId: prod.id,
        gameName: prod.gameName,
        productActive: prod.active,
        productImage: prod.image,
      }))
    );
  }, [products]);

  const filteredPackages = useMemo(() => {
    let result = allPackages.filter((pkg) => {
      const matchesSearch =
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.productName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProduct = productFilter === 'all' || pkg.productId === productFilter;
      const matchesPopular = quickFilter === 'popular' ? pkg.popular : true;

      return matchesSearch && matchesProduct && matchesPopular;
    });

    if (quickFilter === 'lowest') {
      result = [...result].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (quickFilter === 'highest') {
      result = [...result].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return result;
  }, [allPackages, searchTerm, productFilter, quickFilter]);

  const popularPackagesCount = allPackages.filter((p) => p.popular).length;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Packages Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black shrink-0">
            <Layers size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Packages Console</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {allPackages.length} PACKAGES
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Popular Items: <strong className="text-amber-400 font-bold">{popularPackagesCount} highlighted</strong> • Catalog: <strong className="text-white">{products.length} games</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All (${allPackages.length})` },
          { id: 'popular', label: `Popular (${popularPackagesCount})` },
          { id: 'lowest', label: 'Lowest Price' },
          { id: 'highest', label: 'Highest Price' },
        ].map((chip) => {
          const active = quickFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setQuickFilter(chip.id as any)}
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
            placeholder="Search package name, diamonds, UC, game..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Packages Mobile Stream */}
      <div className="space-y-2.5">
        {filteredPackages.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <Layers size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">No Packages Found</p>
          </div>
        ) : (
          filteredPackages.map((pkg, idx) => (
            <div
              key={pkg.id || idx}
              onClick={() => {
                setAdminSelectedProductId(pkg.productId);
                setAdminTab('product_edit');
              }}
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-purple-400 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                  <Sparkles size={18} />
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">{pkg.name}</span>
                    {pkg.popular && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{pkg.productName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="font-black text-sm text-slate-900 font-mono">{formatNPR(pkg.price)}</span>
                  {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                    <span className="text-[10px] text-slate-400 line-through block">{formatNPR(pkg.originalPrice)}</span>
                  )}
                </div>

                <span className="text-slate-400 group-hover:text-purple-600 transition-colors">
                  <ChevronRight size={18} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPackagesTab;
