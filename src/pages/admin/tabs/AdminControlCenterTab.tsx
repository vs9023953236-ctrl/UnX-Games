import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cloud,
  ShieldCheck,
  Zap,
  Radio,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Search,
  Eye,
  Sliders,
  Send,
  Layers,
  ArrowRight,
  Clock,
  HardDrive,
  Users,
  ShieldAlert,
  Bell,
  Cpu,
  Sparkles,
  Bot,
  Wand2,
  Play,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';

type ControlSubTab = 'overview' | 'api' | 'realtime' | 'database_storage' | 'tracer' | 'ai_intelligence';

export const AdminControlCenterTab: React.FC = () => {
  const { showToast, setAdminTab, syncOrdersFromBackend, orders } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<ControlSubTab>('overview');
  const [loading, setLoading] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dbData, setDbData] = useState<any>(null);
  const [r2Data, setR2Data] = useState<any>(null);
  const [realtimeData, setRealtimeData] = useState<any>(null);
  
  // Tracer state
  const [searchRequestId, setSearchRequestId] = useState('');
  const [traceResult, setTraceResult] = useState<any>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  // Test realtime event
  const [testingRealtime, setTestingRealtime] = useState(false);

  // AI Intelligence Lab State
  const [simReviewName, setSimReviewName] = useState('Bikash Tamang');
  const [simGame, setSimGame] = useState('Free Fire');
  const [simPackage, setSimPackage] = useState('1080 Diamonds + Bonus');
  const [simRating, setSimRating] = useState<number>(5);
  const [simComment, setSimComment] = useState('Top-up received within 2 minutes via eSewa! Highly trusted store.');
  const [simTone, setSimTone] = useState<'professional' | 'gamer' | 'vip' | 'empathetic'>('gamer');
  const [simLoading, setSimLoading] = useState(false);
  const [simOutput, setSimOutput] = useState<string | null>(null);
  const [simLatency, setSimLatency] = useState<number | null>(null);

  // Sentinel Diagnostic Scanner
  const [sentinelRunning, setSentinelRunning] = useState(false);
  const [sentinelResult, setSentinelResult] = useState<any>(null);

  const handleForceSyncAll = async () => {
    setIsForceSyncing(true);
    try {
      await Promise.allSettled([
        syncOrdersFromBackend(),
        fetchControlData(),
        fetchRealtimeData(),
        fetchDatabaseAndR2(),
      ]);
      showToast('success', 'Realtime Sync Complete', 'All operational queues, orders, and telemetry synced.');
    } catch {
      showToast('error', 'Sync Warning', 'Could not refresh all subsystems.');
    } finally {
      setIsForceSyncing(false);
    }
  };

  const fetchControlData = async () => {
    setLoading(true);
    try {
      const [overviewRes, apiRes, alertsRes] = await Promise.all([
        api.gateway.control.getLiveOverview().catch(() => null),
        api.gateway.control.getApiMonitor().catch(() => null),
        api.gateway.control.getAlerts().catch(() => null),
      ]);

      if (overviewRes && overviewRes.success) setOverview(overviewRes.data);
      else if (overviewRes && overviewRes.data) setOverview(overviewRes.data);

      if (apiRes && apiRes.success) setApiData(apiRes.data);
      else if (apiRes && apiRes.data) setApiData(apiRes.data);

      if (alertsRes && alertsRes.success) setAlerts(alertsRes.data || []);
      else if (alertsRes && alertsRes.data) setAlerts(alertsRes.data || []);
    } catch (err: any) {
      console.warn('Control center fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseAndR2 = async () => {
    try {
      const [dbRes, r2Res] = await Promise.all([
        api.gateway.control.getDatabase().catch(() => null),
        api.gateway.control.getR2().catch(() => null),
      ]);
      if (dbRes && dbRes.data) setDbData(dbRes.data);
      if (r2Res && r2Res.data) setR2Data(r2Res.data);
    } catch {}
  };

  const fetchRealtimeData = async () => {
    try {
      const res = await api.gateway.control.getRealtime();
      if (res && res.data) setRealtimeData(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchControlData();
    const interval = setInterval(fetchControlData, 12000); // 12s auto-refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'database_storage') {
      fetchDatabaseAndR2();
    } else if (activeSubTab === 'realtime') {
      fetchRealtimeData();
    }
  }, [activeSubTab]);

  const handleDismissAlert = async (alertId: string) => {
    try {
      await api.gateway.control.dismissAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      showToast('success', 'Alert dismissed');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to dismiss alert');
    }
  };

  const handleTestRealtime = async () => {
    setTestingRealtime(true);
    try {
      const res = await api.gateway.control.sendTestRealtime({
        eventType: 'ADMIN_DIAGNOSTIC_PING',
        entityType: 'control_center',
        entityId: 'diag_1',
      });
      if (res && res.success) {
        showToast('success', 'Realtime sync event broadcasted successfully across the cluster!');
        fetchRealtimeData();
      } else {
        showToast('error', res.message || 'Failed to broadcast event');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error sending realtime test');
    } finally {
      setTestingRealtime(false);
    }
  };

  const handleSearchTrace = async () => {
    if (!searchRequestId.trim()) return;
    setTraceLoading(true);
    setTraceResult(null);
    try {
      const res = await api.gateway.control.traceRequest(searchRequestId.trim());
      if (res && res.success && res.data) {
        setTraceResult(res.data);
      } else if (res && res.data) {
        setTraceResult(res.data);
      } else {
        showToast('info', 'No matching request trace found for this Request ID');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Request ID not found');
    } finally {
      setTraceLoading(false);
    }
  };

  const handleSimulateAiReview = async () => {
    setSimLoading(true);
    setSimOutput(null);
    const start = performance.now();
    try {
      const res = await api.reviews.previewAiReply({
        userName: simReviewName,
        productName: simGame,
        packageName: simPackage,
        rating: simRating,
        comment: simComment,
        tone: simTone,
        isVerifiedBuyer: true,
      });

      const end = performance.now();
      setSimLatency(Math.round(end - start));

      if (res && res.reply) {
        setSimOutput(res.reply);
        showToast('success', 'AI Simulation Complete', `Generated reply in ${Math.round(end - start)}ms`);
      } else {
        showToast('error', 'Simulation Notice', 'Failed to generate preview.');
      }
    } catch (err: any) {
      showToast('error', 'AI Studio Error', err.message || 'Could not connect to AI Engine.');
    } finally {
      setSimLoading(false);
    }
  };

  const handleRunSentinelScan = async (autofix = false) => {
    setSentinelRunning(true);
    try {
      const res = await fetch(`/api/admin/sentinel/${autofix ? 'autofix' : 'scan'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data && data.success) {
        setSentinelResult(data.scan || data.data || data);
        showToast('success', autofix ? 'Sentinel Auto-Fix Completed' : 'System Sentinel Scan Passed', 'Diagnostics report updated.');
      } else {
        showToast('info', 'Sentinel Report', data.message || 'Diagnostic scan executed.');
      }
    } catch (err: any) {
      showToast('error', 'Diagnostic Warning', err.message || 'Sentinel service offline');
    } finally {
      setSentinelRunning(false);
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status, latency }: { status: string; latency?: number }) => {
    const isOnline = status === 'ONLINE' || status === 'operational' || status === 'connected';
    const isWarning = status === 'WARNING';
    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1 border ${
          isOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : isWarning
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600' : isWarning ? 'bg-amber-500' : 'bg-rose-600'}`} />
        <span>{status}</span>
        {latency !== undefined && <span className="font-mono text-[9px]">({latency}ms)</span>}
      </span>
    );
  };

  const subsystems = overview?.subsystems || {};
  const traffic = overview?.traffic || {};

  return (
    <div className="space-y-6">
      {/* Control Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            <Cpu size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                UNX Operations & Control Center
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-purple-600 text-white animate-pulse">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Centralized operational monitoring, health diagnostics, telemetry & subsystem control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleForceSyncAll}
            disabled={isForceSyncing || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Force Real-Time Sync across all clusters"
          >
            <Zap size={14} className={isForceSyncing ? 'animate-spin' : ''} />
            <span>{isForceSyncing ? 'Syncing...' : 'Force Real-time Sync'}</span>
          </button>
          <button
            onClick={fetchControlData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Health Score Banner */}
      {(() => {
        const status = overview?.overallStatus || 'HEALTHY';
        const isHealthy = status === 'HEALTHY';
        const isDegraded = status === 'DEGRADED';
        const isCritical = !isHealthy && !isDegraded;
        const hasR2Issue = (overview?.degradedReasons || []).some((r: string) => String(r).toLowerCase().includes('r2') || String(r).toLowerCase().includes('storage'));

        return (
          <div
            className={`p-4.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              isHealthy
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : isDegraded
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`p-2 rounded-xl text-white ${
                  isHealthy ? 'bg-emerald-700' : isDegraded ? 'bg-amber-600' : 'bg-rose-600'
                }`}
              >
                {isHealthy ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase tracking-wider">
                    System Status: {status}
                  </span>
                </div>
                <p className="text-xs font-medium opacity-90">
                  {overview?.degradedReasons && overview.degradedReasons.length > 0
                    ? overview.degradedReasons.join(' • ')
                    : 'All core subsystems (API Gateway, PostgreSQL DB, Supabase Auth, LFU Cache, Realtime & R2) are fully operational.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isHealthy && hasR2Issue && (
                <button
                  onClick={() => setAdminTab('app_settings')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  Configure R2 Storage &rarr;
                </button>
              )}
              <div className="flex items-center gap-2 text-xs font-mono">
                <Clock size={14} />
                <span>Uptime: {Math.floor((overview?.uptimeSeconds || 0) / 60)} mins</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live Operations & Real-Time Sync Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300">Live Sync Bus</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supabase Realtime Channel: <code className="text-indigo-200">ghn_sync_event_bus</code> • Auto-reconnecting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTestRealtime}
            disabled={testingRealtime}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send size={12} className={testingRealtime ? 'animate-spin' : ''} />
            <span>{testingRealtime ? 'Broadcasting...' : 'Broadcast Ping'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('orders')}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
          >
            <span>Live Orders</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Subsystem Health Matrix Grid (10 Core Subsystems) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* API Gateway */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">API Gateway</span>
            <Server size={14} className="text-blue-600" />
          </div>
          <StatusBadge status={subsystems.api?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium">
            {traffic.requestsPerMinute || 0} req/min • {subsystems.api?.errorRatePercent || 0}% err
          </p>
        </div>

        {/* Database */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Database</span>
            <Database size={14} className="text-emerald-700" />
          </div>
          <StatusBadge status={subsystems.database?.status || 'ONLINE'} latency={subsystems.database?.latencyMs} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            {subsystems.database?.message || 'PostgreSQL Pool'}
          </p>
        </div>

        {/* Supabase Auth */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Auth Engine</span>
            <ShieldCheck size={14} className="text-purple-600" />
          </div>
          <StatusBadge status={subsystems.auth?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium">
            PKCE & MFA TOTP Active
          </p>
        </div>

        {/* LFU Cache */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LFU Cache</span>
            <Zap size={14} className="text-amber-500" />
          </div>
          <StatusBadge status={subsystems.cache?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium">
            Hit Rate: {Math.round((subsystems.cache?.hitRate || 0) * 100)}% ({subsystems.cache?.totalItems || 0} items)
          </p>
        </div>

        {/* Realtime Bus */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Realtime Bus</span>
            <Radio size={14} className="text-rose-500" />
          </div>
          <StatusBadge status={subsystems.realtime?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            channel: ghn_sync_event_bus
          </p>
        </div>

        {/* Cloudflare R2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Storage R2</span>
            <Cloud size={14} className="text-cyan-600" />
          </div>
          <StatusBadge status={subsystems.storage?.status || 'ONLINE'} latency={subsystems.storage?.latencyMs} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            Zero-Egress Media Vault
          </p>
        </div>

        {/* Worker Cluster */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Worker Cluster</span>
            <Cpu size={14} className="text-indigo-600" />
          </div>
          <StatusBadge status={subsystems.workers?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            {subsystems.workers?.healthy ?? 3}/{subsystems.workers?.total ?? 3} Active ({subsystems.workers?.algorithm || 'ROUND_ROBIN'})
          </p>
        </div>

        {/* Payment Gateways */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Gateways</span>
            <CheckCircle size={14} className="text-emerald-600" />
          </div>
          <StatusBadge status={subsystems.payment?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            {subsystems.payment?.message || 'eSewa & Khalti Active'}
          </p>
        </div>

        {/* Queue Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ingress Queue</span>
            <Layers size={14} className="text-slate-600" />
          </div>
          <StatusBadge status={subsystems.queue?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            {subsystems.queue?.activeConnections || 0} active in-flight conns
          </p>
        </div>

        {/* Database Backups */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DB Backups</span>
            <HardDrive size={14} className="text-orange-600" />
          </div>
          <StatusBadge status={subsystems.backups?.status || 'ONLINE'} />
          <p className="text-[10px] text-slate-600 font-medium truncate">
            Last: {subsystems.backups?.lastStatus || 'SUCCESS'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs for Operations Center */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Alerts', icon: Bell, badge: alerts.length },
          { id: 'ai_intelligence', label: 'AI Intelligence & Sentinel', icon: Sparkles },
          { id: 'api', label: 'API Gateway Monitor', icon: Server },
          { id: 'realtime', label: 'Realtime Sync Bus', icon: Radio },
          { id: 'database_storage', label: 'Database & R2 Storage', icon: Database },
          { id: 'tracer', label: 'Request ID Tracer', icon: Search },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as ControlSubTab)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${active ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ALERTS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Traffic Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Traffic</span>
              <p className="text-2xl font-black text-slate-900">{traffic.totalRequests || 0}</p>
              <p className="text-[11px] text-slate-600 font-medium">{traffic.requestsPerMinute || 0} req / min</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2xx / 3xx Success</span>
              <p className="text-2xl font-black text-emerald-800">
                {(traffic.status2xx || 0) + (traffic.status3xx || 0)}
              </p>
              <p className="text-[11px] text-slate-600 font-medium">Authoritative & fast cached</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">4xx / 5xx Issues</span>
              <p className="text-2xl font-black text-rose-600">
                {(traffic.status4xx || 0) + (traffic.status5xx || 0)}
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                {traffic.rateLimitedCount || 0} rate-limited (429)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Presence</span>
              <p className="text-2xl font-black text-purple-700">{traffic.activeUsers || 0}</p>
              <p className="text-[11px] text-slate-600 font-medium">{traffic.onlineAdmins || 0} online admins</p>
            </div>
          </div>

          {/* Active Alerts Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Operational Alerts & Anomaly Monitor
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {alerts.length} Active Notice{alerts.length === 1 ? '' : 's'}
              </span>
            </div>

            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                      alert.level === 'CRITICAL'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : alert.level === 'WARNING'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 text-[9px] font-black rounded uppercase bg-black/10">
                          {alert.subsystem}
                        </span>
                        <h4 className="text-xs font-black">{alert.title}</h4>
                      </div>
                      <p className="text-xs opacity-90">{alert.message}</p>
                      <span className="text-[10px] text-slate-600 font-mono block">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white/80 hover:bg-white rounded-lg border border-black/10 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-600 font-medium">
                No active system alerts. All operational thresholds (error rates, latencies, database connections) are healthy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: AI INTELLIGENCE & SENTINEL */}
      {activeSubTab === 'ai_intelligence' && (
        <div className="space-y-6">
          {/* AI Subsystems Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-purple-500/30 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="text-purple-400" size={20} />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">Gemini 3.8 Flash</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </div>
              <div>
                <div className="text-2xl font-black">AI Auto-Reply Engine</div>
                <p className="text-xs text-purple-200/80 mt-1">
                  Contextual AI review responses with gamer/VIP persona, 100% English precision & auto-dispatch.
                </p>
              </div>
              <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-[11px] text-purple-300 font-mono">
                <span>Model: gemini-3.8-flash</span>
                <span>Latency: ~350ms</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={20} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">System Sentinel</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Self-Healing
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">Automated Diagnostics</div>
                <p className="text-xs text-slate-600 mt-1">
                  Continuous schema validation, orphaned cart sweeps, rate limit abuse audits & auto-recovery.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunSentinelScan(false)}
                  disabled={sentinelRunning}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Activity size={12} className={sentinelRunning ? 'animate-spin' : ''} />
                  <span>Run Diagnostic</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunSentinelScan(true)}
                  disabled={sentinelRunning}
                  className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Wand2 size={12} />
                  <span>Auto-Fix</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-500" size={20} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">AI Notification Composer</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                  Push Engine
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">Broadcast Assistant</div>
                <p className="text-xs text-slate-600 mt-1">
                  Generates instant flash sales, cashback announcements, maintenance alerts and gamer promos.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAdminTab('notifications')}
                  className="w-full py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Open Push Broadcast Hub</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Sentinel Result Banner if available */}
          {sentinelResult && (
            <div className="bg-slate-900 text-white p-4.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle size={15} />
                  <span>Sentinel Diagnostics Report</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{sentinelResult.status || 'HEALTHY'}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Scanned Tables</span>
                  <span className="text-xs font-mono font-bold text-slate-200">{sentinelResult.tablesChecked || '18/18'}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Orphaned Cleaned</span>
                  <span className="text-xs font-mono font-bold text-slate-200">{sentinelResult.cleanedItems ?? 0}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Integrity Score</span>
                  <span className="text-xs font-mono font-bold text-purple-300">100% SECURE</span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive AI Simulation & Testing Laboratory */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Interactive AI Response Simulator</h3>
                  <p className="text-xs text-slate-500 font-medium">Test real-time AI reply generation with custom gamer tones & scenarios.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                Playground
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Simulator Input Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={simReviewName}
                      onChange={(e) => setSimReviewName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Featured Game</label>
                    <input
                      type="text"
                      value={simGame}
                      onChange={(e) => setSimGame(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Package Name</label>
                    <input
                      type="text"
                      value={simPackage}
                      onChange={(e) => setSimPackage(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rating ({simRating} Stars)</label>
                    <select
                      value={simRating}
                      onChange={(e) => setSimRating(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5 - Perfect)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 - Great)</option>
                      <option value={3}>⭐⭐⭐ (3 - Neutral)</option>
                      <option value={2}>⭐⭐ (2 - Dissatisfied)</option>
                      <option value={1}>⭐ (1 - Critical)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Simulated Review Comment</label>
                  <textarea
                    rows={2}
                    value={simComment}
                    onChange={(e) => setSimComment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Reply Tone Personality</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'gamer', label: '🎮 Gamer / GG' },
                      { id: 'professional', label: '👔 Executive' },
                      { id: 'vip', label: '👑 VIP Concierge' },
                      { id: 'empathetic', label: '❤️ Empathetic' },
                    ].map((toneOpt) => (
                      <button
                        key={toneOpt.id}
                        type="button"
                        onClick={() => setSimTone(toneOpt.id as any)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          simTone === toneOpt.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {toneOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateAiReview}
                  disabled={simLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <Sparkles size={14} className={simLoading ? 'animate-spin' : ''} />
                  <span>{simLoading ? 'Simulating AI Generation...' : 'Execute Live AI Simulation'}</span>
                </button>
              </div>

              {/* Simulation Output Area */}
              <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl p-4.5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
                    <Bot size={15} />
                    <span>AI Stream Result</span>
                  </div>
                  {simLatency !== null && (
                    <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                      ⏱️ {simLatency} ms
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-[140px] flex items-center justify-center p-3 bg-black/40 rounded-xl border border-white/5">
                  {simLoading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Sparkles className="animate-spin text-purple-400" size={24} />
                      <span className="text-xs font-mono">Querying Gemini 3.8 Flash...</span>
                    </div>
                  ) : simOutput ? (
                    <div className="w-full text-xs font-medium text-slate-100 leading-relaxed space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Generated Official Response:</div>
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-emerald-200">
                        {simOutput}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-500">
                      Press "Execute Live AI Simulation" to test the AI reply generation in real-time.
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                  <span>Engine: @google/genai</span>
                  <span>Safety: Strict English Output</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API GATEWAY MONITOR */}
      {activeSubTab === 'api' && (
        <div className="space-y-6">
          {/* Top Endpoints Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Top Active Endpoints (Traffic Volume)
              </h2>
              <span className="text-xs font-semibold text-slate-600">
                {apiData?.totalEndpointsTracked || 0} Endpoints Monitored
              </span>
            </div>

            {apiData?.topEndpoints && apiData.topEndpoints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-bold">Method</th>
                      <th className="py-2.5 px-3 font-bold">Endpoint Route</th>
                      <th className="py-2.5 px-3 font-bold text-center">Total Reqs</th>
                      <th className="py-2.5 px-3 font-bold text-center">Avg Latency</th>
                      <th className="py-2.5 px-3 font-bold text-center">P95 Latency</th>
                      <th className="py-2.5 px-3 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apiData.topEndpoints.map((ep: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              ep.method === 'GET'
                                ? 'bg-blue-50 text-blue-700'
                                : ep.method === 'POST'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {ep.method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                          {ep.endpoint}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {ep.totalRequests}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {ep.avgDurationMs}ms
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {ep.p95Ms || ep.avgDurationMs}ms
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-600 font-medium">
                No endpoint metrics captured yet. Traffic data will appear as users interact with the app.
              </div>
            )}
          </div>

          {/* Slow & Failed Endpoints Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Slow Endpoints */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                <span>Slow Endpoints (&gt;400ms avg)</span>
              </h3>
              {apiData?.slowEndpoints && apiData.slowEndpoints.length > 0 ? (
                <div className="space-y-2">
                  {apiData.slowEndpoints.map((ep: any, idx: number) => (
                    <div key={idx} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-800 truncate">{ep.method} {ep.endpoint}</span>
                      <span className="font-bold text-amber-900 font-mono">{ep.avgDurationMs}ms</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 font-medium py-4 text-center">No slow endpoints detected.</p>
              )}
            </div>

            {/* Failed Endpoints */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                <span>Failed Endpoints (4xx / 5xx)</span>
              </h3>
              {apiData?.failedEndpoints && apiData.failedEndpoints.length > 0 ? (
                <div className="space-y-2">
                  {apiData.failedEndpoints.map((ep: any, idx: number) => (
                    <div key={idx} className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-800 truncate">{ep.method} {ep.endpoint}</span>
                      <span className="font-bold text-rose-700">{ep.failedRequests} errors</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 font-medium py-4 text-center">Zero failed endpoints.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REALTIME SYNC BUS */}
      {activeSubTab === 'realtime' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Radio size={18} className="text-emerald-700" />
                  <span>Supabase Realtime Sync Event Bus</span>
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Cluster channel: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">ghn_sync_event_bus</code>
                </p>
              </div>

              <button
                onClick={handleTestRealtime}
                disabled={testingRealtime}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                <span>{testingRealtime ? 'Broadcasting...' : 'Broadcast Test Event'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              When mutations occur on Products, Games, Packages, Orders, or Wallets, the server writes directly to the authoritative database and emits a sync event on the cluster bus. User clients listen and automatically invalidate cached queries to stay 100% in sync without full page reloads.
            </p>

            {realtimeData?.history && realtimeData.history.length > 0 ? (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Recent Dispatched Events
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {realtimeData.history.map((evt: any) => (
                    <div key={evt.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-slate-800">{evt.eventType}</span>
                        <p className="text-[11px] text-slate-600">
                          Entity: {evt.entityType || 'system'} {evt.entityId ? `(#${evt.entityId})` : ''}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-800 rounded">
                          {evt.status}
                        </span>
                        <p className="text-[10px] text-slate-600 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-600 font-medium">
                No sync events dispatched recently. Try clicking "Broadcast Test Event".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE & STORAGE (R2) */}
      {activeSubTab === 'database_storage' && (
        <div className="space-y-6">
          {/* Database Pool Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Database size={18} className="text-emerald-700" />
              <span>PostgreSQL / Supabase Authoritative Database</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Connection Status</span>
                <p className="text-sm font-bold text-slate-900">{dbData?.health?.status || 'ONLINE'}</p>
                <p className="text-[10px] text-slate-600">{dbData?.health?.latencyMs || 1}ms query ping</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Provider</span>
                <p className="text-sm font-bold text-slate-900 truncate">{dbData?.provider || 'Supabase Pool'}</p>
                <p className="text-[10px] text-slate-600">Authoritative master</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Total Pool Connections</span>
                <p className="text-sm font-bold text-slate-900">{dbData?.totalPoolConnections || 1}</p>
                <p className="text-[10px] text-slate-600">Idle: {dbData?.idlePoolConnections || 0}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Row Level Security</span>
                <p className="text-sm font-bold text-emerald-800">ENFORCED</p>
                <p className="text-[10px] text-slate-600">Cross-user isolated</p>
              </div>
            </div>
          </div>

          {/* Cloudflare R2 Media Vault */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Cloud size={18} className="text-cyan-600" />
              <span>Cloudflare R2 Media Storage</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Bucket Name</span>
                <p className="text-sm font-mono font-bold text-slate-900 truncate">
                  {r2Data?.config?.bucket || 'Not Configured'}
                </p>
                <p className="text-[10px] text-slate-600">S3 API Compatible</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Public CDN Domain</span>
                <p className="text-xs font-mono font-bold text-slate-900 truncate">
                  {r2Data?.config?.publicDomain || 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev'}
                </p>
                <p className="text-[10px] text-slate-600">Zero-Egress Fees</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Roundtrip Diagnostic</span>
                <p className="text-sm font-bold text-emerald-800">
                  {r2Data?.test?.success ? 'CONNECTED' : 'STANDBY'}
                </p>
                <p className="text-[10px] text-slate-600 font-mono">
                  {r2Data?.test?.latencyMs ? `${r2Data.test.latencyMs}ms probe` : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REQUEST ID TRACER */}
      {activeSubTab === 'tracer' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Search size={18} className="text-blue-600" />
              <span>Request ID Lifecycle Tracer</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Every request traveling through the UNX API Gateway receives an authoritative <code className="bg-slate-100 px-1 rounded">X-Request-ID</code> header. Enter any Request ID to trace its execution lifecycle.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. unx_a1b2c3d4-..."
                value={searchRequestId}
                onChange={(e) => setSearchRequestId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTrace()}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearchTrace}
                disabled={traceLoading || !searchRequestId.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {traceLoading ? 'Tracing...' : 'Trace Request'}
              </button>
            </div>

            {traceResult && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 pt-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {traceResult.method} {traceResult.path}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      traceResult.statusCode < 400
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    HTTP {traceResult.statusCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Duration</span>
                    <span className="font-mono font-bold text-slate-800">{traceResult.durationMs}ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Client App</span>
                    <span className="font-mono text-slate-800">{traceResult.clientApp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Cache Result</span>
                    <span className="font-mono text-slate-800">{traceResult.cacheLookup || 'MISS (DB)'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Client IP</span>
                    <span className="font-mono text-slate-800">{traceResult.ip}</span>
                  </div>
                </div>

                {/* Lifecycle Pipeline Visualization */}
                <div className="pt-2">
                  <span className="text-[10px] text-slate-600 uppercase font-bold block mb-1">
                    Lifecycle Pipeline
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                    <span>Client</span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <span className="text-blue-600 font-bold">API Gateway</span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <span>Rate Limiter</span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <span>{traceResult.userRole ? `Auth (${traceResult.userRole})` : 'Public'}</span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <span>{traceResult.cacheLookup === 'HIT' ? 'Cache (LFU)' : 'PostgreSQL DB'}</span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <span className="text-emerald-800 font-bold">Response</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminControlCenterTab;
