import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Loader2,
  RefreshCw,
  Terminal,
  Calendar,
  Search,
  Filter,
  Shield,
  Clock,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Radio,
  Download,
  Copy,
  Check,
  ChevronRight,
  X,
  Smartphone,
  Lock,
  ShoppingBag,
  CreditCard,
  Wallet,
  Cpu,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../../context/StoreContext';
import { fetchApi } from '../../../services/api';

export const AdminSystemEventsTab: React.FC = () => {
  const { showToast } = useStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [autoTail, setAutoTail] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const streamContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => {
      fetchEvents(false);
    }, 8000); // 8s live polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoTail && streamContainerRef.current) {
      streamContainerRef.current.scrollTop = 0;
    }
  }, [events, autoTail]);

  const fetchEvents = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetchApi('/api/admin/system-events?limit=200');
      if (res.success && res.events && res.events.length > 0) {
        setEvents(res.events);
      } else {
        const fallbackRes = await fetchApi('/api/admin/activity-logs');
        if (fallbackRes.success && fallbackRes.logs) {
          setEvents(
            fallbackRes.logs.map((l: any) => ({
              id: l.id,
              event_type: l.action || 'SYSTEM_EVENT',
              severity: l.action?.includes('ERROR') || l.action?.includes('FAIL') ? 'ERROR' : 'INFO',
              actor_id: l.actor || l.adminId || 'system',
              message: l.description || l.details || '',
              metadata: l,
              created_at: l.createdAt || l.created_at,
            }))
          );
        } else {
          setEvents([]);
        }
      }
    } catch {
      // Fallback
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setSyncing(true);
    await fetchEvents(true);
    setSyncing(false);
    showToast('success', 'System Events Refreshed');
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    showToast('info', 'Copied to clipboard', label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `system_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('success', 'Log Exported');
  };

  const getEventIcon = (type = '') => {
    const t = type.toUpperCase();
    if (t.includes('AUTH') || t.includes('LOGIN') || t.includes('OTP')) return <Lock size={14} className="text-purple-500" />;
    if (t.includes('ORDER')) return <ShoppingBag size={14} className="text-blue-500" />;
    if (t.includes('PAY') || t.includes('ESEWA') || t.includes('KHALTI')) return <CreditCard size={14} className="text-emerald-500" />;
    if (t.includes('WALLET')) return <Wallet size={14} className="text-amber-500" />;
    if (t.includes('SEC') || t.includes('RATE') || t.includes('BLOCK')) return <Shield size={14} className="text-rose-500" />;
    return <Cpu size={14} className="text-cyan-500" />;
  };

  const filteredEvents = events.filter((ev) => {
    const type = (ev.event_type || ev.action || '').toUpperCase();
    const msg = (ev.message || ev.description || '').toLowerCase();
    const actor = (ev.actor_id || ev.actor || '').toLowerCase();
    const sev = (ev.severity || 'INFO').toUpperCase();

    if (selectedSeverity !== 'ALL' && sev !== selectedSeverity) return false;

    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'AUTH' && !type.includes('AUTH') && !type.includes('LOGIN') && !type.includes('OTP')) return false;
      if (selectedCategory === 'ORDERS' && !type.includes('ORDER')) return false;
      if (selectedCategory === 'PAYMENTS' && !type.includes('PAY') && !type.includes('ESEWA') && !type.includes('KHALTI')) return false;
      if (selectedCategory === 'WALLET' && !type.includes('WALLET')) return false;
      if (selectedCategory === 'SECURITY' && !type.includes('SEC') && !type.includes('RATE') && !type.includes('BLOCK')) return false;
      if (selectedCategory === 'ERRORS' && sev !== 'ERROR' && sev !== 'CRITICAL') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return type.toLowerCase().includes(q) || msg.includes(q) || actor.includes(q) || String(ev.id).toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Compact Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <Terminal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">System Events</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time audit telemetry & security stream ({filteredEvents.length} events)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoTail(!autoTail)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              autoTail
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 border-slate-700'
            }`}
          >
            <Radio size={13} className={autoTail ? 'animate-pulse' : ''} />
            <span>{autoTail ? 'Auto-Tail ON' : 'Auto-Tail OFF'}</span>
          </button>

          <button
            onClick={handleExportJson}
            title="Export JSON Log"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download size={15} />
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={syncing || loading}
            className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncing || loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Compact Quick Filter Chips (Horizontal Mobile Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'All Events' },
          { id: 'AUTH', label: 'Auth & 2FA' },
          { id: 'ORDERS', label: 'Orders' },
          { id: 'PAYMENTS', label: 'Payments' },
          { id: 'WALLET', label: 'Wallet' },
          { id: 'SECURITY', label: 'Security' },
          { id: 'ERRORS', label: 'Failures & 5xx' },
        ].map((chip) => {
          const active = selectedCategory === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setSelectedCategory(chip.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search and Severity Filter Bar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search event ID, type, message, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                selectedSeverity === sev
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile-Native Compact Events Stream List */}
      <div
        ref={streamContainerRef}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[640px] overflow-y-auto custom-scrollbar"
      >
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-red-600" />
            <span className="text-xs font-medium">Connecting to low-level event pipeline...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Terminal size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No matching events found</p>
            <p className="text-xs text-slate-400 mt-1">Try switching category filter or clearing search.</p>
          </div>
        ) : (
          filteredEvents.map((ev, idx) => {
            const sev = (ev.severity || 'INFO').toUpperCase();
            const isErr = sev === 'ERROR' || sev === 'CRITICAL';
            const isWarn = sev === 'WARNING';
            const dateStr = ev.created_at || ev.createdAt || new Date().toISOString();

            return (
              <div
                key={ev.id || idx}
                onClick={() => setSelectedEvent(ev)}
                className="p-3 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5">
                    {getEventIcon(ev.event_type || ev.action)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900">
                        {ev.event_type || ev.action || 'SYSTEM'}
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          isErr
                            ? 'bg-rose-100 text-rose-700'
                            : isWarn
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {sev}
                      </span>

                      {ev.id && (
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[100px]">
                          #{String(ev.id).slice(-8)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-1 break-words">
                      {ev.message || ev.description || 'System event recorded.'}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(dateStr).toLocaleTimeString()}
                      </span>
                      {ev.actor_id && <span>actor: {ev.actor_id}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-red-600 transition-colors shrink-0">
                  <ChevronRight size={16} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Advanced Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="text-red-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">Event Details Inspector</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 custom-scrollbar flex-1 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Event ID:</span>
                    <span className="font-bold text-slate-900">{selectedEvent.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Event Type:</span>
                    <span className="font-bold text-slate-900">{selectedEvent.event_type || selectedEvent.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Severity:</span>
                    <span className="font-bold text-red-600">{selectedEvent.severity || 'INFO'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-slate-700">{new Date(selectedEvent.created_at || selectedEvent.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Actor:</span>
                    <span className="text-slate-700">{selectedEvent.actor_id || selectedEvent.actor || 'system'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700">Message & Summary</span>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs break-words">
                    {selectedEvent.message || selectedEvent.description}
                  </div>
                </div>

                {selectedEvent.metadata && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Structured Payload (Redacted)</span>
                      <button
                        onClick={() => handleCopy(JSON.stringify(selectedEvent.metadata, null, 2), 'Metadata JSON')}
                        className="text-[11px] text-red-600 font-bold hover:underline flex items-center gap-1"
                      >
                        {copiedId === 'Metadata JSON' ? <Check size={12} /> : <Copy size={12} />}
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48 custom-scrollbar">
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSystemEventsTab;
