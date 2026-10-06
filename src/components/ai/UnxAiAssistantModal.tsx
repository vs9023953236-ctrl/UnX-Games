import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  User,
  Zap,
  Copy,
  Check,
  ShoppingBag,
  Trash2,
  Mic,
  MicOff,
  MessageCircle,
  Headphones,
  CreditCard,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { motion } from 'motion/react';

interface ActionItem {
  label: string;
  type: 'navigate' | 'external_link' | 'quick_send';
  target?: string;
}

interface ProductPackageItem {
  id: string;
  name: string;
  price: number;
  amount?: number;
  badge?: string;
}

interface ProductCardData {
  id: string;
  name: string;
  category?: string;
  packages: ProductPackageItem[];
}

interface PaymentInfoData {
  esewaId?: string;
  esewaName?: string;
  khaltiId?: string;
  khaltiName?: string;
  supportPhone?: string;
  bankName?: string;
  bankAccount?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning_details?: unknown;
  actions?: ActionItem[];
  orderInfo?: any;
  productCard?: ProductCardData | null;
  paymentInfo?: PaymentInfoData | null;
}

const QUICK_SUGGESTIONS = [
  { label: '🔥 Free Fire Rates', query: 'What are the latest Free Fire Diamond rates?' },
  { label: '🎯 PUBG UC Rates', query: 'What are the PUBG Mobile UC rates?' },
  { label: '📦 Track My Order', query: 'Track my latest order status' },
  { label: '💳 Payment Guide', query: 'How to pay via eSewa or Khalti QR?' },
  { label: '⚡ Delivery Speed', query: 'What is the standard delivery time?' },
];

