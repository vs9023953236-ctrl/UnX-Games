import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Search,
  Trash2,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Cloud,
  Globe2,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../../context/StoreContext';
import { api } from '../../../services/api';

export const AdminMediaVaultTab: React.FC = () => {
  const { showToast } = useStore();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<any | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getMedia();
      if (res.success && Array.isArray(res.media)) {
        setMedia(res.media);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('info', 'URL Copied', 'Direct CDN link copied to clipboard.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredMedia = media.filter((item) => {
    if (sourceFilter !== 'all') {
      const src = (item.source || item.category || '').toLowerCase();
      if (!src.includes(sourceFilter)) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const name = (item.name || item.key || item.url || '').toLowerCase();
      return name.includes(q);
    }

    return true;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native R2 Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black shrink-0">
            <Cloud size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">R2 Media Vault</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                CLOUDFLARE CDN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Zero-egress object storage & image asset CDN ({media.length} items)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMedia}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Media (${media.length})` },
          { id: 'product', label: 'Products' },
          { id: 'banner', label: 'Hero Banners' },
          { id: 'qr', label: 'Payment QRs' },
          { id: 'avatar', label: 'Avatars' },
        ].map((chip) => {
          const active = sourceFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setSourceFilter(chip.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
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
            placeholder="Search image name, URL, key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Mobile-Native Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? (
          <div className="col-span-full bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-cyan-600" />
            <span className="text-xs font-medium">Loading R2 bucket objects...</span>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <ImageIcon size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">No Media Assets Found</p>
          </div>
        ) : (
          filteredMedia.map((item, idx) => (
            <div
              key={item.url || idx}
              onClick={() => setZoomImage(item)}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden group cursor-pointer hover:border-cyan-500 transition-all flex flex-col"
            >
              <div className="relative aspect-4/3 bg-slate-900 overflow-hidden">
                <img
                  src={item.url}
                  alt={item.name || 'Media'}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="p-1.5 bg-white/20 backdrop-blur-xs rounded-lg text-white">
                    <Eye size={16} />
                  </span>
                </div>
              </div>

              <div className="p-2.5 flex items-center justify-between gap-1 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate text-[11px]">{item.name || item.key || 'Image'}</p>
                  <span className="text-[9px] text-slate-400 font-mono block truncate">{item.source || 'R2 Bucket'}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleCopy(item.url, String(idx), e)}
                  title="Copy CDN Link"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 transition-colors"
                >
                  {copiedKey === String(idx) ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox Zoom Modal */}
      <AnimatePresence>
        {zoomImage && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 space-y-3 shadow-2xl relative text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs truncate max-w-[280px]">{zoomImage.name || 'Preview'}</span>
                <button
                  onClick={() => setZoomImage(null)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                <img src={zoomImage.url} alt="Zoom" className="max-w-full max-h-full object-contain" />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-[10px] text-slate-400 break-all">
                {zoomImage.url}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleCopy(zoomImage.url, 'modal', e)}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30"
                >
                  <Copy size={14} />
                  <span>Copy CDN URL</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMediaVaultTab;
