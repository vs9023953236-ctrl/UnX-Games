import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../../services/api';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { PasswordResetRequest } from '../../../types';
import { formatDate } from '../../../utils/formatters';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  User,
  Mail,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminPasswordResetsTab: React.FC = () => {
  const { showToast, setAdminTab } = useStore();
  const { currentUser } = useAuth();
  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;

  const [requests, setRequests] = useState<PasswordResetRequest[]>(() => {
    try {
      const cached = null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = null;
      return !(cached && Array.isArray(JSON.parse(cached)));
    } catch {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Confirmation modals
  const [requestToApprove, setRequestToApprove] = useState<PasswordResetRequest | null>(null);
  const [requestToReject, setRequestToReject] = useState<PasswordResetRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    if (requests.length === 0) {
      setLoading(true);
    }
    try {
      const res = await api.admin.getPasswordResetRequests();
      if (res.success && res.requests) {
        setRequests(res.requests);
        try {

        } catch {}
      }
    } catch {
      if (requests.length === 0) {
        showToast('error', 'Error', 'Failed to fetch password reset requests.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const handleApprove = async () => {
    if (!requestToApprove) return;
    setActionLoading(true);
    try {
      const res = await api.admin.approvePasswordReset(requestToApprove.id);
      if (res.success) {
        showToast('success', 'Reset Approved', `Password updated for ${requestToApprove.email}`);
        setRequestToApprove(null);
        await fetchRequests();
      } else {
        showToast('error', 'Approval Failed', res.message || 'Could not approve request.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to communicate with server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestToReject) return;
    setActionLoading(true);
    try {
      const res = await api.admin.rejectPasswordReset(requestToReject.id, rejectReason.trim() || undefined);
      if (res.success) {
        showToast('info', 'Request Rejected', `Password reset declined for ${requestToReject.email}`);
        setRequestToReject(null);
        setRejectReason('');
        await fetchRequests();
      } else {
        showToast('error', 'Rejection Failed', res.message || 'Could not reject request.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to communicate with server.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (r.userName && r.userName.toLowerCase().includes(q))
      );
    });
  }, [requests, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const approved = requests.filter((r) => r.status === 'APPROVED').length;
    const rejected = requests.filter((r) => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [requests]);

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
              Customer Password Reset Authorization privileges are restricted exclusively to the Store Owner.
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
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <KeyRound size={20} />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Password Reset Requests
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Review and approve customer password reset requests. Passwords are only activated upon admin verification.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <KeyRound size={16} />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock size={16} />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.pending}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.approved}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
            <XCircle size={16} />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.rejected}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Email, Name, Phone or Request ID..."
            className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab, idx) => (
            <button
              key={`pwd-reset-tab-${tab}-${idx}`}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading reset requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <KeyRound size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No reset requests found</p>
            <p className="text-xs">There are no requests matching your current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req, rIdx) => (
                  <tr key={`admin-reset-req-${req.id || rIdx}-${rIdx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {req.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span>{req.userName || 'Customer'}</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Mail size={12} className="text-slate-400" />
                        <span>{req.email}</span>
                      </div>
                      {req.phone && (
                        <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} className="text-slate-400" />
                          <span>{req.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}
                      >
                        {req.status === 'APPROVED' && <CheckCircle2 size={12} />}
                        {req.status === 'REJECTED' && <XCircle size={12} />}
                        {req.status === 'PENDING' && <Clock size={12} />}
                        <span>{req.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {req.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setRequestToApprove(req)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRequestToReject(req)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Resolved {req.reviewedAt ? formatDate(req.reviewedAt) : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <AnimatePresence>
        {requestToApprove && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShieldCheck size={24} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Approve Password Reset?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Approving this request will immediately apply the newly hashed password to{' '}
                  <strong className="text-slate-800">{requestToApprove.email}</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Request ID:</span>
                  <span className="font-mono font-bold text-slate-900">{requestToApprove.id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>User:</span>
                  <span className="font-bold text-slate-900">{requestToApprove.userName || requestToApprove.email}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Security:</span>
                  <span className="text-indigo-600 font-bold">Supabase Auth Secured</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestToApprove(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Confirmation Modal */}
      <AnimatePresence>
        {requestToReject && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Reject Password Reset?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Declining this reset will leave the existing password for{' '}
                  <strong className="text-slate-800">{requestToReject.email}</strong> untouched.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Rejection Reason (Optional)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Identity could not be verified"
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRequestToReject(null);
                    setRejectReason('');
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <XCircle size={16} />
                      <span>Reject Request</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AdminPasswordResetsTab;
