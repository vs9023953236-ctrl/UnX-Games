import React, { useState, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR, formatTimeAgo } from '../../../utils/formatters';
import { exportOrdersToCSV } from '../../../utils/csvExport';
import { getOfficialGameImage } from '../../../utils/gameImageHelper';
import { Order, OrderStatus } from '../../../types';
import {
  ShoppingBag,
  Search,
  Download,
  Eye,
  ChevronRight,
  Phone,
  MessageCircle,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { ModalPortal } from '../../../components/common/ModalPortal';

export const AdminOrdersTab: React.FC = () => {
  const {
    orders,
    syncOrdersFromBackend,
    setAdminTab,
    setAdminSelectedOrderId,
    updateOrderStatus,
    deleteOrder,
    clearAllOrders,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isSuperAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'ADMIN'].includes(uRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    syncOrdersFromBackend?.();
  }, [syncOrdersFromBackend]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncOrdersFromBackend?.();
      showToast('info', 'Orders Synced', 'Refreshed live orders from database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const adminInfo = currentUser ? {
    uid: currentUser.id || (currentUser as any).uid || 'admin',
    name: currentUser.name || (currentUser as any).full_name || 'Admin',
    email: currentUser.email || 'admin@unx.com',
  } : undefined;

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('info', 'Copied', text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickComplete = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ok = await updateOrderStatus(orderId, 'completed', 'Completed & Delivered by Admin');
      if (ok) {
        showToast('success', 'Order Completed', 'Diamonds/UC delivered successfully.');
      }
    } catch {
      // Handled
    }
  };

  const handleDeleteSingleOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this order from the database?')) return;
    setIsProcessingAction(true);
    try {
      const res = await deleteOrder(orderId, adminInfo);
      if (res && res.success) {
        showToast('success', 'Order Deleted', 'Order removed permanently from database.');
      }
    } catch (err: any) {
      showToast('error', 'Delete Failed', err?.message || 'Could not delete order.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleClearAll = async () => {
    setIsProcessingAction(true);
    try {
      const res = await clearAllOrders(adminInfo);
      if (res && res.success) {
        setShowClearConfirm(false);
        showToast('success', 'All Orders Cleared', 'All test orders deleted permanently.');
      }
    } catch (err: any) {
      showToast('error', 'Clear Failed', err?.message || 'Could not clear orders.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.orderStatus || (o as any).status || '').toLowerCase();
      if (activeFilter === 'pending' && st !== 'payment_verification' && st !== 'pending' && st !== 'pending_verification') return false;
      if (activeFilter === 'processing' && st !== 'processing') return false;
      if (activeFilter === 'completed' && st !== 'completed' && st !== 'delivered') return false;
      if (activeFilter === 'cancelled' && st !== 'cancelled' && st !== 'payment_failed') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.orderCode?.toLowerCase().includes(q) ||
          o.productName?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.includes(q) ||
          o.playerId?.includes(q) ||
          (o as any).playerUid?.includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  const pendingCount = orders.filter((o) => {
    const st = (o.orderStatus || (o as any).status || '').toLowerCase();
    return st === 'payment_verification' || st === 'pending' || st === 'processing';
  }).length;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Orders Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black shrink-0">
            <ShoppingBag size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Order Management</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {orders.length} TOTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Actionable Queue: <strong className="text-amber-400 font-mono">{pendingCount} orders awaiting action</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            title="Refresh orders from database"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sync Orders</span>
          </button>

          {orders.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear / Delete all orders"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}

          <button
            onClick={() => exportOrdersToCSV(orders)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Orders (${orders.length})` },
          { id: 'pending', label: `Awaiting (${pendingCount})` },
          { id: 'processing', label: 'Processing' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((chip) => {
          const active = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
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
            placeholder="Search order code, game, customer, player UID, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orders Stream (Mobile Cards) */}
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
            <ShoppingBag size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">No Orders Found</p>
            <p className="text-xs text-slate-500 mt-0.5">No orders match the selected filter criteria.</p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const st = (order.orderStatus || (order as any).status || 'pending').toLowerCase();
            const isCompleted = st === 'completed' || st === 'delivered';
            const isPending = st === 'payment_verification' || st === 'pending';
            const isProcessing = st === 'processing';

            return (
              <div
                key={`admin-order-${order.id || idx}-${idx}`}
                onClick={() => {
                  setAdminSelectedOrderId(order.id);
                  setAdminTab('order_detail');
                }}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer hover:border-blue-500 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200/80 shadow-2xs relative self-start sm:self-center">
                    <img
                      src={getOfficialGameImage(order.productId, order.productName, order.productImage)}
                      alt={order.productName || 'Product'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getOfficialGameImage(order.productId, order.productName);
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs sm:text-sm text-slate-900 font-mono tracking-tight shrink-0">
                        #{order.orderCode || order.id.slice(0, 8)}
                      </span>
                      <span className="font-extrabold text-xs sm:text-sm text-slate-800 truncate max-w-[170px] sm:max-w-xs">
                        {order.productName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/80'
                            : isProcessing
                            ? 'bg-blue-100/90 text-blue-800 border border-blue-200/80'
                            : isPending
                            ? 'bg-amber-100/90 text-amber-800 border border-amber-200/80 animate-pulse'
                            : 'bg-rose-100/90 text-rose-800 border border-rose-200/80'
                        }`}
                      >
                        {st}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 font-medium">
                      <span className="font-black text-slate-900 font-mono text-xs sm:text-sm">
                        {formatNPR(Number(order.totalAmount || order.amount || (order as any).total_amount || order.price || 0))}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="truncate max-w-[130px] sm:max-w-none text-slate-700 font-semibold">{order.packageName}</span>
                      {(order.playerId || (order as any).playerUid || order.gameUserId || (order as any).game_uid || (order as any).uid) && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded-md text-[10px] shrink-0 border border-slate-200">
                            UID: {order.playerId || (order as any).playerUid || order.gameUserId || (order as any).game_uid || (order as any).uid}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span className="truncate max-w-[120px] sm:max-w-none font-semibold text-slate-600">{order.customerName || order.customerEmail || 'Customer'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-slate-400">{formatTimeAgo(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!isCompleted && !st.includes('cancel') && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickComplete(order.id, e)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Check size={13} />
                      <span>Complete</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSingleOrder(order.id, e)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Order Permanently"
                  >
                    <Trash2 size={14} />
                  </button>

                  <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                    <ChevronRight size={18} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Orders Confirmation Modal */}
      <ModalPortal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} zIndex={999999}>
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-24 sm:pb-4 overflow-y-auto"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-white border sm:border border-slate-200 rounded-3xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 shadow-2xl relative text-slate-900 my-auto mb-20 sm:mb-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete All Orders</h3>
                <p className="text-xs text-slate-500 font-medium">Permanent database purge</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50 p-3 rounded-2xl border border-rose-100 font-medium">
              Are you sure you want to permanently clear and delete <strong className="text-slate-900">ALL {orders.length} orders</strong> from the database? This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                {isProcessingAction ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{isProcessingAction ? 'Clearing...' : 'Yes, Delete All'}</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default AdminOrdersTab;
