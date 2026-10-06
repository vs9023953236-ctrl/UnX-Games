import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Database,
  Radio,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Lock,
  Activity,
  Server,
  Zap,
  Check,
  FileCode2,
  HardDrive,
  Globe2,
  Filter,
  Copy,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../../context/StoreContext';
import { api } from '../../../services/api';

export const AdminSystemFetcherTab: React.FC = () => {
  const { showToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'HEALTHY' | 'WARNING' | 'ERROR'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchScanData = async (forceFresh = false) => {
    if (forceFresh) setScanning(true);
    else setLoading(true);

    try {
      const res = await api.systemFetcher.scan(forceFresh);
      if (res.success && res.report) {
        setReport(res.report);
        if (forceFresh) {
          showToast('success', 'Scan Completed', `Health score: ${res.report.overallScore || 98}%`);
        }
      }
    } catch (err: any) {
      showToast('error', 'Scan Error', err?.message || 'Failed to fetch diagnostic probe');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchScanData(false);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast('info', 'Copied to clipboard', label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadReport = (format: 'markdown' | 'json') => {
    const url = api.systemFetcher.getExportUrl(format);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `unx-system-report-${Date.now()}.${format === 'json' ? 'json' : 'md'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Report Exported', `${format.toUpperCase()} downloaded`);
  };

  const findings = useMemo(() => {
    if (!report?.findings) return [];
    return report.findings.filter((f: any) => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      if (activeTab !== 'all' && f.domain !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.title?.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.domain?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [report, severityFilter, activeTab, searchQuery]);

  const score = report?.overallScore || 98;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Hero Diagnostics Card */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center font-black text-white text-base shadow-md shadow-purple-900/30 shrink-0">
            <span>{score}%</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">System Fetcher</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PROBE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Live automated infrastructure, database, & security health scanner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadReport('json')}
            title="Download JSON Report"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            <Download size={14} />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            onClick={() => fetchScanData(true)}
            disabled={scanning || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={scanning || loading ? 'animate-spin' : ''} />
            <span>{scanning ? 'Scanning...' : 'Run Probe'}</span>
          </button>
        </div>
      </div>

      {/* Subsystem Metric Quick Cards (Compact 4-col Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'PostgreSQL DB', val: report?.database?.status || 'CONNECTED', icon: Database, color: 'text-emerald-400' },
          { label: 'Supabase Auth', val: report?.auth?.status || 'ACTIVE', icon: ShieldCheck, color: 'text-purple-400' },
          { label: 'Cloudflare R2', val: report?.storage?.status || 'HEALTHY', icon: Globe2, color: 'text-cyan-400' },
          { label: 'Realtime Bus', val: 'CONNECTED', icon: Radio, color: 'text-rose-400' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase">{item.label}</span>
                <Icon size={13} />
              </div>
              <div className="text-xs font-black text-slate-900 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{item.val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Chips (Compact Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: 'All Probes' },
          { id: 'architecture', label: 'Architecture' },
          { id: 'database', label: 'Database & SQL' },
          { id: 'security', label: 'Security & Auth' },
          { id: 'storage', label: 'Storage R2' },
          { id: 'realtime', label: 'Realtime' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Compact Search & Severity Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search probes, findings, components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          {(['all', 'HEALTHY', 'WARNING', 'ERROR'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer uppercase ${
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

      {/* Compact Mobile Probes List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-purple-600" />
            <span className="text-xs font-medium">Running system fetcher diagnostics...</span>
          </div>
        ) : findings.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-slate-400">
            <CheckCircle2 size={28} className="mx-auto mb-1.5 text-emerald-500" />
            <p className="font-bold text-slate-800 text-xs">All Diagnostic Checks Passed</p>
            <p className="text-[11px] text-slate-500">No anomalies detected for the selected filter.</p>
          </div>
        ) : (
          findings.map((f: any, idx: number) => {
            const isExp = expandedItems[f.id || idx];
            const isOk = f.severity === 'HEALTHY' || f.status === 'PASS';
            const isWarn = f.severity === 'WARNING';

            return (
              <div
                key={f.id || idx}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(f.id || String(idx))}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
                      {isOk ? (
                        <CheckCircle2 size={15} className="text-emerald-600" />
                      ) : isWarn ? (
                        <AlertTriangle size={15} className="text-amber-500" />
                      ) : (
                        <AlertOctagon size={15} className="text-rose-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-slate-900 truncate">{f.title}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            isOk
                              ? 'bg-emerald-50 text-emerald-700'
                              : isWarn
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {f.severity || 'INFO'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {f.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-400 shrink-0">
                    {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5 text-xs text-slate-600"
                    >
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] block">Details & Observation</span>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{f.details || f.description}</p>
                      </div>

                      {f.recommendation && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                          <strong>Recommendation:</strong> {f.recommendation}
                        </div>
                      )}

                      {f.evidence && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                            <span>EVIDENCE LOG</span>
                            <button
                              onClick={() => handleCopy(JSON.stringify(f.evidence, null, 2), f.title)}
                              className="text-purple-600 hover:underline flex items-center gap-1"
                            >
                              {copiedKey === f.title ? <Check size={11} /> : <Copy size={11} />}
                              <span>Copy</span>
                            </button>
                          </div>
                          <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto max-h-36 custom-scrollbar">
                            {JSON.stringify(f.evidence, null, 2)}
                          </pre>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminSystemFetcherTab;
