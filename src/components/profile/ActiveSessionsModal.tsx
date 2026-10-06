import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, Shield, LogOut, RefreshCw, X, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../services/api';
import { ModalPortal } from '../common/ModalPortal';

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    } else {
      setMessage(null);
      setConfirmRevokeOthers(false);
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchApi<any>('/api/sessions');
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to load active sessions.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const data = await fetchApi<any>(`/api/sessions/${sessionId}/revoke`, { method: 'POST' });
      if (data.success) {
        setMessage({ type: 'success', text: 'Device session revoked successfully.' });
        loadSessions();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to revoke session.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke session.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeOthers = async () => {
    if (!confirmRevokeOthers) {
      setConfirmRevokeOthers(true);
      return;
    }
    setConfirmRevokeOthers(false);
    setActionLoading(true);
    setMessage(null);
    try {
      const data = await fetchApi<any>('/api/sessions/revoke-others', { method: 'POST' });
      if (data.success) {
        setMessage({ type: 'success', text: 'All other device sessions revoked successfully.' });
        loadSessions();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to revoke other sessions.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke other sessions.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[99999] transition-opacity"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[88dvh] flex flex-col border border-slate-200/90 shadow-2xl text-left overflow-hidden animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Shield className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">Active Device Sessions</h3>
                <p className="text-[11px] text-slate-500 font-medium">Manage devices logged into your Unx Games account</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {message && (
            <div className={`mx-5 mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {message.text}
            </div>
          )}

          <div className="px-5 pt-3 text-xs text-slate-500">
            If you see an unrecognized device, revoke it immediately to protect your account.
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-violet-600" />
                <span>Loading active sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active sessions found.
              </div>
            ) : (
              sessions.map((s, sIdx) => {
                const DeviceIcon = s.device_type === 'Mobile' ? Smartphone : s.device_type === 'Tablet' ? Tablet : Monitor;
                const isRevoked = Boolean(s.revokedAt || !s.isActive);
                return (
                  <div
                    key={`user-session-${s.id || sIdx}-${sIdx}`}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                      s.isCurrent
                        ? 'border-violet-300 bg-violet-50/60 shadow-xs'
                        : isRevoked
                        ? 'border-slate-200 bg-slate-50/40 opacity-70'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl shrink-0 border ${
                        s.isCurrent
                          ? 'bg-violet-100 text-violet-600 border-violet-200'
                          : isRevoked
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                        <DeviceIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {s.browser || 'Browser'} on {s.os || 'Device'}
                          </span>
                          {s.isCurrent && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-600 text-white shrink-0">
                              Current Device
                            </span>
                          )}
                          {isRevoked && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600 shrink-0">
                              Signed Out
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          IP: <span className="font-mono">{s.ip_address || '127.0.0.1'}</span> • {s.location_approx || 'Nepal Region'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Last active: {new Date(s.lastActivityAt || s.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!s.isCurrent && !isRevoked && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2.5 bg-slate-50/80 shrink-0">
            {sessions.some(s => !s.isCurrent && !s.revokedAt && s.isActive) ? (
              <button
                onClick={handleRevokeOthers}
                disabled={actionLoading}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs ${
                  confirmRevokeOthers ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{confirmRevokeOthers ? 'Confirm: Sign Out All Others?' : 'Sign Out Other Devices'}</span>
              </button>
            ) : (
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>All other devices signed out</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-extrabold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 ml-auto cursor-pointer shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
