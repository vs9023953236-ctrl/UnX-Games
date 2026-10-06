import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Activity,
  Search,
  CheckCircle,
  RefreshCw,
  XCircle,
  Smartphone,
  Eye,
  FileText,
  UserX,
  X,
  Check,
  Clock,
  ChevronRight,
  Sliders,
  Flag,
  Globe,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchApi } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';

export const AdminSecurityTab: React.FC = () => {
  const { showToast } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isSuperAdmin = ['SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF', 'STORE_OWNER', 'ADMIN'].includes(uRole);

  const [activeSubTab, setActiveSubTab] = useState<'incidents' | 'sessions' | 'risk' | 'flags' | 'audit'>('incidents');
  const [stats, setStats] = useState<any>({
    totalIncidents: 0,
    openIncidents: 0,
    criticalIncidents: 0,
    activeSessionsCount: 0,
    highRiskUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [riskScores, setRiskScores] = useState<any[]>([]);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      loadSecurityData();
    } else {
      setLoading(false);
    }
  }, [activeSubTab, isSuperAdmin]);

  const loadSecurityData = async (isManual = false) => {
    setLoading(true);
    try {
      const statsData = await fetchApi('/api/admin/security/stats');
      if (statsData.success) setStats(statsData.stats);

      if (activeSubTab === 'incidents') {
        const data = await fetchApi('/api/admin/security/incidents');
        if (data.success) setIncidents(data.incidents || []);
      } else if (activeSubTab === 'sessions') {
        const data = await fetchApi('/api/admin/security/sessions');
        if (data.success) setSessionsList(data.sessions || []);
      } else if (activeSubTab === 'risk') {
        const data = await fetchApi('/api/admin/security/risk-scores');
        if (data.success) setRiskScores(data.riskScores || []);
      } else if (activeSubTab === 'flags') {
        const data = await fetchApi('/api/admin/feature-flags');
        if (data.success) setFeatureFlags(data.flags || []);
      } else if (activeSubTab === 'audit') {
        const data = await fetchApi('/api/admin/audit-logs');
        if (data.success) setAuditLogs(data.auditLogs || []);
      }

      if (isManual) showToast('success', 'Security Telemetry Refreshed');
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncident = async (id: string, status: 'resolved' | 'dismissed') => {
    setResolving(true);
    try {
      const res = await fetchApi(`/api/admin/security/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: resolutionNotes }),
      });
      if (res.success) {
        showToast('success', `Incident ${status}`);
        setSelectedIncident(null);
        setResolutionNotes('');
        loadSecurityData();
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message);
    } finally {
      setResolving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetchApi(`/api/admin/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });
      if (res.success) {
        showToast('success', 'Session Revoked');
        loadSecurityData();
      }
    } catch (err: any) {
      showToast('error', 'Revocation Failed', err?.message);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const sev = (inc.severity || 'LOW').toUpperCase();
    if (severityFilter !== 'ALL' && sev !== severityFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        inc.type?.toLowerCase().includes(q) ||
        inc.description?.toLowerCase().includes(q) ||
        inc.ip_address?.includes(q) ||
        inc.user_email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Dark Security Hero Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black shrink-0">
            <ShieldAlert size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Security & Fraud Center</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ACTIVE SHIELD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Zero-Trust threat detection, anomaly mitigation, & session control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSecurityData(true)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Security Metrics Grid (Compact 4-col) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Open Incidents</span>
          <p className="text-base font-black text-slate-900 font-mono">{stats.openIncidents || 0}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Critical Threats</span>
          <p className="text-base font-black text-rose-600 font-mono">{stats.criticalIncidents || 0}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Sessions</span>
          <p className="text-base font-black text-blue-600 font-mono">{stats.activeSessionsCount || 1}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">High Risk Users</span>
          <p className="text-base font-black text-amber-600 font-mono">{stats.highRiskUsers || 0}</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'incidents', label: 'Incidents & Threats', icon: AlertTriangle },
          { id: 'sessions', label: 'Active Sessions', icon: Smartphone },
          { id: 'risk', label: 'Risk Scores', icon: Activity },
          { id: 'flags', label: 'Security Flags', icon: Flag },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
        ].map((tab) => {
          const active = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB: INCIDENTS */}
      {activeSubTab === 'incidents' && (
        <div className="space-y-3">
          {/* Search & Severity Chips */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search threats, IP, actor, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-1 w-full sm:w-auto">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents Mobile Cards Stream */}
          <div className="space-y-2">
            {loading ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={20} className="animate-spin text-rose-600" />
                <span className="text-xs font-medium">Scanning security incidents...</span>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-slate-400">
                <ShieldCheck size={28} className="mx-auto mb-1.5 text-emerald-500" />
                <p className="font-bold text-slate-800 text-xs">Zero Open Threat Incidents</p>
                <p className="text-[11px] text-slate-500">Security perimeter is clean & verified.</p>
              </div>
            ) : (
              filteredIncidents.map((inc, idx) => {
                const isCrit = inc.severity === 'CRITICAL' || inc.severity === 'HIGH';
                return (
                  <div
                    key={inc.id || idx}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isCrit ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                        <ShieldAlert size={16} />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900">{inc.type || 'THREAT'}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              isCrit ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {inc.severity || 'LOW'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(inc.created_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">{inc.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          {inc.ip_address && <span>IP: {inc.ip_address}</span>}
                          {inc.user_email && <span>User: {inc.user_email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: SESSIONS */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-2">
          {sessionsList.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-slate-400">
              <Smartphone size={28} className="mx-auto mb-1.5 text-slate-300" />
              <p className="font-bold text-slate-800 text-xs">No Active Remote Sessions</p>
            </div>
          ) : (
            sessionsList.map((sess, idx) => (
              <div
                key={sess.id || idx}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <Smartphone size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">{sess.user_email || 'Admin'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700">ONLINE</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {sess.ip} • {sess.os || 'Mobile/Desktop'} • {new Date(sess.last_active || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB: RISK SCORES */}
      {activeSubTab === 'risk' && (
        <div className="space-y-2">
          {riskScores.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-slate-400">
              <Activity size={28} className="mx-auto mb-1.5 text-slate-300" />
              <p className="font-bold text-slate-800 text-xs">No High-Risk Anomalies</p>
              <p className="text-[11px] text-slate-500">All authenticated gamers have trusted reputation scores.</p>
            </div>
          ) : (
            riskScores.map((r, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-xs text-slate-900">{r.email}</span>
                  <p className="text-[11px] text-slate-500">Risk Score: {r.score}/100 • {r.reasons?.join(', ')}</p>
                </div>
                <span className="px-2 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-700">
                  {r.level || 'HIGH'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-slate-400">
              <FileText size={28} className="mx-auto mb-1.5 text-slate-300" />
              <p className="font-bold text-slate-800 text-xs">Zero Audit Anomalies</p>
            </div>
          ) : (
            auditLogs.slice(0, 30).map((log, idx) => (
              <div
                key={log.id || idx}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] font-mono text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{log.details || log.description}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{log.admin_email || 'system'}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Incident Inspector Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">Incident Details</h3>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="font-bold text-slate-900">{selectedIncident.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Severity:</span>
                  <span className="font-bold text-rose-600">{selectedIncident.severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-bold text-slate-900">{selectedIncident.ip_address || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">User:</span>
                  <span className="text-slate-700">{selectedIncident.user_email || 'Anonymous'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700">Resolution Notes</span>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain remediation action taken..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleResolveIncident(selectedIncident.id, 'dismissed')}
                  disabled={resolving}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveIncident(selectedIncident.id, 'resolved')}
                  disabled={resolving}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  {resolving ? 'Resolving...' : 'Resolve Threat'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSecurityTab;
