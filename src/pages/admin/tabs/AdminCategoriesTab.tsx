import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Folder,
  Search,
  Plus,
  Edit2,
  Trash2,
  Smartphone,
  Monitor,
  Gamepad2,
  Ticket,
  Gift,
  Crown,
  Trophy,
  Sparkles,
  Flame,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../../../types';

const ICON_MAP: Record<string, any> = {
  smartphone: Smartphone,
  mobile: Smartphone,
  monitor: Monitor,
  pc: Monitor,
  gamepad2: Gamepad2,
  console: Gamepad2,
  ticket: Ticket,
  voucher: Ticket,
  gift: Gift,
  crown: Crown,
  trophy: Trophy,
  flame: Flame,
  sparkles: Sparkles,
};

export const AdminCategoriesTab: React.FC = () => {
  const { categories, createCategory, updateCategory, deleteCategory, showToast } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('Gamepad2');

  const handleOpenNew = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormIcon('Gamepad2');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug || cat.id);
    setFormIcon(cat.icon || 'Gamepad2');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('error', 'Form Error', 'Category name is required.');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formName.trim(),
          slug: formSlug.trim() || formName.toLowerCase().replace(/\s+/g, '-'),
          icon: formIcon,
        });
        showToast('success', 'Category Updated');
      } else {
        await createCategory({
          name: formName.trim(),
          slug: formSlug.trim() || formName.toLowerCase().replace(/\s+/g, '-'),
          icon: formIcon,
          active: true,
        });
        showToast('success', 'Category Created');
      }
      setIsModalOpen(false);
    } catch {
      // Handled
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this category?')) return;
    try {
      await deleteCategory(id);
      showToast('success', 'Category Removed');
    } catch {
      // Handled
    }
  };

  const filteredCategories = (categories || []).filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Categories Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black shrink-0">
            <Folder size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Store Categories</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {categories.length} GROUPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Manage storefront catalog filters, game classifications, & icons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNew}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search category name, slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Categories Stream (Mobile Cards) */}
      <div className="space-y-2.5">
        {filteredCategories.map((cat) => {
          const IconComp = ICON_MAP[(cat.icon || cat.slug || 'gamepad2').toLowerCase()] || Gamepad2;
          return (
            <div
              key={cat.id}
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <IconComp size={18} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600">
                      {cat.slug || cat.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Order: {cat.display_order || 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Folder className="text-purple-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Mobile Games"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Slug / URL Identifier</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. mobile-games"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Icon</label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Smartphone">Smartphone (Mobile)</option>
                    <option value="Monitor">Monitor (PC)</option>
                    <option value="Gamepad2">Gamepad (Console)</option>
                    <option value="Ticket">Ticket (Vouchers)</option>
                    <option value="Gift">Gift (Gift Cards)</option>
                    <option value="Crown">Crown (VIP / Memberships)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-600/30"
                  >
                    Save Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategoriesTab;
