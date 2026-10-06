import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Phone, Mail, MapPin, MessageCircle, ExternalLink } from 'lucide-react';
import { PRIMARY_BRAND_NAME, LEGAL_COMPANY_NAME, COPYRIGHT_NOTICE, BRAND_COMPANY_LINE } from '../../utils/branding';

export const COMPANY_CONFIG = {
  name: PRIMARY_BRAND_NAME,
  brandName: PRIMARY_BRAND_NAME,
  companyName: LEGAL_COMPANY_NAME,
  legalName: LEGAL_COMPANY_NAME,
  copyrightNotice: COPYRIGHT_NOTICE,
  brandCompanyLine: BRAND_COMPANY_LINE,
  tagline: "Nepal's #1 Game Top-Up & Voucher App",
  address: 'Deelasaini-6, Baitadi, Nepal',
  phone: '9768914027',
  displayPhone: '+977 9768914027',
  email: 'hii.binodthalal@gmail.com',
  whatsappUrl: 'https://wa.me/9779768914027',
  telUrl: 'tel:9768914027',
  mailUrl: 'mailto:hii.binodthalal@gmail.com',
};

interface CompanyDetailsProps {
  variant?: 'full' | 'compact' | 'cards';
  className?: string;
}

export const CompanyDetails: React.FC<CompanyDetailsProps> = ({
  variant = 'cards',
  className = '',
}) => {
  const { appSettings } = useStore();

  const phone = appSettings?.whatsappNumber || appSettings?.supportPhone || COMPANY_CONFIG.phone;
  const email = appSettings?.supportEmail || COMPANY_CONFIG.email;
  const address = appSettings?.companyAddress || COMPANY_CONFIG.address;
  const name = appSettings?.companyName || COMPANY_CONFIG.name;

  const telUrl = `tel:${phone}`;
  const mailUrl = `mailto:${email}`;
  const whatsappUrl = `https://wa.me/977${phone.replace(/^(\+977|977)/, '')}`;

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-slate-600 space-y-1 ${className}`}>
        <p className="font-black text-slate-900">{PRIMARY_BRAND_NAME}</p>
        <p className="text-[11px] font-bold text-red-600">By {LEGAL_COMPANY_NAME}</p>
        <p className="flex items-center gap-1.5 text-slate-500">
          <MapPin size={13} className="text-slate-400 shrink-0" />
          <span>{address}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <Phone size={13} className="text-emerald-600 shrink-0" />
          <a href={telUrl} className="hover:text-red-600 font-mono">
            {phone}
          </a>
        </p>
        <p className="flex items-center gap-1.5">
          <Mail size={13} className="text-red-600 shrink-0" />
          <a href={mailUrl} className="hover:text-red-600 underline">
            {email}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Call Us */}
        <a
          href={telUrl}
          className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 hover:border-red-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Phone size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Call Us
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono block">
              {phone}
            </span>
          </div>
        </a>

        {/* Email Us */}
        <a
          href={mailUrl}
          className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 hover:border-red-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Mail size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Email Support
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate">
              {email}
            </span>
          </div>
        </a>

        {/* WhatsApp Support */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 hover:border-emerald-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MessageCircle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              WhatsApp Support
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono block">
              {phone}
            </span>
          </div>
          <ExternalLink size={14} className="text-slate-400" />
        </a>

        {/* Business Address */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Business Location
            </span>
            <span className="text-xs font-semibold text-slate-900 block">
              {address}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
