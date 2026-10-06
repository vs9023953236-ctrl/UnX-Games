import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { COMPANY_CONFIG } from '../../components/common/CompanyDetails';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Sparkles,
  Ticket,
  Paperclip,
  Image as ImageIcon,
  X,
  Search,
  MessageSquare,
  Flame,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupportInquiry, SupportMessageItem } from '../../types';
import { uploadImage } from '../../services/api';

const QUICK_ISSUE_TEMPLATES = [
  { label: 'Payment Deducted but Top-Up Pending', category: 'Payment Verification', priority: 'HIGH', text: 'Namaste, my payment was completed via eSewa/Khalti but my top-up is still pending. Please verify my transaction reference.' },
  { label: 'Wrong Player UID Provided', category: 'Game Top-Up', priority: 'URGENT', text: 'I entered the wrong Player UID during checkout. My correct UID is: ' },
  { label: 'Order Status Query', category: 'Order Issue', priority: 'NORMAL', text: 'Kindly check the delivery progress for my recent order. Thank you!' },
  { label: 'Login / Account Issue', category: 'Account Help', priority: 'NORMAL', text: 'I am unable to login to my account. Please assist with password reset or account verification.' },
];

export const ContactUsPage: React.FC = () => {
  const { showToast, appSettings, inquiries, submitInquiry, fetchTicketMessages, sendTicketMessage } = useStore();
  const { currentUser } = useAuth();

  // Active view tab: 'new_ticket' or 'my_tickets'
  const [activeTab, setActiveTab] = useState<'new_ticket' | 'my_tickets'>('new_ticket');

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [category, setCategory] = useState<SupportInquiry['category']>('Order Issue');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<SupportInquiry | null>(null);

  // Thread Chat Modal for user
  const [activeChatTicket, setActiveChatTicket] = useState<SupportInquiry | null>(null);
  const [chatMessages, setChatMessages] = useState<SupportMessageItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<string>('');
  const [sendingReply, setSendingReply] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const isMountedRef = useRef(true);

  // Close thread chat modal and reset transient form / chat state on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setActiveChatTicket(null);
      setCreatedTicket(null);
      setChatMessages([]);
      setChatLoading(false);
      setSubmitting(false);
      setSendingReply(false);
      setChatSearch('');
      setReplyText('');
    };
  }, []);

  const officialPhone = appSettings?.whatsappNumber || appSettings?.supportPhone || COMPANY_CONFIG.phone;
  const supportEmail = appSettings?.supportEmail || COMPANY_CONFIG.email;
  const address = appSettings?.companyAddress || COMPANY_CONFIG.address;

  const whatsappUrl = `https://wa.me/977${officialPhone.replace(/^(\+977|977)/, '')}`;
  const mailUrl = `mailto:${supportEmail}`;

  // Sync user details if logged in
  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name || '');
      if (!email) setEmail(currentUser.email || '');
      if (!phone) setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Filter user's submitted inquiries
  const myInquiries = inquiries.filter((inq) => {
    if (currentUser?.uid && inq.userId === currentUser.uid) return true;
    if (currentUser?.email && inq.userEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (email && inq.userEmail.toLowerCase() === email.toLowerCase().trim()) return true;
    return false;
  });

  // Filter inquiries for search inside "My Tickets"
  const displayedInquiries = myInquiries.filter((inq) => {
    if (!chatSearch.trim()) return true;
    const q = chatSearch.toLowerCase();
    return (
      (inq.ticketNumber && inq.ticketNumber.toLowerCase().includes(q)) ||
      (inq.subject && inq.subject.toLowerCase().includes(q)) ||
      (inq.message && inq.message.toLowerCase().includes(q)) ||
      (inq.orderId && inq.orderId.toLowerCase().includes(q))
    );
  });

  // Handle file upload for initial ticket
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please select an image under 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    try {
      const url = await uploadImage(file, 'support-attachments', (p) => setUploadProgress(p));
      setAttachmentUrl(url);
      showToast('success', 'Image Attached', 'Screenshot attached to your support ticket.');
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle file upload for chat thread reply
  const handleReplyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please select an image under 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'support-attachments');
      setReplyAttachment(url);
      showToast('success', 'Image Attached', 'Ready to send in message.');
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    }
  };

  const handleApplyTemplate = (tmpl: typeof QUICK_ISSUE_TEMPLATES[0]) => {
    setCategory(tmpl.category as any);
    setPriority(tmpl.priority as any);
    setSubject(tmpl.label);
    setMessage(tmpl.text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || !email.trim()) {
      showToast('error', 'Required Fields', 'Please fill in your name, email and message.');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await submitInquiry({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        category,
        priority,
        orderId: orderId.trim() || undefined,
        subject: subject.trim() || `${category} - Support Request`,
        message: message.trim(),
        attachmentUrl: attachmentUrl || undefined,
        userId: currentUser?.uid,
      });

      setCreatedTicket(ticket);
      setMessage('');
      setOrderId('');
      setSubject('');
      setAttachmentUrl('');
      setPriority('NORMAL');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (isMountedRef.current) {
        showToast('error', 'Error', err.message || 'Failed to submit inquiry.');
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  // Open ticket thread chat
  const handleOpenChat = async (ticket: SupportInquiry) => {
    setActiveChatTicket(ticket);
    setChatLoading(true);
    setReplyText('');
    setReplyAttachment('');
    try {
      const msgs = await fetchTicketMessages(ticket.id, email || currentUser?.email);
      if (isMountedRef.current) {
        setChatMessages(msgs);
      }
    } catch {
      if (isMountedRef.current) {
        setChatMessages([]);
      }
    } finally {
      if (isMountedRef.current) {
        setChatLoading(false);
        setTimeout(() => {
          chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    }
  };

  // Send reply in ticket thread
  const handleSendThreadReply = async () => {
    if (!activeChatTicket || (!replyText.trim() && !replyAttachment)) return;

    setSendingReply(true);
    try {
      const res = await sendTicketMessage(activeChatTicket.id, {
        message: replyText.trim() || (replyAttachment ? 'Sent an attachment' : ''),
        attachmentUrl: replyAttachment || undefined,
        senderName: currentUser?.name || name || 'Customer',
        email: currentUser?.email || email,
      });

      if (res.success && res.message) {
        setChatMessages((prev) => [...prev, res.message]);
        setReplyText('');
        setReplyAttachment('');
        setTimeout(() => {
          chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      showToast('error', 'Failed to Send', err.message || 'Error sending reply');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-transparent">
      <div className="space-y-2 sm:space-y-2 w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-2 pb-2 sm:pb-2">
        
        {/* Top Header & Fast Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WhatsApp Direct */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-400 active:scale-[0.99] transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
              <MessageCircle size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Fastest Response (24/7)</span>
              <h3 className="text-xs font-black text-slate-900">WhatsApp Live Chat</h3>
              <p className="text-[11px] font-mono text-slate-500">{officialPhone}</p>
            </div>
          </a>

          {/* Email Support */}
          <a
            href={mailUrl}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 active:scale-[0.99] transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
              <Mail size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Official Inquiries</span>
              <h3 className="text-xs font-black text-slate-900">Official Support Email</h3>
              <p className="text-[11px] text-slate-500 truncate">{supportEmail}</p>
            </div>
          </a>
        </div>

        {/* Navigation Tabs: Submit Request vs My Inquiries */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('new_ticket')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'new_ticket'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={15} />
            <span>Submit a Support Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_tickets')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'my_tickets'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ticket size={15} />
            <span>My Support Tickets</span>
            {myInquiries.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                {myInquiries.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: New Ticket Submission Form */}
        {activeTab === 'new_ticket' && (
          <div className="space-y-4">
            {/* Success Ticket Alert Banner (if newly created) */}
            <AnimatePresence>
              {createdTicket && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={22} className="shrink-0" />
                      <h4 className="font-black text-sm">Support Ticket Created Successfully!</h4>
                    </div>
                    <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-200/80 text-emerald-900">
                      #{createdTicket.ticketNumber || createdTicket.id}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Our admin team is notified and reviewing your ticket. You can open live chat thread to view updates and send additional details.
                  </p>
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenChat(createdTicket)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      <MessageSquare size={14} />
                      <span>Open Live Chat Thread</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatedTicket(null)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50 cursor-pointer transition-colors"
                    >
                      Submit Another Ticket
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Template Picker */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <Sparkles size={16} className="text-amber-500" />
                <span>Quick Issue Presets (Click to autofill):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_ISSUE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-left transition-all text-xs cursor-pointer flex items-start justify-between group"
                  >
                    <div>
                      <span className="font-bold text-slate-900 group-hover:text-indigo-700 block text-[11px]">
                        {tmpl.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Category: {tmpl.category} • {tmpl.priority}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* In-App Contact Message Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <HelpCircle size={17} className="text-indigo-600" />
                    <span>Submit a Support Request / Message</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Our team receives this directly and will respond in real-time.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                  Priority System
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Contact Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="gamer@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Phone & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 98XXXXXXXX"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-900 font-mono placeholder:text-slate-400 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inquiry Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-hidden transition-all cursor-pointer"
                    >
                      <option value="Order Issue">Order Issue (Status / Delay)</option>
                      <option value="Payment Verification">Payment &amp; QR Verification</option>
                      <option value="Game Top-Up">Game Top-Up &amp; UID Help</option>
                      <option value="Account Help">Account &amp; Password Reset</option>
                      <option value="General Inquiry">General Inquiry / Feedback</option>
                    </select>
                  </div>
                </div>

                {/* Priority Selector Pill Buttons */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Urgency / Priority Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('NORMAL')}
                      className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        priority === 'NORMAL'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Normal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('HIGH')}
                      className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        priority === 'HIGH'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
                      }`}
                    >
                      <AlertTriangle size={13} />
                      <span>High</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('URGENT')}
                      className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        priority === 'URGENT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70'
                      }`}
                    >
                      <Flame size={13} />
                      <span>Urgent 🔥</span>
                    </button>
                  </div>
                </div>

                {/* Order ID & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Related Order ID (Optional)</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g. GHN-10492"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-900 font-mono placeholder:text-slate-400 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your question..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Message Details */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Detailed Message *</label>
                    <span className="text-[11px] text-slate-400 font-mono">{message.length} chars</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question, Player UID, payment transaction reference, or issue in detail..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Attachment Upload (Cloudflare R2) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attach Screenshot / Payment Proof (Optional)</label>
                  
                  {attachmentUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                      <img
                        src={attachmentUrl}
                        alt="Attachment preview"
                        className="w-14 h-14 object-cover rounded-xl border border-indigo-200 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-extrabold text-indigo-950 block">File Attached</span>
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>View Full Image</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachmentUrl('')}
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200"
                        title="Remove Attachment"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        id="ticket-file-upload"
                      />
                      <label
                        htmlFor="ticket-file-upload"
                        className={`py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          isUploading ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                            <span>Uploading Image ({uploadProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Paperclip size={14} className="text-indigo-600" />
                            <span>Attach Payment Receipt / Error Screenshot</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting || isUploading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Submit Official Support Ticket</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: My Support Tickets & Interactive Thread */}
        {activeTab === 'my_tickets' && (
          <div className="space-y-3">
            {/* Search filter for user's tickets */}
            {myInquiries.length > 0 && (
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search your tickets by ticket number, order ID, or subject..."
                  className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all shadow-xs"
                />
              </div>
            )}

            {displayedInquiries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Ticket size={24} />
                </div>
                <h4 className="text-sm font-black text-slate-900">No Support Tickets Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {chatSearch
                    ? 'No tickets match your search keyword.'
                    : 'You have not submitted any support tickets yet. Click "Submit a Support Request" above to send one.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_ticket')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send size={13} />
                  <span>Create New Ticket</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedInquiries.map((inq, idx) => {
                  const isReplied = inq.status === 'replied' || inq.status === 'resolved' || !!inq.adminReply;
                  return (
                    <div
                      key={`contact-inq-${inq.id || idx}-${idx}`}
                      className="p-4 sm:p-5 rounded-3xl border border-slate-200 bg-white space-y-3.5 text-xs shadow-xs hover:border-indigo-300 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-indigo-700 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
                            {inq.ticketNumber || inq.id}
                          </span>
                          <span className="font-bold text-slate-800">{inq.category || 'Support'}</span>
                          {inq.priority === 'URGENT' && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[10px] flex items-center gap-1">
                              <Flame size={10} />
                              <span>Urgent</span>
                            </span>
                          )}
                          {inq.orderId && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] text-slate-700">
                              Order #{inq.orderId}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              inq.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isReplied
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inq.status === 'resolved'
                              ? '✅ Resolved'
                              : isReplied
                              ? '💬 Admin Replied'
                              : '⏳ Under Review'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenChat(inq)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <MessageSquare size={13} />
                            <span>Live Thread</span>
                          </button>
                        </div>
                      </div>

                      {/* User's Message */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-xs">{inq.subject || 'Customer Support Request'}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(inq.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{inq.message}</p>
                        
                        {inq.attachmentUrl && (
                          <div className="pt-1">
                            <a
                              href={inq.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl text-[11px] text-indigo-700 font-bold hover:bg-indigo-50 transition-colors"
                            >
                              <ImageIcon size={13} />
                              <span>View Attached Image</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Admin's Response Preview */}
                      {inq.adminReply ? (
                        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-black text-emerald-900 flex items-center gap-1.5">
                              <ShieldCheck size={15} className="text-emerald-600" />
                              <span>Verified Admin Reply ({inq.repliedBy || 'Support Team'})</span>
                            </span>
                            {inq.repliedAt && (
                              <span className="text-[10px] text-emerald-700 font-medium">
                                {new Date(inq.repliedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-emerald-900 leading-relaxed whitespace-pre-wrap">
                            {inq.adminReply}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-amber-900 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock size={15} className="shrink-0 text-amber-600" />
                            <span>Admin reviewing. Click "Live Thread" to chat or add more details.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenChat(inq)}
                            className="font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                          >
                            Open Thread
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Support Working Hours & Address Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Support Hours &amp; Location</h3>

          <div className="space-y-2.5 text-slate-600">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-indigo-600 shrink-0" />
              <span>
                Support Hours: <strong>7:00 AM – 11:00 PM (NPT)</strong>, 7 Days a Week
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin size={16} className="text-rose-500 shrink-0" />
              <span>
                Office: <strong>{address}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Support Ticket Chat Thread Modal */}
      <AnimatePresence>
        {activeChatTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-xl w-full h-[620px] max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-black text-indigo-100">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">
                        Ticket #{activeChatTicket.ticketNumber || activeChatTicket.id}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                        {activeChatTicket.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-200 truncate max-w-xs">
                      {activeChatTicket.subject || 'Customer Support Request'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveChatTicket(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Thread Messages Area */}
              <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
                {chatLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  /* If no messages yet, show original message */
                  <div className="space-y-3">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>{activeChatTicket.userName} (You)</span>
                        <span>{new Date(activeChatTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{activeChatTicket.message}</p>
                    </div>

                    {activeChatTicket.adminReply && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 ml-6 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-black text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span>{activeChatTicket.repliedBy || 'Unx Games Support'}</span>
                          </span>
                          <span>{activeChatTicket.repliedAt ? new Date(activeChatTicket.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{activeChatTicket.adminReply}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isAdmin = msg.senderType === 'ADMIN';
                    return (
                      <div
                        key={`contact-chat-msg-${msg.id || idx}-${idx}`}
                        className={`flex flex-col ${isAdmin ? 'items-start mr-8' : 'items-end ml-8'}`}
                      >
                        <div
                          className={`rounded-2xl p-3.5 text-xs shadow-2xs space-y-1.5 max-w-full ${
                            isAdmin
                              ? 'bg-white border border-slate-200 text-slate-900'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          <div className={`flex items-center justify-between gap-3 text-[10px] ${isAdmin ? 'text-indigo-700 font-extrabold' : 'text-indigo-200'}`}>
                            <span className="flex items-center gap-1">
                              {isAdmin && <ShieldCheck size={13} className="text-indigo-600 shrink-0" />}
                              <span>{msg.senderName || (isAdmin ? 'Support Agent' : 'You')}</span>
                            </span>
                            <span className="opacity-80">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.message}</p>

                          {msg.attachmentUrl && (
                            <div className="pt-1">
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 p-1 rounded-xl text-[11px] font-bold ${
                                  isAdmin ? 'bg-slate-100 text-indigo-700' : 'bg-indigo-700 text-white'
                                }`}
                              >
                                <ImageIcon size={13} />
                                <span>Attached Image</span>
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input & Attachment Area */}
              <div className="p-3.5 bg-white border-t border-slate-200 space-y-2 shrink-0">
                {replyAttachment && (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
                    <img
                      src={replyAttachment}
                      alt="Attachment"
                      className="w-10 h-10 rounded-lg object-cover bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[11px] font-bold text-indigo-900 flex-1">Image Attached</span>
                    <button
                      type="button"
                      onClick={() => setReplyAttachment('')}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={replyFileInputRef}
                    onChange={handleReplyFileUpload}
                    className="hidden"
                    id="reply-file-upload"
                  />
                  <label
                    htmlFor="reply-file-upload"
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors shrink-0"
                    title="Attach Image"
                  >
                    <Paperclip size={16} />
                  </label>

                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message to support staff..."
                    className="flex-1 bg-slate-100 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (replyText.trim() || replyAttachment)) {
                        handleSendThreadReply();
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={sendingReply || (!replyText.trim() && !replyAttachment)}
                    onClick={handleSendThreadReply}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition-all shrink-0"
                  >
                    {sendingReply ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ContactUsPage;
