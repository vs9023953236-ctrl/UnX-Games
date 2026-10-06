import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Gamepad2, Search, Package, Star, ArrowRight, Layers } from 'lucide-react';

export const AdminGamesTab: React.FC = () => {
  const { products, setAdminTab, setAdminSelectedProductId, setSelectedProductId } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Group products by gameName
  const gamesMap = products.reduce((acc: any, prod) => {
    const game = prod.gameName || 'Other';
    if (!acc[game]) {
      acc[game] = {
        name: game,
        productsCount: 0,
        activeProductsCount: 0,
        packagesCount: 0,
        categories: new Set<string>(),
        minPrice: Infinity,
        maxPrice: -Infinity,
        imageUrl: prod.image,
        sampleProductId: prod.id,
      };
    }

    acc[game].productsCount += 1;
    if (prod.active) {
      acc[game].activeProductsCount += 1;
    }
    acc[game].packagesCount += (prod.packages || []).length;
    acc[game].categories.add(prod.category);

    const prodPrices = (prod.packages || []).map((p) => p.price);
    if (prodPrices.length > 0) {
      const minP = Math.min(...prodPrices);
      const maxP = Math.max(...prodPrices);
      if (minP < acc[game].minPrice) acc[game].minPrice = minP;
      if (maxP > acc[game].maxPrice) acc[game].maxPrice = maxP;
    }

    return acc;
  }, {});

  const gamesList = Object.values(gamesMap).map((g: any) => ({
    ...g,
    categories: Array.from(g.categories).join(', '),
    minPrice: g.minPrice === Infinity ? 0 : g.minPrice,
    maxPrice: g.maxPrice === -Infinity ? 0 : g.maxPrice,
  }));

  const filteredGames = gamesList.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInspectGameProducts = (productId: string) => {
    setAdminSelectedProductId(productId);
    setSelectedProductId(productId);
    setAdminTab('products');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Gamepad2 size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Gaming Titles Management</h2>
            <p className="text-xs text-slate-500 font-medium">View and monitor top gaming title configurations and active catalog items</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search gaming titles (e.g. Free Fire, PUBG Mobile)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredGames.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <p className="text-slate-400 text-xs font-semibold">No gaming titles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
              <div className="relative h-28 bg-slate-100 flex items-center justify-center">
                {game.imageUrl ? (
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover opacity-85"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Gamepad2 size={36} className="text-slate-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
                  <h3 className="text-white text-base font-black tracking-tight drop-shadow-xs truncate w-full">
                    {game.name}
                  </h3>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Products</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{game.productsCount}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded-xl">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase">Active</p>
                    <p className="text-xs font-black text-emerald-800 mt-0.5">{game.activeProductsCount}</p>
                  </div>
                  <div className="bg-indigo-50/50 p-2 rounded-xl">
                    <p className="text-[9px] font-bold text-indigo-600 uppercase">Packages</p>
                    <p className="text-xs font-black text-indigo-800 mt-0.5">{game.packagesCount}</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400 text-[10px]">Categories:</span>
                    <span className="text-slate-700 truncate max-w-[150px]">{game.categories}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400 text-[10px]">Price range:</span>
                    <span className="text-emerald-600 font-extrabold">Rs. {game.minPrice} - {game.maxPrice}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleInspectGameProducts(game.sampleProductId)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-extrabold border border-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>Inspect Products</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default AdminGamesTab;