export const UnxAiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { walletBalance, setCurrentTab, showToast, currentTab, setSelectedProductId } = useStore();

  const customerName = currentUser?.name?.split(' ')[0] || 'Gamer';

  // Professional Customer Greeting for Unx Games
  const buildUniqueGreeting = (name: string) =>
    `Hello ${name}, Welcome to Unx Games! 👋\n\nHow can I help you today with game top-ups, live diamond rates, payment methods, or order tracking?`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: buildUniqueGreeting(customerName),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Dynamically update greeting if customer logs in
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            ...prev[0],
            content: buildUniqueGreeting(customerName),
          }
        ];
      }
      return prev;
    });
  }, [customerName]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingId(null);
    }
  }, [isOpen, messages]);

  // Voice speech-to-text recognition
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('info', 'Voice Input', 'Speech recognition is not supported on this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ne-NP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  // Text to speech readout
  const handleToggleSpeak = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('info', 'Audio', 'Speech playback not supported on this browser.');
      return;
    }

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = text
      .replace(/[*#_~`>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/•/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('success', 'Copied', 'Copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: buildUniqueGreeting(customerName),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('info', 'Chat Cleared', 'Conversation history reset.');
  };

  const handleActionClick = (action: ActionItem) => {
    if (action.type === 'quick_send' && action.target) {
      handleSend(action.target);
    } else if (action.type === 'external_link' && action.target) {
      window.open(action.target, '_blank', 'noopener,noreferrer');
    } else if (action.type === 'navigate' && action.target) {
      onClose();
      if (action.target === 'shop' || action.target === 'orders' || action.target === 'wallet') {
        setCurrentTab(action.target);
      }
    }
  };

  const handleSelectPackageOrder = (productId: string, pkgName: string) => {
    setSelectedProductId(productId);
    setCurrentTab('shop');
    onClose();
    showToast('success', 'Package Selected', `Opening ${pkgName} in Store...`);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const historyForApi = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
        reasoning_details: m.reasoning_details,
      }));

      const res: any = await api.ai.assistantChat(historyForApi, {
        id: currentUser?.id || currentUser?.uid,
        userId: currentUser?.id || currentUser?.uid,
        name: currentUser?.name || 'Customer',
        email: currentUser?.email || '',
        walletBalance: walletBalance || 0,
        currentTab,
      });

      if (res && res.success && res.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: res.reply,
            reasoning_details: res.reasoning_details,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: res.actions || [],
            orderInfo: res.orderInfo || null,
            productCard: res.productCard || null,
            paymentInfo: res.paymentInfo || null,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content:
              res?.reply ||
              'Namaste sir! Ma tapailai Free Fire rates, order tracking ra payment guide ma help garna sakchu. Kripaya query re-check garnus!',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content:
            'Namaste sir! Tapai ko order ya diamond rates check garna kripaya tapai ko Order ID ya game name bhannus na, ma turuntai status check garchu!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full h-full sm:h-[88vh] sm:max-w-xl sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200 sm:border-indigo-500/20">
        {/* =================================================================== */}
        {/* TOP NATIVE APP BAR (CLEAN, POLISHED "Alex Unx Agent")               */}
        {/* =================================================================== */}
        <div className="pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 bg-gradient-to-r from-violet-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0 shadow-md relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner">
                <Headphones size={22} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-700 shadow-sm flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                  Alex Unx Agent
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[9px] font-black uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-[11px] text-violet-100/90 flex items-center gap-1 font-medium mt-0.5">
                <Sparkles size={11} className="text-amber-300 animate-spin" />
                <span className="font-bold text-amber-200">Nemotron 3 Ultra (550B)</span>
                <span className="text-[10px] text-emerald-300 font-bold">• Live AI Model</span>
              </p>
            </div>
          </div>

          {/* Right actions: WhatsApp, Clear Chat, Close */}
          <div className="flex items-center gap-1.5">
            <a
              href="https://wa.me/9779768914027?text=Namaste%20Unx%20Games%20Support,%20I%20need%20assistance"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400/50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
              title="Open WhatsApp Manager"
            >
              <MessageCircle size={15} className="text-emerald-300" />
              <span className="hidden xs:inline text-[11px]">WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer border border-white/20"
              title="Reset Chat"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer border border-white/20"
              title="Close Modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Status Sub-Bar */}
        <div className="px-4 py-1.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-indigo-200/60 flex items-center justify-between text-[11px] text-slate-800 font-semibold shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>⚡ Fast 5-15 Min Delivery • Dedicated Gamer Care</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 text-[10px]">
            <span>Hotline: +977-9768914027</span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MESSAGES SCROLL AREA (CLEAN PROPORTIONED CHAT BUBBLES)              */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/70">
          {messages.map((m, mIndex) => {
            const isAgent = m.role === 'assistant';
            return (
              <div key={m.id} className={`flex items-start gap-2.5 ${isAgent ? '' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isAgent
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-500/20'
                      : 'bg-slate-900 text-white shadow-slate-900/20'
                  }`}
                >
                  {isAgent ? <Headphones size={15} /> : <User size={15} />}
                </div>

                {/* Bubble Container */}
                <div className="max-w-[90%] sm:max-w-[85%] space-y-2">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13px] sm:text-[13.5px] leading-relaxed shadow-xs relative group ${
                      isAgent
                        ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs font-normal'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-tr-xs shadow-violet-600/20'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed select-text space-y-1">
                      {m.content.split('\n').map((line, idx) => {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={idx} className={line.startsWith('•') ? 'pl-2 text-slate-700' : ''}>
                            {parts.map((p, pIdx) => {
                              if (p.startsWith('**') && p.endsWith('**')) {
                                return (
                                  <strong
                                    key={pIdx}
                                    className={isAgent ? 'font-black text-slate-900' : 'font-black text-white'}
                                  >
                                    {p.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return p;
                            })}
                          </p>
                        );
                      })}
                    </div>

                    {/* Quick suggestion chips under initial welcome greeting */}
                    {isAgent && mIndex === 0 && messages.length === 1 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {QUICK_SUGGESTIONS.map((chip, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => handleSend(chip.query)}
                            className="px-2.5 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-2xs"
                          >
                            <span>{chip.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* RICH CARD 1: INTERACTIVE LIVE RATE MATRIX (PRODUCT CARD) */}
                    {/* ========================================================= */}
                    {isAgent && m.productCard && Array.isArray(m.productCard.packages) && m.productCard.packages.length > 0 && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 space-y-2 shadow-md">
                        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🎮</span>
                            <div>
                              <h4 className="text-xs font-black text-white">{m.productCard.name}</h4>
                              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live Database Rates • Instant Delivery
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectPackageOrder(m.productCard!.id, m.productCard!.name)}
                            className="px-2 py-0.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black tracking-wide shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Store View →
                          </button>
                        </div>

                        {/* Package Pills Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {m.productCard.packages.map((pkg) => (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() =>
                                handleSelectPackageOrder(m.productCard!.id, `${m.productCard!.name} - ${pkg.name}`)
                              }
                              className="flex items-center justify-between p-2 rounded-xl bg-white/10 hover:bg-violet-600/40 border border-white/10 hover:border-violet-400/50 text-left transition-all active:scale-98 group cursor-pointer"
                            >
                              <div className="min-w-0 pr-1">
                                <span className="text-[11px] font-bold text-white block truncate group-hover:text-amber-300 transition-colors">
                                  {pkg.name}
                                </span>
                                {pkg.badge && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-xs bg-amber-500/30 text-amber-300 text-[8px] font-black uppercase">
                                    {pkg.badge}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs font-black text-emerald-400 shrink-0">
                                Rs.{pkg.price}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* RICH CARD 2: REAL-TIME ORDER TRACKING CARD               */}
                    {/* ========================================================= */}
                    {isAgent && m.orderInfo && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white border border-indigo-500/30 space-y-2 shadow-md">
                        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-violet-400" />
                            <span className="text-xs font-black text-white">
                              Order #{m.orderInfo.order_code || m.orderInfo.order_number || m.orderInfo.id?.slice(0, 8)}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${
                              (m.orderInfo.order_status || '').toUpperCase() === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : (m.orderInfo.order_status || '').toUpperCase() === 'FAILED'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            }`}
                          >
                            {m.orderInfo.order_status || 'PROCESSING'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-400 block">Item:</span>
                            <span className="font-bold text-white truncate block">
                              {m.orderInfo.package_name || m.orderInfo.product_name || 'In-Game Package'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Player UID:</span>
                            <span className="font-mono font-bold text-amber-300">{m.orderInfo.game_uid || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Total Amount:</span>
                            <span className="font-mono font-bold text-emerald-400">Rs.{m.orderInfo.total_amount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Est. Delivery:</span>
                            <span className="font-semibold text-white">5–15 Minutes</span>
                          </div>
                        </div>

                        {m.orderInfo.rejection_reason && (
                          <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-300 flex items-center gap-1">
                            <AlertTriangle size={11} className="shrink-0" />
                            <span>Note: {m.orderInfo.rejection_reason}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* RICH CARD 3: OFFICIAL QR PAYMENT GUIDE                   */}
                    {/* ========================================================= */}
                    {isAgent && m.paymentInfo && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-300/80 space-y-2 text-slate-800 shadow-sm">
                        <div className="flex items-center gap-1.5 border-b border-emerald-200/80 pb-1.5">
                          <CreditCard size={14} className="text-emerald-700" />
                          <span className="text-xs font-black text-emerald-900">Official Payment Accounts</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2 rounded-xl bg-white border border-emerald-200/80 space-y-1">
                            <span className="text-[10px] font-black text-emerald-700 block">eSewa Wallet</span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {m.paymentInfo.esewaId || '9768914027'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(m.paymentInfo?.esewaId || '9768914027', 'esewa')}
                                className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                                title="Copy eSewa Number"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 block truncate">
                              {m.paymentInfo.esewaName || 'BINOD THALAL'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white border border-purple-200/80 space-y-1">
                            <span className="text-[10px] font-black text-purple-700 block">Khalti Wallet</span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {m.paymentInfo.khaltiId || '9768914027'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(m.paymentInfo?.khaltiId || '9768914027', 'khalti')}
                                className="p-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer"
                                title="Copy Khalti Number"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 block truncate">
                              {m.paymentInfo.khaltiName || 'UNX GAMES'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                          💡 Pay garera receipt ko <strong>Ref ID</strong> copy garnus ra checkout form ma paste garnus!
                        </p>
                      </div>
                    )}

                    {/* Bottom Metadata & Controls */}
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-slate-100/80">
                      <span className={`text-[9px] font-mono ${isAgent ? 'text-slate-400' : 'text-violet-200'}`}>
                        {m.timestamp}
                      </span>
                      {isAgent && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(m.content, m.id)}
                            className={`text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
                              speakingId === m.id
                                ? 'text-violet-600 font-bold animate-pulse'
                                : 'text-slate-400 hover:text-violet-600'
                            }`}
                            title={speakingId === m.id ? 'Stop Speech' : 'Listen with Audio'}
                          >
                            {speakingId === m.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(m.content, m.id)}
                            className="text-slate-400 hover:text-violet-600 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy Answer"
                          >
                            {copiedId === m.id ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <Check size={11} /> Copied
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy size={11} /> Copy
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Action Buttons */}
                  {isAgent && m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5 pl-1">
                      {m.actions.map((act, actIdx) => {
                        const cleanLabel = act.label.replace(/^[\p{Emoji}\s]+/u, '').trim() || act.label;
                        return (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => handleActionClick(act)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-violet-50 text-violet-800 border border-violet-200/90 hover:border-violet-300 text-[11px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            {act.type === 'external_link' ? (
                              <MessageCircle size={12} className="text-emerald-600 shrink-0" />
                            ) : act.type === 'navigate' ? (
                              <ShoppingBag size={12} className="text-violet-600 shrink-0" />
                            ) : (
                              <Zap size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span>{cleanLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Headphones size={15} />
              </div>
              <div className="px-3.5 py-2.5 bg-white rounded-2xl rounded-tl-xs border border-slate-200/90 shadow-2xs flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 ml-1">Alex is thinking...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* =================================================================== */}
        {/* ADVANCED INPUT COMPOSER (USER SPEAKS / TYPES FREELY - A TO Z)       */}
        {/* =================================================================== */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening in Nepali / English...'
                    : 'Ask Alex anything (e.g. "free fire rate", "mero order", "pubg uc")...'
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-violet-600 focus:bg-white transition-all shadow-2xs pr-10"
              />

              {/* Voice recognition button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all cursor-pointer ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-violet-600'
                }`}
                title={isListening ? 'Stop Listening' : 'Voice Dictation'}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-40 text-white rounded-2xl transition-all cursor-pointer shadow-md shadow-violet-600/30 active:scale-95 shrink-0 flex items-center justify-center min-w-11"
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
