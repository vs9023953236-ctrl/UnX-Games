import React, { useState, useMemo } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR } from '../../../utils/formatters';
import {
  FileBarChart,
  Download,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Users,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

type DateFilter = 'today' | '7days' | '30days' | 'this_month' | 'all';

export const AdminReportsTab: React.FC = () => {
  const { orders, products, showToast } = useStore();
  const { users } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return true;

      switch (dateFilter) {
        case 'today':
          return (
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        case '7days':
          return orderDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30days':
          return orderDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'this_month':
          return (
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        case 'all':
        default:
          return true;
      }
    });
  }, [orders, dateFilter]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(
      (o) => o.orderStatus === 'completed' || (o as any).status === 'completed' || (o as any).status === 'delivered'
    );
    const completedCount = completedOrders.length;
    const cancelledCount = filteredOrders.filter(
      (o) => o.orderStatus === 'cancelled' || (o as any).status === 'cancelled'
    ).length;
    const pendingCount = totalOrders - completedCount - cancelledCount;

    const totalRevenue = completedOrders.reduce(
      (acc, o) => acc + (Number(o.totalAmount || (o as any).total_amount) || 0),
      0
    );

    const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    const successRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;

    return {
      totalOrders,
      completedCount,
      pendingCount,
      cancelledCount,
      totalRevenue,
      avgOrderValue,
      successRate,
    };
  }, [filteredOrders]);

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      showToast('error', 'Export Notice', 'No orders in current timeframe.');
      return;
    }

    const headers = ['Order Code', 'Date', 'Customer', 'Product', 'Package', 'Amount', 'Payment Method', 'Status'];
    const rows = filteredOrders.map((o) => [
      o.orderCode || o.id,
      new Date(o.createdAt).toLocaleDateString(),
      o.customerName || (o as any).userName || 'Customer',
      o.productName,
      o.packageName,
      o.totalAmount,
      o.paymentMethod,
      o.orderStatus || (o as any).status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unx-reports-${dateFilter}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Report Exported', 'CSV summary generated successfully.');
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Dark Revenue Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shrink-0">
            <TrendingUp size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Reports & Analytics</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE METRICS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time revenue, order fulfillment rates, & sales volume analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Chips (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'today', label: 'Today' },
          { id: '7days', label: 'Last 7 Days' },
          { id: '30days', label: 'Last 30 Days' },
          { id: 'this_month', label: 'This Month' },
          { id: 'all', label: 'All-Time' },
        ].map((chip) => {
          const active = dateFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setDateFilter(chip.id as DateFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Metric Cards (Compact 4-col Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</span>
          <div className="text-base sm:text-lg font-black text-emerald-600 font-mono">
            {formatNPR(metrics.totalRevenue)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Avg: {formatNPR(metrics.avgOrderValue)}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</span>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {metrics.totalOrders}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">{metrics.completedCount} Completed</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Fulfillment Rate</span>
          <div className="text-base sm:text-lg font-black text-blue-600 font-mono">
            {metrics.successRate}%
          </div>
          <span className="text-[10px] text-amber-600 font-bold">{metrics.pendingCount} Pending</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Gamers</span>
          <div className="text-base sm:text-lg font-black text-purple-600 font-mono">
            {users.length || 1}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{products.length} Products</span>
        </div>
      </div>

      {/* Top Performing Packages & Game Categories (Compact Mobile List) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          <span>Top Sales in Current Timeframe</span>
        </h3>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <ShoppingBag size={28} className="mx-auto mb-1.5 text-slate-300" />
            <p className="font-bold text-slate-800 text-xs">No Orders Found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No orders found in the selected timeframe.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
            {filteredOrders.slice(0, 15).map((o, idx) => (
              <div key={o.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{o.productName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{o.packageName} • {o.orderCode || o.id}</div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 font-mono">{formatNPR(Number(o.totalAmount || o.amount || (o as any).total_amount || o.price || 0))}</div>
                  <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {o.orderStatus || (o as any).status || 'COMPLETED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsTab;
