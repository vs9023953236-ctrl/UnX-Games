import React, { useState, useMemo } from "react";
import { useStore } from "../../../context/StoreContext";
import { useAuth } from "../../../context/AuthContext";
import { formatTimeAgo, formatDisplayOrderId } from "../../../utils/formatters";
import { NotificationType } from "../../../types";
import { api } from "../../../services/api";
import {
  Bell,
  Send,
  Radio,
  Trash2,
  Filter,
  Globe,
  UserCheck,
  Sparkles,
  Zap,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Search,
  Tag,
  Gamepad2,
  CreditCard,
  Percent,
  Check,
  Clock,
  Layers,
  ShieldCheck,
} from "lucide-react";

export const AdminNotificationsTab: React.FC = () => {
  const {
    notifications,
    sendNotification,
    refreshNotifications,
    showToast,
    clearSystemNotifications,
    deleteNotification,
    setAdminTab,
    setAdminSelectedUserId,
  } = useStore();
  const { users, currentUser } = useAuth();

  const [recipient, setRecipient] = useState<"all" | string>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("announcement");
  const [filterType, setFilterType] = useState<"all" | "broadcast" | "targeted" | "kyc" | "payments" | "orders">("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AI Composer State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState<"hype" | "urgent" | "friendly" | "official" | "festive">("hype");
  const [aiGame, setAiGame] = useState("Free Fire");
  const [aiPromoCode, setAiPromoCode] = useState("");
  const [aiDiscount, setAiDiscount] = useState<number | "">("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Quick Preset Templates
  const presets = [
    {
      label: "⚡ Free Fire Diamonds Drop",
      icon: "💎",
      title: "⚡ Free Fire Double Diamond Bonus Live!",
      message: "Top up your Free Fire Diamonds today on Unx Games & get bonus diamonds + 5-min instant delivery via UID.",
      type: "announcement" as NotificationType,
    },
    {
      label: "🔫 PUBG UC Weekend Deal",
      icon: "🎯",
      title: "🎯 PUBG Mobile UC Discount — Instant Delivery",
      message: "Grab exclusive discounted UC packs with zero processing fees. Instant delivery directly to your Player ID!",
      type: "announcement" as NotificationType,
    },
    {
      label: "💳 5% Wallet Top-Up Cashback",
      icon: "🎁",
      title: "🎁 5% Extra Balance on eSewa / Khalti Load!",
      message: "Deposit NPR 500+ into your Unx Games wallet today and get 5% instant bonus balance added automatically.",
      type: "announcement" as NotificationType,
    },
    {
      label: "🎟️ 10% Flat Promo Code",
      icon: "🏷️",
      title: "🏷️ Special Promo Code: GHN10 (10% OFF)",
      message: "Apply promo code GHN10 at checkout to claim 10% off your next game package. Valid for the next 24 hours!",
      type: "announcement" as NotificationType,
    },
    {
      label: "⚙️ Scheduled System Notice",
      icon: "🛠️",
      title: "⚙️ Scheduled Fast System Optimization",
      message: "Unx Games server upgrade scheduled tonight (2:00 AM - 3:00 AM NPT). Orders placed will be completed immediately.",
      type: "system" as NotificationType,
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTitle(p.title);
    setMessage(p.message);
    setType(p.type);
    showToast("info", "Template Loaded", `Filled form with "${p.label}".`);
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      showToast("error", "Topic Required", "Please enter a campaign topic or promotion goal.");
      return;
    }

    setIsAiGenerating(true);
    try {
      const res: any = await api.notifications.aiCompose({
        topic: aiTopic.trim(),
        tone: aiTone,
        game: aiGame !== "None" ? aiGame : undefined,
        promoCode: aiPromoCode.trim() || undefined,
        discountPercent: typeof aiDiscount === "number" ? aiDiscount : undefined,
      });

      if (res.success && res.composed) {
        setTitle(res.composed.title);
        setMessage(res.composed.message);
        if (res.composed.suggestedType) {
          setType(res.composed.suggestedType as NotificationType);
        }
        setShowAiModal(false);
        showToast("success", "AI Generated!", "Generated optimized notification and applied to form.");
      } else {
        throw new Error(res.message || "Failed to generate AI broadcast content.");
      }
    } catch (err: any) {
      showToast("error", "AI Error", err.message || "Failed to generate AI notification.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("error", "Validation Error", "Title and Message are required.");
      return;
    }

    setSending(true);
    const isBroadcast = recipient === "all";
    try {
      await sendNotification(
        {
          recipientUid: recipient,
          recipientRole: "user",
          userId: recipient,
          isGlobal: isBroadcast,
          title: title.trim(),
          message: message.trim(),
          type,
        },
        currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined
      );

      setTitle("");
      setMessage("");
    } catch (e: any) {
      showToast("error", "Dispatch Error", e.message || "Could not send notification.");
    } finally {
      setSending(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotifications();
      showToast("info", "Synced", "Notifications list refreshed from PostgreSQL.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isGlobal = n.isGlobal === true || n.recipientUid === "all" || n.userId === "all";
      if (filterType === "broadcast" && !isGlobal) return false;
      if (filterType === "targeted" && isGlobal) return false;
      if (filterType === "kyc" && n.type !== "kyc_request") return false;
      if (filterType === "payments" && !(n.type === "payment_verification" || n.type === "payment" || n.type === "WALLET_DEPOSIT" || (n.title || '').toLowerCase().includes('payment'))) return false;
      if (filterType === "orders" && !(n.type === "order" || n.type === "order_status" || (n.title || '').toLowerCase().includes('order'))) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchTitle = (n.title || "").toLowerCase().includes(q);
        const matchMessage = (n.message || "").toLowerCase().includes(q);
        const matchUser = (n.recipientUid || "").toLowerCase().includes(q);
        return matchTitle || matchMessage || matchUser;
      }
      return true;
    });
  }, [notifications, filterType, searchFilter]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const broadcasts = notifications.filter(
      (n) => n.isGlobal === true || n.recipientUid === "all" || n.userId === "all"
    ).length;
    const targeted = total - broadcasts;
    const kycRequests = notifications.filter((n) => n.type === "kyc_request").length;
    const paymentsCount = notifications.filter((n) => n.type === "payment_verification" || n.type === "payment" || n.type === "WALLET_DEPOSIT" || (n.title || '').toLowerCase().includes('payment')).length;
    const readCount = notifications.filter((n) => n.read).length;
    return { total, broadcasts, targeted, kycRequests, paymentsCount, readCount };
  }, [notifications]);

  const getUserLabel = (uid?: string, isGlobal?: boolean) => {
    if (isGlobal || uid === "all") return "📢 All Customers (Broadcast)";
    if (uid === "admin") return "🛡️ Administrator Alert";
    const found = users.find((u) => u.uid === uid);
    if (found) return `👤 ${found.name} (${found.email})`;
    return `👤 User UID: ${uid || "Unknown"}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & AI Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Bell size={16} />
            <span>Broadcast &amp; Notifications Engine</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
            Notification Center &amp; AI Dispatcher
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast promotional alerts, game drops, wallet incentives, or private user updates synced across all customer devices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh from PostgreSQL"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            <span>AI Notification Generator</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={13} className="text-indigo-600" />
            Total Dispatches
          </span>
          <div className="text-xl font-black text-slate-900">{stats.total}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe size={13} className="text-amber-600" />
            Broadcasts
          </span>
          <div className="text-xl font-black text-amber-700">{stats.broadcasts}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck size={13} className="text-purple-600" />
            Targeted Direct
          </span>
          <div className="text-xl font-black text-purple-700">{stats.targeted}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Active Sync Rate
          </span>
          <div className="text-xl font-black text-emerald-700">100% Live</div>
        </div>
      </div>

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dispatch Form & Preset Templates */}
        <div className="lg:col-span-5 space-y-5">
          {/* Dispatcher Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Radio size={16} className="text-indigo-600" />
                <span>Create &amp; Dispatch Alert</span>
              </h2>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                PostgreSQL Synced
              </span>
            </div>

            <form onSubmit={handleSend} className="space-y-3.5">
              {/* Recipient Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Target Audience *
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 font-semibold"
                >
                  <option value="all">📢 All Customers (Global Broadcast)</option>
                  <optgroup label="Direct Active Users">
                    {users.map((u, uIdx) => (
                      <option key={`admin-notif-usr-${u.uid || u.id || uIdx}-${uIdx}`} value={u.uid || u.id}>
                        👤 {u.name} ({u.email || u.phone || (u.uid || u.id || '').slice(0, 8)})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[10px] text-slate-500 font-medium">
                  {recipient === "all"
                    ? "📢 Broadcast will appear in every customer's notification bell immediately."
                    : "🔒 Private: Delivered securely only to the selected user's account."}
                </p>
              </div>

              {/* Notification Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Notification Type &amp; Theme *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as NotificationType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 font-semibold"
                >
                  <option value="announcement">📢 Announcement / Promotion / Flash Deal</option>
                  <option value="system">⚙️ System &amp; Maintenance Notice</option>
                  <option value="order_completed">✅ Order Delivery / Completion</option>
                  <option value="payment_verified">💳 Payment Verification &amp; Wallet</option>
                </select>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ⚡ Free Fire Diamond Bonus Live!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 font-bold"
                />
              </div>

              {/* Message Body Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Notification Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detailed message displayed to recipient..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 resize-none font-medium"
                />
              </div>

              {/* Live Preview Card */}
              {(title || message) && (
                <div className="p-3 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl text-white space-y-2 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-b border-white/10 pb-1.5">
                    <span className="flex items-center gap-1 text-purple-300">
                      <Smartphone size={12} />
                      Live Customer Push Preview
                    </span>
                    <span>Just now</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 text-white font-black text-xs">
                      GH
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {title || "Notification Title"}
                      </div>
                      <div className="text-[11px] text-slate-300 line-clamp-2 leading-tight font-medium">
                        {message || "Notification message preview..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Dispatch */}
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                <span>{sending ? "Dispatching to Devices..." : "Dispatch Notification Now"}</span>
              </button>
            </form>
          </div>

          {/* 1-Click Fill Preset Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              1-Click Fast Presets
            </span>
            <div className="grid grid-cols-1 gap-2">
              {presets.map((p, i) => (
                <button
                  key={`preset-${i}`}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-purple-50/70 hover:border-purple-200 text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.icon}</span>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-purple-900">
                      {p.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Fill Form →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sent History & Live Log */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>Dispatch History</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {filteredNotifications.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Live audit trail of dispatched notifications
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold overflow-x-auto hide-scrollbar w-full sm:w-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    filterType === "all"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("broadcast")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    filterType === "broadcast"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Broadcasts
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("targeted")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    filterType === "targeted"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Targeted
                </button>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search notifications by title, message, or user..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
            />
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Bell size={28} className="mx-auto text-slate-300 opacity-60" />
              <p className="font-semibold">No notifications match your current filter.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredNotifications.map((n, idx) => {
                const isGlobal = n.isGlobal === true || n.recipientUid === "all" || n.userId === "all";
                return (
                  <div
                    key={`admin-notif-${n.id || idx}-${idx}`}
                    className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2 hover:bg-slate-50 transition-all shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-xs text-slate-900">
                            {n.orderId && n.title.includes(n.orderId)
                              ? n.title.replace(n.orderId, formatDisplayOrderId(n.orderId))
                              : n.title}
                          </span>
                          {isGlobal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                              <Globe size={10} /> Broadcast
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                              <UserCheck size={10} /> Direct
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full uppercase">
                            {n.type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                          {n.message}
                        </p>

                        {n.type === "kyc_request" && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                const targetUid = n.customerId || (n.recipientUid !== "admin" ? n.recipientUid : undefined);
                                if (targetUid) {
                                  setAdminSelectedUserId(targetUid);
                                }
                                setAdminTab("kyc");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <ShieldCheck size={13} />
                              <span>Review KYC Application →</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteNotification(
                              n.id,
                              currentUser
                                ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
                                : undefined
                            );
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                          title="Delete notification"
                          aria-label="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 text-[10px] text-slate-500 border-t border-slate-200/60 font-medium">
                      <span>Recipient: <strong className="text-slate-700">{getUserLabel(n.recipientUid || n.userId, n.isGlobal)}</strong></span>
                      {n.orderId && (
                        <>
                          <span>·</span>
                          <span className="text-slate-600 font-mono">
                            Attached Order #{n.orderId}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="text-slate-400 font-mono text-[9px]">ID: {n.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. AI Notification Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 p-5 text-white flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles size={15} />
                  <span>Powered by Gemini 3.8 Flash</span>
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  AI Broadcast &amp; Notification Composer
                </h3>
                <p className="text-xs text-purple-200 font-medium">
                  Autonomous English copywriter crafted specifically for Unx Games promotions and updates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAiGenerate} className="p-5 space-y-4">
              {/* Campaign Topic / Goal */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Promotion Goal / Announcement Topic *
                </label>
                <input
                  type="text"
                  required
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Free Fire Double Diamonds 10% OFF this weekend"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-purple-600 font-bold"
                />
              </div>

              {/* Tone & Game Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Tone / Style
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-purple-600 font-semibold"
                  >
                    <option value="hype">🔥 Hype &amp; Gaming Action</option>
                    <option value="urgent">⚡ Urgent / Limited Time</option>
                    <option value="friendly">🤝 Friendly &amp; Helpful</option>
                    <option value="official">🏛️ Official Notice</option>
                    <option value="festive">🎉 Festive &amp; Celebration</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Featured Game
                  </label>
                  <select
                    value={aiGame}
                    onChange={(e) => setAiGame(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-purple-600 font-semibold"
                  >
                    <option value="Free Fire">Free Fire</option>
                    <option value="PUBG Mobile">PUBG Mobile</option>
                    <option value="Mobile Legends">Mobile Legends</option>
                    <option value="Roblox">Roblox</option>
                    <option value="Steam">Steam Nepal</option>
                    <option value="All Games">All Gaming Store</option>
                  </select>
                </div>
              </div>

              {/* Promo Code & Discount Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={aiPromoCode}
                    onChange={(e) => setAiPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GHN10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-purple-600 font-mono font-bold uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Discount % (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={aiDiscount}
                    onChange={(e) => setAiDiscount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-purple-600 font-bold"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAiGenerating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} className={isAiGenerating ? "animate-spin text-amber-300" : "text-amber-300"} />
                  <span>{isAiGenerating ? "Gemini is Writing..." : "Generate & Apply Copy"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminNotificationsTab;
