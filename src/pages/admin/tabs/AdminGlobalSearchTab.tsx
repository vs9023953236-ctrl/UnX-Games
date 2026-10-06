import React, { useState } from 'react';
import {
  Search,
  Users,
  ShoppingBag,
  CreditCard,
  Package,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  X,
  Copy,
  Check,
  User,
  ExternalLink,
  ChevronRight,
  Hash,
  Phone,
  Mail,
  Gamepad2,
  Sparkles,
  Zap,
  Ticket,
  ShieldCheck,
  QrCode,
  Plus,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { api } from '../../../services/api';
import { formatDisplayOrderId } from '../../../utils/formatters';

export const AdminGlobalSearchTab: React.FC = () => {
  const {
    showToast,
    setAdminTab,
    setSelectedProductId,
    setAdminSelectedProductId,
    setSelectedOrderId,
    setAdminSelectedOrderId,
    setAdminSelectedUserId,
  } = useStore() as any;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'orders' | 'customers' | 'payments' | 'products'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const executeSearch = async (searchTerm: string) => {
    const cleanQuery = searchTerm.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.admin.search(cleanQuery);
      if (res.success) {
        setResults(res.results);
      } else {
        showToast('error', 'Search Notice', res.message || 'Error executing search.');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', err.message || 'Could not connect to search API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast('info', 'Copied', `${label} copied to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleInspectOrder = (orderId: string) => {
    if (typeof setAdminSelectedOrderId === 'function') setAdminSelectedOrderId(orderId);
    if (typeof setSelectedOrderId === 'function') setSelectedOrderId(orderId);
    if (typeof setAdminTab === 'function') setAdminTab('order_detail');
  };

  const handleInspectProduct = (productId: string) => {
    if (typeof setAdminSelectedProductId === 'function') setAdminSelectedProductId(productId);
    if (typeof setSelectedProductId === 'function') setSelectedProductId(productId);
    if (typeof setAdminTab === 'function') setAdminTab('product_edit');
  };

  const handleInspectCustomer = (customerId: string) => {
    if (typeof setAdminSelectedUserId === 'function') setAdminSelectedUserId(customerId);
    if (typeof setAdminTab === 'function') setAdminTab('user_detail');
  };

  const totalResults = results
    ? (results.customers?.length || 0) +
      (results.orders?.length || 0) +
      (results.payments?.length || 0) +
      (results.products?.length || 0)
    : 0;

  const quickPills = [
    { label: 'Free Fire UID', query: '657315028' },
    { label: 'Recent Order', query: 'GHN-' },
    { label: 'eSewa Pay', query: 'eSewa' },
    { label: 'Customers', query: '@' },
  ];

  const getOrderStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'processing') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'pending' || s === 'under_review') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'cancelled' || s === 'rejected' || s === 'failed') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getPaymentStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'verified' || s === 'completed' || s === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'rejected' || s === 'failed') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Mobile App Native Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Search size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">System Global Search</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-100">
                PostgreSQL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Search cross-table entries instantly across orders, payments, customers, and catalog items.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Search Input & Quick Shortcuts */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search UID, Order #, TXN ID, email, name, phone..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-4 sm:px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs sm:text-sm font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            {loading ? <RefreshCw className="animate-spin" size={15} /> : <Search size={15} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Quick:</span>
          {quickPills.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(pill.query);
                executeSearch(pill.query);
              }}
              className="h-7 px-2.5 rounded-lg bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 text-slate-600 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Results Section */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <RefreshCw size={28} className="animate-spin text-red-600 mx-auto" />
          <p className="text-xs sm:text-sm font-bold text-slate-800">Searching PostgreSQL database...</p>
          <p className="text-[11px] text-slate-400 font-medium">Checking across orders, customers, payments, and catalog items</p>
        </div>
      ) : hasSearched && results ? (
        <div className="space-y-4">
          {/* Result Filter Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveCategory('all')}
                className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  activeCategory === 'all'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span>All Results</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeCategory === 'all' ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {totalResults}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('orders')}
                className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  activeCategory === 'orders'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span>Orders</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeCategory === 'orders' ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {results.orders?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('customers')}
                className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  activeCategory === 'customers'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span>Customers</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeCategory === 'customers' ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {results.customers?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('payments')}
                className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  activeCategory === 'payments'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span>Payments</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeCategory === 'payments' ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {results.payments?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('products')}
                className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  activeCategory === 'products'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span>Products</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeCategory === 'products' ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {results.products?.length || 0}
                </span>
              </button>
            </div>
          </div>

          {totalResults === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 sm:p-14 text-center shadow-xs space-y-3">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No records found for "{query}"</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try searching with a partial player UID, customer name, mobile number, or order code.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Orders Results */}
              {(activeCategory === 'all' || activeCategory === 'orders') && results.orders?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={16} className="text-red-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Orders Matches</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {results.orders.length} found
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {results.orders.map((o: any, idx: number) => {
                      const displayId = formatDisplayOrderId(o);
                      const characterUid = o.character_id || o.game_uid || o.recipient_uid || '';
                      return (
                        <div
                          key={`ord-${o.id || idx}`}
                          onClick={() => handleInspectOrder(o.id)}
                          className="p-4 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-red-600 text-xs sm:text-sm">
                                #{displayId}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${getOrderStatusBadge(o.order_status)}`}>
                                {o.order_status?.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                              {characterUid && (
                                <div className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  <Gamepad2 size={12} className="text-red-500" />
                                  <span>UID: {characterUid}</span>
                                  <button
                                    onClick={(e) => handleCopy(characterUid, 'Player UID', e)}
                                    className="text-slate-400 hover:text-red-600 p-0.5"
                                  >
                                    {copiedText === characterUid ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                  </button>
                                </div>
                              )}
                              {o.customer_name_snapshot && (
                                <span className="font-medium text-slate-500">
                                  {o.customer_name_snapshot}
                                </span>
                              )}
                              {o.phone_number && (
                                <span className="font-mono text-slate-400 text-[11px]">
                                  {o.phone_number}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900">
                                Rs. {Number(o.total_amount || 0).toLocaleString()}
                              </span>
                              <p className="text-[10px] font-medium text-slate-400">
                                {o.payment_status || 'Pending'}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectOrder(o.id);
                              }}
                              className="h-8 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>View</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Customers Results */}
              {(activeCategory === 'all' || activeCategory === 'customers') && results.customers?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-purple-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Customers Matches</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {results.customers.length} found
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {results.customers.map((c: any, idx: number) => (
                      <div
                        key={`cust-${c.id || idx}`}
                        onClick={() => handleInspectCustomer(c.id)}
                        className="p-4 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 text-purple-700 font-black text-sm flex items-center justify-center shrink-0">
                            {(c.name || c.email || 'U')[0].toUpperCase()}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{c.name || 'Gamer'}</p>
                              <span className={`px-2 py-0.2 rounded text-[10px] font-black uppercase ${
                                c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {c.status}
                              </span>
                              {c.role && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 uppercase">
                                  {c.role}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-[11px] flex-wrap">
                              <span className="font-mono">{c.email}</span>
                              {(c.phone || c.mobile) && <span>• {c.phone || c.mobile}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectCustomer(c.id);
                          }}
                          className="h-8 px-3 self-end sm:self-center bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Profile</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Payments Results */}
              {(activeCategory === 'all' || activeCategory === 'payments') && results.payments?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Payments Matches</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {results.payments.length} found
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {results.payments.map((p: any, idx: number) => {
                      const txnId = p.transaction_id || '';
                      return (
                        <div
                          key={`pay-${p.id || idx}`}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <span>TXN: {txnId || 'N/A'}</span>
                                {txnId && (
                                  <button
                                    onClick={(e) => handleCopy(txnId, 'Transaction ID', e)}
                                    className="text-slate-400 hover:text-red-600 p-0.5"
                                  >
                                    {copiedText === txnId ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                  </button>
                                )}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700">
                                {p.payment_method}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${getPaymentStatusBadge(p.status)}`}>
                                {p.status}
                              </span>
                            </div>

                            <p className="text-slate-400 font-mono text-[11px]">
                              Linked Order ID: #{p.order_id}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                            <span className="text-sm font-black text-emerald-600 font-mono">
                              Rs. {Number(p.amount || 0).toLocaleString()}
                            </span>
                            {p.order_id && (
                              <button
                                onClick={() => handleInspectOrder(p.order_id)}
                                className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <span>Order</span>
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Products Results */}
              {(activeCategory === 'all' || activeCategory === 'products') && results.products?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-amber-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Catalog Matches</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {results.products.length} found
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {results.products.map((pr: any, idx: number) => (
                      <div
                        key={`prod-${pr.id || idx}`}
                        onClick={() => handleInspectProduct(pr.id)}
                        className="p-4 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {pr.image_url ? (
                            <img
                              src={pr.image_url}
                              alt={pr.title || pr.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                              <Package size={20} />
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{pr.title || pr.name}</p>
                            <p className="text-slate-400 font-medium text-[11px]">
                              {pr.slug || pr.category_id || 'Top-up Package'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pr.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {pr.active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectProduct(pr.id);
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                          >
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Interactive Quick Action Command Launchpad */
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-red-600" size={18} />
                <h3 className="text-sm font-black text-slate-900">Console Quick Actions & Shortcuts</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">1-Click Launchpad</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Add New Product', icon: Plus, tab: 'product_new', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
                { label: 'Create Promo Coupon', icon: Ticket, tab: 'coupons', color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
                { label: 'AI Push Broadcast', icon: Sparkles, tab: 'notifications', color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100' },
                { label: 'Verify Payments', icon: CreditCard, tab: 'payments', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
                { label: 'Review KYC Docs', icon: ShieldCheck, tab: 'kyc', color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
                { label: 'QR Gateway Setup', icon: QrCode, tab: 'payment_settings', color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
                { label: 'AI Control Tower', icon: Zap, tab: 'control_center', color: 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100' },
                { label: 'Manage Wallets', icon: Users, tab: 'wallets', color: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100' },
              ].map((act, i) => {
                const Icon = act.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (typeof setAdminTab === 'function') setAdminTab(act.tab);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${act.color}`}
                  >
                    <div className="p-2 rounded-xl bg-white/80 shadow-2xs shrink-0">
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold leading-tight">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs space-y-2">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-500">
              <Search size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Search System Database</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Type any customer email, Free Fire player UID, order ID (GHN-), or transaction code above to inspect full records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminGlobalSearchTab;
