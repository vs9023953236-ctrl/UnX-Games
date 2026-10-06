import React, { forwardRef } from 'react';
import { Order, AppSettings } from '../../types';
import { formatNPR } from '../../utils/formatters';
import {
  OFFICIAL_R2_LOGO,
  PRIMARY_BRAND_NAME,
  LEGAL_COMPANY_NAME,
  BRAND_COMPANY_LINE,
  COPYRIGHT_NOTICE,
} from '../../utils/branding';
import { AppLogo } from '../common/AppLogo';

interface OrderReceiptProps {
  order: Order;
  appSettings: AppSettings;
}

export const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(
  ({ order, appSettings }, ref) => {
    const orderDate = (order.createdAt || (order as any).created_at)
      ? new Date(order.createdAt || (order as any).created_at).toLocaleString()
      : 'N/A';

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

    const subtotal = rawSubtotal > 0 && rawSubtotal >= finalPaid
      ? rawSubtotal
      : (finalPaid + discount > 0 ? finalPaid + discount : (finalPaid > 0 ? finalPaid : 0));

    const customerName = order.customerName || (order as any).customer_name || order.userName || (order as any).user_name || (order.userEmail ? order.userEmail.split('@')[0] : 'Customer');
    const customerEmail = order.userEmail || (order as any).user_email || (order as any).customer_email || 'N/A';
    const gameUid = order.gameUserId || (order as any).game_user_id || (order as any).game_uid || order.gameUid || (order as any).player_id || order.playerId || 'N/A';
    const productName = order.productName || (order as any).product_name || (order as any).product_name_snapshot || (order as any).game_name || 'Digital Top-up';
    const packageName = order.packageName || (order as any).package_name || (order as any).package_name_snapshot || 'Top-Up Package';

    return (
      <div
        id="printable-order-receipt"
        ref={ref}
        className="p-6 sm:p-8 bg-white text-slate-900 font-sans border border-slate-200 rounded-2xl shadow-sm"
        style={{ width: '800px', maxWidth: '100%', margin: '0 auto', color: '#000', backgroundColor: '#ffffff' }}
      >
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-0 bg-transparent">
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
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-black text-slate-900 text-base">{PRIMARY_BRAND_NAME}</p>
              <p className="text-xs font-bold text-red-600">
                By {LEGAL_COMPANY_NAME}
              </p>
              <p>{appSettings.companyAddress || 'Deelasaini-6, Baitadi, Nepal'}</p>
              {appSettings.businessRegistrationNumber && <p>Reg No: {appSettings.businessRegistrationNumber}</p>}
              {appSettings.businessPan && <p>PAN: {appSettings.businessPan}</p>}
              {appSettings.vatNumber && <p>VAT: {appSettings.vatNumber}</p>}
              <p>Email: {appSettings.supportEmail || 'hii.binodthalal@gmail.com'}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black uppercase tracking-wider text-slate-800 mb-2">Receipt</h1>
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-semibold text-slate-800">Order ID:</span> {order.orderCode || order.id}</p>
              <p><span className="font-semibold text-slate-800">Date:</span> {orderDate}</p>
              <p><span className="font-semibold text-slate-800">Status:</span> {String(order.orderStatus || (order as any).order_status || order.status || 'PENDING').toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase border-b border-slate-200 pb-1">Customer Details</h3>
          <div className="text-sm text-slate-600">
            <p><span className="font-semibold text-slate-800">Name:</span> {customerName}</p>
            <p><span className="font-semibold text-slate-800">Email:</span> {customerEmail}</p>
            <p><span className="font-semibold text-slate-800">Player ID / Username:</span> {gameUid}</p>
          </div>
        </div>

        <table className="w-full text-left text-sm mb-8 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="py-3 px-4 font-bold border-b border-slate-200">Item Description</th>
              <th className="py-3 px-4 font-bold border-b border-slate-200 text-center">Qty</th>
              <th className="py-3 px-4 font-bold border-b border-slate-200 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-4 px-4 border-b border-slate-100">
                <p className="font-bold text-slate-900">{productName}</p>
                <p className="text-xs text-slate-500 mt-1">{packageName}</p>
              </td>
              <td className="py-4 px-4 border-b border-slate-100 text-center text-slate-700">{order.quantity || 1}</td>
              <td className="py-4 px-4 border-b border-slate-100 text-right font-medium text-slate-800">
                {formatNPR(subtotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mb-12">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatNPR(subtotal)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatNPR(discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t border-slate-200 mt-2">
              <span>Total:</span>
              <span>{formatNPR(finalPaid)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 border-t border-slate-200 pt-6 text-center space-y-1">
          <p className="font-semibold text-slate-700">Thank you for choosing {PRIMARY_BRAND_NAME}!</p>
          <p className="text-[11px] font-bold text-slate-600">{BRAND_COMPANY_LINE}</p>
          <p className="text-[10px] text-slate-400">This is an official computer-generated receipt for digital goods and requires no physical signature.</p>
          {appSettings.complaintContact && <p className="mt-1">Grievance/Support: {appSettings.complaintContact}</p>}
        </div>
      </div>
    );
  }
);
