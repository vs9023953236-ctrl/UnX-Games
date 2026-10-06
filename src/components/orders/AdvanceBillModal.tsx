import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Receipt,
  Gamepad2,
  Calendar,
  CheckCircle2,
  QrCode,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Order, AppSettings } from '../../types';
import { formatNPR, formatDisplayOrderId } from '../../utils/formatters';
import {
  OFFICIAL_R2_LOGO,
  PRIMARY_BRAND_NAME,
  LEGAL_COMPANY_NAME,
  BRAND_COMPANY_LINE,
  COPYRIGHT_NOTICE,
} from '../../utils/branding';
import { AppLogo } from '../common/AppLogo';
import { ModalPortal } from '../common/ModalPortal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AdvanceBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  appSettings?: AppSettings;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const AdvanceBillModal: React.FC<AdvanceBillModalProps> = ({
  isOpen,
  onClose,
  order,
  appSettings,
  showToast,
}) => {
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const displayOrderId = formatDisplayOrderId(order);
  const orderDate = (order.createdAt || (order as any).created_at)
    ? new Date(order.createdAt || (order as any).created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  // Comprehensive and resilient financial calculations covering all schema naming conventions
  const finalPaid = Number(
    order.finalAmount ??
    (order as any).final_amount ??
    order.amount ??
    (order as any).total_amount ??
    order.totalAmount ??
    (order as any).price ??
    (order as any).unit_price ??
    order.unitPrice ??
    0
  );

  const discount = Number(
    order.discount ??
    (order as any).discount_amount ??
    order.couponDiscount ??
    (order as any).coupon_discount ??
    0
  );

  const quantity = Math.max(1, Number(order.quantity || (order as any).qty || 1));

  const rawSubtotal = Number(
    (order as any).subtotal ??
    (order as any).original_price ??
    (order as any).package_price ??
    order.amount ??
    (order as any).total_amount ??
    order.totalAmount ??
    (order as any).price ??
    0
  );

  // Guarantee valid subtotal: Never show Rs. 0 when an amount was paid
  const subtotal = rawSubtotal > 0 && rawSubtotal >= finalPaid
    ? rawSubtotal
    : (finalPaid + discount > 0 ? finalPaid + discount : (finalPaid > 0 ? finalPaid : 0));

  const isCompleted = order.orderStatus === 'completed' || order.orderStatus === 'delivered' || (order as any).order_status === 'completed' || (order as any).order_status === 'delivered';

  const customerName = order.customerName || (order as any).customer_name || order.userName || (order as any).user_name || (order.userEmail ? order.userEmail.split('@')[0] : 'Valued Customer');
  const customerPhone = order.customerPhone || (order as any).customer_phone || order.userPhone || (order as any).user_phone;
  const customerEmail = order.userEmail || (order as any).user_email || (order as any).customer_email;
  const customerLocation = order.customerLocation || (order as any).customer_location || order.userLocation || (order as any).user_location || order.location;
  
  const productName = order.productName || (order as any).product_name || (order as any).product_name_snapshot || (order as any).game_name || 'Game Title';
  const packageName = order.packageName || (order as any).package_name || (order as any).package_name_snapshot || 'Top-Up Package';
  const gameUid = order.gameUserId || (order as any).game_user_id || (order as any).game_uid || order.gameUid || (order as any).player_id || order.playerId || 'N/A';
  const gameZone = order.gameZoneId || (order as any).game_zone_id || (order as any).game_server || order.zoneId || order.server || (order as any).region;
  const txnId = order.transactionId || (order as any).transaction_id || (order as any).payment_ref_id || (order as any).payment_reference;
  const paymentMethod = String(order.paymentMethod || (order as any).payment_method || 'esewa').toLowerCase();
  const rawStatus = String(order.orderStatus || (order as any).order_status || order.status || 'PENDING').toUpperCase();

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      if (showToast) showToast('success', 'Copied!', `${label} copied to clipboard.`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      if (showToast) showToast('info', 'Copy', text);
    }
  };

  // Download PDF
  const handleDownloadPdf = useCallback(async () => {
    if (!receiptCardRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const element = receiptCardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Center vertically if it fits on one page
      const margin = 10;
      const availableWidth = pdfWidth - margin * 2;
      const adjustedHeight = (imgProps.height * availableWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', margin, 15, availableWidth, adjustedHeight);
      pdf.save(`UnxGames_Bill_${displayOrderId}.pdf`);

      if (showToast) {
        showToast('success', 'Bill Downloaded!', `Official PDF invoice saved as UnxGames_Bill_${displayOrderId}.pdf`);
      }
    } catch (err) {
      console.error('Failed to generate PDF bill:', err);
      if (showToast) {
        showToast('error', 'Download Failed', 'Could not generate PDF. Please try saving as Image or use Print.');
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [displayOrderId, showToast]);

  // Download Image (PNG)
  const handleDownloadImage = useCallback(async () => {
    if (!receiptCardRef.current) return;
    setIsDownloadingImage(true);
    try {
      const element = receiptCardRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `UnxGames_Receipt_${displayOrderId}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (showToast) {
        showToast('success', 'Image Saved!', `Official receipt image saved to your downloads.`);
      }
    } catch (err) {
      console.error('Failed to save receipt image:', err);
      if (showToast) {
        showToast('error', 'Save Failed', 'Could not save receipt image.');
      }
    } finally {
      setIsDownloadingImage(false);
    }
  }, [displayOrderId, showToast]);

  // Trigger Native Print
  const handlePrint = useCallback(() => {
    try {
      window.print();
    } catch {
      if (showToast) {
        showToast('info', 'Print Bill', 'Please use your browser menu or press Ctrl+P to print.');
      }
    }
  }, [showToast]);

  // Share Bill
  const handleShare = async () => {
    const text = `Unx Games Official Tax Invoice & Receipt\nOrder Ref: ${displayOrderId}\nItem: ${order.productName} - ${order.packageName}\nAmount Paid: ${formatNPR(finalPaid)}\nStatus: ${order.orderStatus?.toUpperCase()}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Unx Games Bill - ${displayOrderId}`,
          text,
          url: window.location.href,
        });
      } catch {}
    } else {
      handleCopy(text, 'Bill Summary');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto no-print">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 my-auto"
          >
          {/* Top Bar with Mobile App UI/UX */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center">
                <Receipt size={16} />
              </div>
              <div>
                <h3 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span>Official E-Tax Invoice &amp; Bill</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Verified
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Ref: {displayOrderId}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Printable Bill View */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/70">
            {/* The Main High-End Printable Bill Card */}
            <div
              ref={receiptCardRef}
              id="printable-order-receipt"
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 text-slate-900 font-sans relative overflow-hidden"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {/* Watermark/Stamp for Completed / Paid Orders */}
              {isCompleted ? (
                <div className="absolute right-4 top-20 pointer-events-none opacity-[0.12] sm:opacity-[0.15] select-none rotate-[-18deg] border-4 border-emerald-700 text-emerald-700 font-black text-2xl sm:text-3xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl uppercase tracking-widest text-center">
                  PAID &amp; DELIVERED
                  <div className="text-[9px] sm:text-[10px] tracking-normal font-bold">UNX GAMES OFFICIAL</div>
                </div>
              ) : (
                <div className="absolute right-4 top-20 pointer-events-none opacity-[0.12] select-none rotate-[-18deg] border-4 border-amber-600 text-amber-600 font-black text-2xl sm:text-3xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl uppercase tracking-widest text-center">
                  OFFICIAL INVOICE
                  <div className="text-[9px] tracking-normal font-bold">UNX GAMES</div>
                </div>
              )}

              {/* 1. Header: Brand Logo, Company Info & Invoice Meta */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b-2 border-dashed border-slate-200">
                <div className="flex items-start gap-3">
                  {/* High Quality Official App Logo */}
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-0 bg-transparent">
                    <img
                      src={OFFICIAL_R2_LOGO}
                      alt="Unx Games"
                      className="w-full h-full object-contain rounded-2xl"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('unx.png')) {
                          target.src = OFFICIAL_R2_LOGO;
                        }
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                      {PRIMARY_BRAND_NAME}
                    </h2>
                    <p className="text-[11px] font-extrabold text-red-600 mt-1">
                      By {LEGAL_COMPANY_NAME}
                    </p>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                      {appSettings?.companyAddress || 'Deelasaini-6, Baitadi, Nepal'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500 font-mono mt-0.5">
                      {appSettings?.businessPan && (
                        <span>PAN: <strong className="text-slate-700">{appSettings.businessPan}</strong></span>
                      )}
                      {appSettings?.vatNumber && (
                        <span>VAT: <strong className="text-slate-700">{appSettings.vatNumber}</strong></span>
                      )}
                      {appSettings?.businessRegistrationNumber && (
                        <span>Reg: <strong className="text-slate-700">{appSettings.businessRegistrationNumber}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-slate-200/60 sm:border-none">
                  <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/70">
                    Tax Invoice / Bill
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                    <p>
                      <span className="text-slate-400 font-medium text-[11px]">Invoice No:</span>{' '}
                      <strong className="font-mono text-slate-900 font-bold">{displayOrderId}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400 font-medium text-[11px]">Date:</span>{' '}
                      <span className="text-slate-700 font-medium">{orderDate}</span>
                    </p>
                    <p>
                      <span className="text-slate-400 font-medium text-[11px]">Status:</span>{' '}
                      <strong
                        className={`font-black uppercase text-[10.5px] ${
                          isCompleted ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {rawStatus.replace(/_/g, ' ')}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Customer & In-Game Target Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 text-xs">
                {/* Customer Details */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Billed To (Customer)
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900 truncate">
                      {customerName}
                    </p>
                    {customerPhone ? (
                      <p className="font-mono text-slate-600 text-[11px]">
                        Phone: {customerPhone}
                      </p>
                    ) : null}
                    {customerEmail && (
                      <p className="text-slate-500 text-[11px] truncate">
                        Email: {customerEmail}
                      </p>
                    )}
                    {customerLocation && (
                      <p className="text-slate-500 text-[11px]">
                        Location: {customerLocation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Gaming Account Target */}
                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Delivery Destination / Player Account
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-red-600 truncate flex items-center gap-1">
                      <Gamepad2 size={13} />
                      <span>{productName}</span>
                    </p>
                    <p className="font-mono font-black text-slate-900 text-xs">
                      Target UID: {gameUid}
                    </p>
                    {gameZone && (
                      <p className="text-slate-600 font-mono text-[11px]">
                        Server / Zone: {gameZone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Items & Package Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item / Package</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {productName} – {packageName}
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>Direct In-Game Top-Up Delivery</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-700">
                        {quantity}x
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNPR(subtotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Payment Breakdown & Gateway Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-1">
                {/* Gateway Details */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Payment Gateway &amp; Reference
                  </span>
                  <div className="flex items-center justify-between text-slate-700 text-[11px]">
                    <span className="font-medium">Method:</span>
                    <strong className="uppercase text-slate-900 font-bold">
                      {paymentMethod.includes('esewa')
                        ? 'ESEWA DIRECT QR'
                        : paymentMethod.includes('khalti')
                        ? 'KHALTI DIRECT QR'
                        : 'GAMER WALLET'}
                    </strong>
                  </div>
                  {txnId && (
                    <div className="flex items-center justify-between text-slate-700 text-[11px]">
                      <span className="font-medium">Ref / Txn ID:</span>
                      <strong className="font-mono font-bold text-red-600">{txnId}</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-700 text-[11px]">
                    <span className="font-medium">Verification:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                      <ShieldCheck size={12} />
                      <span>100% Genuine</span>
                    </span>
                  </div>
                </div>

                {/* Financial Totals */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Package Subtotal:</span>
                    <span className="font-mono font-medium">{formatNPR(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Voucher Discount:</span>
                      <span className="font-mono">-{formatNPR(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Processing &amp; Tax:</span>
                    <span className="font-bold text-emerald-600 uppercase text-[10px]">FREE (RS. 0)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200 mt-1">
                    <span className="font-black text-slate-900 text-sm">Total Paid:</span>
                    <span className="font-mono font-black text-base sm:text-lg text-red-600">
                      {formatNPR(finalPaid)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Barcode & Digital Verification Footer */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                {/* Stylized Barcode */}
                <div className="space-y-1">
                  <div className="font-mono tracking-[4px] sm:tracking-[6px] text-slate-900 font-extrabold text-sm select-none">
                    ||| | |||| | || ||| || ||||
                  </div>
                  <div className="font-mono text-[9.5px] text-slate-400 font-bold tracking-wider">
                    {displayOrderId}
                  </div>
                </div>

                {/* Company Compliance Note */}
                <div className="text-[10px] text-slate-400 max-w-xs space-y-0.5 sm:text-right">
                  <p className="font-bold text-slate-700">
                    {PRIMARY_BRAND_NAME} By {LEGAL_COMPANY_NAME}
                  </p>
                  <p className="font-semibold text-slate-500">
                    Official Electronic Tax Invoice &amp; Bill &bull; Registered in Nepal 🇳🇵
                  </p>
                  <p>
                    Support: {appSettings?.supportEmail || 'hii.binodthalal@gmail.com'} &bull; {appSettings?.supportPhone || appSettings?.whatsappNumber || '+977 9768914027'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer with Mobile App UI/UX */}
          <div className="px-4 py-3.5 bg-white border-t border-slate-200/90 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 w-full">
              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf || isDownloadingImage}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-violet-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDownloadingPdf ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF Bill'}</span>
              </button>

              {/* Save PNG Image Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloadingPdf || isDownloadingImage}
                className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-extrabold transition-all cursor-pointer border border-slate-200/80 disabled:opacity-50"
                title="Save Receipt Image"
              >
                {isDownloadingImage ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                <span className="hidden sm:inline">Save Image</span>
              </button>

              {/* Share / Print Buttons */}
              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all cursor-pointer border border-slate-200/80"
                title="Share Invoice"
              >
                {copiedField === 'Bill Summary' ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all cursor-pointer border border-slate-200/80"
                title="Print Receipt"
              >
                <Printer size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  </ModalPortal>
  );
};
