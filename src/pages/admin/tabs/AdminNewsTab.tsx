import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatDate } from '../../../utils/formatters';
import { NewsItem } from '../../../types';
import {
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  Layers,
  X,
  Eye,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminNewsTab: React.FC = () => {
  const {
    news,
    updateNews,
    deleteNews,
    setAdminTab,
    setAdminSelectedNewsId,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newsToDelete, setNewsToDelete] = useState<NewsItem | null>(null);

  const normalizeCatKey = (cat: string) => {
    if (!cat) return 'announcements';
    const c = cat.toLowerCase().trim().replace(/[\s_]+/g, '-');
    if (c.includes('offer') || c.includes('promo') || c.includes('deal')) return 'offers';
    if (c.includes('maint')) return 'maintenance';
    if (c.includes('game') || c.includes('patch') || c.includes('update')) return 'game-updates';
    return 'announcements';
  };

  const filteredNews = news.filter((n) => {
    if (categoryFilter !== 'all' && normalizeCatKey(n.category) !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || (n.summary || '').toLowerCase().includes(q);
  });

  const handleToggleStatus = async (item: NewsItem) => {
    try {
      const willBePublished = !item.published;
      await updateNews(item.id, { published: willBePublished });
      showToast('success', 'Status Updated', `Post is now ${willBePublished ? 'Published' : 'Draft'}.`);
    } catch {
      // Handled
    }
  };

  const handleConfirmDelete = async () => {
    if (!newsToDelete) return;
    try {
      await deleteNews(newsToDelete.id);
      showToast('success', 'Post Deleted');
      setNewsToDelete(null);
    } catch {
      // Handled
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Dark News Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black shrink-0">
            <Newspaper size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">News & Announcements</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {news.length} POSTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Publish community updates, patch notes, promo announcements, & maintenance alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminTab('news_new')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Posts (${news.length})` },
          { id: 'announcements', label: 'Announcements' },
          { id: 'offers', label: 'Offers & Promos' },
          { id: 'game-updates', label: 'Game Updates' },
          { id: 'maintenance', label: 'Maintenance' },
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
            placeholder="Search news titles, content, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Compact News Stream */}
      <div className="space-y-2.5">
        {filteredNews.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <Newspaper size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">No Articles Found</p>
            <p className="text-xs text-slate-500 mt-0.5">Click "New Post" to publish your first announcement.</p>
          </div>
        ) : (
          filteredNews.map((item) => {
            const isPub = item.published;
            return (
              <div
                key={item.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 line-clamp-1">{item.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-50 text-purple-700">
                        {item.category || 'General'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isPub ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isPub ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">{item.summary || item.content}</p>

                    <div className="text-[10px] text-slate-400 font-mono">
                      <span>{formatDate(item.createdAt)}</span>
                      {item.author && <span> • by {item.author}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    title={isPub ? 'Unpublish' : 'Publish'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isPub ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {isPub ? 'Draft' : 'Publish'}
                  </button>

                  <button
                    onClick={() => {
                      setAdminSelectedNewsId(item.id);
                      setAdminTab('news_edit');
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    onClick={() => setNewsToDelete(item)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {newsToDelete && (
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
              <h3 className="text-sm font-black text-slate-900">Delete Announcement?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-800">"{newsToDelete.title}"</strong>?
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewsToDelete(null)}
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

export default AdminNewsTab;
