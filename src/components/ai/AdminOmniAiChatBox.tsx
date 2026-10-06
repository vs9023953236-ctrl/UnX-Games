import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Bot,
  Sparkles,
  Zap,
  Terminal,
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  Layers,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Code2,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning_details?: unknown;
  executedAction?: {
    actionType: string;
    success: boolean;
    summary: string;
    data?: any;
  } | null;
  timestamp: string;
}

export const AdminOmniAiChatBox: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}> = ({ isOpen = true, onClose, isEmbedded = false }) => {
  const { showToast, syncOrdersFromBackend } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `⚡ **Namaste Admin! Omni Super-AI Engine Online.**\n\nI possess **complete autonomous authority** over Unx Games database, backend APIs, frontend UI, orders, and system operations.\n\nYou can speak to me in **Nepali, Hindi, or English** to execute actions, run SQL, fix bugs, reconcile orders, or build features directly!`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputPrompt).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputPrompt('');
    setLoading(true);

    try {
      const historyPayload = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        reasoning_details: m.reasoning_details,
      }));

      const res = await api.ai.omniChat(historyPayload);

      if (res && res.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.reply || 'Command processed successfully.',
          reasoning_details: res.reasoning_details,
          executedAction: res.executedAction,
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => [...prev, aiMsg]);

        // If an action was executed (e.g. orders updated), trigger a store refresh
        if (res.executedAction?.actionType === 'RESOLVE_PENDING_ORDERS' || res.executedAction?.actionType === 'FULL_SYSTEM_SELF_HEAL') {
          syncOrdersFromBackend().catch(() => {});
          showToast('success', 'Autonomous Action Executed', res.executedAction.summary);
        }

        // Voice Readout if enabled
        if (speechEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const cleanSpeech = (res.reply || '').replace(/[*_#`]/g, '').slice(0, 200);
            const utterance = new SpeechSynthesisUtterance(cleanSpeech);
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
          } catch (_) {}
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Action Notice: ${res?.message || 'Could not process command.'}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error executing command: ${err?.message || 'Network exception'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('success', 'Copied', 'Response copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `⚡ **Omni Super-AI Engine Ready.** All systems operational across PostgreSQL, API Gateways, and UI. What would you like to build, query, or execute?`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const containerContent = (
    <div className={`flex flex-col ${isEmbedded ? 'h-[700px] rounded-3xl border border-slate-200 bg-white shadow-sm' : 'h-full bg-slate-950 text-white'}`}>
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-600 flex items-center justify-center font-black text-white shadow-md shadow-violet-950/50 shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">Omni Super-Admin AI</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-violet-500/20 text-violet-300 border border-violet-500/40">
                ULTIMATE AUTHORITY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <span>Model: nvidia/nemotron-3-ultra-550b-a55b:free</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">24/7 Executing</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              speechEnabled ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={speechEnabled ? 'Mute AI Voice' : 'Enable AI Speech Output'}
          >
            {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            onClick={clearChat}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-xs sm:text-sm custom-scrollbar bg-slate-950">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black shrink-0 mt-0.5 shadow-xs">
                  <Bot size={16} />
                </div>
              )}

              <div className={`space-y-2 max-w-[88%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Executed Action Badge (If Real DB/System Action was performed) */}
                {m.executedAction && (
                  <div className={`p-3 rounded-2xl border text-xs font-mono space-y-1.5 ${
                    m.executedAction.success ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border-rose-800 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {m.executedAction.success ? <CheckCircle2 size={15} className="text-emerald-400" /> : <AlertTriangle size={15} className="text-rose-400" />}
                      <span>ACTION EXECUTED: {m.executedAction.actionType}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">{m.executedAction.summary}</p>
                    {m.executedAction.data && Array.isArray(m.executedAction.data.rows) && (
                      <div className="overflow-x-auto max-h-36 pt-1">
                        <pre className="p-2 rounded-lg bg-black/50 text-[10px] text-emerald-400">
                          {JSON.stringify(m.executedAction.data.rows, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`p-4 rounded-3xl relative shadow-md leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white rounded-tr-xs'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-xs'
                }`}>
                  {m.content}

                  <div className={`flex items-center justify-between gap-3 mt-2 pt-1 text-[10px] font-mono ${
                    isUser ? 'text-violet-200' : 'text-slate-500 border-t border-slate-800/80'
                  }`}>
                    <span>{m.timestamp}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => copyMessage(m.content, m.id)}
                        className="hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === m.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-xs font-mono animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-violet-900/60 border border-violet-700 flex items-center justify-center text-violet-300">
              <Cpu size={16} className="animate-spin" />
            </div>
            <span>Omni AI is reasoning, planning, and executing action on server...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested 1-Tap Command Chips */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
        <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">Quick Commands:</span>
        {[
          '⚡ Sab pending orders complete aur verify kar do',
          '🧠 Full-system deep auto-heal pass chalao',
          '🗄️ SELECT id, order_code, total_amount FROM orders LIMIT 5;',
          '📢 Send Broadcast: 10% Bonus Diamond Cashback Live!',
          '🎨 Naya React Top-Up Card Component bana do',
        ].map((cmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(cmd)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-violet-950 hover:border-violet-700 border border-slate-700 text-slate-300 hover:text-violet-200 text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-end gap-2 shrink-0"
      >
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Tell your Super-AI to build code, run SQL, fix bugs, or verify orders in any language..."
            rows={2}
            className="w-full p-3 pr-10 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-xs sm:text-sm font-medium outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !inputPrompt.trim()}
          className="h-11 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-violet-900/40 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Execute</span>
        </button>
      </form>
    </div>
  );

  if (isEmbedded) {
    return containerContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl h-[88vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
          >
            {containerContent}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminOmniAiChatBox;
