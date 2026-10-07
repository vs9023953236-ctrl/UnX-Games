import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { AppSettings } from '../../../types';
import { AppLogo } from '../../../components/common/AppLogo';
import { MaintenanceScreen } from '../../../components/common/MaintenanceScreen';
import { GameHubLoadingScreen } from '../../../components/common/GameHubLoadingScreen';
import { AdminMaintenanceTab } from './AdminMaintenanceTab';
import { validateLogoFile } from '../../../utils/branding';
import { api, uploadImage } from '../../../services/api';

import {
  Settings,
  Save,
  AlertTriangle,
  Upload,
  RotateCcw,
  CheckCircle2,
  X,
  Eye,
  Sparkles,
  Wrench,
  Zap,
  Power,
  Cloud,
  Database,
  Server,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';

export const AdminAppSettingsTab: React.FC = () => {
  const { appSettings, updateAppSettings, toggleStoreStatus, toggleOrderingStatus, toggleMaintenanceStatus, updateAppLogo, resetAppLogo, showToast, setAdminTab } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;

  // App Identity Fields
  const [appName, setAppName] = useState(appSettings.appName || 'Unx Games');
  const [appTagline, setAppTagline] = useState(appSettings.appTagline || "Nepal's #1 Instant Gaming Top-Up Platform");
  const [companyName, setCompanyName] = useState(appSettings.companyName || 'Unx Games');
  const [companyAddress, setCompanyAddress] = useState(appSettings.companyAddress || 'Deelasaini-6, Baitadi, Nepal');
  const [supportEmail, setSupportEmail] = useState(appSettings.supportEmail || 'hii.binodthalal@gmail.com');
  const [supportPhone, setSupportPhone] = useState(appSettings.supportPhone || '9768914027');
  const [whatsappNumber, setWhatsappNumber] = useState(appSettings.whatsappNumber || '9768914027');
  const [viberNumber, setViberNumber] = useState(appSettings.viberNumber || '9768914027');

  // Nepal E-commerce fields
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(appSettings.businessRegistrationNumber || '');
  const [businessPan, setBusinessPan] = useState(appSettings.businessPan || '');
  const [vatNumber, setVatNumber] = useState(appSettings.vatNumber || '');
  const [complaintContact, setComplaintContact] = useState(appSettings.complaintContact || '');
  const [responsibleBusinessInfo, setResponsibleBusinessInfo] = useState(appSettings.responsibleBusinessInfo || '');

  // Operational Switches
  const [maintenanceMode, setMaintenanceMode] = useState(appSettings.maintenanceMode || false);
  const [orderingEnabled, setOrderingEnabled] = useState(appSettings.orderingEnabled ?? true);
  const [announcementActive, setAnnouncementActive] = useState(appSettings.announcementActive);
  const [announcementBanner, setAnnouncementBanner] = useState(appSettings.announcementBanner);

  useEffect(() => {
    setOrderingEnabled(appSettings.orderingEnabled !== false);
    setMaintenanceMode(Boolean(appSettings.maintenanceMode));
  }, [appSettings.orderingEnabled, appSettings.maintenanceMode]);

  // Cloudflare R2 Credentials Fields
  const [r2AccountId, setR2AccountId] = useState(appSettings.r2_account_id || '');
  const [r2BucketName, setR2BucketName] = useState(appSettings.r2_bucket_name || '');
  const [r2PublicDomain, setR2PublicDomain] = useState(appSettings.r2_public_domain || '');
  const [r2AccessKeyId, setR2AccessKeyId] = useState(appSettings.r2_access_key_id || '');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState(appSettings.r2_secret_access_key || '');

  // Cloudflare R2 Testing State
  const [r2Status, setR2Status] = useState<any>(null);
  const [r2Testing, setR2Testing] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<any>(null);
  const [r2UploadTesting, setR2UploadTesting] = useState(false);
  const [sampleUploadedUrl, setSampleUploadedUrl] = useState<string | null>(null);

  // Custom AI (OpenRouter & nemotron-3-ultra-550b-a55b:free) State
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('nvidia/nemotron-3-ultra-550b-a55b:free');
  const [reasoningEnabled, setReasoningEnabled] = useState(true);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [hasExistingAiKey, setHasExistingAiKey] = useState(false);
  const [maskedAiKey, setMaskedAiKey] = useState('');

  useEffect(() => {
    fetchR2Status();
    fetchAiConfig();
  }, []);

  const fetchAiConfig = async () => {
    try {
      const res = await api.ai.getAiConfig();
      if (res && res.success && res.config) {
        setHasExistingAiKey(Boolean(res.config.hasApiKey));
        setMaskedAiKey(res.config.apiKeyMasked || '');
        if (res.config.model) setOpenRouterModel(res.config.model);
        if (typeof res.config.reasoningEnabled === 'boolean') setReasoningEnabled(res.config.reasoningEnabled);
      }
    } catch (_) {}
  };

  const handleSaveAiConfig = async () => {
    setSavingAiConfig(true);
    try {
      const res = await api.ai.updateAiConfig({
        apiKey: openRouterKey ? openRouterKey.trim() : undefined,
        model: openRouterModel.trim(),
        reasoningEnabled,
      });
      if (res && res.success) {
        showToast('success', 'Custom AI Saved', 'OpenRouter and Nemotron 3 Ultra settings saved successfully!');
        setOpenRouterKey('');
        fetchAiConfig();
      } else {
        showToast('error', 'Update Failed', res?.message || 'Could not save AI settings.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Server error saving AI config.');
    } finally {
      setSavingAiConfig(false);
    }
  };

  const fetchR2Status = async () => {
    try {
      const res = await api.storage.getStatus();
      if (res && res.success) {
        setR2Status(res);
      }
    } catch (e) {
      console.error('Failed to load R2 status:', e);
    }
  };

  const handleTestR2Connection = async () => {
    setR2Testing(true);
    setR2TestResult(null);
    try {
      const res = await api.storage.testConnection();
      setR2TestResult(res);
      if (res.success) {
        showToast('success', 'Cloudflare R2 Connected', res.message || 'R2 connection verified successfully!');
      } else {
        showToast('warning', 'Cloudflare R2 Notice', res.message || 'Cloudflare R2 is not fully configured or failed verification.');
      }
      fetchR2Status();
    } catch (err: any) {
      setR2TestResult({
        success: false,
        status: 'error',
        message: err.message || 'Failed to communicate with storage test server endpoint.',
      });
      showToast('error', 'Storage Test Failed', err.message || 'Could not verify R2 connection.');
    } finally {
      setR2Testing(false);
    }
  };

  const handleTestSampleUpload = async () => {
    setR2UploadTesting(true);
    try {
      const res = await api.storage.testConnection();
      if (res.success) {
        setSampleUploadedUrl(res.publicUrlSample || 'https://cloudflare-r2-active');
        showToast('success', 'Test Upload Verified', 'Cloudflare R2 write & read probe verified successfully!');
      } else {
        showToast('error', 'Upload Failed', res.message || 'Could not verify R2 connection.');
      }
    } catch (err: any) {
      showToast('error', 'Upload Test Error', err.message || 'Sample upload failed.');
    } finally {
      setR2UploadTesting(false);
    }
  };

  // Sync state when appSettings is loaded or updated from database
  useEffect(() => {
    if (appSettings) {
      if (appSettings.appName) setAppName(appSettings.appName);
      if (appSettings.appTagline) setAppTagline(appSettings.appTagline);
      if (appSettings.companyName) setCompanyName(appSettings.companyName);
      if (appSettings.companyAddress) setCompanyAddress(appSettings.companyAddress);
      if (appSettings.supportEmail) setSupportEmail(appSettings.supportEmail);
      if (appSettings.supportPhone) setSupportPhone(appSettings.supportPhone);
      if (appSettings.whatsappNumber) setWhatsappNumber(appSettings.whatsappNumber);
      if (appSettings.viberNumber) setViberNumber(appSettings.viberNumber);
      setMaintenanceMode(Boolean(appSettings.maintenanceMode));
      setOrderingEnabled(appSettings.orderingEnabled ?? true);
      setAnnouncementActive(appSettings.announcementActive ?? true);
      if (appSettings.announcementBanner !== undefined) setAnnouncementBanner(appSettings.announcementBanner);
      if (appSettings.termsAndConditions) {
        setTermsAndConditions(appSettings.termsAndConditions.replace(/game\s*hub\s*nepal/gi, 'Unx Games').replace(/game\s*hub/gi, 'Unx Games'));
      }
      if (appSettings.privacyPolicy) {
        setPrivacyPolicy(appSettings.privacyPolicy.replace(/game\s*hub\s*nepal/gi, 'Unx Games').replace(/game\s*hub/gi, 'Unx Games'));
      }
      if (appSettings.r2_account_id !== undefined) setR2AccountId(appSettings.r2_account_id || '');
      if (appSettings.r2_bucket_name !== undefined) setR2BucketName(appSettings.r2_bucket_name || '');
      if (appSettings.r2_public_domain !== undefined) setR2PublicDomain(appSettings.r2_public_domain || '');
      if (appSettings.r2_access_key_id !== undefined) setR2AccessKeyId(appSettings.r2_access_key_id || '');
      if (appSettings.r2_secret_access_key !== undefined) setR2SecretAccessKey(appSettings.r2_secret_access_key || '');
    }
  }, [appSettings]);

  // Legal
  const [termsAndConditions, setTermsAndConditions] = useState(
    (appSettings.termsAndConditions || '').replace(/game\s*hub\s*nepal/gi, 'Unx Games').replace(/game\s*hub/gi, 'Unx Games')
  );
  const [privacyPolicy, setPrivacyPolicy] = useState(
    (appSettings.privacyPolicy || '').replace(/game\s*hub\s*nepal/gi, 'Unx Games').replace(/game\s*hub/gi, 'Unx Games')
  );

  // Logo Upload State
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation Modal State
  const [pendingLogoData, setPendingLogoData] = useState<{
    file: File;
    dataUrl: string;
    dimensions: { width: number; height: number };
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPreviewMaintenance, setShowPreviewMaintenance] = useState(false);
  const [showPreviewLoading, setShowPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [instantUpdating, setInstantUpdating] = useState(false);

  const [showOrderingModal, setShowOrderingModal] = useState(false);
  const [targetOrderingState, setTargetOrderingState] = useState(true);

  const handleToggleOrderingDirectly = async (targetState: boolean) => {
    setInstantUpdating(true);
    try {
      const adminInfo = currentUser
        ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
        : undefined;

      await toggleOrderingStatus(targetState, { adminInfo });
      setOrderingEnabled(targetState);
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not update ordering status.');
    } finally {
      setInstantUpdating(false);
      setShowOrderingModal(false);
    }
  };

  const handleToggleMaintenanceDirectly = async (targetState: boolean) => {
    setInstantUpdating(true);
    try {
      const adminInfo = currentUser
        ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
        : undefined;

      await toggleMaintenanceStatus(targetState, { adminInfo });
      setMaintenanceMode(targetState);
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not update maintenance status.');
    } finally {
      setInstantUpdating(false);
      setShowMaintenanceModal(false);
    }
  };

  // Handle Logo File Selection & Validation
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const validation = await validateLogoFile(file);
    if (!validation.valid || !validation.dataUrl || !validation.dimensions) {
      showToast('error', 'Invalid Logo File', validation.error || 'Please upload a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    setPendingLogoData({
      file,
      dataUrl: validation.dataUrl,
      dimensions: validation.dimensions,
    });
    setShowConfirmModal(true);
  };

  // Confirm and Execute Logo Upload
  const handleConfirmLogoUpload = async () => {
    if (!pendingLogoData) return;

    setLogoUploading(true);
    setShowConfirmModal(false);

    try {
      let downloadUrl = pendingLogoData.dataUrl;
      try {
        downloadUrl = await uploadImage(
          pendingLogoData.file,
          'branding',
          (progress) => setUploadProgress(progress)
        );
      } catch (uploadErr) {
        console.warn('Storage upload notice, saving data URI:', uploadErr);
      }

      const adminInfo = currentUser
        ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
        : undefined;

      await updateAppLogo(
        downloadUrl,
        {
          fileName: pendingLogoData.file.name,
          dimensions: pendingLogoData.dimensions,
        },
        adminInfo
      );

      showToast(
        'success',
        'Logo Uploaded Successfully',
        'The new Unx Games official logo has been activated across the entire platform.'
      );
    } catch (err) {
      console.error('Logo upload error:', err);
      showToast('error', 'Upload Failed', 'Could not upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
      setPendingLogoData(null);
      setUploadProgress(0);
    }
  };

  const handleResetLogo = async () => {
    const adminInfo = currentUser
      ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
      : undefined;

    await resetAppLogo(adminInfo);
    setShowResetConfirmModal(false);
    showToast('info', 'Logo Reset', 'Branding has been reset to default.');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const adminInfo = currentUser
      ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
      : undefined;

    const payload: Partial<AppSettings> = {
      appName: appName.trim(),
      appTagline: appTagline.trim(),
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim(),
      supportEmail: supportEmail.trim(),
      supportPhone: supportPhone.trim(),
      whatsappNumber: whatsappNumber.trim(),
      viberNumber: viberNumber.trim(),
      maintenanceMode,
      announcementActive,
      announcementBanner: announcementBanner.trim(),
      termsAndConditions,
      privacyPolicy,
      r2_account_id: r2AccountId.trim(),
      r2_bucket_name: r2BucketName.trim(),
      r2_public_domain: r2PublicDomain.trim(),
      r2_access_key_id: r2AccessKeyId.trim(),
      r2_secret_access_key: r2SecretAccessKey.trim(),
      businessRegistrationNumber: businessRegistrationNumber.trim(),
      businessPan: businessPan.trim(),
      vatNumber: vatNumber.trim(),
      complaintContact: complaintContact.trim(),
      responsibleBusinessInfo: responsibleBusinessInfo.trim(),
    };

    await updateAppSettings(payload, adminInfo);
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
              Core Application Configuration & Store Settings modifications are restricted exclusively to the Store Owner.
            </p>
            <p className="text-xs text-slate-400">
              Current Role: <span className="font-bold text-slate-700 uppercase">{currentUser?.role || 'Staff'}</span>
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setAdminTab('overview')}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            >
              Return to Dashboard Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none px-2.5 sm:px-4 lg:px-6 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Settings size={16} />
            <span>Store Configuration</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Platform Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage branding, contact info, announcement banners, and legal terms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Logo & Branding */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Official Store Logo
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-center shrink-0">
              <AppLogo size="lg" />
            </div>

            <div className="space-y-3 flex-1 w-full text-center sm:text-left">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Storefront Logo</h3>
                <p className="text-[11px] text-slate-500">
                  Recommended: PNG or WebP with transparent background, at least 200×200px.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload size={14} />
                  <span>{logoUploading ? 'Uploading...' : 'Upload New Logo'}</span>
                </button>

                {appSettings.customLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Store Identity & Contact */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            2. Identity &amp; Contact Support
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Official Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Unx Games"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Business Address (Nepal)</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Deelasaini 6 Baitadi Nepal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Platform Title</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Tagline / Subtitle</label>
              <input
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Customer Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Support Phone / Mobile</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">WhatsApp Help Number</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Viber Number (Optional)</label>
              <input
                type="text"
                value={viberNumber}
                onChange={(e) => setViberNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section: Nepal E-Commerce Readiness */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Nepal E-Commerce Readiness & Legal Identity
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            For compliance with Nepal's e-commerce guidelines, please provide valid business registration information. Do not enter fabricated details. If not yet registered, leave these fields blank.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Business / Firm Registration No.</label>
              <input
                type="text"
                value={businessRegistrationNumber}
                onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                placeholder="e.g. 123456/078/079"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Business PAN</label>
              <input
                type="text"
                value={businessPan}
                onChange={(e) => setBusinessPan(e.target.value)}
                placeholder="e.g. 301234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">VAT Number (if applicable)</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="e.g. 301234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Complaint / Grievance Officer Contact</label>
              <input
                type="text"
                value={complaintContact}
                onChange={(e) => setComplaintContact(e.target.value)}
                placeholder="Name, Phone, or Email for complaints"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Responsible Business Information / Director Details</label>
              <textarea
                value={responsibleBusinessInfo}
                onChange={(e) => setResponsibleBusinessInfo(e.target.value)}
                placeholder="Name of proprietor/director, registered physical address, etc."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Announcement Bar & Maintenance Mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            3. Alerts &amp; Maintenance Mode
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={announcementActive}
                onChange={(e) => setAnnouncementActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Show Top Store Announcement Banner</span>
                <p className="text-[11px] text-slate-500">Displays a marquee bar across customer header</p>
              </div>
            </label>

            {announcementActive && (
              <input
                type="text"
                value={announcementBanner}
                onChange={(e) => setAnnouncementBanner(e.target.value)}
                placeholder="e.g. 🔥 Flash Sale! Use eSewa Scan & Pay for 5-minute instant diamond delivery!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            )}

            <div className="pt-4 border-t border-slate-100">
              <AdminMaintenanceTab embedded={true} />
            </div>
          </div>
        </div>

        
        {/* Section 4: Cloudflare R2 Storage & Image Verification */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                <Cloud size={15} />
                <span>Cloud Object Storage</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                4. Cloudflare R2 Connection &amp; Image Verification
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchR2Status}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Refresh Status"
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                disabled={r2Testing}
                onClick={handleTestR2Connection}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {r2Testing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Run R2 Health Test</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* R2 Credentials Form Fields */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Server size={14} className="text-indigo-600" />
              <span>Configure Cloudflare R2 Storage (For Images)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">R2 Account ID</label>
                <input
                  type="text"
                  value={r2AccountId}
                  onChange={(e) => setR2AccountId(e.target.value)}
                  placeholder="e.g. 700a5f98309d1c4646aee7ecea6d0823"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500">Found in your Cloudflare dashboard under R2 Overview.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">R2 Bucket Name</label>
                <input
                  type="text"
                  value={r2BucketName}
                  onChange={(e) => setR2BucketName(e.target.value)}
                  placeholder="e.g. unxgames"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500">The specific name of your Cloudflare R2 Bucket.</p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Public Asset Domain URL</label>
                <input
                  type="text"
                  value={r2PublicDomain}
                  onChange={(e) => setR2PublicDomain(e.target.value)}
                  placeholder="e.g. https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500">Your Cloudflare custom domain or public bucket gateway URL (starts with https://).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">R2 Access Key ID</label>
                <input
                  type="text"
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                  placeholder="32 hex characters (e.g. b683ab7ac8c64168ac8d1674d54b331f)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500">Cloudflare Dashboard &gt; R2 &gt; Manage R2 API Tokens (32 characters).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">R2 Secret Access Key</label>
                <input
                  type="password"
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  placeholder="64 hex characters (token secret value)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500">Cloudflare Dashboard &gt; R2 &gt; Manage R2 API Tokens (64 characters secret).</p>
              </div>
            </div>
          </div>

          {/* R2 Status & Diagnostic Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">R2 Bucket Target</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {r2Status?.bucket || 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Public Asset Domain</span>
                <span className="text-xs font-mono text-slate-700 truncate max-w-[200px]" title={r2Status?.publicDomain || 'Not configured'}>
                  {r2Status?.publicDomain && !r2Status.publicDomain.includes('Not configured') ? r2Status.publicDomain : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Backend Secrets Status</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={13} />
                  Protected Server-Side
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Diagnostic Status</span>
                {r2TestResult ? (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      r2TestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {r2TestResult.success ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {r2TestResult.success ? 'Connected & Verified' : 'Configuration Notice'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Click "Run R2 Health Test"</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Round-Trip Latency</span>
                <span className="text-xs font-bold text-slate-700">
                  {r2TestResult?.latencyMs ? `${r2TestResult.latencyMs} ms` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Image Upload Mode</span>
                <span className="text-xs font-bold text-slate-800">
                  {r2Status?.isConfigured ? 'Direct Cloudflare R2' : 'Inline Dev Fallback'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Diagnostic Details Output if available */}
          {r2TestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                r2TestResult.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {r2TestResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{r2TestResult.success ? 'R2 Storage Online' : 'R2 Verification Notice'}</span>
              </div>
              <p className="text-[11px] font-medium opacity-90">{r2TestResult.message}</p>
              {r2TestResult.publicUrlSample && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-emerald-800 truncate">
                    Sample Key: {r2TestResult.publicUrlSample}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Live Sample Upload Test */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Test Product Image Upload</h3>
              <p className="text-[11px] text-slate-500">
                Uploads a probe image to test URL generation and public CDN delivery.
              </p>
            </div>
            <button
              type="button"
              disabled={r2UploadTesting}
              onClick={handleTestSampleUpload}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              {r2UploadTesting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Test Sample Upload</span>
                </>
              )}
            </button>
          </div>

          {sampleUploadedUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Sample Upload Result:</span>
                <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  HTTP 200 OK
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={sampleUploadedUrl}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-mono"
                />
                <a
                  href={sampleUploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {/* Security & Architecture Guarantee */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
            <span className="font-bold flex items-center gap-1 text-indigo-800">
              <ShieldCheck size={14} />
              Zero Secret Exposure Policy
            </span>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              All credentials (<code className="font-mono font-semibold">R2_SECRET_ACCESS_KEY</code>, <code className="font-mono font-semibold">R2_ACCESS_KEY_ID</code>, and <code className="font-mono font-semibold">R2_ACCOUNT_ID</code>) are strictly processed inside the server environment. Only public image URLs and sanitized CDN links are dispatched to frontend clients.
            </p>
          </div>
        </div>

        {/* Section 5: Custom User AI (OpenRouter & Nemotron 3 Ultra 550b) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  5. Custom User AI (OpenRouter &amp; Nemotron 3 Ultra)
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    hasExistingAiKey
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {hasExistingAiKey ? '● OpenRouter Active' : '○ Standby / Fallback'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your custom OpenRouter API integration (<code className="font-mono font-semibold">nvidia/nemotron-3-ultra-550b-a55b:free</code>) with reasoning preservation for the 3-Model AI Council.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveAiConfig}
              disabled={savingAiConfig}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
            >
              {savingAiConfig ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save AI Config</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>OpenRouter Model ID</span>
                <span className="text-[10px] text-slate-400 font-mono">Custom Model</span>
              </label>
              <input
                type="text"
                value={openRouterModel}
                onChange={(e) => setOpenRouterModel(e.target.value)}
                placeholder="e.g. nvidia/nemotron-3-ultra-550b-a55b:free"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
              <p className="text-[10px] text-slate-500">
                Default: <code className="font-mono text-violet-700">nvidia/nemotron-3-ultra-550b-a55b:free</code>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>OpenRouter API Key</span>
                {hasExistingAiKey && (
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    Saved: {maskedAiKey}
                  </span>
                )}
              </label>
              <input
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder={hasExistingAiKey ? 'Enter new key to replace existing' : 'sk-or-v1-xxxxxxxxxxxxxxxxxxxx'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
              <p className="text-[10px] text-slate-500">
                Processed exclusively on backend server. Securely stored in database.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reasoningEnabled}
                onChange={(e) => setReasoningEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Enable Model Reasoning Protocol</span>
                <p className="text-[11px] text-slate-500">
                  Transmits <code className="font-mono text-violet-700">{`reasoning: { enabled: true }`}</code> to OpenRouter and preserves reasoning details across multi-turn assistant messages.
                </p>
              </div>
            </label>
          </div>

          {/* Quick Technical Summary */}
          <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-xl text-xs text-violet-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-violet-800">
              <Sparkles size={14} className="text-violet-600" />
              <span>Multi-Tier High-Availability Pipeline</span>
            </div>
            <p className="text-[11px] text-violet-700 leading-relaxed">
              When an OpenRouter API key is active, customer queries are processed directly through <strong className="font-mono text-violet-900">{openRouterModel}</strong> with preserved reasoning. If OpenRouter quota is exhausted or unreachable, requests seamlessly cascade to Google Gemini and the live PostgreSQL rule engine so store support is never interrupted.
            </p>
          </div>
        </div>

        {/* Section 6: Legal & Policies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            6. Terms &amp; Privacy Policy
          </h2>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Terms and Conditions</label>
              <textarea
                rows={4}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Privacy Policy</label>
              <textarea
                rows={4}
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modals */}
      {showConfirmModal && pendingLogoData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900">
            <h3 className="text-base font-bold text-slate-900">Apply New Store Logo?</h3>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-center">
              <img src={pendingLogoData.dataUrl} alt="Preview" className="max-h-24 object-contain" />
            </div>
            <p className="text-xs text-slate-500">
              This logo will immediately appear on the storefront header, invoices, and payment pages.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingLogoData(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogoUpload}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Apply Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-900">
            <h3 className="text-base font-bold text-slate-900">Reset Logo to Default</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to reset the store logo to the default Unx Games graphic badge?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResetLogo}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Reset Default
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className={`flex items-center gap-2.5 ${targetOrderingState ? 'text-emerald-600' : 'text-red-600'}`}>
              <div className={`p-2 rounded-xl ${targetOrderingState ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {targetOrderingState ? 'Turn ordering ON?' : 'Turn ordering OFF?'}
                </h3>
                <span className={`text-[11px] font-bold ${targetOrderingState ? 'text-emerald-600' : 'text-red-600'}`}>
                  {targetOrderingState ? 'Orders will resume' : 'Orders will be blocked'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {targetOrderingState 
                ? 'Customers will be able to place new orders.' 
                : 'Customers will not be able to place new orders. They can still browse products.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOrderingModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={instantUpdating}
                onClick={() => handleToggleOrderingDirectly(targetOrderingState)}
                className={`flex-1 py-2.5 rounded-xl active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                  targetOrderingState ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {instantUpdating ? 'Updating...' : (targetOrderingState ? 'Go Online' : 'Turn Offline')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Enable Maintenance Mode?</h3>
                <span className="text-[11px] font-bold text-amber-600">Customer Lock Screen</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will activate the native mobile maintenance launch screen for regular customers. Top-up purchases will be safely paused while you work on updates. Logged-in admins will retain unrestricted access.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={instantUpdating}
                onClick={() => handleToggleMaintenanceDirectly(true)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {instantUpdating ? 'Enabling...' : 'Confirm & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Maintenance Modal */}
      {showPreviewMaintenance && (
        <div className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950 flex flex-col">
          <div className="sticky top-0 z-[1000000] bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <Eye size={16} className="text-amber-400" />
              <span>Customer Maintenance Screen (Live Preview)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviewMaintenance(false)}
              className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Exit Preview ✕
            </button>
          </div>
          <div className="flex-1">
            <MaintenanceScreen
              isPreview
              onDismissPreview={() => setShowPreviewMaintenance(false)}
            />
          </div>
        </div>
      )}

      {/* Live Preview Loading Screen Modal */}
      {showPreviewLoading && (
        <GameHubLoadingScreen
          message="NEPAL'S #1 GAME TOP-UP & VOUCHER APP"
          isPreview
          autoFinish={false}
          onDismissPreview={() => setShowPreviewLoading(false)}
        />
      )}
    </div>
  );
};
export default AdminAppSettingsTab;
