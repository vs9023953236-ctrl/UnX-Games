import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Activity,
  Layers,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Shield,
  Clock,
  HardDrive,
  Database,
  Radio,
  Sliders,
  Check,
  Send,
  Power,
  PowerOff,
  Eye,
  Shuffle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';

export const AdminInfrastructureTab: React.FC = () => {
  const { showToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [clusterData, setClusterData] = useState<any>(null);
  const [liveTraffic, setLiveTraffic] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testingFailover, setTestingFailover] = useState(false);
  const [failoverTestResult, setFailoverTestResult] = useState<any>(null);
  const [syncingDatabase, setSyncingDatabase] = useState(false);

  const handleSyncDatabase = async () => {
    setSyncingDatabase(true);
    try {
      const res = await api.admin.syncDatabase();
      if (res && res.success) {
        showToast('success', 'Database Synchronized', res.message || 'All tables, products, and packages synced synchronously.');
        fetchClusterStats();
      } else {
        showToast('error', res?.message || 'Database synchronization failed');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Error during database sync');
    } finally {
      setSyncingDatabase(false);
    }
  };

  const fetchClusterStats = async () => {
    try {
      const [res, trafficRes] = await Promise.all([
        api.gateway.cluster.getStats(),
        api.gateway.cluster.getLiveTraffic().catch(() => null),
      ]);

      if (res && res.success && res.data) {
        setClusterData(res.data);
      } else if (res && res.data) {
        setClusterData(res.data);
      } else if (res && res.workers) {
        setClusterData(res);
      }

      if (trafficRes && trafficRes.success && Array.isArray(trafficRes.data?.traffic)) {
        setLiveTraffic(trafficRes.data.traffic);
      } else if (trafficRes && Array.isArray(trafficRes.traffic)) {
        setLiveTraffic(trafficRes.traffic);
      }
    } catch (err: any) {
      console.warn('Cluster stats fetch note:', err);
    }
  };

  useEffect(() => {
    fetchClusterStats();
    const interval = setInterval(fetchClusterStats, 3000); // 3s fast polling for live cluster telemetry
    return () => clearInterval(interval);
  }, []);

  const handleSwitchAlgorithm = async (algo: string) => {
    setActionLoading('algo');
    try {
      const res = await api.gateway.cluster.setAlgorithm(algo);
      if (res && res.success) {
        showToast('success', `Load balancer algorithm changed to ${algo}`);
        fetchClusterStats();
      } else {
        showToast('error', res.message || 'Failed to update algorithm');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating algorithm');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHealthCheck = async (workerId?: string) => {
    setActionLoading(`health_${workerId || 'all'}`);
    try {
      const res = await api.gateway.cluster.healthCheck(workerId || '');
      if (res && res.success) {
        showToast('success', res.data?.message || `Health check completed for ${workerId || 'cluster'}`);
        fetchClusterStats();
      } else {
        showToast('error', res.message || 'Health check failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error running health check');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDrain = async (workerId: string) => {
    setActionLoading(`drain_${workerId}`);
    try {
      const res = await api.gateway.cluster.drainWorker(workerId);
      if (res && res.success) {
        showToast('info', `${workerId} marked as DRAINING. New traffic halted; finishing active connections.`);
        fetchClusterStats();
      } else {
        showToast('error', res.message || 'Failed to drain worker');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to drain worker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable = async (workerId: string) => {
    setActionLoading(`disable_${workerId}`);
    try {
      const res = await api.gateway.cluster.disableWorker(workerId);
      if (res && res.success) {
        showToast('info', `${workerId} disabled and taken OFFLINE.`);
        fetchClusterStats();
      } else {
        showToast('error', res.message || 'Failed to disable worker');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to disable worker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnable = async (workerId: string) => {
    setActionLoading(`enable_${workerId}`);
    try {
      const res = await api.gateway.cluster.enableWorker(workerId);
      if (res && res.success) {
        showToast('success', `${workerId} enabled and returned to healthy rotation!`);
        fetchClusterStats();
      } else {
        showToast('error', res.message || 'Failed to enable worker');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to enable worker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecover = async (workerId: string) => {
    setActionLoading(`recover_${workerId}`);
    try {
      const res = await api.gateway.cluster.recoverWorker(workerId);
      if (res && res.success) {
        showToast('success', `${workerId} recovered to HEALTHY and returned to cluster rotation!`);
        fetchClusterStats();
      } else {
        showToast('error', res.message || 'Failed to recover worker');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to recover worker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateFailure = async (workerId: string) => {
    setActionLoading(`fail_${workerId}`);
    try {
      const res = await api.gateway.cluster.failWorker(workerId);
      if (res && res.success) {
        showToast('info', `Simulated failure on ${workerId}. Automatic failover active!`);
        fetchClusterStats();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to simulate failure');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunFailoverTest = async () => {
    setTestingFailover(true);
    setFailoverTestResult(null);
    try {
      const res = await api.gateway.cluster.failoverTest('worker-app-02');
      if (res && res.success) {
        setFailoverTestResult(res.data || res);
        showToast('success', res.data?.message || 'Controlled failover test passed with 0 dropped requests!');
        fetchClusterStats();
      } else {
        showToast('error', res?.message || 'Failover test did not complete cleanly');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failover test execution failed');
    } finally {
      setTestingFailover(false);
    }
  };

  const workers = clusterData?.workers || [];
  const circuitBreakers = clusterData?.circuitBreakers || [];
  const algorithm = clusterData?.algorithm || 'WEIGHTED_LEAST_CONNECTIONS';
  const zeroDowntimeSupported = Boolean(clusterData?.zeroDowntimeSupported);
  const zeroDowntimeStatus = clusterData?.zeroDowntimeStatus || 'Evaluating...';
  const redisDistributedState = clusterData?.redisDistributedState || 'LOCAL_FALLBACK';

  const algorithms = [
    { id: 'WEIGHTED_LEAST_CONNECTIONS', label: 'Weighted Least Conns (Primary)' },
    { id: 'LEAST_CONNECTIONS', label: 'Least Connections' },
    { id: 'ROUND_ROBIN', label: 'Round Robin' },
    { id: 'WEIGHTED_ROUND_ROBIN', label: 'Weighted Round Robin' },
    { id: 'LATENCY_WEIGHTED', label: 'Latency Weighted' },
    { id: 'IP_HASH', label: 'IP Hash (Sticky)' },
  ];

  const totalHandled = workers.reduce((acc: number, w: any) => acc + (w.requests || w.requestsHandled || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-950 text-white p-5 rounded-2xl border border-purple-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                UNX Reverse Proxy
              </span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Real Worker Cluster
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                zeroDowntimeSupported
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {zeroDowntimeSupported ? 'Zero-Downtime Active' : 'Single/Degraded Mode'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded">
                Redis: {redisDistributedState}
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>UNX Reverse Proxy & Worker Cluster</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl font-medium">
              Authoritative request routing, real health checks, connection draining, automated failover, and live traffic telemetry across server workers.
            </p>
          </div>

          {/* Controls: Algorithm Switcher & Failover Test */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={algorithm}
              onChange={(e) => handleSwitchAlgorithm(e.target.value)}
              disabled={actionLoading === 'algo'}
              className="bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden focus:border-purple-500"
            >
              {algorithms.map((algo) => (
                <option key={algo.id} value={algo.id}>
                  {algo.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleSyncDatabase}
              disabled={syncingDatabase}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Synchronously sync and verify all database tables, products, and Supabase records"
            >
              <Database size={13} className={syncingDatabase ? 'animate-spin' : ''} />
              <span>{syncingDatabase ? 'Syncing...' : 'Sync Database'}</span>
            </button>

            <button
              onClick={handleRunFailoverTest}
              disabled={testingFailover}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Performs a live controlled failover test on a standby worker and verifies traffic shift"
            >
              <Shuffle size={13} className={testingFailover ? 'animate-spin' : ''} />
              <span>{testingFailover ? 'Testing Failover...' : 'Failover Test'}</span>
            </button>

            <button
              onClick={() => handleHealthCheck()}
              disabled={actionLoading === 'health_all'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-all cursor-pointer"
              title="Run health checks across all workers"
            >
              <RefreshCw size={13} className={actionLoading === 'health_all' ? 'animate-spin' : ''} />
              <span>Check All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Failover Test Result Banner (When Executed) */}
      {failoverTestResult && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Controlled Failover Test Report: {failoverTestResult.testStatus}
              </h3>
            </div>
            <button
              onClick={() => setFailoverTestResult(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-emerald-100 font-medium">{failoverTestResult.message}</p>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono text-emerald-300/80">
            <span>Target Worker: {failoverTestResult.testedWorkerId}</span>
            <span>•</span>
            <span>All 10 Requests Bypassed Target: {failoverTestResult.allBypassedTarget ? 'YES (100%)' : 'NO'}</span>
            <span>•</span>
            <span>Active Pool Restored: {failoverTestResult.healthyWorkersAfter} Workers</span>
          </div>
        </div>
      )}

      {/* Cluster Metrics KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cluster Traffic</span>
          <p className="text-2xl font-black text-slate-900">{clusterData?.totalRequests || 0}</p>
          <p className="text-[11px] text-slate-600 font-medium">{clusterData?.requestsPerSecond || 0} reqs / sec</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Conns</span>
          <p className="text-2xl font-black text-cyan-600">{clusterData?.activeConnections || 0}</p>
          <p className="text-[11px] text-slate-600 font-medium">In-flight right now</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cluster Health</span>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black text-emerald-800">{clusterData?.healthyWorkers || 0}</span>
            <span className="text-xs text-slate-600 font-bold">/ {workers.length} Healthy</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            {clusterData?.unhealthyWorkers > 0 ? `${clusterData.unhealthyWorkers} Offline` : 'All nodes ready'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Latency (P50 / P95)</span>
          <p className="text-2xl font-black text-purple-700">
            {clusterData?.p50Latency || 1}ms <span className="text-sm font-bold text-slate-500">/ {clusterData?.p95Latency || 2}ms</span>
          </p>
          <p className="text-[11px] text-slate-600 font-medium">P99: {clusterData?.p99Latency || 5}ms</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Zero-Downtime</span>
          <div className="flex items-center gap-1.5">
            {zeroDowntimeSupported ? (
              <ShieldCheck size={20} className="text-emerald-600" />
            ) : (
              <ShieldAlert size={20} className="text-amber-600" />
            )}
            <span className={`text-sm font-black ${zeroDowntimeSupported ? 'text-emerald-800' : 'text-amber-800'}`}>
              {zeroDowntimeSupported ? 'ACTIVE' : 'NO REDUNDANCY'}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 font-medium truncate" title={zeroDowntimeStatus}>
            {zeroDowntimeStatus}
          </p>
        </div>
      </div>

      {/* Individual Worker Nodes Dashboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Server size={18} className="text-purple-600" />
            <span>Worker Node Registry & Lifecycle Controls</span>
          </h2>
          <span className="text-xs font-semibold text-slate-600">
            {workers.length} Registered Instances
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {workers.map((worker: any) => {
            const isHealthy = worker.status === 'HEALTHY';
            const isDegraded = worker.status === 'DEGRADED';
            const isDraining = worker.status === 'DRAINING' || worker.draining;
            const isFailed = worker.status === 'OFFLINE' || worker.status === 'UNHEALTHY' || worker.isSimulatedFailure;

            return (
              <div
                key={worker.workerId}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 relative overflow-hidden"
              >
                {/* Header: Name, ID and Status Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{worker.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        worker.type === 'REAL' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {worker.type === 'REAL' ? 'ACTIVE PROCESS' : 'CLUSTER WORKER'}
                      </span>
                      <p className="text-[11px] font-mono text-slate-600">
                        {worker.workerId} • {worker.host}:{worker.port}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1 border ${
                      isHealthy
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isDegraded
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : isDraining
                        ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isHealthy ? 'bg-emerald-600' : isDegraded ? 'bg-amber-500' : isDraining ? 'bg-cyan-500' : 'bg-rose-600'
                      }`}
                    />
                    <span>{worker.status}</span>
                  </span>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">CPU / Heap</span>
                    <span className="font-mono font-bold text-slate-900">
                      {worker.cpuUsage}% / {worker.memoryUsageMb} MB
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Active Conns</span>
                    <span className="font-mono font-bold text-cyan-600">{worker.activeConnections}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Latency (P50 / P95)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {worker.p50Latency || worker.latency || 0}ms / {worker.p95Latency || worker.latency || 0}ms
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Weight / Failures</span>
                    <span className="font-mono font-bold text-slate-900">
                      Weight: {worker.weight} • Failures: {worker.consecutiveFailures || 0}
                    </span>
                  </div>
                </div>

                {/* Lifetime Handled vs Failed */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono border-t border-slate-100 pt-2">
                  <span>Requests: <strong>{worker.requests || worker.requestsHandled || 0}</strong></span>
                  <span>
                    Errors:{' '}
                    <strong className={(worker.errorCount || worker.requestsFailed) > 0 ? 'text-rose-600' : ''}>
                      {worker.errorCount || worker.requestsFailed || 0}
                    </strong>
                  </span>
                </div>

                {/* Control Actions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleHealthCheck(worker.workerId)}
                    disabled={actionLoading === `health_${worker.workerId}`}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    title="Probe worker health endpoint"
                  >
                    <RefreshCw size={11} className={actionLoading === `health_${worker.workerId}` ? 'animate-spin' : ''} />
                    <span>Health Check</span>
                  </button>

                  {isFailed ? (
                    <button
                      onClick={() => handleRecover(worker.workerId)}
                      disabled={actionLoading === `recover_${worker.workerId}`}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={11} />
                      <span>Recover</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDrain(worker.workerId)}
                        disabled={isDraining || actionLoading === `drain_${worker.workerId}`}
                        className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        title="Drain existing connections before maintenance"
                      >
                        Drain
                      </button>
                      <button
                        onClick={() => handleDisable(worker.workerId)}
                        disabled={actionLoading === `disable_${worker.workerId}`}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        title="Disable worker and set OFFLINE"
                      >
                        Disable
                      </button>
                      <button
                        onClick={() => handleSimulateFailure(worker.workerId)}
                        disabled={actionLoading === `fail_${worker.workerId}`}
                        className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 text-center"
                        title="Simulate outage to verify automatic failover"
                      >
                        Fail Test
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Traffic Feed (Actual Requests Intercepted by UNX Reverse Proxy) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-cyan-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Live Reverse Proxy Traffic Feed
            </h2>
          </div>
          <span className="text-xs text-slate-600 font-mono">
            {liveTraffic.length} Recent Requests Captured
          </span>
        </div>

        {liveTraffic.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
            No recent traffic recorded yet. Incoming API calls through the reverse proxy will stream here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Endpoint</th>
                  <th className="py-2 px-3">Assigned Worker</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Latency</th>
                  <th className="py-2 px-3">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {liveTraffic.slice(0, 15).map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-slate-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        entry.method === 'GET'
                          ? 'bg-blue-100 text-blue-800'
                          : entry.method === 'POST'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.method === 'PUT' || entry.method === 'PATCH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {entry.method}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-sans font-medium truncate max-w-xs" title={entry.path}>
                      {entry.path}
                    </td>
                    <td className="py-2 px-3 font-bold text-purple-700">
                      {entry.workerId}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        entry.statusCode < 300
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.statusCode < 400
                          ? 'bg-cyan-100 text-cyan-800'
                          : entry.statusCode < 500
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {entry.statusCode}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-900 font-bold">
                      {entry.durationMs}ms
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {entry.clientIp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Downstream Circuit Breakers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-emerald-700" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Downstream Circuit Breaker Safeguards
            </h2>
          </div>
          <span className="text-xs text-slate-600 font-medium">Automatic Protection</span>
        </div>

        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Circuit breakers prevent cascading outages. If a downstream provider fails 5 consecutive times, the circuit trips to <code className="bg-slate-100 px-1 rounded text-rose-600 font-bold">OPEN</code> to avoid hammering the failing dependency, and transitions to <code className="bg-slate-100 px-1 rounded text-amber-600 font-bold">HALF_OPEN</code> after cooldown to probe recovery.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          {circuitBreakers.map((cb: any) => (
            <div key={cb.name} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{cb.name}</span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    cb.state === 'CLOSED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : cb.state === 'HALF_OPEN'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {cb.state}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                Failures: {cb.failureCount} / {cb.failureThreshold} (Cooldown: {cb.cooldownMs / 1000}s)
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminInfrastructureTab;
