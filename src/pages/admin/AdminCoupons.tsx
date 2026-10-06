import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Coupon } from '../../types';
import { Trash2, Plus, Edit2, Ticket, Percent, Search, X, Check, ArrowLeft, MoreVertical, Copy, RefreshCw, Sparkles, Calendar, Database, CheckCircle2 } from 'lucide-react';
import { formatNPR } from '../../utils/formatters';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useStore();

  const formatCouponDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Active Now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Active Now';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Active Now';
    }
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.coupons.getAll();
      if (res.success) {
        setCoupons(res.coupons || []);
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Error', 'Failed to load coupons');
    }
    setLoading(false);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await api.coupons.syncAll();
      if (res.success) {
        setCoupons(res.coupons || []);
        showToast('success', 'Supabase Synced', 'All coupons linked to Supabase with real usage data & 99 uses limit!');
      } else {
        showToast('error', 'Sync Failed', res.message || 'Failed to sync coupons.');
      }
    } catch (err: any) {
      showToast('error', 'Sync Error', err?.message || 'Failed to sync coupons.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this coupon?')) {
      const res = await api.coupons.delete(id);
      if (res.success) {
        showToast('success', 'Coupon Deleted', 'Coupon removed successfully.');
        fetchCoupons();
      } else {
        showToast('error', 'Error', res.message || 'Failed to delete coupon.');
      }
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('success', 'Copied', 'Coupon code copied to clipboard!');
  };

  const filteredCoupons = coupons.filter(c => 
    c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Mobile-Style Header */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Ticket size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Vouchers & Promos</h2>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Supabase Real-Time Synced &bull; Real usage count from live orders</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSyncAll}
              disabled={syncing}
              className="h-10 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 text-emerald-700 font-bold text-xs flex items-center gap-2 transition-all shadow-xs shrink-0 disabled:opacity-50"
              title="Sync with Supabase live orders and activate all with 99 uses limit"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing...' : 'Sync Supabase (Real Data)'}</span>
            </button>
            <button 
              onClick={() => { setEditingCoupon(null); setShowModal(true); }}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-red-600/20 shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Create Code</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by code or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Mobile App Style List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium text-sm animate-pulse">Loading vouchers...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <Ticket size={24} className="text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">No vouchers found</p>
              <p className="text-xs text-slate-500 mt-0.5">Create your first discount code</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCoupons.map((c, cIdx) => {
              const isPercent = (c.discountType || (c as any).discount_type || '').toString().toLowerCase() === 'percentage';
              const discountVal = Number(c.discountValue ?? (c as any).discount_value ?? 0);
              const isActive = c.isActive !== undefined ? Boolean(c.isActive) : (c as any).is_active !== undefined ? Boolean((c as any).is_active) : (c as any).active !== undefined ? Boolean((c as any).active) : true;
              const usedCount = Number(c.usedCount ?? (c as any).used_count ?? 0);
              const usageLimit = c.usageLimit !== undefined && c.usageLimit !== null && Number(c.usageLimit) > 0
                ? Number(c.usageLimit)
                : ((c as any).usage_limit !== undefined && (c as any).usage_limit !== null && Number((c as any).usage_limit) > 0 ? Number((c as any).usage_limit) : 99);
              const category = c.category || (c as any).category || 'All';
              const minSpend = Number(c.minOrderAmount ?? (c as any).min_order_amount ?? (c as any).minimum_order_amount ?? 0);
              const remaining = Math.max(0, usageLimit - usedCount);

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`admin-coupon-${c.id || c.code || cIdx}-${cIdx}`} 
                  className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3 relative overflow-hidden"
                >
                  {/* Decoration */}
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full opacity-50 pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-sm text-white shrink-0">
                        <Percent size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 tracking-tight text-sm uppercase">{c.code}</h3>
                          <button onClick={() => copyCode(c.code)} className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer" title="Copy Code">
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-red-600 mt-0.5">
                          {isPercent ? `${discountVal}% OFF` : `${formatNPR(discountVal)} OFF`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setEditingCoupon(c); setShowModal(true); }}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100/60 border-dashed grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Category</span>
                      <span className="text-slate-700 font-semibold">{category}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Status</span>
                      <span className={`inline-flex items-center gap-1.5 font-bold ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Usage Limit</span>
                      <span className="text-slate-800 font-bold">
                        <span className={usedCount > 0 ? 'text-red-600 font-extrabold' : 'text-slate-800'}>{usedCount}</span> / {usageLimit} <span className="text-[10px] font-normal text-slate-400">({remaining} left)</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Min Spend</span>
                      <span className="text-slate-700 font-semibold">{minSpend > 0 ? formatNPR(minSpend) : 'No min'}</span>
                    </div>
                  </div>

                  {/* Real Date & Supabase Sync Status Footer */}
                  <div className="pt-2.5 mt-0.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium" title="Real Date Created/Active">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span>Date: <strong className="text-slate-700 font-semibold">{formatCouponDate(c.createdAt || (c as any).created_at)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Database size={10} className="text-emerald-500" />
                      <span>Supabase Live</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <CouponModal 
            coupon={editingCoupon} 
            onClose={() => {
              setShowModal(false);
              fetchCoupons();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const CouponModal = ({ coupon, onClose }: { coupon: Coupon | null, onClose: () => void }) => {
  const { showToast } = useStore();
  const [loading, setLoading] = useState(false);
  
  const getInitialForm = () => {
    if (coupon) {
      const isPercent = (coupon.discountType || (coupon as any).discount_type || '').toString().toLowerCase() !== 'fixed';
      const limit = coupon.usageLimit !== undefined && coupon.usageLimit !== null && Number(coupon.usageLimit) > 0
        ? Number(coupon.usageLimit)
        : ((coupon as any).usage_limit !== undefined && Number((coupon as any).usage_limit) > 0 ? Number((coupon as any).usage_limit) : 99);
      return {
        ...coupon,
        code: coupon.code || '',
        discountType: isPercent ? 'percentage' as const : 'fixed' as const,
        discountValue: Number(coupon.discountValue ?? (coupon as any).discount_value ?? 0),
        category: coupon.category || (coupon as any).category || 'All',
        isActive: coupon.isActive !== undefined ? Boolean(coupon.isActive) : (coupon as any).is_active !== undefined ? Boolean((coupon as any).is_active) : true,
        usedCount: Number(coupon.usedCount ?? (coupon as any).used_count ?? 0),
        minOrderAmount: Number(coupon.minOrderAmount ?? (coupon as any).min_order_amount ?? 0),
        maxDiscount: Number(coupon.maxDiscount ?? (coupon as any).max_discount ?? 0),
        usageLimit: limit,
        notifyUsers: false,
        notifyAudience: 'ALL',
        description: coupon.description || '',
      };
    }
    return {
      code: '',
      discountType: 'percentage' as const,
      discountValue: 10,
      category: 'All',
      isActive: true,
      usedCount: 0,
      minOrderAmount: 0,
      maxDiscount: 0,
      usageLimit: 99,
      notifyUsers: false,
      notifyAudience: 'ALL',
      description: '',
    };
  };

  const [formData, setFormData] = useState<Partial<Coupon> & { notifyUsers?: boolean; notifyAudience?: string; description?: string; }>(getInitialForm());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || Number(formData.discountValue || 0) <= 0) {
      showToast('error', 'Validation Error', 'Code and valid discount value are required.');
      return;
    }

    setLoading(true);
    const newCoupon = {
      ...formData,
      code: formData.code.toUpperCase().replace(/\s+/g, ''), // Clean code
      usageLimit: Number(formData.usageLimit) > 0 ? Number(formData.usageLimit) : 99,
      isActive: formData.isActive !== undefined ? formData.isActive : true
    };

    try {
      if (coupon?.id) {
        await api.coupons.update(coupon.id, newCoupon);
        showToast('success', 'Updated', 'Coupon updated successfully!');
      } else {
        await api.coupons.create(newCoupon);
        showToast('success', 'Created', 'New coupon created successfully!');
      }
      onClose();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to save coupon');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0 overflow-hidden">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      {/* Modal / Bottom Sheet */}
      <motion.div 
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-200" />
        </div>

        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Ticket size={16} />
            </div>
            <h2 className="text-lg font-black text-slate-900">{coupon ? 'Edit Voucher' : 'Create Voucher'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 overscroll-contain">
          <form id="coupon-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Code & Active Status */}
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Voucher Code</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. WELCOME20"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all uppercase placeholder-slate-400" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                />
              </div>
              <div className="shrink-0 pt-7">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-3 text-xs font-bold text-slate-700">{formData.isActive ? 'Active' : 'Disabled'}</span>
                </label>
              </div>
            </div>

            {/* Discount Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Type</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-500 transition-all" 
                  value={formData.discountType} 
                  onChange={e => setFormData({...formData, discountType: e.target.value as 'percentage' | 'fixed'})}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs.)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Value</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm font-bold">{formData.discountType === 'fixed' ? 'Rs' : '%'}</span>
                  </div>
                  <input 
                    required 
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-9 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" 
                    value={formData.discountValue || ''} 
                    onChange={e => setFormData({...formData, discountValue: Number(e.target.value)})} 
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Category / Audience</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all" 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value as any})}
              >
                <option value="All">All / General</option>
                <option value="Special Offers">Special Events & Offers</option>
                <option value="Payment Offers">Payment Wallet Offers (eSewa/Khalti)</option>
                <option value="New User Offers">New Users Only</option>
              </select>
            </div>

            {/* Constraints */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">Min Order Amount</label>
                <input 
                  type="number" 
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400" 
                  value={formData.minOrderAmount || ''} 
                  onChange={e => setFormData({...formData, minOrderAmount: Number(e.target.value)})} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">Max Discount Limit</label>
                <input 
                  type="number" 
                  placeholder="Optional"
                  disabled={formData.discountType === 'fixed'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50 disabled:bg-slate-100 placeholder-slate-400" 
                  value={formData.maxDiscount || ''} 
                  onChange={e => setFormData({...formData, maxDiscount: Number(e.target.value)})} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500">Max Usages Limit (Default: 99)</label>
              <input 
                type="number" 
                placeholder="99"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400" 
                value={formData.usageLimit ?? 99} 
                onChange={e => setFormData({...formData, usageLimit: Number(e.target.value)})} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500">Expiry Date (Optional - Leave blank for lifetime validity)</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400" 
                value={formData.expiresAt ? String(formData.expiresAt).substring(0, 10) : ''} 
                onChange={e => setFormData({...formData, expiresAt: e.target.value || null})} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500">Offer Description / Notification Message</label>
              <input 
                type="text" 
                placeholder="E.g., Get 10% off for being a new user!"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400" 
                value={formData.description || ''} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>

            {!coupon && (
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={formData.notifyUsers} 
                    onChange={e => setFormData({...formData, notifyUsers: e.target.checked})}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">Push Notification to Users</span>
                </label>

                {formData.notifyUsers && (
                  <div className="space-y-1.5 pl-2 border-l-2 border-red-100 ml-2">
                    <label className="text-[11px] font-bold text-slate-500">Target Audience</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 transition-all" 
                      value={formData.notifyAudience || 'ALL'} 
                      onChange={e => setFormData({...formData, notifyAudience: e.target.value})} 
                    >
                      <option value="ALL">All Users</option>
                      <option value="NEW_USER">New Users Only</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="coupon-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : <Check size={16} />}
            <span>{coupon ? 'Save Changes' : 'Create Voucher'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
export default AdminCoupons;
