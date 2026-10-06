import React, { useState, useEffect } from 'react';
import {
  Zap,
  RefreshCw,
  Database,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Flame,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';

export const AdminCacheTab: React.FC = () => {
  const { showToast } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const [selectedTag, setSelectedTag] = useState('products');
  const [showFlushConfirm, setShowFlushConfirm] = useState(false);

  const fetchCacheStats = async () => {
    setLoading(true);
    try {
      const res = await api.gateway.cache.getStats();
      if (res && res.success && res.data) {
        setStats(res.data);
      } else if (res && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch cache stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleInvalidateTag = async (tag: string) => {
    setInvalidating(true);
    try {
      const res = await api.gateway.cache.invalidate({ tag });
      if (res && res.success) {
        showToast('success', `Cache tag "${tag}" successfully invalidated (${res.invalidatedCount || 0} entries purged).`);
        fetchCacheStats();
      } else {
        showToast('error', res.message || 'Failed to invalidate cache');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error invalidating cache');
    } finally {
      setInvalidating(false);
    }
  };

  const handleFlushCache = async () => {
    setInvalidating(true);
    setShowFlushConfirm(false);
    try {
      const res = await api.gateway.cache.flush();
      if (res && res.success) {
        showToast('success', 'All non-critical cache cleared successfully!');
        fetchCacheStats();
      } else {
        showToast('error', res.message || 'Failed to flush cache');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error flushing cache');
    } finally {
      setInvalidating(false);
    }
  };

  const [isWarmingUp, setIsWarmingUp] = useState(false);

  const handleWarmUpCache = async () => {
    setIsWarmingUp(true);
    try {
      await Promise.allSettled([
        fetch('/api/products').catch(() => null),
        fetch('/api/categories').catch(() => null),
        fetch('/api/banners').catch(() => null),
        fetch('/api/offers').catch(() => null),
        fetch('/api/news').catch(() => null),
        fetch('/api/games').catch(() => null),
        fetch('/api/payment-settings').catch(() => null),
      ]);
      showToast('success', 'Cache Warmed Up!', 'Catalog endpoints preloaded into LFU memory cache.');
      fetchCacheStats();
    } catch (err: any) {
      showToast('error', 'Warm-up notice', err.message);
    } finally {
      setIsWarmingUp(false);
    }
  };

  const hitRatePercent = stats ? Math.round((stats.hitRate || 0) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <Zap size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                UNX Advanced Cache Engine (LFU + LRU)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                High-speed Cache-Aside memory acceleration with stale-while-revalidate &amp; stampede coalescing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleWarmUpCache}
            disabled={isWarmingUp}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={isWarmingUp ? 'animate-bounce' : ''} />
            <span>{isWarmingUp ? 'Warming Up...' : 'Warm Up Cache'}</span>
          </button>

          <button
            onClick={fetchCacheStats}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Stats</span>
          </button>

          <button
            onClick={() => setShowFlushConfirm(true)}
            disabled={invalidating}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span>Flush Cache</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showFlushConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-black text-slate-900">Confirm Cache Flush</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to flush all in-memory catalog cache? This will reset all active cached responses. The database will automatically repopulate entries on subsequent requests.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowFlushConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFlushCache}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Yes, Flush Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Hit Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hit Rate</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{hitRatePercent}%</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {stats?.staleHits ? `+${stats.staleHits} SWR` : 'Active'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, hitRatePercent))}%` }}
            />
          </div>
        </div>

        {/* Cache Hits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cache Hits</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <CheckCircle size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.cacheHits || 0}</span>
            <span className="text-[10px] text-slate-600 font-bold">Fast Path</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">Avg lookup: ~{stats?.averageGetTimeMs || 0.1}ms</p>
        </div>

        {/* Cache Misses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cache Misses</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Database size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.cacheMisses || 0}</span>
            <span className="text-[10px] text-slate-600 font-bold">DB Fallback</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">Auto-populated to cache</p>
        </div>

        {/* LFU Evictions & Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stored Items</span>
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Layers size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.totalItems || 0}</span>
            <span className="text-[10px] text-slate-600 font-bold">/ {stats?.maxItems || 1000} max</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            LFU Evictions: {stats?.evictions || 0} • Expired: {stats?.expiredEntries || 0}
          </p>
        </div>
      </div>

      {/* Manual Tag Invalidation Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-amber-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Targeted Cache Invalidation
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600">Zero Downtime Purge</span>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Select a domain tag to invalidate all associated cached responses across the cluster. Subscribed users will automatically refetch fresh authoritative database data via Realtime.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { tag: 'products', label: 'Products & Top-ups' },
            { tag: 'games', label: 'Games Catalog' },
            { tag: 'banners', label: 'Home Banners' },
            { tag: 'offers', label: 'Promotional Deals' },
            { tag: 'coupons', label: 'Discount Coupons' },
            { tag: 'categories', label: 'Game Categories' },
            { tag: 'news', label: 'Store News' },
            { tag: 'settings', label: 'Store Settings' },
          ].map((item) => (
            <button
              key={item.tag}
              onClick={() => handleInvalidateTag(item.tag)}
              disabled={invalidating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{item.label}</span>
              <ArrowRight size={12} className="text-slate-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Top Cached Keys & Frequency (LFU Inspector) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-emerald-700" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Top Cached Keys (LFU Frequency Ranking)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            Est. Memory: ~{stats?.memoryUsageEstimateKb || 0} KB
          </span>
        </div>

        {stats?.topKeys && stats.topKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-bold">Cache Key</th>
                  <th className="py-2.5 px-3 font-bold text-center">Frequency (LFU)</th>
                  <th className="py-2.5 px-3 font-bold text-right">Last Accessed (LRU)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topKeys.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800 truncate max-w-xs">
                      {item.key}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-md border border-emerald-200">
                        {item.frequency} hits
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {new Date(item.lastAccessedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-600 font-medium">
            Cache is warming up. As users browse the store, popular items will appear here ranked by LFU frequency.
          </div>
        )}
      </div>

      {/* Safety Policy Guarantee Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">UNX Financial Data Protection Guarantee</p>
          <p>
            Wallet transactions, order checkouts, and payment verifications bypass the cache layer completely and execute directly against authoritative PostgreSQL database transactions. Cache is strictly utilized for public catalog read acceleration.
          </p>
        </div>
      </div>
    </div>
  );
};
export default AdminCacheTab;
