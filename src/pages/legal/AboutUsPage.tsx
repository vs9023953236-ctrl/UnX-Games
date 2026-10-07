import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { AppLogo } from '../../components/common/AppLogo';
import { COMPANY_CONFIG } from '../../components/common/CompanyDetails';
import {
  PRIMARY_BRAND_NAME,
  LEGAL_COMPANY_NAME,
  COPYRIGHT_NOTICE,
  BRAND_COMPANY_LINE,
} from '../../utils/branding';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Zap,
  QrCode,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  Headphones,
  Award,
  Lock,
  ChevronRight,
  MessageCircle,
  Clock,
  Flame,
  FileText,
  Building2,
  Users,
  Crown,
  UserCheck,
  Copy,
  Check,
  ArrowUpRight,
  Shield,
  BadgeCheck,
  RotateCcw,
  CreditCard,
  Target,
  Eye,
  HeartHandshake,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Globe,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_OFFICERS = [
  {
    id: 'owner-binod',
    full_name: 'Binod Thalal',
    gamer_username: 'GHN_BinodOwner',
    email: 'hii.binodthalal@gmail.com',
    mobile: '9768914027',
    role: 'STORE_OWNER',
    position_title: 'Founder & CEO (intraX Pvt Ltd & Unx Games)',
    status: 'ACTIVE',
    is_owner: true,
    location: 'Deelasaini-6, Baitadi, Nepal',
  },
  {
    id: 'staff-nabin',
    full_name: 'Nabin Thalal',
    gamer_username: 'GHN_NabinStaff',
    email: 'nabinthalal96@gmail.com',
    mobile: '9748878187',
    role: 'SUPPORT_STAFF',
    position_title: 'Operations & Support Lead',
    status: 'ACTIVE',
    location: 'Kathmandu, Lalitpur, Nepal',
  },
];

