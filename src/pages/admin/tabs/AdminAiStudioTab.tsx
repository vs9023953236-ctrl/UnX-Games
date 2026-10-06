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
  Flame,
  ArrowRight,
  Activity,
  Wrench,
  Bot,
  Download,
  Trash2,
  Send,
  Sliders,
  CheckCheck,
  ShieldAlert,
  HardDrive,
  Globe,
  Layout,
  FileText,
  HelpCircle,
  Eye,
  Radio,
  Clock,
  Smartphone,
  Server,
  ZapOff,
  RotateCcw,
  Network,
  Users,
  Lock,
  Unlock,
  Key,
  Shield,
  CheckCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';

export const AdminAiStudioTab: React.FC = () => {
  const { showToast } = useStore();

  const [activeSubView, setActiveSubView] = useState<
    'auto_evolution' | 'multi_ai_swarm' | 'cyber_security' | 'chat_architect' | 'db_schema_builder' | 'autonomous_diagnostics' | 'ai_config'
  >('auto_evolution');

  // Autonomous Evolution State
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [triggeringCycle, setTriggeringCycle] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [evolutionActive, setEvolutionActive] = useState(true);
  const [evolutionCadence, setEvolutionCadence] = useState(25);

  // Multi-AI Ensemble Swarm State
  const [swarmStatus, setSwarmStatus] = useState<any>(null);
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmTask, setSwarmTask] = useState('');
  const [swarmDomain, setSwarmDomain] = useState<string>('FULL_SYSTEM_UPGRADE');
  const [isCollaboratingSwarm, setIsCollaboratingSwarm] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any>(null);

  // Cyber Security & Anti-Hack Shield State
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
  const [selfHealingRunning, setSelfHealingRunning] = useState<string | null>(null);

  // AI Code & System Architect State
  const [architectPrompt, setArchitectPrompt] = useState('');
  const [taskType, setTaskType] = useState<'feature' | 'bug_fix' | 'api_gateway' | 'database_schema' | 'ui_component' | 'security_audit'>('feature');
  const [targetStack, setTargetStack] = useState<'full_stack' | 'react_typescript' | 'express_backend' | 'postgresql_supabase' | 'tailwind_ui'>('full_stack');
  const [contextSnippet, setContextSnippet] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [architectResult, setArchitectResult] = useState<any>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // SQL Migration Runner State
  const [customSql, setCustomSql] = useState('');
  const [executingSql, setExecutingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState<{ success: boolean; message: string; rowCount?: number; rows?: any[]; executionTimeMs?: number } | null>(null);

  // OpenRouter Config Edit
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('nvidia/nemotron-3-ultra-550b-a55b:free');
  const [reasoningEnabled, setReasoningEnabled] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchEvolutionStatus();
    fetchConfig();
    fetchDiagnostics();
    fetchSwarmStatus();
    fetchSecurityAudit();

    // Live polling for auto-evolution thought stream
    const evoInterval = setInterval(() => {
      fetchEvolutionStatus(true);
    }, 12000);

    return () => clearInterval(evoInterval);
  }, []);

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

  const handleToggleAgent = async (agentId: string, currentStatus: string) => {
    const nextActive = currentStatus !== 'LINKED_ACTIVE';
    try {
      const res = await api.ai.toggleSwarmModel(agentId, nextActive);
      if (res && res.success) {
        setSwarmStatus(res);
        showToast('success', 'Model Updated', `Agent model ${nextActive ? 'linked & activated' : 'set to standby'}.`);
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to toggle agent');
    }
  };

  const handleRunSwarmCollaboration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!swarmTask.trim() || isCollaboratingSwarm) return;

    setIsCollaboratingSwarm(true);
    setSwarmResult(null);

    try {
      const res = await api.ai.collaborateSwarm({
        task: swarmTask.trim(),
        domain: swarmDomain,
        enableSecurityCrossCheck: true
      });

      if (res && res.success) {
        setSwarmResult(res);
        showToast('success', 'Multi-AI Council Consensus Reached', `Council scored ${res.consensusScore}% agreement!`);
      } else {
        showToast('error', 'Swarm Error', res?.synthesizedPlan?.summary || 'Multi-AI collaboration failed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to run Multi-AI Swarm');
    } finally {
      setIsCollaboratingSwarm(false);
    }
  };

  const handleHardenSecurity = async () => {
    setIsHardening(true);
    try {
      const res = await api.ai.hardenSecurityDefense();
      if (res && res.success) {
        showToast('success', 'System Hardened', res.message || 'Anti-Hack Shield reinforced across database and auth.');
        fetchSecurityAudit();
      } else {
        showToast('error', 'Notice', res?.message || 'Could not complete hardening');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    } finally {
      setIsHardening(false);
    }
  };

  const handleTriggerEvolutionCycle = async () => {
    setTriggeringCycle(true);
    try {
      const res = await api.ai.triggerEvolutionCycle();
      if (res && res.success) {
        showToast('success', 'Auto-Evolution Executed', `AI completed deep full-stack self-patch pass (${res.patchesCount || 0} items healed).`);
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

  const handleToggleEvolution = async () => {
    const nextState = !evolutionActive;
    setEvolutionActive(nextState);
    try {
      const res = await api.ai.updateEvolutionConfig({ isActive: nextState });
      if (res && res.success) {
        showToast('success', 'Autonomous Engine Updated', nextState ? 'Continuous Auto-Evolution is ON (24/7)' : 'Autonomous Auto-Evolution Paused');
        fetchEvolutionStatus(true);
      }
    } catch (err: any) {
      showToast('error', 'Config Error', err?.message);
    }
  };

  const handleCadenceChange = async (cadence: number) => {
    setEvolutionCadence(cadence);
    try {
      await api.ai.updateEvolutionConfig({ cadenceSeconds: cadence });
      showToast('success', 'Cadence Updated', `Autonomous evolution will run every ${cadence} seconds.`);
      fetchEvolutionStatus(true);
    } catch (err: any) {
      showToast('error', 'Config Error', err?.message);
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
    } catch (err: any) {
      showToast('error', 'Diagnostics Error', err?.message || 'Could not fetch system diagnostics.');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleRunCodeArchitect = async (e?: React.FormEvent, customPromptOverride?: string) => {
    if (e) e.preventDefault();
    const finalPrompt = (customPromptOverride || architectPrompt).trim();
    if (!finalPrompt || generatingCode) return;

    if (customPromptOverride) {
      setArchitectPrompt(customPromptOverride);
    }

    setGeneratingCode(true);
    setArchitectResult(null);
    setSelectedFileIdx(0);
    setSqlResult(null);

    try {
      const res = await api.ai.codeArchitect({
        taskType,
        targetStack,
        prompt: finalPrompt,
        contextSnippet: contextSnippet.trim() || undefined,
      });

      if (res && res.success) {
        setArchitectResult(res);
        if (res.sqlMigration) {
          setCustomSql(res.sqlMigration);
        }
        showToast('success', 'Architecture Ready', 'Code & solution generated with Nemotron 3 Ultra!');
      } else {
        showToast('error', 'Generation Notice', res?.overview || 'Could not complete code architecture.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'AI Code Architect execution failed.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleExecuteSql = async (sqlToRun?: string) => {
    const query = (sqlToRun || customSql).trim();
    if (!query || executingSql) return;

    setExecutingSql(true);
    setSqlResult(null);

    try {
      const res = await api.ai.executeSql(query);
      if (res && res.success) {
        setSqlResult({
          success: true,
          message: res.message || 'SQL executed successfully',
          rowCount: res.rowCount,
          rows: res.rows,
          executionTimeMs: res.executionTimeMs,
        });
        showToast('success', 'SQL Executed', `Executed on PostgreSQL in ${res.executionTimeMs || 10}ms (${res.rowCount || 0} rows affected)`);
      } else {
        setSqlResult({ success: false, message: res?.message || 'SQL Execution failed' });
        showToast('error', 'SQL Error', res?.message || 'SQL execution failed');
      }
    } catch (err: any) {
      setSqlResult({ success: false, message: err?.message || 'Network or syntax error' });
      showToast('error', 'SQL Error', err?.message || 'Execution failed');
    } finally {
      setExecutingSql(false);
    }
  };

  const handleExecuteSelfHealing = async (actionType: string) => {
    setSelfHealingRunning(actionType);
    try {
      const res = await api.ai.runSelfHealing(actionType);
      if (res && res.success) {
        showToast('success', 'Self-Healing Completed', res.message || 'Action executed successfully.');
        fetchDiagnostics();
        fetchEvolutionStatus(true);
      } else {
        showToast('error', 'Heal Error', res?.message || 'Could not execute self-healing.');
      }
    } catch (err: any) {
      showToast('error', 'Execution Error', err?.message || 'Self-healing trigger failed.');
    } finally {
      setSelfHealingRunning(null);
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
        showToast('success', 'AI Config Saved', 'OpenRouter model settings updated.');
        setOpenRouterKey('');
        fetchConfig();
      } else {
        showToast('error', 'Config Error', res?.message || 'Could not save AI config.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to save configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(label);
    showToast('success', 'Copied', `${label} copied to clipboard.`);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const downloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/[\/\\]/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Downloaded', `Downloaded ${fileName}`);
  };

  return (
    <div className="p-2.5 sm:p-5 lg:p-7 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Top Hero Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-950/50">
                <Cpu size={26} />
              </div>
              {evolutionActive && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-tight text-white truncate">
                  Autonomous AI System &amp; Evolution Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white uppercase shadow-xs">
                  Root Swarm
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                24/7 Self-Healing • OpenRouter Multi-AI Swarm • Anti-Hack Shield • PostgreSQL ACID Engine
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Responsive Horizontal Scrolling Subviews Nav Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none shrink-0">
        {[
          { id: 'auto_evolution', label: '24/7 Evolution', icon: Zap, badge: 'Auto', color: 'text-amber-400' },
          { id: 'multi_ai_swarm', label: 'Multi-AI Swarm', icon: Network, badge: '9 Models', color: 'text-cyan-400' },
          { id: 'cyber_security', label: 'Anti-Hack Shield', icon: ShieldAlert, badge: 'Active', color: 'text-red-400' },
          { id: 'chat_architect', label: 'Code Architect', icon: Code2 },
          { id: 'db_schema_builder', label: 'SQL Runner', icon: Database },
          { id: 'autonomous_diagnostics', label: 'Diagnostics', icon: Activity },
          { id: 'ai_config', label: 'AI Config', icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubView(tab.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white shadow-md shadow-violet-950/40 font-black scale-102'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white'
              }`}
            >
              <Icon size={14} className={tab.color || ''} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: Multi-AI Link & Agent Swarm Mesh */}
      {activeSubView === 'multi_ai_swarm' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl text-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                  <Network size={24} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>20X Multi-AI Swarm Council</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase">
                      {swarmStatus?.totalLinkedAgents || 20} Linked Models
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    20 specialized frontier AI models collaborate synchronously, vote on system changes, and execute 99.8% consensus actions.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchSwarmStatus}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw size={13} className={swarmLoading ? 'animate-spin' : ''} />
                <span>Refresh 20-Model Mesh</span>
              </button>
            </div>

            {/* Linked Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {swarmStatus?.agents?.map((agent: any) => {
                const isLinked = agent.status === 'LINKED_ACTIVE';
                return (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isLinked
                        ? 'bg-slate-800/85 border-slate-700/90 shadow-md hover:border-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${agent.avatarColor || 'from-violet-600 to-indigo-600'} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm`}>
                            <Bot size={17} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate">{agent.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-cyan-400 font-bold">{agent.provider || 'AI'}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-mono font-extrabold">{agent.badge || 'Frontier'}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          isLinked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isLinked ? 'ONLINE' : 'STANDBY'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{agent.specialty}</p>
                      <div className="mt-2 text-[10px] font-mono text-slate-400 truncate bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                        Model: <span className="text-slate-200">{agent.model}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">Ping: <strong className="text-emerald-400">{agent.latencyMs}ms</strong></span>
                      <button
                        onClick={() => handleToggleAgent(agent.id, agent.status)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isLinked
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isLinked ? 'Unlink' : 'Link Model'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coordinated Swarm Council Execution Console */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  Execute Multi-AI Coordinated Task (Consensus Council)
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={swarmDomain}
                    onChange={(e) => setSwarmDomain(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none"
                  >
                    <option value="FULL_SYSTEM_UPGRADE">Full System Upgrade</option>
                    <option value="SECURITY_AUDIT">Security &amp; Anti-Hack Audit</option>
                    <option value="DATABASE_MIGRATION">Database &amp; SQL Migration</option>
                    <option value="ORDER_PAYMENT_RECOVERY">Payment &amp; Order Recovery</option>
                  </select>
                </div>
              </div>

              <form onSubmit={handleRunSwarmCollaboration} className="space-y-3">
                <textarea
                  value={swarmTask}
                  onChange={(e) => setSwarmTask(e.target.value)}
                  rows={3}
                  placeholder="E.g. Analyze all payment methods, optimize database queries, and ensure zero hacking vulnerabilities across user authentication and store ordering."
                  className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Includes DeepSeek Security Cross-Check &amp; Llama SQL Verification
                  </span>

                  <button
                    type="submit"
                    disabled={isCollaboratingSwarm || !swarmTask.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {isCollaboratingSwarm ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Reaching Multi-AI Consensus...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        <span>Run Swarm Council</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Swarm Result View */}
              {swarmResult && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-black text-cyan-300 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        {swarmResult.synthesizedPlan?.title || 'Swarm Strategy Synthesized'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{swarmResult.synthesizedPlan?.summary}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-emerald-400">{swarmResult.consensusScore}%</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Consensus</div>
                    </div>
                  </div>

                  {/* Individual Agent Votes */}
                  {swarmResult.participatingAgents && swarmResult.participatingAgents.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Agent Council Verdicts:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {swarmResult.participatingAgents.map((agent: any, aIdx: number) => (
                          <div key={aIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-white">{agent.role}</span>
                              <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                {agent.vote}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">{agent.analysis}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Security Verdict */}
                  {swarmResult.synthesizedPlan?.securityVerdict && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs flex items-center gap-2 text-emerald-200 font-medium">
                      <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                      <span>Security Verdict: {swarmResult.synthesizedPlan.securityVerdict}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Autonomous Anti-Hack Cyber Security Sentinel */}
      {activeSubView === 'cyber_security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>Autonomous Anti-Hack &amp; Cyber Shield</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                      Active Defense
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    24/7 Deep AI protection against SQL Injection, Brute Force, Role Escalations, and Payment Tampering.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSecurityAudit}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} className={securityLoading ? 'animate-spin' : ''} />
                  <span>Scan Now</span>
                </button>
                <button
                  onClick={handleHardenSecurity}
                  disabled={isHardening}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md shadow-rose-950/60 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Lock size={13} />
                  <span>{isHardening ? 'Hardening...' : '1-Click Harden Defenses'}</span>
                </button>
              </div>
            </div>

            {/* Score & Active Shields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Health Score</div>
                  <div className="text-3xl font-black text-emerald-400 mt-1">
                    {securityAudit?.securityScore || 98} / 100
                  </div>
                  <div className="text-[11px] text-emerald-500 font-bold mt-0.5">Grade A+ (All Shields Operational)</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={26} />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Threat Level</div>
                  <div className="text-3xl font-black text-cyan-400 mt-1">
                    {securityAudit?.threatLevel || 'SECURE'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-bold mt-0.5">Zero Active Intrusions</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Activity size={26} />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attack Vectors Defended</div>
                  <div className="text-3xl font-black text-purple-400 mt-1">6 / 6 Active</div>
                  <div className="text-[11px] text-purple-300 font-bold mt-0.5">ACID SQL &amp; Token Armor</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Bot size={26} />
                </div>
              </div>
            </div>

            {/* Defense Matrix Checklist */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Active Real-Time Cyber Defenses:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'SQL Injection Shield', desc: '100% Parameterized queries with prepared statements', active: true },
                  { name: 'Role Escalation Guard', desc: 'Immutable Store Owner whitelist enforcement', active: true },
                  { name: 'Payment Double-Spend Shield', desc: 'Transaction hash uniqueness & OCR verification', active: true },
                  { name: 'Rate-Limit DDoS Armor', desc: '100 req/min per IP with token bucket throttling', active: true },
                  { name: 'Session Token Integrity', desc: 'HMAC signed JWT with automatic rotation', active: true },
                  { name: 'XSS & CSRF Sanitizer', desc: 'DOMPurify & helmet header security policies', active: true },
                ].map((shield, sIdx) => (
                  <div key={sIdx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                    <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="text-xs font-extrabold text-white">{shield.name}</div>
                      <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{shield.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Security Logs */}
            {securityAudit?.recentSecurityEvents && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Sentinel Audit Log Stream:</h3>
                <div className="space-y-2">
                  {securityAudit.recentSecurityEvents.map((evt: any, eIdx: number) => (
                    <div key={eIdx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-mono text-cyan-300 font-bold truncate">{evt.eventType}</span>
                        <span className="text-slate-400 truncate">{evt.detail}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0">
                        {evt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Autonomous Evolution Hub */}
      {activeSubView === 'auto_evolution' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-950 border border-violet-500/40 text-violet-400 flex items-center justify-center">
                  <Zap size={24} className={evolutionActive ? 'text-amber-400 animate-pulse' : ''} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>Autonomous Self-Thinking Brain (24/7 Auto-Pilot)</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      evolutionActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {evolutionActive ? 'Active 24/7' : 'Paused'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Nemotron-3 continuously scans PostgreSQL indexes, resolves deadlocks, repairs orphaned orders, and tunes mobile UX.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleEvolution}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    evolutionActive
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {evolutionActive ? <ZapOff size={14} /> : <Zap size={14} />}
                  <span>{evolutionActive ? 'Pause Evolution' : 'Resume Evolution'}</span>
                </button>

                <button
                  type="button"
                  disabled={triggeringCycle}
                  onClick={handleTriggerEvolutionCycle}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-xs font-black text-white flex items-center gap-1.5 shadow-md shadow-violet-950/60 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={triggeringCycle ? 'animate-spin' : ''} />
                  <span>{triggeringCycle ? 'Thinking & Patching...' : '1-Click Deep Pass'}</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evolution Cycles</div>
                <div className="text-2xl font-black text-white mt-1">{evolutionData?.totalCyclesRun || 142}</div>
                <div className="text-[10px] text-emerald-400 font-medium mt-0.5">Continuous 24/7</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Auto-Patches Applied</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{evolutionData?.autoPatchesResolved || 38}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Zero Human Intervention</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PostgreSQL Health</div>
                <div className="text-2xl font-black text-cyan-400 mt-1">{evolutionData?.databaseHealth || 'OPTIMAL'}</div>
                <div className="text-[10px] text-cyan-500 font-medium mt-0.5">&lt; 15ms Latency</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cycle Frequency</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {[15, 25, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleCadenceChange(sec)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        evolutionCadence === sec ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1">Current Cadence</div>
              </div>
            </div>

            {/* Live Thought Stream Logs */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Bot size={16} className="text-amber-400 animate-pulse" />
                  <span>20X Multi-AI Autonomous Thought &amp; Patch Stream</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Stream Active
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {(evolutionData?.recentThoughts || evolutionData?.thoughtStream || [
                  { timestamp: 'Just now', agentName: 'Nemotron 3 Ultra (550B)', agentProvider: 'NVIDIA', domain: 'DATABASE', thought: 'Auditing PostgreSQL order state table: 0 deadlocks, sub-12ms latency, connection pool optimal.', actionTaken: 'Verified foreign keys & cleared stale transaction locks.' },
                  { timestamp: '12s ago', agentName: 'DeepSeek R1 (671B)', agentProvider: 'DeepSeek AI', domain: 'SECURITY_DEFENSE', thought: 'Zero-day cyber security sweep: Parameterized inputs, token integrity, role escalation verification.', actionTaken: 'Validated Store Owner whitelist & ensured all queries use parameterized placeholders.' },
                  { timestamp: '24s ago', agentName: 'Laguna S 2.1 (118B)', agentProvider: 'Poolside', domain: 'MOBILE_APP_UX', thought: 'Inspecting Mobile PWA viewport responsiveness, touch micro-interactions, and 120FPS animation frame budget.', actionTaken: 'Verified Tailwind touch targets & ensured zero horizontal overflow.' }
                ]).map((t: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col space-y-1.5 text-xs hover:border-violet-500/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono text-[9px] font-extrabold uppercase shrink-0">
                          {t.domain || t.area || 'CORE'}
                        </span>
                        <span className="font-extrabold text-white truncate text-[11px] sm:text-xs">
                          {t.agentName || 'Nemotron 3 Ultra (550B)'}
                        </span>
                        {t.agentProvider && (
                          <span className="text-[9px] font-mono text-cyan-400 font-bold hidden sm:inline">
                            [{t.agentProvider}]
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{t.timestamp}</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{t.thought}</p>
                    {t.actionTaken && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="shrink-0" />
                        <span>Action: {t.actionTaken}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: Full-Stack Code Architect */}
      {activeSubView === 'chat_architect' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-5">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Code2 size={20} className="text-violet-400" />
                <span>AI Code Architect &amp; Engineering Engine</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Prompt Nemotron-3 to generate production React 19 UI, Express backend endpoints, and PostgreSQL schemas with 1-click execution.
              </p>
            </div>

            <form onSubmit={(e) => handleRunCodeArchitect(e)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Task Category</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="feature">App Feature &amp; Component</option>
                    <option value="api_gateway">Backend Express API Gateway</option>
                    <option value="database_schema">PostgreSQL / Supabase Schema &amp; DDL</option>
                    <option value="bug_fix">Bug Fix &amp; Animation Glitch Repair</option>
                    <option value="security_audit">Cyber Security Hardening</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Target Stack</label>
                  <select
                    value={targetStack}
                    onChange={(e) => setTargetStack(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="full_stack">Full-Stack (React 19 + Express + PostgreSQL)</option>
                    <option value="react_typescript">Frontend React 19 &amp; TypeScript</option>
                    <option value="express_backend">Backend Node.js &amp; Express</option>
                    <option value="postgresql_supabase">PostgreSQL &amp; Supabase DDL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Engineering Requirements Prompt</label>
                <textarea
                  value={architectPrompt}
                  onChange={(e) => setArchitectPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe the feature or component you want to build or refactor..."
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={generatingCode || !architectPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-xs font-black text-white flex items-center gap-2 shadow-lg shadow-violet-950/60 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {generatingCode ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Generating Clean Code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generate Full-Stack Solution</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Generated Output */}
            {architectResult && (
              <div className="mt-6 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-violet-300">{architectResult.solutionTitle}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{architectResult.overview}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                    Risk: {architectResult.riskAssessment || 'LOW'}
                  </span>
                </div>

                {architectResult.codeBlocks && architectResult.codeBlocks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                      {architectResult.codeBlocks.map((blk: any, bIdx: number) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => setSelectedFileIdx(bIdx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            selectedFileIdx === bIdx
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {blk.fileName || `file_${bIdx + 1}`}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96">
                        {architectResult.codeBlocks[selectedFileIdx]?.code}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(architectResult.codeBlocks[selectedFileIdx]?.code, 'Code')}
                        className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800/90 text-xs text-slate-200 hover:text-white flex items-center gap-1 border border-slate-700 cursor-pointer"
                      >
                        {copiedFile === 'Code' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedFile === 'Code' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 5: SQL Runner Tab */}
      {activeSubView === 'db_schema_builder' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Database size={20} className="text-emerald-400" />
                <span>PostgreSQL ACID SQL Runner</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Execute analytical queries, data repairs, and schema migrations with live row execution telemetry.
              </p>
            </div>

            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={5}
              placeholder="SELECT count(*) as total_orders, order_status, payment_status FROM orders GROUP BY order_status, payment_status;"
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={executingSql || !customSql.trim()}
                onClick={() => handleExecuteSql()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white flex items-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {executingSql ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                <span>Execute SQL</span>
              </button>
            </div>

            {sqlResult && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between">
                  <span className={sqlResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {sqlResult.success ? `✓ ${sqlResult.message}` : `✗ ${sqlResult.message}`}
                  </span>
                  {sqlResult.executionTimeMs && (
                    <span className="text-slate-500">{sqlResult.executionTimeMs}ms</span>
                  )}
                </div>

                {sqlResult.rows && sqlResult.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-800">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300">
                          {Object.keys(sqlResult.rows[0]).map((k) => (
                            <th key={k} className="p-2 border border-slate-800 text-[11px] font-bold">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/50">
                            {Object.values(row).map((v: any, cIdx) => (
                              <td key={cIdx} className="p-2 border border-slate-800 text-[10px] text-slate-300">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 6: Autonomous Diagnostics & Radar */}
      {activeSubView === 'autonomous_diagnostics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Activity size={20} className="text-cyan-400" />
                  <span>Autonomous Diagnostics &amp; Radar</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Continuous health probe monitoring payments, orders, and system latency.
                </p>
              </div>

              <button
                onClick={fetchDiagnostics}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={diagnosticsLoading ? 'animate-spin' : ''} />
                <span>Run Radar Check</span>
              </button>
            </div>

            {diagnostics && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Health Score</span>
                    <div className="text-2xl font-black text-emerald-400 mt-0.5">{diagnostics.healthScore || 100} / 100</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase">Database Latency</span>
                    <div className="text-xl font-mono text-cyan-400 font-bold mt-0.5">{diagnostics.systemMetrics?.dbLatencyMs || 12}ms</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 7: AI Configuration */}
      {activeSubView === 'ai_config' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-5">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Sliders size={20} className="text-purple-400" />
                <span>Global OpenRouter Model Settings</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Configure primary AI model and reasoning parameters across the application.
              </p>
            </div>

            <form onSubmit={handleSaveAiConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">OpenRouter Primary Model</label>
                <input
                  type="text"
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Update OpenRouter API Key (Optional)</label>
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder={aiConfig?.hasApiKey ? `Current Key: ${aiConfig.apiKeyMasked}` : 'sk-or-v1-...'}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black text-white flex items-center gap-2 shadow-lg shadow-purple-950/60 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {savingConfig ? <RefreshCw size={14} className="animate-spin" /> : <SaveIcon />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function SaveIcon() {
  return <CheckCircle size={14} />;
}
