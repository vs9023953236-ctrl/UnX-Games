import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sliders,
  Zap,
  Clock,
  Activity,
  Layers,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Check,
  Shield,
  Lock,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';

export const AdminRateLimitingTab: React.FC = () => {
  const { showToast } = useStore();
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_OWNER';

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Flood simulation state
  const [testingFlood, setTestingFlood] = useState(false);
  const [floodResult, setFloodResult] = useState<any>(null);

  const fetchRateLimitData = async () => {
    try {
      const [statsRes, policiesRes, eventsRes] = await Promise.all([
        api.gateway.rateLimit.getStats().catch(() => null),
        api.gateway.rateLimit.getPolicies().catch(() => null),
        api.gateway.rateLimit.getEvents().catch(() => null),
      ]);

      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (policiesRes && policiesRes.data) setPolicies(policiesRes.data);
      if (eventsRes && eventsRes.data) setEvents(eventsRes.data);
    } catch (err: any) {
      console.warn('Rate limit data fetch note:', err);
    }
  };

  useEffect(() => {
    fetchRateLimitData();
    const interval = setInterval(fetchRateLimitData, 5000); // 5s polling
    return () => clearInterval(interval);
  }, []);

  const handleUpdatePolicyAlgo = async (policyId: string, algorithm: string) => {
    setActionLoading(`algo_${policyId}`);
    try {
      const res = await api.gateway.rateLimit.updatePolicy(policyId, { algorithm });
      if (res && res.success) {
        showToast('success', `Policy [${policyId}] algorithm updated to ${algorithm}`);
        fetchRateLimitData();
      } else {
        showToast('error', res.message || 'Failed to update algorithm');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating policy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePolicy = async (policy: any) => {
    if (policy.isCritical && policy.enabled && !isSuperAdmin) {
      showToast('error', 'Critical security endpoints can only be disabled by Super Admin.');
      return;
    }

    setActionLoading(`toggle_${policy.id}`);
    try {
      const res = await api.gateway.rateLimit.updatePolicy(policy.id, { enabled: !policy.enabled });
      if (res && res.success) {
        showToast('info', `Policy [${policy.name}] ${!policy.enabled ? 'Enabled' : 'Disabled'}`);
        fetchRateLimitData();
      } else {
        showToast('error', res.message || 'Failed to toggle policy');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error toggling policy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestFlood = async (policyId = 'AUTH_LOGIN') => {
    setTestingFlood(true);
    setFloodResult(null);
    try {
      const res = await api.gateway.rateLimit.testFlood({
        policyId,
        count: 10,
        identifier: 'simulated_attacker_client',
      });
      if (res && res.success && res.data) {
        setFloodResult(res.data);
        showToast('success', `Simulated 10 requests: ${res.data.blockedCount} blocked with HTTP 429`);
        fetchRateLimitData();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Flood simulation failed');
    } finally {
      setTestingFlood(false);
    }
  };

  const blockedPct = stats?.totalRequests > 0 ? Math.round((stats.totalBlocked / stats.totalRequests) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-950 text-white p-5 rounded-2xl border border-rose-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Security & Abuse Shield
              </span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Multi-Algorithm
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>UNX API Rate Limiting & Abuse Protection</span>
              <ShieldAlert size={20} className="text-rose-400" />
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl font-medium">
              Fine-grained multi-dimensional rate limiting across Fixed Window, Sliding Window, Token Bucket & Leaky Bucket algorithms to stop brute-force, OTP spam & API flooding.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleTestFlood('AUTH_LOGIN')}
              disabled={testingFlood}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Flame size={13} className={testingFlood ? 'animate-spin' : ''} />
              <span>{testingFlood ? 'Flooding...' : 'Simulate 10 Reqs Flood'}</span>
            </button>

            <button
              onClick={fetchRateLimitData}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evaluated Reqs</span>
          <p className="text-2xl font-black text-slate-900">{stats?.totalRequests || 0}</p>
          <p className="text-[11px] text-slate-600 font-medium">{stats?.requestsPerSecond || 0} reqs / sec</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allowed Traffic</span>
          <p className="text-2xl font-black text-emerald-800">{stats?.totalAllowed || 0}</p>
          <p className="text-[11px] text-slate-600 font-medium">Fair & smooth access</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">HTTP 429 Blocked</span>
          <p className="text-2xl font-black text-rose-600">{stats?.totalBlocked || 0}</p>
          <p className="text-[11px] text-slate-600 font-medium">{blockedPct}% block ratio</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distributed Backend</span>
          <p className="text-lg font-black text-purple-700 truncate font-mono">
            {stats?.distributed ? 'REDIS DISTRIBUTED' : 'LOCAL FALLBACK'}
          </p>
          <p className="text-[11px] text-slate-600 font-medium">
            {stats?.distributed ? 'Shared across worker nodes' : 'In-memory safe local state'}
          </p>
        </div>
      </div>

      {/* Flood Simulation Results Banner (if ran) */}
      {floodResult && (
        <div className="bg-slate-900 text-white p-4.5 rounded-2xl border border-rose-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-mono text-xs font-bold text-rose-400">
              Flood Test Result: {floodResult.dispatchedCount} Requests Dispatched → {floodResult.blockedCount} Blocked (HTTP 429)
            </span>
            <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
              Retry-After Active
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono py-1">
            {floodResult.results?.map((r: any) => (
              <span
                key={r.requestNum}
                className={`px-2 py-1 rounded border whitespace-nowrap ${
                  r.allowed
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                }`}
              >
                Req #{r.requestNum}: {r.allowed ? '200 OK' : `429 (${r.retryAfterSec}s)`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4 Algorithms Concept Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Fixed Window</span>
            <Clock size={14} className="text-blue-600" />
          </div>
          <p className="text-[10px] text-slate-600">
            Resets counter at exact wall-clock boundaries (e.g. 5 req / 5 mins). Ideal for mass signup prevention.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Sliding Window</span>
            <Activity size={14} className="text-purple-600" />
          </div>
          <p className="text-[10px] text-slate-600">
            Evaluates requests over a rolling 60s window without boundary spikes. Ideal for Login & OTP Verify.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Token Bucket</span>
            <Zap size={14} className="text-amber-500" />
          </div>
          <p className="text-[10px] text-slate-600">
            Allows bursts up to bucket capacity and refills steadily at N tokens/sec. Ideal for Orders & Public APIs.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Leaky Bucket</span>
            <Layers size={14} className="text-cyan-600" />
          </div>
          <p className="text-[10px] text-slate-600">
            Queues bursts and smoothly processes traffic at a constant leak rate, eliminating sudden spikes.
          </p>
        </div>
      </div>

      {/* Central Rate Limit Policies Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Endpoint Rate Limit Policies & Algorithm Assignment
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {policies.length} Policies Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3">Policy Target</th>
                <th className="py-2.5 px-3">Endpoint Route</th>
                <th className="py-2.5 px-3 text-center">Algorithm</th>
                <th className="py-2.5 px-3 text-center">Limit / Window</th>
                <th className="py-2.5 px-3 text-center">Blocked</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{policy.name}</span>
                      {policy.isCritical && (
                        <span className="text-[9px] px-1 py-0.2 bg-rose-50 text-rose-700 rounded font-black border border-rose-200">
                          Critical
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-600">{policy.id}</span>
                  </td>

                  <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-bold mr-1.5">
                      {policy.method}
                    </span>
                    {policy.endpoint}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <select
                      value={policy.algorithm}
                      onChange={(e) => handleUpdatePolicyAlgo(policy.id, e.target.value)}
                      disabled={actionLoading === `algo_${policy.id}`}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="SLIDING_WINDOW">Sliding Window</option>
                      <option value="FIXED_WINDOW">Fixed Window</option>
                      <option value="TOKEN_BUCKET">Token Bucket</option>
                      <option value="LEAKY_BUCKET">Leaky Bucket</option>
                    </select>
                  </td>

                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                    {policy.limit} req / {Math.round(policy.windowMs / 1000)}s
                    {policy.capacity && (
                      <span className="block text-[10px] text-slate-600 font-normal">
                        burst: {policy.capacity}
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className={`font-bold ${policy.totalBlocked > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {policy.totalBlocked}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${
                        policy.enabled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {policy.enabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleTogglePolicy(policy)}
                      disabled={actionLoading === `toggle_${policy.id}`}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        policy.enabled
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {policy.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Security Event Stream */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Real-Time Security Event Stream (Abuse Detections)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {events.length} Recent Events Logged
          </span>
        </div>

        {events.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {events.map((evt) => (
              <div key={evt.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 text-[9px] font-black rounded uppercase bg-rose-100 text-rose-800">
                      {evt.type}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {evt.method} {evt.endpoint}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Target: {evt.identifier} • IP: {evt.ip} • ReqID: {evt.requestId}
                  </p>
                </div>

                <div className="text-right space-y-0.5 font-mono">
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded">
                    Retry-After: {evt.retryAfterSec}s
                  </span>
                  <p className="text-[10px] text-slate-600">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-600 font-medium">
            No abuse events detected in the current window. System traffic is running smoothly.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRateLimitingTab;
