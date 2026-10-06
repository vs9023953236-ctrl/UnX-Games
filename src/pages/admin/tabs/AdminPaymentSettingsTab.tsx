import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { PaymentSettings } from '../../../types';
import { uploadImage } from '../../../services/api';

import {
  QrCode,
  Save,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  ShieldCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AdminPaymentSettingsTab: React.FC = () => {
  const { paymentSettings, updatePaymentSettings, showToast, setAdminTab } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;

  // Local Form State - ONLY eSewa and Khalti
  const [esewaEnabled, setEsewaEnabled] = useState(paymentSettings.esewaEnabled ?? true);
  const [esewaName, setEsewaName] = useState(paymentSettings.esewaName || 'BINOD THALAL (UNX GAMES)');
  const [esewaId, setEsewaId] = useState(paymentSettings.esewaId || '9768914027');
  const [esewaInstructions, setEsewaInstructions] = useState(
    paymentSettings.esewaInstructions ||
      '1. Scan this QR code using your eSewa App.\n2. In Remarks, enter your Unx Games Order ID.\n3. Complete the payment and take a screenshot.\n4. Upload the payment receipt screenshot and enter the Transaction ID below.'
  );
  const [esewaQR, setEsewaQR] = useState(paymentSettings.esewaQR || '');

  const [khaltiEnabled, setKhaltiEnabled] = useState(paymentSettings.khaltiEnabled ?? true);
  const [khaltiName, setKhaltiName] = useState(paymentSettings.khaltiName || 'UNX GAMES OFFICIAL');
  const [khaltiId, setKhaltiId] = useState(paymentSettings.khaltiId || '9768914027');
  const [khaltiInstructions, setKhaltiInstructions] = useState(
    paymentSettings.khaltiInstructions ||
      '1. Open Khalti App and Scan this QR.\n2. Enter the exact order amount in NPR.\n3. Mention your Order ID or Game UID in Remarks.\n4. Save the payment receipt and upload it here.'
  );
  const [khaltiQR, setKhaltiQR] = useState(paymentSettings.khaltiQR || '');

  // Upload Progress
  const [uploadingTarget, setUploadingTarget] = useState<'esewa' | 'khalti' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const allDisabled = !esewaEnabled && !khaltiEnabled;

  const handleUploadQR = async (
    file: File,
    target: 'esewa' | 'khalti'
  ) => {
    setUploadingTarget(target);
    setUploadProgress(0);

    try {
      const url = await uploadImage(file, `qr_codes/${target}_${Date.now()}`, (pct) => {
        setUploadProgress(pct);
      });

      if (target === 'esewa') setEsewaQR(url);
      else if (target === 'khalti') setKhaltiQR(url);

      setUploadProgress(null);
      setUploadingTarget(null);
      showToast('success', 'QR Image Uploaded', `${target.toUpperCase()} QR code uploaded to Cloudflare R2.`);
    } catch (err: any) {
      console.error('R2 upload error:', err);
      showToast('error', 'Upload Failed', err?.message || 'Failed to upload image to Cloudflare R2.');
      setUploadProgress(null);
      setUploadingTarget(null);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const adminInfo = currentUser
      ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
      : undefined;

    const payload: Partial<PaymentSettings> = {
      esewaEnabled,
      esewaName: esewaName.trim(),
      esewaId: esewaId.trim(),
      esewaInstructions: esewaInstructions.trim(),
      esewaQR: esewaQR.trim(),

      khaltiEnabled,
      khaltiName: khaltiName.trim(),
      khaltiId: khaltiId.trim(),
      khaltiInstructions: khaltiInstructions.trim(),
      khaltiQR: khaltiQR.trim(),
    };

    await updatePaymentSettings(payload, adminInfo);
    setSaving(false);
  };

  if (!isSuperAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-xs">
            🔒
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Payment QR Gateway Configuration & Setup controls are restricted exclusively to the Store Owner.
            </p>
            <p className="text-xs text-slate-400">
              Current Role: <span className="font-bold text-slate-700 uppercase">{currentUser?.role || 'Staff'}</span>
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setAdminTab('overview')}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            >
              Return to Dashboard Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Header with Live Status & Action */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-600 text-xs font-black uppercase tracking-wider">
            <QrCode size={16} />
            <span>eSewa &amp; Khalti Gateways</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Payment QR &amp; Method Control</h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload custom QR codes for eSewa &amp; Khalti. Uploaded QRs display live on User Checkout.
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save & Publish Live'}</span>
        </button>
      </div>

      {/* 2. Gateway Status Toggles Bar (Only eSewa & Khalti) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* eSewa Toggle Card */}
        <div
          onClick={() => setEsewaEnabled(!esewaEnabled)}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none ${
            esewaEnabled
              ? 'bg-emerald-50/90 border-emerald-500 shadow-2xs'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              eS
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-900">eSewa Wallet &amp; QR</h4>
              <p className="text-xs font-mono text-slate-500">{esewaId}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              esewaEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {esewaEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
          </span>
        </div>

        {/* Khalti Toggle Card */}
        <div
          onClick={() => setKhaltiEnabled(!khaltiEnabled)}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none ${
            khaltiEnabled
              ? 'bg-purple-50/90 border-purple-500 shadow-2xs'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              KH
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-900">Khalti Wallet &amp; QR</h4>
              <p className="text-xs font-mono text-slate-500">{khaltiId}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              khaltiEnabled ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {khaltiEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
          </span>
        </div>
      </div>

      {allDisabled && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-2xs">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-bold text-sm">Both Payment Methods are Currently Turned OFF!</span>
            <p className="text-xs text-rose-700 mt-1">
              Customers will see a notification on Checkout that online payments are temporarily disabled. Enable at least eSewa or Khalti.
            </p>
          </div>
        </div>
      )}

      {/* 3. Detailed Editor Cards for eSewa and Khalti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= eSewa Setup Card ================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                eS
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">eSewa Account &amp; QR Details</h3>
                <p className="text-[11px] text-slate-500">Nepal Direct eSewa Wallet</p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={esewaEnabled}
                onChange={(e) => setEsewaEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span className={`text-xs font-bold ${esewaEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                {esewaEnabled ? 'Active' : 'Off'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">eSewa Account Holder</label>
                <input
                  type="text"
                  value={esewaName}
                  onChange={(e) => setEsewaName(e.target.value)}
                  placeholder="Holder Name"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">eSewa ID / Phone</label>
                <input
                  type="text"
                  value={esewaId}
                  onChange={(e) => setEsewaId(e.target.value)}
                  placeholder="e.g. 98XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* eSewa QR Image Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <QrCode size={15} className="text-emerald-600" />
                  <span>eSewa QR Code Image</span>
                </label>
                {esewaQR && (
                  <button
                    type="button"
                    onClick={() => setEsewaQR('')}
                    className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Clear Image</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-36 h-36 bg-white border-2 border-emerald-200 rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-2xs group overflow-hidden">
                  {esewaQR ? (
                    <img src={esewaQR} alt="eSewa QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <QrCode size={28} className="mx-auto mb-1 text-slate-300" />
                      <span className="text-[10px] font-bold block">No QR Uploaded</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 w-full text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">1. Upload QR Image File</span>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Choose File to Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadQR(file, 'esewa');
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">2. Or Paste Image URL</span>
                    <input
                      type="text"
                      value={esewaQR}
                      onChange={(e) => setEsewaQR(e.target.value)}
                      placeholder="https://.../esewa_qr.png"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-700 focus:border-red-600"
                    />
                  </div>

                  {uploadingTarget === 'esewa' && uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-emerald-700 font-bold">
                        <span>Uploading QR Image...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">User Instructions at Checkout</label>
              <textarea
                rows={3}
                value={esewaInstructions}
                onChange={(e) => setEsewaInstructions(e.target.value)}
                placeholder="Instructions displayed to users..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl p-2.5 text-xs text-slate-900 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* ================= Khalti Setup Card ================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                KH
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Khalti Account &amp; QR Details</h3>
                <p className="text-[11px] text-slate-500">Nepal Direct Khalti Digital Wallet</p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={khaltiEnabled}
                onChange={(e) => setKhaltiEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
              />
              <span className={`text-xs font-bold ${khaltiEnabled ? 'text-purple-700' : 'text-slate-400'}`}>
                {khaltiEnabled ? 'Active' : 'Off'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khalti Account Holder</label>
                <input
                  type="text"
                  value={khaltiName}
                  onChange={(e) => setKhaltiName(e.target.value)}
                  placeholder="Holder Name"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khalti ID / Phone</label>
                <input
                  type="text"
                  value={khaltiId}
                  onChange={(e) => setKhaltiId(e.target.value)}
                  placeholder="e.g. 98XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Khalti QR Image Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <QrCode size={15} className="text-purple-600" />
                  <span>Khalti QR Code Image</span>
                </label>
                {khaltiQR && (
                  <button
                    type="button"
                    onClick={() => setKhaltiQR('')}
                    className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Clear Image</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-36 h-36 bg-white border-2 border-purple-200 rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-2xs group overflow-hidden">
                  {khaltiQR ? (
                    <img src={khaltiQR} alt="Khalti QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <QrCode size={28} className="mx-auto mb-1 text-slate-300" />
                      <span className="text-[10px] font-bold block">No QR Uploaded</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 w-full text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">1. Upload QR Image File</span>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Choose File to Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadQR(file, 'khalti');
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">2. Or Paste Image URL</span>
                    <input
                      type="text"
                      value={khaltiQR}
                      onChange={(e) => setKhaltiQR(e.target.value)}
                      placeholder="https://.../khalti_qr.png"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-700 focus:border-red-600"
                    />
                  </div>

                  {uploadingTarget === 'khalti' && uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-purple-700 font-bold">
                        <span>Uploading QR Image...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-purple-600 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">User Instructions at Checkout</label>
              <textarea
                rows={3}
                value={khaltiInstructions}
                onChange={(e) => setKhaltiInstructions(e.target.value)}
                placeholder="Instructions displayed to users..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl p-2.5 text-xs text-slate-900 transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminPaymentSettingsTab;
