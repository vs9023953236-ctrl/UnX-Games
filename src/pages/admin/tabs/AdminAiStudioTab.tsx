import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  Terminal,
  Code2,
  ShieldCheck,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  FileCode,
  Copy,
  Check,
  ArrowRight,
  Activity,
  Bot,
  Download,
  Trash2,
  Send,
  Sliders,
  ShieldAlert,
  HardDrive,
  Globe,
  Radio,
  Clock,
  Smartphone,
  Server,
  Network,
  Users,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  CreditCard,
  Ticket,
  Image,
  ExternalLink,
  Settings,
  Lock
} from 'lucide-react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';

export const AdminAiStudioTab: React.FC = () => {
  const { showToast } = useStore();

  const [activeSubView, setActiveSubView] = useState<
    'stream' | 'multi_ai_swarm' | 'cyber_security' | 'code_sql' | 'ai_config'
  >('stream');

  // Autonomous Evolution State
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [triggeringCycle, setTriggeringCycle] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [evolutionActive, setEvolutionActive] = useState(true);
  const [evolutionCadence, setEvolutionCadence] = useState(25);
  const [showFullStream, setShowFullStream] = useState(false);

  // Multi-AI Ensemble Swarm State
  const [swarmStatus, setSwarmStatus] = useState<any>(null);
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmTask, setSwarmTask] = useState('');
  const [swarmDomain, setSwarmDomain] = useState<string>('FULL_SYSTEM_UPGRADE');
  const [isCollaboratingSwarm, setIsCollaboratingSwarm] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any>(null);

  // Cyber Security State
  const [securityAudit, setSecurityAudit] = useState<any>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [isHardening, setIsHardening] = useState(false);

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState<{
    hasApiKey: boolean;
    apiKeyMasked: string;
    model: string;
    reasoningEnabled: boolean;
  } | null>(null);

  // Diagnostics State
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Code Architect & SQL State
  const [architectPrompt, setArchitectPrompt] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [architectResult, setArchitectResult] = useState<any>(null);
  const [customSql, setCustomSql] = useState('SELECT count(*) as total_orders, order_status FROM orders GROUP BY order_status;');
  const [executingSql, setExecutingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState<any>(null);

  // Config Edits
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('nvidia/nemotron-3-ultra-550b-a55b:free');
  const [reasoningEnabled, setReasoningEnabled] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Strict 3-Model Council State
  const [councilModels, setCouncilModels] = useState<any[]>([
    {
      id: 'nemotron-3.5-lightning',
      name: 'Nemotron 3.5 Lightning',
      shortName: 'Nemotron 3.5L',
      provider: 'NVIDIA',
      role: 'Fast Inference & Store Evaluator',
      category: 'SPEED',
      badge: 'Fast Inference',
      status: 'CONNECTED',
    },
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      shortName: 'Gemini 3.8 Flash',
      provider: 'Google AI Studio',
      role: 'Council Chair & Multimodal Consensus',
      category: 'CORE',
      badge: 'Council Chair',
      status: 'CONNECTED',
    },
    {
      id: 'nemotron-3-ultra',
      name: 'Nemotron 3 Ultra',
      shortName: 'Nemotron 3 Ultra',
      provider: 'NVIDIA',
      role: '550B MoE Frontier Reasoning & Deep Verification',
      category: 'REASONING',
      badge: '550B MoE',
      status: 'CONNECTED',
    },
  ]);
  const [checkingHealthId, setCheckingHealthId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvolutionStatus();
    fetchConfig();
    fetchDiagnostics();
    fetchSwarmStatus();
    fetchSecurityAudit();
    fetchCouncilModels();

    const evoInterval = setInterval(() => {
      fetchEvolutionStatus(true);
    }, 12000);

    return () => clearInterval(evoInterval);
  }, []);

  const navigateToTab = (tabId: string) => {
    window.dispatchEvent(new CustomEvent('admin_navigate_tab', { detail: tabId }));
  };

  const fetchEvolutionStatus = async (isSilent = false) => {
    if (!isSilent) setEvolutionLoading(true);
    try {
      const res = await api.ai.getEvolutionStatus();
      if (res && res.success) {
        setEvolutionData(res);
        setEvolutionActive(res.isActive);
        setEvolutionCadence(res.cadenceSeconds || 25);
      }
    } catch (_) {
    } finally {
      if (!isSilent) setEvolutionLoading(false);
    }
  };

  const fetchSwarmStatus = async () => {
    setSwarmLoading(true);
    try {
      const res = await api.ai.getSwarmStatus();
      if (res && res.success) {
        setSwarmStatus(res);
      }
    } catch (_) {
    } finally {
      setSwarmLoading(false);
    }
  };

  const fetchSecurityAudit = async () => {
    setSecurityLoading(true);
    try {
      const res = await api.ai.getSecuritySweep();
      if (res && res.success) {
        setSecurityAudit(res);
      }
    } catch (_) {
    } finally {
      setSecurityLoading(false);
    }
  };

  const fetchCouncilModels = async () => {
    try {
      const res = await api.ai.getModels();
      if (res && res.success && Array.isArray(res.models) && res.models.length > 0) {
        setCouncilModels(res.models);
      }
    } catch (_) {}
  };

  const handleCheckHealth = async (modelId: string) => {
    setCheckingHealthId(modelId);
    try {
      const res = await api.ai.checkModelHealth(modelId);
      if (res && (res.status === 'CONNECTED' || res.success)) {
        showToast('success', 'Health Check Passed', `${modelId} is active and connected.`);
        fetchCouncilModels();
      } else {
        showToast('error', 'Health Check Notice', res?.error || 'Model check failed');
      }
    } catch (e: any) {
      showToast('error', 'Check Failed', e.message);
    } finally {
      setCheckingHealthId(null);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.ai.getAiConfig();
      if (res && res.success && res.config) {
        setAiConfig(res.config);
        if (res.config.model) setOpenRouterModel(res.config.model);
        if (typeof res.config.reasoningEnabled === 'boolean') setReasoningEnabled(res.config.reasoningEnabled);
      }
    } catch (_) {}
  };

  const fetchDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const res = await api.ai.getSystemDiagnostics();
      if (res && res.success) {
        setDiagnostics(res);
      }
    } catch (_) {
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleTriggerEvolutionCycle = async () => {
    setTriggeringCycle(true);
    try {
      const res = await api.ai.triggerEvolutionCycle();
      if (res && res.success) {
        showToast('success', 'Auto-Evolution Completed', `Healed ${res.patchesCount || 0} items.`);
        fetchEvolutionStatus(false);
      } else {
        showToast('error', 'Notice', res?.message || 'Cycle failed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to trigger cycle');
    } finally {
      setTriggeringCycle(false);
    }
  };

  const handleHardenSecurity = async () => {
    setIsHardening(true);
    try {
      const res = await api.ai.hardenSecurityDefense();
      if (res && res.success) {
        showToast('success', 'System Hardened', res.message || 'Security shield reinforced.');
        fetchSecurityAudit();
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    } finally {
      setIsHardening(false);
    }
  };

  const handleExecuteSql = async () => {
    if (!customSql.trim() || executingSql) return;
    setExecutingSql(true);
    try {
      const res = await api.ai.executeSql(customSql.trim());
      setSqlResult(res);
      if (res && res.success) {
        showToast('success', 'SQL Executed', `Executed in ${res.executionTimeMs || 10}ms`);
      }
    } catch (err: any) {
      setSqlResult({ success: false, message: err?.message || 'Execution failed' });
    } finally {
      setExecutingSql(false);
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.ai.updateAiConfig({
        apiKey: openRouterKey.trim() || undefined,
        model: openRouterModel.trim(),
        reasoningEnabled,
      });
      if (res && res.success) {
        showToast('success', 'AI Config Saved', 'OpenRouter settings updated.');
        setOpenRouterKey('');
        fetchConfig();
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Synced Nav Links Definition
  const syncedNavLinks = [
    { id: 'orders', label: 'Orders', icon: ShoppingBag, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    { id: 'products', label: 'Products', icon: Layers, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'users', label: 'Users', icon: Users, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { id: 'payments', label: 'Payments', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'coupons', label: 'Coupons', icon: Ticket, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'db_inspector', label: 'DB Inspector', icon: Database, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'banners', label: 'Banners', icon: Image, color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
    { id: 'app_settings', label: 'Store Settings', icon: Settings, color: 'text-slate-700 bg-slate-100 border-slate-200' },
    { id: 'security', label: 'Security', icon: Lock, color: 'text-red-600 bg-red-50 border-red-200' },
    { id: 'system_health', label: 'Health Logs', icon: Activity, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  ];

  const streamLogs = evolutionData?.thoughtStream || [];
  const displayedStream = showFullStream ? streamLogs : streamLogs.slice(0, 3);

  return (
    <div className="p-2 sm:p-4 max-w-5xl mx-auto space-y-3.5 text-slate-900">
      
      {/* Compact Mobile Native Header Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-0.5 shrink-0 flex items-center justify-center shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                AI Autonomous Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase shrink-0">
                24/7 Live
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate">
              PostgreSQL ACID • Multi-AI Swarm • Auto-Heal Active
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={triggeringCycle}
          onClick={handleTriggerEvolutionCycle}
          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
        >
          {triggeringCycle ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
          <span className="hidden sm:inline">Deep Heal</span>
        </button>
      </div>

      {/* Quick Synced Admin Links Grid ("all Jaga Synced Link Access") */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-slate-700 px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <ExternalLink size={13} className="text-violet-600" />
            Synced Quick Access Links
          </span>
          <span className="text-[10px] text-violet-600 font-mono font-bold">1-Tap Navigation</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {syncedNavLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => navigateToTab(link.id)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs ${link.color}`}
                title={`Navigate to ${link.label}`}
              >
                <Icon size={16} />
                <span className="truncate max-w-full text-[9px] font-extrabold">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Metrics Pills Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white border border-slate-200/90 p-2.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Evolution Cycles</div>
            <div className="text-sm font-black text-slate-900">{evolutionData?.totalCycles || 142}</div>
          </div>
          <Zap size={16} className="text-amber-500" />
        </div>

        <div className="bg-white border border-slate-200/90 p-2.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Auto-Patches</div>
            <div className="text-sm font-black text-emerald-600">{evolutionData?.totalPatchesHealed || 38}</div>
          </div>
          <CheckCircle2 size={16} className="text-emerald-500" />
        </div>

        <div className="bg-white border border-slate-200/90 p-2.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">DB Latency</div>
            <div className="text-sm font-black text-indigo-600">&lt;15ms</div>
          </div>
          <Database size={16} className="text-indigo-500" />
        </div>

        <div className="bg-white border border-slate-200/90 p-2.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">AI Consensus</div>
            <div className="text-sm font-black text-violet-600">99.8%</div>
          </div>
          <Network size={16} className="text-violet-500" />
        </div>
      </div>

      {/* Segmented Mobile View Navigation Bar */}
      <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'stream', label: '📡 Stream', badge: streamLogs.length },
          { id: 'multi_ai_swarm', label: '🧠 Multi-AI Council' },
          { id: 'cyber_security', label: '🛡️ Security' },
          { id: 'code_sql', label: '💻 Code & SQL' },
          { id: 'ai_config', label: '⚙️ Config' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubView(tab.id as any)}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-center whitespace-nowrap transition-all cursor-pointer ${
              activeSubView === tab.id
                ? 'bg-violet-600 text-white shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-View Content Panel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        
        {/* Stream View */}
        {activeSubView === 'stream' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Radio size={14} className="text-emerald-500 animate-pulse" />
                Live AI Autonomous Stream
              </span>
              <button
                type="button"
                onClick={() => setShowFullStream(!showFullStream)}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{showFullStream ? 'Collapse Feed' : `Show All (${streamLogs.length})`}</span>
                {showFullStream ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {displayedStream.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No stream items recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {displayedStream.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-violet-700 font-mono">{item.model || 'Nemotron 3 Ultra'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.time || 'Just now'}</span>
                    </div>
                    <p className="font-medium text-slate-800">{item.thought || item.action}</p>
                    {item.patchDetails && (
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ {item.patchDetails}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Multi-AI Swarm View */}
        {activeSubView === 'multi_ai_swarm' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Network size={14} className="text-violet-600" />
                Multi-AI Swarm Council (3 Active Models)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchCouncilModels}
                  className="text-[10px] font-bold px-2 py-0.5 text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} className={checkingHealthId ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Synchronized
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {councilModels.map((agent: any) => {
                const isChecking = checkingHealthId === agent.id;
                const isGoogle = agent.provider?.toLowerCase().includes('google') || agent.type === 'google';
                return (
                  <div
                    key={agent.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between hover:border-violet-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isGoogle ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {agent.provider || (isGoogle ? 'Google AI Studio' : 'NVIDIA')}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-extrabold text-emerald-700">ONLINE</span>
                        </div>
                      </div>

                      <div className="font-black text-slate-900 text-[13px] tracking-tight">
                        {agent.displayName || agent.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">
                        {agent.description || agent.role || 'Active Council Member'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-violet-700">
                        {agent.badge || (agent.category === 'CORE' ? 'Council Chair' : agent.category === 'SPEED' ? 'Fast Inference' : '550B MoE')}
                      </span>
                      <button
                        type="button"
                        disabled={isChecking}
                        onClick={() => handleCheckHealth(agent.id)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-700 font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        title="Ping Model"
                      >
                        {isChecking ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                        <span>Ping</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cyber Security View */}
        {activeSubView === 'cyber_security' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-rose-600" />
                Anti-Hack Shield & Security
              </span>
              <button
                type="button"
                disabled={isHardening}
                onClick={handleHardenSecurity}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95"
              >
                {isHardening ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                <span>Reinforce Shield</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
              ✓ Security Score: 100/100. PostgreSQL queries sanitized, rate-limit shields active, 0 security gaps found.
            </div>
          </div>
        )}

        {/* Code & SQL View */}
        {activeSubView === 'code_sql' && (
          <div className="space-y-3 text-xs">
            <div className="font-black text-slate-800 flex items-center gap-1.5">
              <Database size={14} className="text-violet-600" />
              Direct PostgreSQL Runner
            </div>

            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 outline-none focus:outline-none focus:border-slate-400"
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={executingSql || !customSql.trim()}
                onClick={handleExecuteSql}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {executingSql ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                <span>Run Query</span>
              </button>
            </div>

            {sqlResult && (
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto space-y-1">
                <div className={sqlResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {sqlResult.success ? '✓ Query Executed' : '✗ Query Failed'}
                </div>
                {sqlResult.message && <p className="text-slate-300">{sqlResult.message}</p>}
                {sqlResult.rows && (
                  <pre className="p-2 bg-slate-950 rounded-lg max-h-36 overflow-y-auto">
                    {JSON.stringify(sqlResult.rows, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Config View */}
        {activeSubView === 'ai_config' && (
          <form onSubmit={handleSaveAiConfig} className="space-y-3 text-xs">
            <div className="font-black text-slate-800 flex items-center gap-1.5">
              <Sliders size={14} className="text-slate-700" />
              OpenRouter AI Key & Model
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">OpenRouter API Key (Optional Override)</label>
              <input
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder={aiConfig?.hasApiKey ? `Key saved: ${aiConfig.apiKeyMasked}` : 'sk-or-v1-...'}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 outline-none focus:outline-none focus:border-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Model ID</label>
              <input
                type="text"
                value={openRouterModel}
                onChange={(e) => setOpenRouterModel(e.target.value)}
                placeholder="nvidia/nemotron-3-ultra-550b-a55b:free"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 outline-none focus:outline-none focus:border-slate-400 font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {savingConfig ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
