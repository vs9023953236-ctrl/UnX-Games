import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../context/StoreContext';
import { api } from '../../../services/api';
import { formatDate, formatTimeAgo } from '../../../utils/formatters';
import { ActivityLog } from '../../../types';
import {
  ShieldAlert,
  Search,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  Settings,
  Newspaper,
  Bell,
  Lock,
  RefreshCw,
  Copy,
  Check,
  Filter,
  X,
  ChevronRight,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminActivityLogsTab: React.FC = () => {
  const { showToast } = useStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.admin.getActivityLogs();
      if (res.success && Array.isArray(res.logs)) {
        setLogs(res.logs);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    showToast('info', 'Copied to clipboard', label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTargetIcon = (targetType: string = '') => {
    const t = targetType.toLowerCase();
    if (t.includes('order')) return <ShoppingBag size={14} className="text-blue-500" />;
    if (t.includes('payment')) return <CreditCard size={14} className="text-emerald-500" />;
    if (t.includes('user') || t.includes('customer')) return <User size={14} className="text-purple-500" />;
    if (t.includes('setting') || t.includes('app')) return <Settings size={14} className="text-amber-500" />;
    if (t.includes('news')) return <Newspaper size={14} className="text-cyan-500" />;
    if (t.includes('security') || t.includes('auth')) return <Lock size={14} className="text-rose-500" />;
    return <ShieldCheck size={14} className="text-slate-500" />;
  };

  const filteredLogs = logs.filter((log) => {
    const type = (log.targetType || (log as any).target_type || 'system').toLowerCase();
    const action = (log.action || '').toLowerCase();
    const desc = (log.description || '').toLowerCase();
    const admin = (log.adminName || log.adminEmail || (log as any).createdBy || '').toLowerCase();

    if (targetFilter !== 'all' && !type.includes(targetFilter)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return action.includes(q) || desc.includes(q) || admin.includes(q) || String(log.id).includes(q);
    }

    return true;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black shrink-0">
            <Clock size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Admin Activity Logs</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                AUDIT TRAIL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Immutable staff actions, config changes, & operational ledger ({filteredLogs.length} entries)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Chips (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: 'All Actions' },
          { id: 'order', label: 'Orders' },
          { id: 'payment', label: 'Payments' },
          { id: 'user', label: 'Users' },
          { id: 'setting', label: 'Settings' },
          { id: 'security', label: 'Security' },
        ].map((chip) => {
          const active = targetFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setTargetFilter(chip.id)}
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

      {/* Compact Search Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, description, admin email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Compact Mobile Logs Stream */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[640px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading activity audit log...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Clock size={28} className="mx-auto mb-1.5 text-slate-300" />
            <p className="font-bold text-slate-800 text-xs">No Activity Records</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No logged actions match your current search.</p>
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={log.id || idx}
              onClick={() => setSelectedLog(log)}
              className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5">
                  {getTargetIcon(log.targetType || (log as any).target_type)}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">{log.action}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                      {log.targetType || (log as any).target_type || 'SYSTEM'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1">{log.description}</p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{log.adminName || log.adminEmail || 'Admin'}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(log.createdAt || (log as any).created_at)}</span>
                  </div>
                </div>
              </div>

              <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-blue-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">Activity Log Inspector</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Action:</span>
                  <span className="font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Type:</span>
                  <span className="text-blue-600 font-bold">{selectedLog.targetType || 'SYSTEM'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor:</span>
                  <span className="text-slate-800 font-bold">{selectedLog.adminName || selectedLog.adminEmail || 'Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="text-slate-700">{new Date(selectedLog.createdAt || selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700">Description</span>
                <p className="p-2.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono break-words">
                  {selectedLog.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminActivityLogsTab;
