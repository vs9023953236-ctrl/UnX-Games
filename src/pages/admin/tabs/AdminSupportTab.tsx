import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { SupportInquiry, SupportMessageItem } from '../../../types';
import { uploadImage } from '../../../services/api';

import {
  MessageSquareText,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Filter,
  User,
  Sparkles,
  Ticket,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  X,
  Paperclip,
  Image as ImageIcon,
  Flame,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_CANNED_REPLIES = [
  'Namaste! Your payment has been verified and diamonds/UC have been credited to your Player ID. Enjoy gaming! 🔥',
  'We checked your order. Please confirm your exact Player UID and Zone/Server ID so our team can complete delivery.',
  'Your payment receipt was verified. Your top-up order is now marked as Completed.',
  'Please provide a clearer screenshot of your payment receipt voucher or transaction reference ID.',
  'Your inquiry has been investigated and resolved. If you need any further assistance, feel free to contact us!',
];

export const AdminSupportTab: React.FC = () => {
  const {
    inquiries,
    replyToInquiry,
    updateInquiryStatus,
    deleteInquiry,
    clearAllInquiries,
    fetchTicketMessages,
    sendTicketMessage,
    setAdminTab,
    setAdminSelectedOrderId,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'STORE_MANAGER' || isSuperAdmin;

  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'replied' | 'resolved'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Active expanded ticket for replying
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'replied' | 'resolved'>('replied');
  const [replyAttachment, setReplyAttachment] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<SupportInquiry | null>(null);

  // Live Chat Thread Modal
  const [liveChatTicket, setLiveChatTicket] = useState<SupportInquiry | null>(null);
  const [threadMessages, setThreadMessages] = useState<SupportMessageItem[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadReplyText, setThreadReplyText] = useState('');
  const [threadReplyAttachment, setThreadReplyAttachment] = useState('');
  const [sendingThreadMessage, setSendingThreadMessage] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox for image preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Statistics
  const totalCount = inquiries.length;
  const pendingCount = inquiries.filter((i) => i.status === 'pending' || !i.adminReply).length;
  const urgentCount = inquiries.filter((i) => i.priority === 'URGENT' && i.status !== 'resolved').length;
  const repliedCount = inquiries.filter((i) => i.status === 'replied' && i.adminReply).length;
  const resolvedCount = inquiries.filter((i) => i.status === 'resolved').length;

  // Filtered inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    // Search matching
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = inq.userName.toLowerCase().includes(q);
      const matchEmail = inq.userEmail.toLowerCase().includes(q);
      const matchPhone = inq.userPhone?.toLowerCase().includes(q);
      const matchTicket = inq.ticketNumber?.toLowerCase().includes(q) || inq.id.toLowerCase().includes(q);
      const matchOrder = inq.orderId?.toLowerCase().includes(q);
      const matchMsg = inq.message.toLowerCase().includes(q);
      const matchSubject = inq.subject?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchTicket && !matchOrder && !matchMsg && !matchSubject) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'pending') {
      if (inq.status !== 'pending' && inq.adminReply) return false;
    } else if (statusFilter === 'replied') {
      if (inq.status !== 'replied' || !inq.adminReply) return false;
    } else if (statusFilter === 'resolved') {
      if (inq.status !== 'resolved') return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && (inq.priority || 'NORMAL') !== priorityFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && inq.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  const handleOpenReply = (ticket: SupportInquiry) => {
    setSelectedTicketId(ticket.id);
    setReplyText(ticket.adminReply || '');
    setReplyStatus(ticket.status === 'resolved' ? 'resolved' : 'replied');
    setReplyAttachment('');
  };

  const handleSendReply = async (ticket: SupportInquiry) => {
    if (!replyText.trim() && !replyAttachment) {
      showToast('error', 'Reply Required', 'Please enter a reply message before sending.');
      return;
    }

    setIsSubmittingReply(true);
    const adminInfo = currentUser
      ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
      : undefined;

    const res = await replyToInquiry(ticket.id, replyText.trim(), replyStatus, adminInfo, replyAttachment || undefined);
    setIsSubmittingReply(false);

    if (res.success) {
      setSelectedTicketId(null);
      setReplyText('');
      setReplyAttachment('');
    }
  };

  const [togglingStatus, setTogglingStatus] = useState<Set<string>>(new Set());

  const handleStatusChange = async (ticket: SupportInquiry, newStatus: SupportInquiry['status']) => {
    if (togglingStatus.has(ticket.id)) return;
    setTogglingStatus(prev => new Set(prev).add(ticket.id));
    try {
      const adminInfo = currentUser
        ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
        : undefined;
      await updateInquiryStatus(ticket.id, newStatus, adminInfo);
    } finally {
      setTogglingStatus(prev => {
        const next = new Set(prev);
        next.delete(ticket.id);
        return next;
      });
    }
  };

  const handleDelete = (ticket: SupportInquiry) => {
    setTicketToDelete(ticket);
  };

  const openOrder = (orderId: string) => {
    setAdminSelectedOrderId(orderId);
    setAdminTab('order_detail');
  };

  // Open live chat thread modal
  const handleOpenLiveChat = async (ticket: SupportInquiry) => {
    setLiveChatTicket(ticket);
    setThreadLoading(true);
    setThreadReplyText('');
    setThreadReplyAttachment('');
    try {
      const msgs = await fetchTicketMessages(ticket.id);
      setThreadMessages(msgs);
    } catch {
      setThreadMessages([]);
    } finally {
      setThreadLoading(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  // Send message from within Live Chat Modal
  const handleSendThreadMessage = async () => {
    if (!liveChatTicket || (!threadReplyText.trim() && !threadReplyAttachment)) return;

    setSendingThreadMessage(true);
    try {
      const res = await sendTicketMessage(liveChatTicket.id, {
        message: threadReplyText.trim() || (threadReplyAttachment ? 'Attached an image' : ''),
        attachmentUrl: threadReplyAttachment || undefined,
        senderName: currentUser?.name || 'Unx Games Support',
      });

      if (res.success && res.message) {
        setThreadMessages((prev) => [...prev, res.message]);
        setThreadReplyText('');
        setThreadReplyAttachment('');
        setTimeout(() => {
          chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      showToast('error', 'Send Error', err.message || 'Failed to send reply');
    } finally {
      setSendingThreadMessage(false);
    }
  };

  // Handle file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isModal: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'support-attachments');
      if (isModal) {
        setThreadReplyAttachment(url);
      } else {
        setReplyAttachment(url);
      }
      showToast('success', 'Image Uploaded', 'Attachment added to reply.');
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="w-full space-y-3 sm:space-y-3.5">
      {/* 1. Header with Live Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-red-600 text-xs font-black uppercase tracking-wider">
            <MessageSquareText size={16} />
            <span>Support &amp; Inquiries Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Customer Support Tickets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-channel ticket management with priority levels, image attachments, and threaded replies.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {urgentCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black flex items-center gap-1.5 shadow-2xs">
              <Flame size={14} className="text-rose-600 animate-bounce" />
              <span>{urgentCount} Urgent</span>
            </span>
          )}

          <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendingCount} Pending</span>
          </span>

          {isConfirmingClear ? (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl transition-all">
              <button
                onClick={async () => {
                  const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
                  await clearAllInquiries(adminInfo);
                  setIsConfirmingClear(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setIsConfirmingClear(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            inquiries.length > 0 && isManager && (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                title="Delete all support tickets"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. Top Stats Filters Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">Total Tickets</span>
          <div className="text-2xl font-black mt-1">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50/70 text-rose-900 border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Pending Action</span>
          <div className="text-2xl font-black mt-1">{pendingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('replied')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'replied'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-blue-50/70 text-blue-900 border-blue-200 hover:border-blue-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Replied (Open)</span>
          <div className="text-2xl font-black mt-1">{repliedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'resolved'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Resolved</span>
          <div className="text-2xl font-black mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ticket ID, Customer Name, Email, Phone, Order ID, or Keyword..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-red-600 w-full sm:w-auto cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="URGENT">🔥 Urgent</option>
            <option value="HIGH">⚠️ High</option>
            <option value="NORMAL">Normal</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-red-600 w-full sm:w-auto cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Order Issue">Order Issue</option>
            <option value="Payment Verification">Payment Verification</option>
            <option value="Game Top-Up">Game Top-Up</option>
            <option value="Account Help">Account Help</option>
            <option value="General Inquiry">General Inquiry</option>
          </select>
        </div>
      </div>

      {/* 4. Support Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <MessageSquareText size={26} />
          </div>
          <h3 className="text-base font-black text-slate-900">No Support Inquiries Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No tickets match your search filters. Try clearing search keywords.'
              : 'All customer support inquiries have been handled or no tickets submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((ticket, idx) => {
            const isSelected = selectedTicketId === ticket.id;
            const isReplied = ticket.status === 'replied' || ticket.status === 'resolved' || !!ticket.adminReply;
            const whatsappNumber = ticket.userPhone ? ticket.userPhone.replace(/^(\+977|977)/, '') : '';
            const whatsappLink = whatsappNumber
              ? `https://wa.me/977${whatsappNumber}?text=${encodeURIComponent(
                  `Namaste ${ticket.userName}, this is Unx Games Support regarding your ticket #${
                    ticket.ticketNumber || ticket.id
                  }.`
                )}`
              : null;

            return (
              <div
                key={`support-ticket-${ticket.id || idx}-${idx}`}
                className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-xs transition-all ${
                  ticket.priority === 'URGENT' && ticket.status !== 'resolved'
                    ? 'border-rose-400 ring-2 ring-rose-500/10'
                    : ticket.status === 'pending' && !ticket.adminReply
                    ? 'border-amber-300 ring-2 ring-amber-500/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-mono font-black text-xs border border-red-100">
                      {ticket.ticketNumber || ticket.id}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                      {ticket.category || 'General'}
                    </span>

                    {/* Priority Badge */}
                    {ticket.priority === 'URGENT' ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] flex items-center gap-1">
                        <Flame size={11} className="text-rose-600" />
                        <span>URGENT</span>
                      </span>
                    ) : ticket.priority === 'HIGH' ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[10px] flex items-center gap-1">
                        <AlertTriangle size={11} className="text-amber-700" />
                        <span>HIGH</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                        Normal
                      </span>
                    )}

                    {ticket.orderId && (
                      <button
                        onClick={() => openOrder(ticket.orderId!)}
                        className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-mono font-bold text-[11px] flex items-center gap-1 hover:bg-purple-100 cursor-pointer"
                      >
                        <span>Order: {ticket.orderId}</span>
                        <ExternalLink size={10} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={ticket.status}
                      disabled={togglingStatus.has(ticket.id)}
                      onChange={(e) => handleStatusChange(ticket, e.target.value as any)}
                      className={`text-xs font-black px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : ticket.status === 'replied'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      <option value="pending">⏳ Pending Review</option>
                      <option value="in_review">🔍 In Review</option>
                      <option value="replied">💬 Replied (Open)</option>
                      <option value="resolved">✅ Resolved</option>
                    </select>

                    <button
                      onClick={() => handleDelete(ticket)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Ticket"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Customer Details & Quick Contact Bar */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-2xl text-xs border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                      <User size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{ticket.userName}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(ticket.createdAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 truncate">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${ticket.userEmail}`}
                      className="text-slate-700 hover:text-red-600 truncate font-medium underline"
                    >
                      {ticket.userEmail}
                    </a>
                  </div>

                  <div className="flex items-center justify-start md:justify-end gap-2">
                    {ticket.userPhone && (
                      <>
                        <a
                          href={`tel:${ticket.userPhone}`}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-red-600 flex items-center gap-1 font-mono font-bold text-[11px] shadow-2xs"
                        >
                          <Phone size={12} />
                          <span>{ticket.userPhone}</span>
                        </a>

                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 font-bold text-[11px] shadow-2xs"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Customer Message Details */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-black text-slate-900">{ticket.subject || 'Customer Support Request'}</p>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {ticket.message}
                  </div>

                  {ticket.attachmentUrl && (
                    <div className="pt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setLightboxImage(ticket.attachmentUrl!)}
                        className="inline-flex items-center gap-2 p-2 bg-slate-100 hover:bg-red-50 border border-slate-200 rounded-xl text-xs text-red-700 font-bold transition-all cursor-pointer"
                      >
                        <ImageIcon size={14} />
                        <span>View Customer Screenshot</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Existing Admin Reply Banner (if already replied) */}
                {ticket.adminReply && !isSelected && (
                  <div className="mt-3.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-black text-emerald-950 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Admin Reply by {ticket.repliedBy || 'Unx Games Support'}</span>
                      </span>
                      {ticket.repliedAt && (
                        <span className="text-emerald-700 text-[10px]">
                          {new Date(ticket.repliedAt).toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap">{ticket.adminReply}</p>
                  </div>
                )}

                {/* Action Buttons: Open Live Chat or Quick Reply Form */}
                {!isSelected ? (
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {ticket.adminReply ? 'Customer received reply. Ready for follow-up.' : 'Waiting for admin response.'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenLiveChat(ticket)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Open interactive threaded chat"
                      >
                        <MessageSquare size={14} />
                        <span>Interactive Thread</span>
                      </button>
                      <button
                        onClick={() => handleOpenReply(ticket)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Send size={13} />
                        <span>{ticket.adminReply ? 'Edit / Send Reply' : 'Reply to Customer'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Reply Form */
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-red-700 flex items-center gap-1.5">
                        <MessageSquareText size={15} />
                        <span>Write Official Reply to {ticket.userName}</span>
                      </h4>
                      <button
                        onClick={() => setSelectedTicketId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Quick Canned Responses Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        ⚡ Quick Canned Templates:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_CANNED_REPLIES.map((canned, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setReplyText(canned)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-[10px] font-medium text-left truncate max-w-xs transition-colors cursor-pointer"
                          >
                            {canned.slice(0, 45)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reply Textarea */}
                    <div>
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Type your reply to ${ticket.userName} (notifies user immediately)...`}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all resize-none font-medium"
                      />
                    </div>

                    {/* Attachment Upload in Reply */}
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        ref={replyFileInputRef}
                        onChange={(e) => handleFileUpload(e, false)}
                        className="hidden"
                        id={`reply-file-${ticket.id}`}
                      />
                      <label
                        htmlFor={`reply-file-${ticket.id}`}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Paperclip size={13} className="text-red-600" />
                        <span>{isUploading ? 'Uploading...' : 'Attach Image Voucher / Proof'}</span>
                      </label>

                      {replyAttachment && (
                        <div className="flex items-center gap-1.5 text-xs text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-xl">
                          <span>Attached</span>
                          <button
                            type="button"
                            onClick={() => setReplyAttachment('')}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status selection and Submit button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-bold text-slate-600">Mark Ticket As:</span>
                        <select
                          value={replyStatus}
                          onChange={(e) => setReplyStatus(e.target.value as any)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="replied">💬 Replied (Open)</option>
                          <option value="resolved">✅ Resolved (Complete)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketId(null)}
                          className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReply || (!replyText.trim() && !replyAttachment)}
                          onClick={() => handleSendReply(ticket)}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 active:scale-[0.98] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmittingReply ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send size={13} />
                              <span>Send Official Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Attachment Images */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X size={20} />
              </button>
              <img
                src={lightboxImage}
                alt="Enlarged screenshot"
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl bg-slate-900"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {ticketToDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Delete Ticket?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Are you sure you want to permanently delete support ticket{' '}
                    <span className="font-extrabold text-slate-800">
                      #{ticketToDelete.ticketNumber || ticketToDelete.id}
                    </span>{' '}
                    from {ticketToDelete.userName}?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setTicketToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const adminInfo = currentUser
                      ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
                      : undefined;
                    await deleteInquiry(ticketToDelete.id, adminInfo);
                    if (selectedTicketId === ticketToDelete.id) setSelectedTicketId(null);
                    setTicketToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Interactive Live Chat Thread Modal */}
      <AnimatePresence>
        {liveChatTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-xl w-full h-[640px] max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-white">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">{liveChatTicket.userName}</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-red-100">
                      Ticket #{liveChatTicket.ticketNumber || liveChatTicket.id.slice(0, 8)} • {liveChatTicket.category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLiveChatTicket(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Thread Messages Area */}
              <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
                {threadLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>{liveChatTicket.userName}</span>
                        <span>{new Date(liveChatTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{liveChatTicket.message}</p>
                    </div>

                    {liveChatTicket.adminReply && (
                      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl p-4 text-xs ml-6 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-red-100">
                          <span>{liveChatTicket.repliedBy || 'Unx Games Support'}</span>
                          <span>{liveChatTicket.repliedAt ? new Date(liveChatTicket.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{liveChatTicket.adminReply}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  threadMessages.map((msg, idx) => {
                    const isAdmin = msg.senderType === 'ADMIN';
                    return (
                      <div
                        key={`support-thread-msg-${msg.id || idx}-${idx}`}
                        className={`flex flex-col ${isAdmin ? 'items-end ml-8' : 'items-start mr-8'}`}
                      >
                        <div
                          className={`rounded-2xl p-3.5 text-xs shadow-2xs space-y-1.5 max-w-full ${
                            isAdmin
                              ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className={`flex items-center justify-between gap-3 text-[10px] ${isAdmin ? 'text-red-100' : 'text-slate-500 font-bold'}`}>
                            <span>{msg.senderName || (isAdmin ? 'Support Staff' : liveChatTicket.userName)}</span>
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
                                  isAdmin ? 'bg-red-700 text-white' : 'bg-slate-100 text-red-700'
                                }`}
                              >
                                <ImageIcon size={13} />
                                <span>View Attachment</span>
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

              {/* Admin Live Reply Form */}
              <div className="p-3.5 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
                {/* Quick Canned Suggestions */}
                <div className="flex flex-wrap gap-1">
                  {QUICK_CANNED_REPLIES.slice(0, 3).map((canned, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setThreadReplyText(canned)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-[10px] font-medium transition-colors cursor-pointer truncate max-w-[200px]"
                    >
                      {canned.slice(0, 30)}...
                    </button>
                  ))}
                </div>

                {threadReplyAttachment && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs">
                    <img
                      src={threadReplyAttachment}
                      alt="Attachment"
                      className="w-10 h-10 rounded-lg object-cover bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[11px] font-bold text-red-900 flex-1">Image Attached</span>
                    <button
                      type="button"
                      onClick={() => setThreadReplyAttachment('')}
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
                    ref={modalFileInputRef}
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                    id="thread-file-upload"
                  />
                  <label
                    htmlFor="thread-file-upload"
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-red-600 cursor-pointer transition-colors shrink-0"
                    title="Attach Image"
                  >
                    <Paperclip size={16} />
                  </label>

                  <input
                    type="text"
                    value={threadReplyText}
                    onChange={(e) => setThreadReplyText(e.target.value)}
                    placeholder="Type official reply to customer..."
                    className="flex-1 bg-slate-100 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (threadReplyText.trim() || threadReplyAttachment)) {
                        handleSendThreadMessage();
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={sendingThreadMessage || (!threadReplyText.trim() && !threadReplyAttachment)}
                    onClick={handleSendThreadMessage}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition-all shrink-0"
                  >
                    {sendingThreadMessage ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Reply</span>
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
export default AdminSupportTab;
