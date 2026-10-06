import React, { useState } from 'react';
import { Order, CancellationRequest } from '../../types';
import { formatNPR, formatDate, formatTimeAgo } from '../../utils/formatters';
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  MessageCircle,
  Eye,
  X,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RefundTrackerCardProps {
  order: Order;
  cancellationRequest?: CancellationRequest | null;
  onWhatsAppHelp?: () => void;
  whatsappUrl?: string;
}

export const RefundTrackerCard: React.FC<RefundTrackerCardProps> = ({
  order,
  cancellationRequest,
  whatsappUrl,
}) => {
  const [copiedRef, setCopiedRef] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);

  const rawStatus = (cancellationRequest?.refundStatus || order.refundStatus || 'refund_pending').toLowerCase();
  const isRejected =
    rawStatus === 'rejected' ||
    cancellationRequest?.status === 'REJECTED' ||
    order.cancellationStatus === 'rejected';
  const isCompleted =
    rawStatus === 'refunded' ||
    rawStatus === 'completed';
  const isProcessing =
    rawStatus === 'processing' ||
    (cancellationRequest?.status === 'APPROVED' && !isCompleted && !isRejected);
  const isPending = !isCompleted && !isProcessing && !isRejected;

  const refundAmount =
    cancellationRequest?.refundAmount ||
    order.refundAmount ||
    order.amount;

  const refundMethod =
    cancellationRequest?.refundMethod ||
    order.refundMethod ||
    (order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'eSewa');

  const refundAccountNo =
    cancellationRequest?.refundAccountNumber ||
    order.refundAccountNumber ||
    order.userPhone ||
    '';

  const refundAccountName =
    cancellationRequest?.refundAccountName ||
    order.refundAccountName ||
    order.userName ||
    order.customerName ||
    '';

  const refundReference =
    cancellationRequest?.refundReference ||
    order.refundReference ||
    '';

  const refundProof =
    cancellationRequest?.refundProofUrl ||
    order.refundProofUrl ||
    '';

  const refundNote =
    cancellationRequest?.adminNote ||
    order.refundNote ||
    '';

  const rejectionReason =
    cancellationRequest?.rejectionReason ||
    order.adminRejectionReason ||
    order.rejectionReason ||
    '';

  const handleCopyRef = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Stepper state calculations
  let currentStep = 1;
  if (isPending) currentStep = 1;
  else if (isProcessing) currentStep = 3;
  else if (isCompleted) currentStep = 4;
  else if (isRejected) currentStep = 4;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header Banner */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100'
            : isRejected
            ? 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-100'
            : isProcessing
            ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100'
            : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-emerald-600 text-white shadow-xs'
                : isRejected
                ? 'bg-rose-600 text-white shadow-xs'
                : isProcessing
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                : 'bg-amber-500 text-white shadow-xs'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 size={16} />
            ) : isRejected ? (
              <XCircle size={16} />
            ) : (
              <RotateCcw size={16} className={isProcessing ? 'animate-spin' : ''} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-slate-900">
                {isCompleted
                  ? 'Refund Completed'
                  : isRejected
                  ? 'Cancellation / Refund Rejected'
                  : isProcessing
                  ? 'Refund In Processing'
                  : 'Refund Request Under Review'}
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 text-slate-700 font-bold uppercase">
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.2">
              {isCompleted
                ? 'Rounds returned back to your payment wallet.'
                : isRejected
                ? 'Request was reviewed and declined by admin.'
                : isProcessing
                ? 'Approved by admin, transferring funds via gateway.'
                : 'Our finance team is verifying your payment details.'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 pl-2">
          <span className="text-xs sm:text-sm font-black font-mono text-slate-900 block">
            {formatNPR(refundAmount)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">Refund Total</span>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1 text-slate-700">
            <Sparkles size={11} className="text-orange-600" />
            <span>Refund Milestones</span>
          </span>
          <span className="text-[9px] text-slate-400 font-mono">Real-time Step {currentStep}/4</span>
        </div>

        {/* Stepped Bar */}
        <div className="grid grid-cols-4 gap-1.5">
          <div
            className={`h-2 rounded-full transition-all ${
              isCompleted
                ? 'bg-emerald-500'
                : isRejected
                ? 'bg-rose-500'
                : currentStep >= 1
                ? 'bg-orange-500'
                : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-2 rounded-full transition-all ${
              isCompleted
                ? 'bg-emerald-500'
                : isRejected
                ? 'bg-rose-500'
                : currentStep >= 2
                ? 'bg-orange-500'
                : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-2 rounded-full transition-all ${
              isCompleted
                ? 'bg-emerald-500'
                : isRejected
                ? 'bg-rose-500'
                : currentStep >= 3
                ? 'bg-orange-500'
                : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-2 rounded-full transition-all ${
              isCompleted
                ? 'bg-emerald-500'
                : isRejected
                ? 'bg-rose-600'
                : 'bg-slate-200'
            }`}
          />
        </div>

        {/* Step Labels */}
        <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-slate-500 text-center">
          <span className={isCompleted ? 'text-emerald-700 font-extrabold' : isRejected ? 'text-rose-700 font-extrabold' : currentStep >= 1 ? 'text-orange-700 font-extrabold' : 'text-slate-400'}>
            1. Requested
          </span>
          <span className={isCompleted ? 'text-emerald-700 font-extrabold' : isRejected ? 'text-rose-700 font-extrabold' : currentStep >= 2 ? 'text-orange-700 font-extrabold' : 'text-slate-400'}>
            2. Reviewing
          </span>
          <span className={isCompleted ? 'text-emerald-700 font-extrabold' : isRejected ? 'text-rose-700 font-extrabold' : currentStep >= 3 ? 'text-orange-700 font-extrabold' : 'text-slate-400'}>
            3. Transferring
          </span>
          <span
            className={
              isCompleted
                ? 'text-emerald-700 font-extrabold'
                : isRejected
                ? 'text-rose-700 font-extrabold'
                : 'text-slate-400'
            }
          >
            {isRejected ? '4. Rejected' : '4. Completed'}
          </span>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="p-4 space-y-3">
        {/* Rejection Alert Box */}
        {isRejected && rejectionReason && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <AlertCircle size={14} className="shrink-0 text-rose-600" />
              <span>Admin Rejection Reason:</span>
            </div>
            <p className="pl-5 text-xs text-rose-700 leading-relaxed bg-white/70 p-2 rounded-lg border border-rose-100">
              &ldquo;{rejectionReason}&rdquo;
            </p>
          </div>
        )}

        {/* Success / Processing Note */}
        {isCompleted && (
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>Refund Successfully Settled</span>
            </div>
            <p className="pl-5 text-xs text-emerald-700 leading-relaxed">
              Rs. {refundAmount} has been credited to your {refundMethod} account ({refundAccountNo || 'registered'}).
              {refundNote && refundNote.trim().length > 2 && (
                <span className="block mt-1 font-semibold text-emerald-800">
                  Note: &ldquo;{refundNote.trim()}&rdquo;
                </span>
              )}
            </p>
          </div>
        )}

        {/* Refund Info Grid */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 divide-y divide-slate-100 text-xs">
          {/* Refund Receiving Wallet */}
          <div className="pb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <CreditCard size={12} className="text-red-600" />
              <span>Refund Destination</span>
            </span>
            <div className="text-right">
              <span className="font-bold text-slate-900 text-[11px]">
                {refundMethod} {refundAccountNo ? `(${refundAccountNo})` : ''}
              </span>
              {refundAccountName && (
                <span className="block text-[9px] text-slate-500 font-medium">
                  A/C Name: {refundAccountName}
                </span>
              )}
            </div>
          </div>

          {/* Refund Transaction Reference (If issued) */}
          {refundReference && (
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Refund Txn Ref ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  {refundReference}
                </span>
                <button
                  onClick={() => handleCopyRef(refundReference)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-200/50 cursor-pointer active:scale-95 transition-all"
                  title="Copy Transaction ID"
                >
                  {copiedRef ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* User Request Reason */}
          {cancellationRequest?.reason && (
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Cancellation Reason</span>
              <span className="font-medium text-slate-800 text-[11px] text-right">
                {cancellationRequest.reason}
              </span>
            </div>
          )}

          {/* Request Date */}
          <div className="pt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>Requested On</span>
            <span className="font-mono text-slate-600 font-medium">
              {cancellationRequest?.requestedAt
                ? formatDate(cancellationRequest.requestedAt)
                : formatDate(order.createdAt)}
            </span>
          </div>
        </div>

        {/* Refund Proof Screenshot Button (If Admin attached receipt) */}
        {refundProof && (
          <div className="pt-1">
            <button
              onClick={() => setShowProofModal(true)}
              className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-red-200/80 cursor-pointer active:scale-[0.98] transition-all"
            >
              <Eye size={13} />
              <span>View Official Refund Transfer Receipt</span>
            </button>
          </div>
        )}

        {/* WhatsApp Help Button */}
        {whatsappUrl && (
          <div className="pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
            >
              <MessageCircle size={14} />
              <span>Direct Refund Support on WhatsApp</span>
            </a>
          </div>
        )}
      </div>

      {/* Refund Proof Lightbox Modal */}
      <AnimatePresence>
        {showProofModal && refundProof && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
              onClick={() => setShowProofModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <h3 className="text-xs font-black text-slate-900">Refund Transfer Proof</h3>
                </div>
                <button
                  onClick={() => setShowProofModal(false)}
                  className="p-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 max-h-[60vh] flex items-center justify-center">
                <img
                  src={refundProof}
                  alt="Refund Transfer Proof"
                  className="max-h-[60vh] w-full object-contain"
                />
              </div>

              <div className="text-center pt-1">
                <p className="text-[10px] text-slate-500 font-medium">
                  Official payment receipt uploaded by Unx Games Admin
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
