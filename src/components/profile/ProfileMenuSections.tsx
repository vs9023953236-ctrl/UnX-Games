import React from 'react';
import { useStore } from '../../context/StoreContext';
import {
  HelpCircle,
  MessageSquare,
  Scale,
  ChevronRight,
  Info,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileMenuSectionsProps {
  onOpenWizardClick?: () => void;
  onEditClick?: () => void;
}

export const ProfileMenuSections: React.FC<ProfileMenuSectionsProps> = () => {
  const { setCurrentTab } = useStore();

  const menuItems = [
    {
      id: 'faq',
      title: 'FAQ & Top-Up Guides',
      subtitle: 'Instant recharge steps, timings & common questions',
      icon: HelpCircle,
      iconBg: 'bg-amber-50 text-amber-600',
      action: () => setCurrentTab('faq'),
      badge: null,
    },
    {
      id: 'support_ticket',
      title: 'Customer Care & Support Ticket',
      subtitle: 'Submit inquiries & track live resolution',
      icon: MessageSquare,
      iconBg: 'bg-emerald-50 text-emerald-600',
      action: () => setCurrentTab('contact'),
      badge: null,
    },
    {
      id: 'legal_policies',
      title: 'Legal & Store Policies',
      subtitle: 'Delivery, Refund, Payment, Terms & Privacy',
      icon: Scale,
      iconBg: 'bg-orange-50 text-orange-600',
      action: () => setCurrentTab('terms'),
      badge: 'All-in-One',
      badgeColor: 'bg-orange-100 text-orange-800',
    },
    {
      id: 'about_us',
      title: 'About Unx Games',
      subtitle: 'Company story, registration & gamer guarantee',
      icon: Info,
      iconBg: 'bg-slate-100 text-slate-700',
      action: () => setCurrentTab('about'),
      badge: 'Official',
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'join_team',
      title: 'Join Our Team',
      subtitle: 'Apply for staff or admin position',
      icon: ShieldCheck,
      iconBg: 'bg-blue-50 text-blue-600',
      action: () => setCurrentTab('join_team'),
      badge: 'Hiring',
      badgeColor: 'bg-blue-100 text-blue-800',
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="w-full bg-white border border-slate-200/90 rounded-3xl p-3 sm:p-4 shadow-sm space-y-3"
    >
      <div className="px-1 py-0.5 flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          Account Services &amp; Info
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          Nepal #1 Gaming Portal
        </span>
      </div>

      {/* Prominent Manage Security & Password Banner */}
      <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200/80 text-xs text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound size={20} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <strong className="text-red-950 font-black block text-xs sm:text-sm">
              Manage Security &amp; Password
            </strong>
            <span className="text-red-700/90 text-[11px] font-medium block truncate">
              Update password, recovery codes, or enable 2FA anytime.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCurrentTab('settings')}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:scale-95 text-white font-black text-xs transition-all shrink-0 shadow-xs cursor-pointer text-center whitespace-nowrap"
        >
          Open Settings
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={`profile-menu-item-${item.id || idx}-${idx}`}
              onClick={item.action}
              className="w-full p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-50 active:bg-slate-100 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl ${item.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}
                >
                  <Icon size={19} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-slate-200/70 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
                <ChevronRight size={15} className="stroke-[2.5]" />
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
