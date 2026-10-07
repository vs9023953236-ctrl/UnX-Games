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
  Bot,
  CreditCard,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { motion } from 'motion/react';
import { NativeMobileSpinner } from '../common/NativeMobileSpinner';

export interface ActionItem {
  label: string;
  type: 'navigate' | 'external_link' | 'quick_reply';
  target?: string;
}

export interface ProductCardData {
  id: string;
  name: string;
  packages: Array<{ id: string; name: string; price: number; badge?: string }>;
}

export interface PaymentInfoData {
  esewaId?: string;
  esewaName?: string;
  khaltiId?: string;
  khaltiName?: string;
  supportPhone?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  modelsSummaryText?: string;
  autoSwitched?: boolean;
  actions?: ActionItem[];
  orderInfo?: any;
  productCard?: ProductCardData | null;
  paymentInfo?: PaymentInfoData | null;
  requestId?: string;
}

export const UnxAiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { walletBalance, setCurrentTab, showToast, currentTab, setSelectedProductId } = useStore();

  const customerName = currentUser?.name?.split(' ')[0] || 'Gamer';

  // Direct, friendly greeting for the User AI Assistant (Alex)
  const buildGreeting = (name: string) =>
    `Hello ${name}! Welcome to Unx Games 👋\n\nI am Alex, your official assistant. I can help you ?`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: buildGreeting(customerName),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Alex',
    },
  ]);

  // Update greeting if customer logs in
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            ...prev[0],
            content: buildGreeting(customerName),
          },
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
        // Do not auto-focus input on mobile so user controls when to open keyboard
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const triggerHaptic = (ms = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (_) {}
    }
  };

  const handleClearChat = () => {
    triggerHaptic(15);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: buildGreeting(customerName),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Alex',
      },
    ]);
    showToast('info', 'Chat Cleared', 'Conversation history has been reset.');
  };

  const handleCopyMessage = (text: string, id: string) => {
    triggerHaptic(8);
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('success', 'Copied to Clipboard');
  };

  const handleToggleSpeak = (text: string, id: string) => {
    triggerHaptic(10);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('error', 'Voice Unavailable', 'Speech synthesis is not supported on this browser.');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown, symbols, and formatting for crystal clear voice playback
    const cleanText = text
      .replace(/[*_~`#•\->]/g, ' ')
      .replace(/http\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best available voice (English / Hindi / Natural)
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice =
          voices.find((v) => v.name.includes('Natural') || v.name.includes('Google')) ||
          voices.find((v) => v.lang.startsWith('en') || v.lang.startsWith('hi') || v.lang.startsWith('ne')) ||
          voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
      }
    } catch (_) {}

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleVoice = () => {
    triggerHaptic(15);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('error', 'Voice Unavailable', 'Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const navLang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
      recognition.lang = navLang.startsWith('ne') ? 'ne-NP' : navLang.startsWith('hi') ? 'hi-IN' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('info', 'Listening...', 'Alex is listening. Speak your question.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        // If language issue occurs, fallback to en-US
        if (e?.error === 'language-not-supported' && recognition.lang !== 'en-US') {
          recognition.lang = 'en-US';
          try {
            recognition.start();
            return;
          } catch (_) {}
        }
        showToast('info', 'Microphone Ready', 'Please tap mic again and speak clearly.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      showToast('error', 'Microphone Error', e?.message || 'Failed to start voice.');
    }
  };

  const handleActionClick = (action: ActionItem) => {
    triggerHaptic(12);
    if (action.type === 'navigate' && action.target) {
      setCurrentTab(action.target);
      onClose();
    } else if (action.type === 'external_link' && action.target) {
      window.open(action.target, '_blank', 'noopener,noreferrer');
    } else if (action.type === 'quick_reply') {
      handleSend(action.label);
    }
  };

  const handleSelectPackageOrder = (productId: string, packageName?: string) => {
    triggerHaptic(12);
    setSelectedProductId(productId);
    setCurrentTab('product_detail');
    onClose();
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    triggerHaptic(12);

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      requestId: reqId,
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
      }));

      // Single model execution with automatic failover (Gemini 3.8 Flash -> Nemotron 3.5L -> Nemotron 3U)
      const finalResult = await api.ai.swarmChat({
        prompt: text,
        requestId: reqId,
        conversationHistory: historyForApi.slice(-6),
        mode: 'single_failover',
      });

      if (finalResult && finalResult.success) {
        const lowerText = text.toLowerCase();
        let matchedProdCard: ProductCardData | null = null;
        let matchedPaymentInfo: PaymentInfoData | null = null;

        if (
          lowerText.includes('free fire') ||
          lowerText.includes('diamond') ||
          lowerText.includes('pubg') ||
          lowerText.includes('uc') ||
          lowerText.includes('rate')
        ) {
          matchedProdCard = {
            id: 'ff-diamonds',
            name: lowerText.includes('pubg') ? 'PUBG Mobile UC' : 'Free Fire Diamonds',
            packages: lowerText.includes('pubg')
              ? [
                  { id: '60uc', name: '60 UC', price: 130 },
                  { id: '325uc', name: '325 UC', price: 650 },
                  { id: '660uc', name: '660 UC', price: 1290 },
                ]
              : [
                  { id: '115d', name: '115 Diamonds', price: 105, badge: 'Popular' },
                  { id: '240d', name: '240 Diamonds', price: 210 },
                  { id: '610d', name: '610 Diamonds', price: 510 },
                  { id: 'weekly', name: 'Weekly Membership', price: 245, badge: 'Hot' },
                  { id: 'monthly', name: 'Monthly Membership', price: 1190 },
                ],
          };
        }

        if (
          lowerText.includes('esewa') ||
          lowerText.includes('khalti') ||
          lowerText.includes('pay') ||
          lowerText.includes('qr')
        ) {
          matchedPaymentInfo = {
            esewaId: '9768914027',
            esewaName: 'BINOD THALAL (UNX GAMES)',
            khaltiId: '9768914027',
            khaltiName: 'UNX GAMES OFFICIAL',
            supportPhone: '9768914027',
          };
        }

        const actions: ActionItem[] = [
          { label: '🔥 View Game Rates', type: 'navigate', target: 'shop' },
          { label: '📦 Track Orders', type: 'navigate', target: 'orders' },
        ];

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: finalResult.synthesisResponse || finalResult.replyText || 'Response received.',
          modelUsed: 'Alex',
          modelsSummaryText: finalResult.modelsSummaryText,
          autoSwitched: finalResult.autoSwitched,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions,
          productCard: matchedProdCard,
          paymentInfo: matchedPaymentInfo,
          requestId: finalResult.requestId || reqId,
        };

        setMessages((prev) => [...prev, aiMsg]);

        if (textToSend) {
          handleToggleSpeak(aiMsg.content, aiMsg.id);
        }
      } else {
        const errorMsg =
          finalResult?.error?.message ||
          finalResult?.message ||
          'AI service temporary issue. Please retry.';
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${errorMsg}`,
            modelUsed: 'System Notice',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Unable to connect to AI service. Please check your internet connection.`,
          modelUsed: 'System Notice',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden animate-in fade-in duration-200">
      {/* Semi-transparent Dimmed Backdrop Overlay (tap outside to close) */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* =================================================================== */}
      {/* GEMINI / GMAIL STYLE BOTTOM SHEET DRAWER                             */}
      {/* =================================================================== */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.8 }}
        className="relative z-10 w-full max-w-2xl mx-auto bg-white rounded-t-[28px] sm:rounded-t-[32px] shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[82dvh] min-h-[48dvh] border-t border-slate-200/80 overflow-hidden transform-gpu will-change-transform"
      >
        {/* Top Center Grab Handle Bar */}
        <div className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none" onClick={onClose}>
          <div className="w-10 h-1.5 bg-slate-400/70 rounded-full hover:bg-slate-500 transition-colors" />
        </div>

        {/* Top Header Row with Sparkle and Close Button */}
        <div className="px-4 sm:px-6 pt-1 pb-2 flex items-center justify-between gap-3 shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {/* Gemini / AI Sparkle Icon */}
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs border border-blue-100">
              <Sparkles size={18} className="fill-blue-500/20 text-blue-600 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-800 tracking-tight">Alex</span>
              {loading ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                  <span>typing</span>
                  <span className="inline-flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
                  </span>
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Reset Chat"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MESSAGES SCROLL CONTAINER                                           */}
        {/* =================================================================== */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 space-y-3 bg-white custom-scrollbar">
        <div className="max-w-4xl mx-auto w-full space-y-3">
          {messages.map((m, mIndex) => {
            const isAgent = m.role === 'assistant';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex items-start gap-2.5 ${isAgent ? '' : 'flex-row-reverse'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isAgent
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-500/20'
                      : 'bg-slate-200 border border-slate-300 text-slate-700 shadow-slate-900/5'
                  }`}
                >
                  {isAgent ? <Bot size={15} /> : <User size={15} />}
                </div>

                {/* Bubble Container */}
                <div className="max-w-[90%] sm:max-w-[85%] space-y-1.5">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13px] sm:text-[13.5px] leading-relaxed shadow-xs relative group ${
                      isAgent
                        ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs font-normal'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-tr-xs shadow-violet-600/25'
                    }`}
                  >
                    {/* Model Indicator on Agent Messages */}
                    {isAgent && (
                      <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-slate-100 text-[9.5px] text-violet-700 font-mono font-bold">
                        <div className="flex items-center gap-1.5 truncate">
                          <Sparkles size={10} className="text-amber-500 shrink-0" />
                          <span className="truncate">{m.modelUsed || 'AI Assistant'}</span>
                        </div>
                        {m.autoSwitched && (
                          <span className="text-[8px] px-1.5 py-0.2 rounded-xs bg-amber-50 text-amber-700 border border-amber-200 font-black shrink-0">
                            Auto-Switched
                          </span>
                        )}
                      </div>
                    )}

                    {/* Content text */}
                    <div className="whitespace-pre-wrap leading-relaxed select-text space-y-1">
                      {m.content.split('\n').map((line, idx) => {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p
                            key={idx}
                            className={line.startsWith('•') ? 'pl-2 text-slate-700 font-medium' : ''}
                          >
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

                    {/* Rich Card 1: Live Game Rates */}
                    {isAgent &&
                      m.productCard &&
                      Array.isArray(m.productCard.packages) &&
                      m.productCard.packages.length > 0 && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-white border border-slate-200 text-slate-900 space-y-2 shadow-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎮</span>
                              <div>
                                <h4 className="text-xs font-black text-slate-900">
                                  {m.productCard.name}
                                </h4>
                                <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live Database Rates • Instant Delivery
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectPackageOrder(m.productCard!.id, m.productCard!.name)
                              }
                              className="px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black tracking-wide shadow-xs active:scale-95 transition-all cursor-pointer"
                            >
                              Store View →
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {m.productCard.packages.map((pkg) => (
                              <button
                                key={pkg.id}
                                type="button"
                                onClick={() =>
                                  handleSelectPackageOrder(
                                    m.productCard!.id,
                                    `${m.productCard!.name} - ${pkg.name}`
                                  )
                                }
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-left transition-all active:scale-98 group cursor-pointer"
                              >
                                <div className="min-w-0 pr-1">
                                  <span className="text-[11px] font-bold text-slate-800 block truncate group-hover:text-violet-700 transition-colors">
                                    {pkg.name}
                                  </span>
                                  {pkg.badge && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-xs bg-amber-100 text-amber-800 text-[8px] font-black uppercase">
                                      {pkg.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-xs font-black text-emerald-600 shrink-0">
                                  Rs.{pkg.price}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Rich Card 2: Order Tracker */}
                    {isAgent && m.orderInfo && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-white border border-slate-200 text-slate-900 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-violet-600" />
                            <span className="text-xs font-black text-slate-900">
                              Order #
                              {m.orderInfo.order_code ||
                                m.orderInfo.order_number ||
                                m.orderInfo.id?.slice(0, 8)}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${
                              (m.orderInfo.order_status || '').toUpperCase() === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : (m.orderInfo.order_status || '').toUpperCase() === 'FAILED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            }`}
                          >
                            {m.orderInfo.order_status || 'PROCESSING'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                          <div>
                            <span className="text-slate-500 block">Item:</span>
                            <span className="font-bold text-slate-900 truncate block">
                              {m.orderInfo.package_name ||
                                m.orderInfo.product_name ||
                                'In-Game Package'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Player UID:</span>
                            <span className="font-mono font-bold text-amber-700">
                              {m.orderInfo.game_uid || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Total Amount:</span>
                            <span className="font-mono font-bold text-emerald-600">
                              Rs.{m.orderInfo.total_amount}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Est. Delivery:</span>
                            <span className="font-semibold text-slate-900">5–15 Minutes</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rich Card 3: Payment Accounts */}
                    {isAgent && m.paymentInfo && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-white border border-emerald-200 space-y-2 text-slate-900 shadow-xs">
                        <div className="flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
                          <CreditCard size={14} className="text-emerald-600" />
                          <span className="text-xs font-black text-emerald-700">
                            Official Payment Accounts
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                            <span className="text-[10px] font-black text-emerald-700 block">
                              eSewa Wallet
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {m.paymentInfo.esewaId || '9768914027'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyMessage(
                                    m.paymentInfo?.esewaId || '9768914027',
                                    'esewa'
                                  )
                                }
                                className="p-1 rounded-md bg-emerald-200/60 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                                title="Copy eSewa Number"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 block truncate">
                              {m.paymentInfo.esewaName || 'BINOD THALAL'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                            <span className="text-[10px] font-black text-purple-700 block">
                              Khalti Wallet
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {m.paymentInfo.khaltiId || '9768914027'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyMessage(
                                    m.paymentInfo?.khaltiId || '9768914027',
                                    'khalti'
                                  )
                                }
                                className="p-1 rounded-md bg-purple-200/60 hover:bg-purple-200 text-purple-800 cursor-pointer"
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
                      </div>
                    )}

                    {/* Bottom Metadata & Audio / Copy Controls */}
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-slate-100">
                      <span
                        className={`text-[9px] font-mono ${
                          isAgent ? 'text-slate-400' : 'text-violet-100'
                        }`}
                      >
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
                        const cleanLabel =
                          act.label.replace(/^[\p{Emoji}\s]+/u, '').trim() || act.label;
                        return (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => handleActionClick(act)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-violet-50 text-violet-700 border border-slate-200 hover:border-violet-300 text-[11px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
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
              </motion.div>
            );
          })}

          {/* WhatsApp-Style Animated Typing Indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5 select-none"
            >
              {/* Alex Avatar */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs relative">
                <Bot size={15} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
              </div>

              {/* WhatsApp-Style Chat Bubble */}
              <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center gap-2.5 text-slate-800">
                <span className="text-xs font-bold text-violet-800">Alex is typing</span>
                <div className="flex items-center gap-1">
                  <motion.span
                    animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
                    className="w-2 h-2 rounded-full bg-violet-600 inline-block"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-indigo-600 inline-block"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* =================================================================== */}
      {/* GMAIL / GEMINI STYLE PILL INPUT COMPOSER                             */}
      {/* =================================================================== */}
      <div className="px-4 sm:px-6 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] bg-white shrink-0 border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          {/* Pill Container (No purple box border or rectangular focus outline) */}
          <div className="w-full flex items-center bg-[#F0F4F9] hover:bg-[#E8EEF6] border border-slate-200/80 rounded-full px-4 py-1.5 transition-all shadow-2xs outline-none focus:outline-none ring-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening in Nepali / English...'
                  : 'Enter a prompt here'
              }
              className="flex-1 bg-transparent text-[13.5px] sm:text-[14px] font-normal text-slate-800 placeholder-slate-500 outline-none focus:outline-none focus:ring-0 ring-0 border-none focus-visible:outline-none focus-visible:ring-0 py-2"
              style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
            />

            <div className="flex items-center gap-1 shrink-0 pl-1">
              {/* Mic Icon */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-slate-200/60'
                }`}
                title={isListening ? 'Stop Listening' : 'Voice Input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Send Icon */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  input.trim() && !loading
                    ? 'text-blue-600 hover:bg-blue-100/60 active:scale-95'
                    : 'text-slate-400 opacity-60 cursor-not-allowed'
                }`}
                title="Send Prompt"
              >
                {loading ? (
                  <NativeMobileSpinner size="xs" variant="tapered-arc" color="indigo" />
                ) : (
                  <Send size={18} className={input.trim() ? 'fill-blue-600/20' : ''} />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Gemini Style Footer Disclaimer */}
        <div className="pt-2 pb-1 text-center">
          <p className="text-[10.5px] text-slate-400">
            Alex in UNX Games can make mistakes.{' '}
            <button
              type="button"
              onClick={() => showToast('info', 'UNX AI Assistant', 'Alex provides official instant customer support and game pricing.')}
              className="underline hover:text-slate-600 cursor-pointer"
            >
              Learn more
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  </div>
  );
};
