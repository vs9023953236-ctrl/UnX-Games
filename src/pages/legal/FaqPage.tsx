import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CompanyDetails, COMPANY_CONFIG } from '../../components/common/CompanyDetails';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FaqPage: React.FC = () => {
  const { goBack, appSettings } = useStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const phone = appSettings?.whatsappNumber || appSettings?.supportPhone || COMPANY_CONFIG.phone;

  const faqs = [
    {
      q: 'How long does it take for my game top-up to arrive?',
      a: 'Top-ups are processed automatically or manually verified within 5 to 15 minutes during operational hours (7:00 AM – 11:00 PM NPT). During high peak periods, delivery may take up to 20-30 minutes.',
    },
    {
      q: 'Which payment methods are accepted in Nepal?',
      a: 'We accept direct wallet transfers and instant QR scan payments from eSewa and Khalti. Simply scan the QR code at checkout, transfer the exact total, and upload the transaction receipt screenshot.',
    },
    {
      q: 'Do you need my game password to deliver diamonds or UC?',
      a: 'NO! Never give your game password to anyone. Unx Games ONLY requires your Player ID / UID (and Server/Zone ID if applicable) to credit top-ups directly into your game account.',
    },
    {
      q: 'Where do I find my Player ID / UID?',
      a: 'Open your game (e.g., Free Fire or PUBG Mobile), tap on your profile avatar in the top-left corner of the main lobby screen, and copy the numeric ID shown next to your nickname.',
    },
    {
      q: 'What if I entered an incorrect Player ID?',
      a: 'If your order has not been fulfilled yet, immediately contact our WhatsApp support team with your Order ID and corrected Player UID. Once credits are delivered to an ID, the transaction cannot be reversed.',
    },
    {
      q: 'Is Unx Games safe and legitimate?',
      a: 'Yes, 100%. We are a registered business operating in Pokhara, Nepal. We have safely fulfilled tens of thousands of digital game top-ups across Nepal with high customer trust.',
    },
    {
      q: 'Can I get a refund if I change my mind?',
      a: 'Due to the instantaneous and non-returnable nature of digital vouchers and top-ups, completed orders cannot be refunded. However, if we fail to deliver within 24 hours or if you accidentally double-paid, a full refund is guaranteed.',
    },
  ];

  return (
    <div className="flex flex-col bg-transparent">
      <div className="space-y-2 sm:space-y-2 w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-2 pb-2 sm:pb-2">
        {/* Intro Banner */}
        <div className="bg-white text-slate-900 rounded-2xl p-4 shadow-2xs border border-slate-200/90 space-y-2 relative">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <HelpCircle size={18} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
                <p className="text-[10px] text-slate-500 font-medium">Quick Answers for Payments &amp; Delivery</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={11} /> Instant Help
            </span>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                    {faq.q}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 font-medium">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Support Callout Box */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs text-center space-y-3">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Still have a question?</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Our support representative is ready on WhatsApp to assist with your order fulfillment.
          </p>
          <a
            href={`https://wa.me/977${phone.replace(/^(\+977|977)/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>Chat Live on WhatsApp ({phone})</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
