import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  ArrowLeft,
  RefreshCw,
  Key,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  Bell,
  CreditCard,
  Package,
  Activity,
  MessageSquare,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

import { motion, AnimatePresence } from 'motion/react';

export const AdminDbInspectorTab: React.FC = () => {
  const { showToast, bulkClearRecords } = useStore();
  const { currentUser } = useAuth();

  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [loadingInspector, setLoadingInspector] = useState(false);
  const [discovery, setDiscovery] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Pagination states
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Storage and Bulk Purge States
  const [storageCounts, setStorageCounts] = useState<any | null>(null);
  const [loadingStorageCounts, setLoadingStorageCounts] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<string | null>(null);
  const [purgeTitle, setPurgeTitle] = useState<string>('');
  const [purgeDescription, setPurgeDescription] = useState<string>('');
  const [isPurging, setIsPurging] = useState(false);

  // Debug Join Utility State
  const [debugJoinData, setDebugJoinData] = useState<any | null>(null);
  const [loadingDebugJoins, setLoadingDebugJoins] = useState(false);

  // AI Database Intelligence Copilot State
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  const handleRunAiCopilot = async (overridePrompt?: string) => {
    const promptToRun = (overridePrompt || aiQuery).trim();
    if (!promptToRun) return;
    setAiLoading(true);
    try {
      const res = await api.ai.databaseCopilot(promptToRun, {
        storageCounts,
        selectedTable,
        discoveryTablesCount: discovery.length,
      });
      if (res && res.success) {
        setAiResult(res);
        showToast('success', 'AI Database Copilot', 'Database intelligence query analyzed.');
      } else {
        showToast('error', 'AI Notice', res?.message || 'Failed to analyze database query.');
      }
    } catch (err: any) {
      showToast('error', 'AI Copilot Error', err.message || 'Could not reach AI database engine.');
    } finally {
      setAiLoading(false);
    }
  };

  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;

  const adminInfo = currentUser
    ? {
        uid: currentUser.uid,
        name: currentUser.name || 'Admin',
        email: currentUser.email,
      }
    : undefined;

  const fetchStorageCounts = async () => {
    setLoadingStorageCounts(true);
    try {
      const res = await api.admin.getStorageCounts();
      if (res.success) {
        setStorageCounts(res.counts || null);
      }
    } catch (err: any) {
      console.warn('Could not fetch storage counts:', err.message);
    } finally {
      setLoadingStorageCounts(false);
    }
  };

  const runDebugJoins = async () => {
    setLoadingDebugJoins(true);
    try {
      const res = await api.admin.getDebugJoins();
      if (res.success) {
        setDebugJoinData(res);
        showToast(
          'success',
          'Join Audit Complete',
          `Integrity: ${res.summary?.joinIntegrityPercent || 100}% (${res.summary?.matchedOrders || 0}/${res.summary?.totalOrders || 0} orders matched).`
        );
      } else {
        showToast('error', 'Audit Notice', res.message || 'Could not run join audit.');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', err.message);
    } finally {
      setLoadingDebugJoins(false);
    }
  };

  const fetchDiscovery = async () => {
    setLoadingDiscovery(true);
    try {
      const res = await api.admin.getDatabaseDiscovery();
      if (res.success) {
        setDiscovery(res.tables || []);
      } else {
        showToast('error', 'Notice', res.message || 'Failed to parse database metadata.');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', err.message || 'Failed to connect to database discovery API.');
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const fetchInspector = async (tableName: string, newOffset = 0) => {
    setLoadingInspector(true);
    try {
      const res = await api.admin.getDataInspector(tableName, limit, newOffset);
      if (res.success || res.rows) {
        setTableRows(res.rows || []);
        setTableColumns(res.columns || []);
        setTotalRows(res.totalRows || 0);
      } else {
        showToast('error', 'Access Notice', res.message || 'Cannot read records from target table.');
      }
    } catch (err: any) {
      showToast('error', 'Query Error', err.message || 'Failed to run database data inspection.');
    } finally {
      setLoadingInspector(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchDiscovery();
      fetchStorageCounts();
    }
  }, [isSuperAdmin]);

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setOffset(0);
    setSearchTerm('');
    fetchInspector(tableName, 0);
  };

  const handleCloseInspector = () => {
    setSelectedTable(null);
    setTableRows([]);
    setTableColumns([]);
    setTotalRows(0);
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    let newOffset = offset;
    if (direction === 'next') {
      newOffset = offset + limit;
    } else {
      newOffset = Math.max(0, offset - limit);
    }
    setOffset(newOffset);
    if (selectedTable) {
      fetchInspector(selectedTable, newOffset);
    }
  };

  const promptPurge = (target: string, title: string, description: string) => {
    setPurgeTarget(target);
    setPurgeTitle(title);
    setPurgeDescription(description);
  };

  const handleExecutePurge = async () => {
    if (!purgeTarget) return;
    setIsPurging(true);
    try {
      await bulkClearRecords({
        target: purgeTarget,
        adminInfo,
      });
      // Refresh counts and discovery
      await Promise.all([fetchStorageCounts(), fetchDiscovery()]);
      setPurgeTarget(null);
    } catch (e: any) {
      showToast('error', 'Purge Failed', e.message);
    } finally {
      setIsPurging(false);
    }
  };

  // Local Search filtering
  const filteredRows = tableRows.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row).some((val) =>
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (!isSuperAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-xs">
            🔒
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Database Inspector & Low-Level Schema Operations are restricted exclusively to the Store Owner.
            </p>
            <p className="text-xs text-slate-400">
              Current Role: <span className="font-bold text-slate-700 uppercase">{currentUser?.role || 'Staff'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl">
            <Database size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Database Storage & Maintenance Center
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Manage database load, bulk clear redundant history, and inspect Supabase PostgreSQL tables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={runDebugJoins}
            disabled={loadingDebugJoins}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck size={14} className={loadingDebugJoins ? 'animate-spin' : ''} />
            <span>{loadingDebugJoins ? 'Auditing Joins...' : 'Run Join Audit'}</span>
          </button>
          <button
            onClick={() => {
              fetchDiscovery();
              fetchStorageCounts();
            }}
            disabled={loadingDiscovery || loadingStorageCounts}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={loadingDiscovery || loadingStorageCounts ? 'animate-spin' : ''}
            />
            <span>Refresh Storage</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 0. AI DATABASE INTELLIGENCE COPILOT */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/30 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 shrink-0">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-wide text-white">AI Database Intelligence Copilot</h3>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-[10px] font-black uppercase tracking-wider">
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Query store telemetry, audit payment verification speed, and synthesize SQL in natural language
              </p>
            </div>
          </div>
        </div>

        {/* Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAiCopilot();
          }}
          className="flex flex-col sm:flex-row items-stretch gap-2.5"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g., 'Analyze order status breakdown and suggest optimizations' or 'Check top revenue packages'..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700 text-xs font-medium text-white placeholder-slate-400 outline-none focus:outline-none focus:border-slate-500 transition-all shadow-inner"
            />
            <Zap size={15} className="absolute right-3.5 top-3.5 text-indigo-400 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={!aiQuery.trim() || aiLoading}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 active:scale-95"
          >
            {aiLoading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Analyzing AI DB...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Run AI Query</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Quick Prompts */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1">
          {[
            '📊 Analyze revenue & order status breakdown',
            '⚡ Audit payment verification speed & bottlenecks',
            '👥 Check registered user growth & top customers',
            '💳 Calculate total wallet balance & transaction volume',
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setAiQuery(prompt);
                handleRunAiCopilot(prompt);
              }}
              disabled={aiLoading}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-500/30 text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* AI Analysis Result Card */}
        {aiResult && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-3.5 text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
              <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span>AI Analysis Output</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Query: "{aiResult.query}"</span>
            </div>

            <p className="text-slate-200 leading-relaxed font-medium">{aiResult.reply}</p>

            {/* Suggested SQL */}
            {aiResult.suggestedSql && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Suggested PostgreSQL Query</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult.suggestedSql);
                      showToast('success', 'Copied SQL', 'Query copied to clipboard!');
                    }}
                    className="text-[10px] text-violet-300 hover:text-white font-bold underline cursor-pointer"
                  >
                    Copy Query
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800 selection:bg-violet-600">
                  {aiResult.suggestedSql}
                </pre>
              </div>
            )}

            {/* Bulleted Insights */}
            {Array.isArray(aiResult.insights) && aiResult.insights.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Key Intelligence Insights</span>
                <ul className="space-y-1 text-slate-300 pl-1">
                  {aiResult.insights.map((insight: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px]">
                      <span className="text-violet-400 shrink-0">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <HardDrive size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Database Load & Bulk Storage Optimizer</span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                  Active
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Purge finished orders, payment images, notifications, and logs to optimize database performance
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() =>
                promptPurge(
                  'all_completed_and_redundant',
                  'Master 1-Click Storage Cleanser',
                  'This will safely clear all completed & cancelled orders, payment proof images, read notifications, and old activity logs in one click. Active pending orders and user accounts will NOT be touched.'
                )
              }
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Zap size={14} className="fill-white" />
              <span>Master 1-Click Clear Redundant Data</span>
            </button>
          )}
        </div>

        {/* Live Storage Counts Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Orders Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold truncate">Orders</span>
              <Package size={14} className="text-indigo-600 shrink-0" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">
              {loadingStorageCounts ? '...' : (storageCounts?.orders?.total ?? storageCounts?.totalOrders ?? 0)}
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="text-emerald-600 font-bold">
                  {storageCounts?.orders?.completed ?? storageCounts?.completedOrders ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="text-amber-600 font-bold">
                  {storageCounts?.orders?.pending ?? storageCounts?.pendingOrders ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cancelled:</span>
                <span className="text-rose-600 font-bold">
                  {storageCounts?.orders?.cancelled ?? storageCounts?.cancelledOrders ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Proofs Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold truncate">Payment Proofs</span>
              <CreditCard size={14} className="text-emerald-600 shrink-0" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">
              {loadingStorageCounts ? '...' : (storageCounts?.paymentProofs?.total ?? storageCounts?.totalPaymentProofs ?? 0)}
            </p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 truncate">
              Manual slip receipts & verification
            </p>
          </div>

          {/* Notifications Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold truncate">Notifications</span>
              <Bell size={14} className="text-amber-600 shrink-0" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">
              {loadingStorageCounts ? '...' : (storageCounts?.notifications?.total ?? storageCounts?.totalNotifications ?? 0)}
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Read:</span>
                <span className="text-slate-700 font-bold">
                  {storageCounts?.notifications?.read ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Unread:</span>
                <span className="text-amber-600 font-bold">
                  {storageCounts?.notifications?.unread ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Logs Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold truncate">Activity Logs</span>
              <Activity size={14} className="text-purple-600 shrink-0" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">
              {loadingStorageCounts ? '...' : (storageCounts?.activityLogs?.total ?? storageCounts?.totalActivityLogs ?? 0)}
            </p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 truncate">
              Admin audit trail & security records
            </p>
          </div>

          {/* Support Tickets Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold truncate">Support Inquiries</span>
              <MessageSquare size={14} className="text-sky-600 shrink-0" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">
              {loadingStorageCounts ? '...' : (storageCounts?.supportInquiries?.total ?? storageCounts?.totalSupportTickets ?? 0)}
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Resolved:</span>
                <span className="text-emerald-600 font-bold">
                  {storageCounts?.supportInquiries?.resolved ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Open:</span>
                <span className="text-sky-600 font-bold">
                  {storageCounts?.supportInquiries?.open ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Targeted Bulk Purge Buttons Grid */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">Targeted Quick Purge Options:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* Clear Completed & Cancelled Orders */}
            <button
              onClick={() =>
                promptPurge(
                  'completed_orders',
                  'Clear Completed & Delivered Orders',
                  'Permanently delete all finished orders from the database to reduce space. Active pending orders remain safe.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-emerald-700 block">
                  Clear Completed Orders
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Removes finished & delivered orders
                </span>
              </div>
              <Trash2 size={15} className="text-emerald-600 shrink-0" />
            </button>

            {/* Clear Payment Proofs & History */}
            <button
              onClick={() =>
                promptPurge(
                  'payments_history',
                  'Clear Payment Proof Records',
                  'Permanently delete manual payment slips, receipts, and proof image attachments to free up storage.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-indigo-700 block">
                  Clear Payment Proofs
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Frees receipt slips and payment image space
                </span>
              </div>
              <Trash2 size={15} className="text-indigo-600 shrink-0" />
            </button>

            {/* Mark All Notifications as Read */}
            <button
              onClick={() =>
                promptPurge(
                  'notifications_mark_read',
                  'Mark All Notifications as Read',
                  'Update status of all unread notifications to Read in the database.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-amber-700 block">
                  Mark All Notifications Read
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Sets all unread notifications count to 0
                </span>
              </div>
              <CheckCircle2 size={15} className="text-amber-600 shrink-0" />
            </button>

            {/* Clear Read Notifications */}
            <button
              onClick={() =>
                promptPurge(
                  'notifications_read',
                  'Clear Read Notifications',
                  'Delete all already-read notifications for users and admins. Unread alerts will remain intact.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-amber-700 block">
                  Clear Read Notifications
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Deletes viewed notification history
                </span>
              </div>
              <Trash2 size={15} className="text-amber-600 shrink-0" />
            </button>

            {/* Clear All Notifications */}
            <button
              onClick={() =>
                promptPurge(
                  'notifications_all',
                  'Clear All Notifications',
                  'Permanently delete all notification records from the database.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-rose-700 block">
                  Clear All Notifications
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Deletes all notifications history
                </span>
              </div>
              <Trash2 size={15} className="text-rose-600 shrink-0" />
            </button>

            {/* Clear Activity Audit Logs */}
            <button
              onClick={() =>
                promptPurge(
                  'activity_logs',
                  'Clear Activity Audit Logs',
                  'Permanently clear historical admin action logs and event records from database.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-purple-700 block">
                  Clear Audit Logs
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Resets historical admin event log trail
                </span>
              </div>
              <Trash2 size={15} className="text-purple-600 shrink-0" />
            </button>

            {/* Clear Resolved Support Tickets */}
            <button
              onClick={() =>
                promptPurge(
                  'inquiries_resolved',
                  'Clear Resolved Inquiries',
                  'Remove all closed and resolved customer support inquiries to reduce database overhead.'
                )
              }
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 group-hover:text-sky-700 block">
                  Clear Resolved Inquiries
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Deletes closed customer support tickets
                </span>
              </div>
              <Trash2 size={15} className="text-sky-600 shrink-0" />
            </button>

            {/* Clear All Orders (Full Reset) */}
            <button
              onClick={() =>
                promptPurge(
                  'all_orders',
                  'Clear ALL Orders (Full Reset)',
                  '⚠️ WARNING: This will permanently delete ALL orders regardless of status. Use only for testing or factory reset.'
                )
              }
              className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-rose-700 group-hover:text-rose-900 block">
                  Clear ALL Orders
                </span>
                <span className="text-[10px] text-rose-600 block">
                  Full wipe of all order records
                </span>
              </div>
              <Trash2 size={15} className="text-rose-600 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Debug Join Audit Report Modal / Card */}
      {debugJoinData && (
        <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Orders ↔ User Profiles Join Audit Report
              </h3>
            </div>
            <button
              onClick={() => setDebugJoinData(null)}
              className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer font-bold"
            >
              Close Report ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="text-slate-500">Total Orders</p>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                {debugJoinData.summary.totalOrders}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="text-slate-500">Successfully Matched</p>
              <p className="text-base font-extrabold text-emerald-600 mt-1">
                {debugJoinData.summary.matchedOrders}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="text-slate-500">Null / Unmatched</p>
              <p className="text-base font-extrabold text-amber-600 mt-1">
                {debugJoinData.summary.nullCustomerOrders}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="text-slate-500">Join Integrity</p>
              <p className="text-base font-extrabold text-indigo-600 mt-1">
                {debugJoinData.summary.joinIntegrityPercent}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">
              Sample Diagnostic Join Results (First 10 records):
            </p>
            <div className="max-h-60 overflow-y-auto bg-slate-50 p-3 rounded-2xl font-mono text-[11px] space-y-1.5 border border-slate-200">
              {debugJoinData.diagnostics.slice(0, 10).map((d: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-slate-200 pb-1"
                >
                  <span className="text-indigo-600">{d.orderNumber || d.orderId}</span>
                  <span className="text-slate-600">
                    {d.customerSnapshotEmail || 'No email snapshot'}
                  </span>
                  <span
                    className={
                      d.hasNullReference ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'
                    }
                  >
                    {d.hasNullReference
                      ? '⚠️ NULL / UNMATCHED'
                      : `✓ ${d.resolvedProfile?.full_name || 'Linked'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TABLE DISCOVERY OR INSPECTOR GRID */}
      {/* ========================================================================= */}
      {!selectedTable ? (
        /* Discovery Schema List Grid */
        loadingDiscovery ? (
          <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw size={24} className="animate-spin text-slate-800 mx-auto" />
            <p className="text-slate-500 text-xs font-semibold">
              Reading PostgreSQL database metadata schema...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Database Tables ({discovery.length} tables found)
              </h3>
              <span className="text-xs text-slate-500">
                Click any table to view and inspect sanitized rows
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discovery.map((table, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectTable(table.tableName)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 transition-all flex flex-col justify-between text-left shadow-2xs cursor-pointer focus:outline-hidden"
                >
                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-indigo-600 truncate max-w-[180px]">
                        {table.tableName}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                        {table.rowCount} rows
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold">
                      Fields: {table.columnCount} total columns
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[10px] font-extrabold text-slate-500">
                    <span>Inspect Table Records</span>
                    <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        /* Table Rows Inspector view */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseInspector}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Inspecting Table:{' '}
                  <span className="font-mono text-indigo-600 font-black">{selectedTable}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  Showing rows {offset + 1} - {Math.min(offset + limit, totalRows)} of {totalRows}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-amber-50 text-amber-800 text-[9px] font-black px-2 py-1 rounded-lg border border-amber-100 flex items-center gap-1">
                <ShieldCheck size={11} className="text-amber-600" />
                <span>Sensitive columns redacted safely</span>
              </span>
              <button
                onClick={() => fetchInspector(selectedTable, offset)}
                disabled={loadingInspector}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
              >
                <RefreshCw size={14} className={loadingInspector ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Records Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 shadow-2xs">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Type keywords to filter records in current page view..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={offset === 0}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-slate-600 font-mono px-2">
                Page {Math.floor(offset / limit) + 1}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={offset + limit >= totalRows}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Row Data Table Grid */}
          {loadingInspector ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto" />
              <p className="text-slate-400 text-xs font-semibold mt-2">
                Running database select query...
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <p className="text-slate-400 text-xs font-semibold">
                No records found in this view
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      {tableColumns.map((col, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-[9px] font-black tracking-wider text-slate-400 uppercase select-none min-w-[120px]"
                        >
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-mono font-black">
                              {col.column_name}
                            </span>
                            <span className="text-[8px] text-slate-400 mt-0.5 lowercase">
                              ({col.data_type})
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/30 font-medium">
                        {tableColumns.map((col, cIdx) => {
                          const val = row[col.column_name];
                          let displayVal = String(val === null || val === undefined ? '' : val);
                          const isRedacted = displayVal === '[REDACTED_SECURE]';

                          if (typeof val === 'object' && val !== null) {
                            displayVal = JSON.stringify(val);
                          }

                          return (
                            <td
                              key={cIdx}
                              className="px-4 py-2.5 max-w-xs truncate font-mono text-[10px]"
                            >
                              {isRedacted ? (
                                <span className="bg-rose-50 text-rose-600 text-[8px] font-bold px-1.5 py-0.5 rounded-md border border-rose-100 flex items-center gap-0.5 w-max">
                                  <Key size={8} />
                                  <span>REDACTED</span>
                                </span>
                              ) : (
                                displayVal || <span className="text-slate-300 italic">null</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PURGE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {purgeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
              onClick={() => !isPurging && setPurgeTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 relative z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{purgeTitle}</h3>
                  <p className="text-xs text-slate-500">Confirm database optimization action</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs text-slate-600 leading-relaxed">
                {purgeDescription}
              </div>

              <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 font-medium flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                <span>
                  This operation deletes redundant historical records to speed up queries and save server load.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPurging}
                  onClick={() => setPurgeTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPurging}
                  onClick={handleExecutePurge}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{isPurging ? 'Clearing Database...' : 'Confirm & Purge'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AdminDbInspectorTab;