export const AboutUsPage: React.FC = () => {
  const { setCurrentTab, appSettings, showToast } = useStore();

  const [teamMembers, setTeamMembers] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('ghn_cached_team_members');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return DEFAULT_OFFICERS;
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const brandName = PRIMARY_BRAND_NAME; // "Unx Games"
  const companyName = LEGAL_COMPANY_NAME; // "intraX Pvt Ltd"
  const brandCompanyLine = BRAND_COMPANY_LINE; // "Unx Games By intraX Pvt Ltd"
  const copyrightNotice = COPYRIGHT_NOTICE; // "© Unx Games By intraX Pvt Ltd"
  const address = appSettings?.companyAddress || COMPANY_CONFIG.address;
  const rawPhone = appSettings?.whatsappNumber || appSettings?.supportPhone || COMPANY_CONFIG.phone;
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const email = appSettings?.supportEmail || COMPANY_CONFIG.email;

  useEffect(() => {
    let isMounted = true;
    api.team.getMembers()
      .then((res) => {
        if (isMounted && res && res.success) {
          const rawMembers = res.members || [];
          const unique: any[] = [];
          const seen = new Set<string>();
          for (const m of rawMembers) {
            const key = (m.email || m.id || m.full_name || '').toLowerCase();
            if (key && seen.has(key)) continue;
            if (key) seen.add(key);
            unique.push(m);
          }
          if (unique.length > 0) {
            setTeamMembers(unique);
            try {
              localStorage.setItem('ghn_cached_team_members', JSON.stringify(unique));
            } catch (_e) {}
          }
        }
      })
      .catch(() => {})
      .finally(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleCopy = (text: string, field: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      showToast('success', `${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast('info', `${field}: ${text}`);
    }
  };

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${brandName} Team! I would like to learn more about your platform and top-up services.`
  )}`;

  const CORE_PILLARS = [
    {
      icon: Zap,
      iconBg: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
      title: '5-15 Mins Superfast Delivery',
      desc: 'Automated queue delivers Diamonds, UC, and passes directly to your Player UID within minutes of verification.',
    },
    {
      icon: Lock,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
      title: 'Zero-Password & 100% Safe',
      desc: 'Official direct UID top-up. No game password, login credentials, or secret OTPs are ever requested.',
    },
    {
      icon: QrCode,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20',
      title: 'Domestic Nepal Payments',
      desc: 'Scan & pay with eSewa, Khalti, IME Pay, and Fonepay Mobile Banking in NPR with zero international card surcharges.',
    },
    {
      icon: Headphones,
      iconBg: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
      title: '24/7 Dedicated Support',
      desc: 'Responsive customer care available around the clock via WhatsApp, live hotline, and ticketing.',
    },
  ];

  const SUPPORTED_GAMES = [
    { name: 'Free Fire', sub: 'Diamonds & Pass', icon: '🔥', tag: 'Instant' },
    { name: 'PUBG Mobile', sub: 'Global UC & Prime', icon: '🎯', tag: 'Fast' },
    { name: 'Mobile Legends', sub: 'Diamonds & Pass', icon: '⚔️', tag: 'Instant' },
    { name: 'Valorant', sub: 'South Asia VP', icon: '🛡️', tag: 'Top Rated' },
    { name: 'Roblox', sub: 'Robux & Codes', icon: '🧱', tag: 'Global' },
    { name: 'Steam Wallet', sub: 'USD / NPR Codes', icon: '🎮', tag: 'Code' },
    { name: 'Clash of Clans', sub: 'Gems & Pass', icon: '🏰', tag: 'Instant' },
    { name: 'Genshin Impact', sub: 'Crystals & Welkin', icon: '✨', tag: 'Direct' },
  ];

  const TRUST_STATS = [
    { number: '50,000+', label: 'Gamers Served', sub: 'Across 7 Provinces', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50/70 border-indigo-100' },
    { number: '99.8%', label: 'Success Rate', sub: 'Automated Delivery', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50/70 border-emerald-100' },
    { number: '2-10 Min', label: 'Average Delivery', sub: 'Direct Player UID', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/70 border-amber-100' },
    { number: '100%', label: 'Ban-Proof', sub: 'Official Publisher Channels', icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-50/70 border-rose-100' },
  ];

  const CORE_VALUES = [
    {
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200/80',
      title: 'Customer-Centric Speed',
      description: 'We understand the urgency of in-game events and limited-time bundles. Every order is processed with lightning-fast automation.',
    },
    {
      icon: Shield,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200/80',
      title: 'Uncompromised Account Safety',
      description: 'All top-ups are sourced through authorized publisher channels. Zero risk of account bans, chargebacks, or fraudulent diamonds.',
    },
    {
      icon: HeartHandshake,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200/80',
      title: 'Transparency & Fair Pricing',
      description: 'Clear, competitive NPR pricing with no hidden currency exchange penalty fees, international card markup, or unexpected deductions.',
    },
  ];

  const APP_FAQS = [
    {
      q: `What is the difference between ${brandName} and ${companyName}?`,
      a: `${brandName} is our public consumer gaming application and top-up marketplace. ${companyName} is the legally incorporated parent enterprise in Nepal that manages technology infrastructure, financial settlements, publisher contracts, and official operations.`,
    },
    {
      q: 'Do you ever need my game account password or email login?',
      a: 'Never! All top-ups on our platform are processed strictly via your public Game User ID (Player UID). We never ask for game passwords, recovery codes, or SMS OTPs.',
    },
    {
      q: 'How long does an order take to reach my account?',
      a: '95% of orders are delivered within 2 to 10 minutes once payment verification is completed through eSewa, Khalti, IME Pay, or Fonepay.',
    },
  ];

  return (
    <div className="flex flex-col bg-slate-50/70 text-slate-900 antialiased selection:bg-indigo-600 selection:text-white pb-2 sm:pb-2">
      
      {/* MAIN MOBILE APP CONTENT CONTAINER */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-2 pb-2 sm:pb-2 space-y-2 sm:space-y-2">
        
        {/* HERO APP BANNER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-500/20 overflow-hidden space-y-4"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-52 h-52 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status & Verification Badge */}
          <div className="flex items-center justify-between gap-2 relative z-10 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-md text-cyan-300 border border-white/15">
              <Building2 size={12} className="text-cyan-400" />
              <span>Operated By <strong className="text-white font-black">{companyName}</strong></span>
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Registered in Nepal 🇳🇵</span>
            </span>
          </div>

          {/* Header Identity Block */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="relative p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shrink-0 flex items-center justify-center">
              <AppLogo
                size="lg"
                glow={false}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden"
                imageClassName="w-full h-full object-contain rounded-xl"
              />
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
                <CheckCircle2 size={13} className="text-white stroke-[3]" />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  {brandName}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-400" /> Nepal&apos;s #1 Hub
                </span>
              </div>

              <p className="text-xs sm:text-sm text-indigo-300 font-black tracking-tight">
                {brandCompanyLine}
              </p>

              <p className="text-xs text-slate-300 leading-relaxed font-normal pt-1">
                Nepal&apos;s high-speed gaming recharge platform. Instant top-ups with domestic wallets (<strong className="text-emerald-300 font-bold">eSewa</strong>, <strong className="text-sky-300 font-bold">Khalti</strong>, <strong className="text-rose-300 font-bold">IME Pay</strong>, &amp; <strong className="text-cyan-300 font-bold">Fonepay</strong>) with zero dollar card required.
              </p>
            </div>
          </div>

          {/* Quick Action Pills in Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 relative z-10 text-xs">
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/40 transition-all cursor-pointer"
            >
              <Gamepad2 size={15} />
              <span>Explore Store</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <MessageCircle size={15} />
              <span>WhatsApp Chat</span>
            </a>

            <button
              type="button"
              onClick={() => handleCopy(rawPhone, 'Hotline')}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-slate-200 font-bold flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer"
            >
              <Phone size={14} className="text-cyan-300" />
              <span>{copiedField === 'Hotline' ? 'Copied!' : 'Hotline Call'}</span>
            </button>
          </div>
        </motion.div>

        {/* 2. STATS COUNTER BENTO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TRUST_STATS.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                className={`bg-white border border-slate-200/90 rounded-2xl p-3.5 text-center shadow-2xs space-y-1 transition-all`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto">
                  <Icon size={17} className={stat.color} />
                </div>
                <div className="font-mono font-black text-slate-900 text-base sm:text-lg tracking-tight">
                  {stat.number}
                </div>
                <div className="text-[11px] text-slate-700 font-bold leading-tight">
                  {stat.label}
                </div>
                <div className="text-[9.5px] text-slate-400 font-medium truncate">
                  {stat.sub}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 3. MISSION, VISION & ZERO PASSWORD */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-2.5">
            <Flame size={18} />
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Our Mission &amp; Purpose
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <Target size={14} />
                <span>Our Mission</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                To empower Nepali gamers with instant, 100% legitimate in-game top-ups directly via domestic wallets without international dollar card limitations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700">
                <Eye size={14} />
                <span>Our Vision</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                To establish {brandName} as Nepal&apos;s definitive unified esports and gaming portal, operating securely under {companyName}.
              </p>
            </div>
          </div>

          {/* Zero Password Guarantee Capsule */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/90 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div className="text-xs space-y-0.5">
              <span className="font-black text-slate-900 block text-xs sm:text-sm">Zero-Password Guarantee</span>
              <span className="text-slate-600 text-[11px] leading-relaxed block font-medium">
                We only require your public Game User ID / Player UID. Your passwords, email access, and OTPs remain 100% private to you.
              </span>
            </div>
          </div>
        </div>

        {/* 4. CORE SERVICE PILLARS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Why Gamers Choose {brandName}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">4 Key Pillars</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CORE_PILLARS.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${pillar.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                      {pillar.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. FOUNDER & EXECUTIVE LEADERSHIP HERO */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-500/30 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <Crown size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Executive Leadership
                </span>
                <h2 className="text-xs sm:text-sm font-black text-white">
                  Store Owner &amp; Founder
                </h2>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 border border-amber-300 shadow-xs flex items-center gap-1">
              <Crown size={11} /> OWNER &amp; CEO
            </span>
          </div>

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 border-2 border-amber-400/80 shadow-md overflow-hidden relative">
              <img
                src="https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/IMG_20260630_172545.png"
                alt="Binod Thalal - Founder & Owner"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                }}
              />
              <span className="absolute inset-0 -z-10 flex items-center justify-center font-black text-lg text-slate-950 bg-gradient-to-tr from-amber-400 to-amber-200">
                BT
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">Binod Thalal</h3>
                <BadgeCheck size={16} className="text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs font-bold text-amber-300">
                Founder, Owner &amp; CEO ({companyName} &amp; {brandName})
              </p>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                &ldquo;Unx Games was established under intraX Pvt Ltd with a singular mission: to provide gamers across all 7 provinces of Nepal with transparent, ban-free in-game recharges that process automatically in minutes.&rdquo;
              </p>
            </div>
          </div>

          {/* Quick Action Contact Chips for Founder */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 relative z-10 text-xs">
            <button
              type="button"
              onClick={() => handleCopy('hii.binodthalal@gmail.com', 'Founder Email')}
              className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-left cursor-pointer transition-all active:scale-95"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={13} className="text-amber-400 shrink-0" />
                <span className="font-mono text-xs truncate text-slate-200">hii.binodthalal@gmail.com</span>
              </div>
              {copiedField === 'Founder Email' ? (
                <Check size={13} className="text-emerald-400 shrink-0" />
              ) : (
                <Copy size={13} className="text-slate-400 shrink-0" />
              )}
            </button>

            <a
              href="tel:9768914027"
              className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-left cursor-pointer transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-emerald-400 shrink-0" />
                <span className="font-mono text-xs text-slate-200">+977 9768914027</span>
              </div>
              <ArrowUpRight size={13} className="text-slate-400 shrink-0" />
            </a>

            <div className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <MapPin size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs text-slate-200 truncate">Deelasaini-6, Baitadi</span>
            </div>
          </div>
        </div>

        {/* 6. VERIFIED OPERATIONAL OFFICERS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-slate-900">
              <Users size={18} className="text-indigo-600" />
              <h2 className="text-sm font-black tracking-tight">
                Verified Operations Team
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {teamMembers.length} Active Officers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {teamMembers.map((member, idx) => (
              <div
                key={`about-team-${member.id || idx}-${idx}`}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs ${
                      member.role === 'OWNER' || member.role === 'STORE_OWNER' ? 'bg-amber-500' :
                      member.role === 'SUPER_ADMIN' || member.role === 'ADMIN' ? 'bg-indigo-600' :
                      'bg-slate-700'
                    }`}>
                      {member.full_name?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-xs sm:text-sm text-slate-900 truncate flex items-center gap-1">
                        <span>{member.full_name}</span>
                        {member.is_owner && <Crown size={12} className="text-amber-500 shrink-0" />}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{member.position_title || member.role}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${
                    member.role === 'OWNER' || member.role === 'STORE_OWNER' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                    member.role === 'SUPPORT_STAFF' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {member.role}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{member.location || 'Nepal'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Join Team Banner */}
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserCheck size={20} className="text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-indigo-950 block truncate">
                  Want to join {brandName} as Staff or Partner?
                </span>
                <span className="text-[10px] text-indigo-700 block">
                  Openings in verification, operations, and community support.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('join_team')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shrink-0 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Apply Now →
            </button>
          </div>
        </div>

        {/* 7. SUPPORTED DOMESTIC WALLETS & PAYMENT SECURITY */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Domestic Nepal Payment Gateways
              </h2>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Zero Surcharges
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="py-3 px-2 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-center space-y-0.5">
              <span className="text-xs font-black text-emerald-700 block">eSewa Wallet</span>
              <span className="text-[10px] text-emerald-600 font-medium block">Instant QR &amp; Manual</span>
            </div>
            <div className="py-3 px-2 bg-sky-50/50 border border-sky-200/80 rounded-xl text-center space-y-0.5">
              <span className="text-xs font-black text-sky-700 block">Khalti Digital</span>
              <span className="text-[10px] text-sky-600 font-medium block">Direct Verification</span>
            </div>
            <div className="py-3 px-2 bg-rose-50/50 border border-rose-200/80 rounded-xl text-center space-y-0.5">
              <span className="text-xs font-black text-rose-700 block">IME Pay</span>
              <span className="text-[10px] text-rose-600 font-medium block">Domestic Banking</span>
            </div>
            <div className="py-3 px-2 bg-blue-50/50 border border-blue-200/80 rounded-xl text-center space-y-0.5">
              <span className="text-xs font-black text-blue-700 block">Fonepay QR</span>
              <span className="text-[10px] text-blue-600 font-medium block">All Nepal Banks</span>
            </div>
          </div>
        </div>

        {/* 8. TOP-UP CATALOG BENTO */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-indigo-600">
              <Gamepad2 size={18} />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Supported Top-Up Catalog
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>Full Store</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SUPPORTED_GAMES.map((game, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentTab('shop')}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 rounded-2xl space-y-1 cursor-pointer transition-all active:scale-95 text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{game.icon}</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                    {game.tag}
                  </span>
                </div>
                <div className="font-black text-xs sm:text-sm text-slate-900 truncate mt-1 group-hover:text-indigo-700 transition-colors">
                  {game.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{game.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 9. REGISTERED BUSINESS & OFFICE DIRECTORY */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-slate-900">
              <Building2 size={18} className="text-indigo-600" />
              <div>
                <h2 className="font-black text-sm tracking-tight">
                  Registered Headquarters &amp; Directory
                </h2>
                <span className="text-[10px] text-slate-500">Government recognized business entity</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
              Active &amp; Verified
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Address */}
            <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Physical Office Location</span>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm block">{address}</span>
                  <span className="text-[10px] text-slate-500">{companyName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(address, 'Office Address')}
                className="p-2 text-slate-400 hover:text-slate-700 active:scale-95 cursor-pointer shrink-0"
                title="Copy Address"
              >
                {copiedField === 'Office Address' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Hotline */}
            <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-start gap-2.5 min-w-0">
                <Phone size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Customer Care Hotline</span>
                  <span className="font-mono font-black text-slate-900 text-xs sm:text-sm block">{rawPhone}</span>
                  <span className="text-[10px] text-slate-500">Live Voice Calls &amp; WhatsApp Support</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(rawPhone, 'Hotline')}
                  className="p-2 text-slate-400 hover:text-slate-700 active:scale-95 cursor-pointer"
                  title="Copy Phone"
                >
                  {copiedField === 'Hotline' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <a
                  href={`tel:${rawPhone}`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs active:scale-95 transition-all inline-flex items-center gap-1 shadow-2xs"
                >
                  <span>Call</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-start gap-2.5 min-w-0">
                <Mail size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Official Inquiries &amp; Support</span>
                  <span className="font-mono font-medium text-slate-900 text-xs truncate block">{email}</span>
                  <span className="text-[10px] text-slate-500">Partner &amp; Consumer Support</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(email, 'Email Address')}
                  className="p-2 text-slate-400 hover:text-slate-700 active:scale-95 cursor-pointer"
                  title="Copy Email"
                >
                  {copiedField === 'Email Address' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <a
                  href={`mailto:${email}`}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs active:scale-95 transition-all inline-flex items-center gap-1 shadow-2xs"
                >
                  <span>Email</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 4. EXPANDABLE MOBILE FAQS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-2">
            {APP_FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-slate-50 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-3 text-left font-bold text-xs text-slate-900 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-3 pb-3 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-200/50"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. APP LEGAL & POLICIES FOOTER LINKS */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCurrentTab('terms')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-left flex items-center justify-between cursor-pointer transition-all active:scale-95 shadow-2xs group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={15} className="text-indigo-600 shrink-0" />
              <span className="font-bold text-xs text-slate-900 truncate">Terms of Service</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('privacy')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-left flex items-center justify-between cursor-pointer transition-all active:scale-95 shadow-2xs group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
              <span className="font-bold text-xs text-slate-900 truncate">Privacy Policy</span>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-600" />
          </button>
        </div>

        {/* 6. OFFICIAL FOOTER IDENTIFIER CARD */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl text-center space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-center gap-2">
            <AppLogo size="sm" glow={false} className="w-5 h-5 rounded-md inline-block" />
            <span className="font-black text-sm text-slate-900">{brandName}</span>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              🇳🇵 Nepal
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            {brandCompanyLine} • Official Gaming Top-Up Platform in Nepal
          </p>

          <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 font-mono flex items-center justify-center gap-2">
            <span>v2.5.0 (Mobile App Edition)</span>
            <span>•</span>
            <span className="font-bold text-slate-700">{copyrightNotice}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AboutUsPage;

