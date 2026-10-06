import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, AlertCircle, CheckCircle, Eye, Clock, Timer, Hourglass, Sparkles } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';

import { api } from '../../../services/api';
import { MaintenanceScreen } from '../../../components/common/MaintenanceScreen';
import { GameHubLoadingScreen } from '../../../components/common/GameHubLoadingScreen';
import { ModalPortal } from '../../../components/common/ModalPortal';

interface AdminMaintenanceTabProps {
  embedded?: boolean;
}

const DURATION_PRESETS = [
  { label: '1 Min', value: 1 },
  { label: '5 Mins', value: 5 },
  { label: '15 Mins', value: 15 },
  { label: '30 Mins', value: 30 },
  { label: '1 Hour', value: 60 },
  { label: '2 Hours', value: 120 },
  { label: '6 Hours', value: 360 },
  { label: '12 Hours', value: 720 },
  { label: '24 Hours', value: 1440 },
  { label: 'Manual Off', value: 0 },
];

const formatDurationLabel = (mins: number) => {
  if (mins <= 0) return 'Manual Off';
  if (mins < 60) return `${mins} Min${mins > 1 ? 's' : ''}`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hrs} Hour${hrs > 1 ? 's' : ''}`;
  return `${hrs}h ${remMins}m`;
};

export const AdminMaintenanceTab: React.FC<AdminMaintenanceTabProps> = ({ embedded = false }) => {
  const { appSettings, updateAppSettings, toggleMaintenanceStatus, refreshSettings, showToast, setAdminTab } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner || uRole === 'ADMIN' || uRole === 'STORE_MANAGER';
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Derive maintenanceMode directly from appSettings to prevent race conditions & state bounce
  const maintenanceMode = Boolean(appSettings.maintenanceMode);

  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    appSettings.maintenanceMessage || 'Top-up service is temporarily unavailable due to maintenance.'
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(appSettings.maintenanceDurationMinutes || 30);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showLoadingPreviewModal, setShowLoadingPreviewModal] = useState(false);

  // Live Countdown state for active maintenance mode
  const [remainingTime, setRemainingTime] = useState<string>('');

  // Keep local duration and message inputs in sync with global appSettings
  useEffect(() => {
    if (appSettings.maintenanceMessage) {
      setMaintenanceMessage(appSettings.maintenanceMessage);
    }
    if (appSettings.maintenanceDurationMinutes !== undefined && appSettings.maintenanceDurationMinutes !== null) {
      setSelectedDuration(Number(appSettings.maintenanceDurationMinutes));
    }
  }, [appSettings.maintenanceMessage, appSettings.maintenanceDurationMinutes]);

  // Update live admin countdown display
  useEffect(() => {
    if (!maintenanceMode || !appSettings.maintenanceUntil) {
      setRemainingTime('');
      return;
    }

    let hasExpired = false;
    const updateTimer = () => {
      const target = new Date(appSettings.maintenanceUntil!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));

      if (diff <= 0) {
        setRemainingTime('Expiring now...');
        if (!hasExpired) {
          hasExpired = true;
          refreshSettings();
        }
        return;
      }

      const hrs = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setRemainingTime(`${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s remaining`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [maintenanceMode, appSettings.maintenanceUntil]);

  // Synchronize maintenance state with backend without state bounce
  const handleToggle = async (targetState: boolean) => {
    if (isSyncing) return;
    setIsSyncing(true);
    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
    const msg = maintenanceMessage.trim() || 'Top-up service is temporarily unavailable due to maintenance.';

    try {
      await toggleMaintenanceStatus(targetState, {
        message: msg,
        durationMinutes: selectedDuration,
        adminInfo,
        silent: true,
      });

      showToast(
        targetState ? 'warning' : 'success',
        targetState ? 'Maintenance Mode ACTIVE' : 'Maintenance Mode OFF',
        targetState
          ? (selectedDuration > 0
              ? `Store maintenance screen is active. Auto turn-off scheduled in ${formatDurationLabel(selectedDuration)}.`
              : 'Store maintenance screen is active (Manual Off mode). Regular customer access is locked.')
          : 'Store is live and accessible to all customers.'
      );
    } catch (err: any) {
      showToast('error', 'Sync Error', err.message || 'Failed to sync maintenance configuration.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePresetSelect = async (presetValue: number) => {
    // 1. Instant local state update (0ms UI lag!)
    setSelectedDuration(presetValue);
    setIsSyncing(true);
    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
    const msg = maintenanceMessage.trim() || 'Top-up service is temporarily unavailable due to maintenance.';

    try {
      if (maintenanceMode) {
        // If maintenance is active, update the running timer
        await toggleMaintenanceStatus(true, {
          message: msg,
          durationMinutes: presetValue,
          adminInfo,
          silent: true,
        });
      } else {
        await api.settings.updateAppSettings({
          maintenanceDurationMinutes: presetValue > 0 ? presetValue : null,
          maintenanceMode: false,
        }).catch(() => {});
      }

      showToast(
        'success',
        'Timer Updated',
        presetValue > 0 ? `Duration set to ${formatDurationLabel(presetValue)}.` : 'Manual turn-off selected (Indefinite until turned off).'
      );
    } catch (err: any) {
      showToast('error', 'Timer Save Error', err.message || 'Could not update timer duration.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplyCustomValue = async (newVal: number) => {
    const clamped = Math.min(1440, Math.max(1, newVal || 1));
    setSelectedDuration(clamped);
    setIsSyncing(true);
    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
    const msg = maintenanceMessage.trim() || 'Top-up service is temporarily unavailable due to maintenance.';

    try {
      if (maintenanceMode) {
        await toggleMaintenanceStatus(true, {
          message: msg,
          durationMinutes: clamped,
          adminInfo,
          silent: true,
        });
      } else {
        await api.settings.updateAppSettings({
          maintenanceDurationMinutes: clamped,
          maintenanceMode: false,
        }).catch(() => {});
      }

      showToast('success', 'Timer Applied', `Auto turn-off set to ${formatDurationLabel(clamped)}.`);
    } catch (err: any) {
      showToast('error', 'Timer Save Error', err.message || 'Could not update timer duration.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMessageBlur = async () => {
    const msg = maintenanceMessage.trim() || 'Top-up service is temporarily unavailable due to maintenance.';
    const adminInfo = currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined;
    try {
      await updateAppSettings({
        maintenanceMessage: msg,
      }, adminInfo, { silent: true });
      showToast('success', 'Notice Message Saved', 'Customer maintenance message updated.');
    } catch (err: any) {
      showToast('error', 'Save Error', err.message || 'Could not update notice message.');
    }
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
              Full System Lockdown & Maintenance Switch controls are restricted exclusively to the Store Owner.
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
    <div className={`w-full ${embedded ? '' : 'max-w-4xl mx-auto'} space-y-6`}>
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">System Lock & Maintenance Mode</h2>
              <p className="text-xs text-slate-500 font-medium">Single source of truth control synchronized across Database, User App, and Admin Panel</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowLoadingPreviewModal(true)}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-red-200"
            >
              <Sparkles size={14} className="text-orange-500" />
              <span>Preview Loading Screen</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye size={14} />
              <span>Preview Maintenance Screen</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-10 text-center rounded-2xl border border-slate-200">
          <RefreshCw size={22} className="animate-spin text-red-600 mx-auto" />
          <p className="text-slate-400 text-xs font-semibold mt-2">Syncing maintenance profile from PostgreSQL...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
          {/* Status Panel */}
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase">Emergency Maintenance Switch</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLoadingPreviewModal(true)}
                  className="text-xs font-extrabold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={13} className="text-orange-500" />
                  <span>Preview Loading Screen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="text-xs font-extrabold text-slate-700 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Preview Maintenance Screen</span>
                </button>
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              maintenanceMode ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${maintenanceMode ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {maintenanceMode ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{maintenanceMode ? '● Maintenance Mode Active' : '● Maintenance Mode Off'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                      maintenanceMode ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      {maintenanceMode ? 'MAINTENANCE MODE ACTIVE' : 'MAINTENANCE MODE OFF'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {maintenanceMode 
                      ? 'Checkout operations and payment uploads are safely restricted for regular customers.' 
                      : 'All customers can browse games, select packages, and place orders normally.'}
                  </p>

                  {/* Active Timer Pill in Admin Panel */}
                  {maintenanceMode && remainingTime && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
                      <Timer size={14} className="animate-pulse text-amber-600" />
                      <span>{remainingTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Toggle switch */}
              <button
                type="button"
                onClick={() => handleToggle(!maintenanceMode)}
                disabled={isSyncing}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Duration / Auto Turn Off Selector System (1 Min to 24 Hours) */}
          <div className="p-5 space-y-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock size={15} className="text-red-600" />
                <span>Scheduled Auto Turn Off Duration (1 Min - 24 Hours)</span>
              </label>
              <div className="flex items-center gap-2">
                {isSyncing && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold animate-pulse">
                    <RefreshCw size={10} className="animate-spin" /> Saving...
                  </span>
                )}
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-100">
                  {selectedDuration > 0 ? `Selected: ${formatDurationLabel(selectedDuration)}` : 'Manual Off'}
                </span>
              </div>
            </div>

            {/* Direct Slider & Minute Input Control System (1 Min to 24 Hours) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Timer size={14} className="text-orange-500" />
                  <span>Set Timer (1 Minute to 24 Hours / 1440 Mins)</span>
                </span>
                <span className="text-xs font-mono font-extrabold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                  {formatDurationLabel(selectedDuration)} ({selectedDuration} Mins)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="1440"
                  step="1"
                  value={selectedDuration || 30}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSelectedDuration(v);
                  }}
                  onMouseUp={() => handleApplyCustomValue(selectedDuration)}
                  onTouchEnd={() => handleApplyCustomValue(selectedDuration)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={selectedDuration || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedDuration(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyCustomValue(selectedDuration);
                      }
                    }}
                    placeholder="Mins"
                    className="w-24 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCustomValue(selectedDuration)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Apply Timer
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium">
              💡 Duration timer is saved to PostgreSQL database. Maintenance Mode will <strong className="text-slate-800">automatically turn OFF</strong> when time runs out.
            </p>
          </div>

          {/* Maintenance Notice Message */}
          <div className="p-5 space-y-3">
            <label className="text-xs font-bold text-slate-700">Client-Facing Maintenance Notice Message</label>
            <textarea
              rows={3}
              required
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              onBlur={handleMessageBlur}
              placeholder="Top-up services are currently suspended for regular maintenance. Please check back later."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold text-slate-800 placeholder:text-slate-400"
            />
            <p className="text-[10px] text-slate-400 font-medium">
              This message will be shown on the customer Maintenance Screen when non-admin users attempt to view or use top-up services. Changes are auto-saved.
            </p>
          </div>
        </div>
      )}

      {/* Preview Maintenance Modal */}
      <ModalPortal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} zIndex={999999}>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh] text-white">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-black flex items-center gap-2 text-white">
                <Eye size={16} className="text-amber-400" />
                <span>Live Customer Maintenance Screen Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
              >
                Close Preview
              </button>
            </div>
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-950 flex justify-center items-center">
              <div className="w-full max-w-sm bg-slate-50 text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 relative min-h-[550px]">
                <MaintenanceScreen isPreview onDismissPreview={() => setShowPreviewModal(false)} />
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Preview Loading Screen Modal */}
      <ModalPortal isOpen={showLoadingPreviewModal} onClose={() => setShowLoadingPreviewModal(false)} zIndex={999999}>
        <GameHubLoadingScreen
          message="NEPAL'S #1 GAME TOP-UP & VOUCHER APP"
          isPreview
          autoFinish={false}
          onDismissPreview={() => setShowLoadingPreviewModal(false)}
        />
      </ModalPortal>
    </div>
  );
};
export default AdminMaintenanceTab;
