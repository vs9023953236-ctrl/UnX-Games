import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  Shield,
  Activity,
  ShieldAlert,
  Loader2,
  Edit,
  ChevronRight,
  User as UserIcon,
  UserPlus,
  Mail,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  X,
  Check,
  RotateCw,
  ShoppingBag,
  Wallet,
  Sparkles,
  Copy,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { formatNPR } from '../../../utils/formatters';
import { UserInvitation } from '../../../types';

interface AdminUsersTabProps {
  initialRoleFilter?: string;
  initialView?: 'users' | 'invitations';
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  initialRoleFilter,
  initialView = 'users',
}) => {
  const { showToast, setAdminTab, setAdminSelectedUserId } = useStore();
  const { currentUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'invitations'>(initialView);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter || 'all');

  // Invitations state
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<'STORE_OWNER' | 'SUPER_ADMIN' | 'STORE_MANAGER' | 'SUPPORT_STAFF' | 'CUSTOMER'>('SUPPORT_STAFF');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Selected User Detail Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.admin.getUsers();
      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
      }
    } catch {
      // Handled
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const res = await api.admin.getInvitations();
      if (res.success && Array.isArray(res.invitations)) {
        setInvitations(res.invitations);
      }
    } catch {
      // Handled
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      showToast('error', 'Form Error', 'Email is required.');
      return;
    }

    setSendingInvite(true);
    try {
      const res = await api.admin.inviteUser({
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteFullName.trim() || undefined,
        role: inviteRole,
      });

      if (res.success) {
        showToast('success', 'Invitation Created', `Invite ready for ${inviteEmail}.`);
        setShowInviteModal(false);
        const directLink = res.inviteLink || (res.invitation as any)?.inviteLink;
        if (directLink) {
          setCreatedInviteLink(directLink);
          setShowLinkModal(true);
        }
        setInviteEmail('');
        setInviteFullName('');
        fetchInvitations();
      }
    } catch (err: any) {
      showToast('error', 'Invite Error', err?.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (id: string, email: string) => {
    try {
      const res = await api.admin.resendInvitation(id);
      if (res.success) {
        showToast('success', 'Invitation Renewed', `Sent/updated invite for ${email}`);
        if (res.inviteLink) {
          setCreatedInviteLink(res.inviteLink);
          setShowLinkModal(true);
        }
        fetchInvitations();
      }
    } catch (err: any) {
      showToast('error', 'Resend Error', err?.message);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      const res = await api.admin.cancelInvitation(id);
      if (res.success) {
        showToast('info', 'Invitation Revoked', 'The pending invitation was cancelled.');
        fetchInvitations();
      }
    } catch (err: any) {
      showToast('error', 'Cancel Error', err?.message);
    }
  };

  const handleCopyLink = (link: string) => {
    try {
      navigator.clipboard.writeText(link);
      showToast('success', 'Link Copied', 'Invitation link copied to clipboard.');
    } catch {
      showToast('info', 'Copy Link', link);
    }
  };

  const filteredUsers = users.filter((u) => {
    const r = String(u.role || '').toUpperCase();
    if (roleFilter !== 'all') {
      if (roleFilter === 'customer' && r !== 'CUSTOMER' && r !== 'USER') return false;
      if (roleFilter === 'staff' && !['STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF', 'ADMIN', 'STAFF'].includes(r)) return false;
    }

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      return (
        (u.name || u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.gamer_id || '').toLowerCase().includes(q) ||
        (u.mobile || '').includes(q) ||
        String(u.id || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const totalCustomers = users.filter((u) => (u.role || '').toUpperCase() === 'CUSTOMER' || (u.role || '').toUpperCase() === 'USER').length;
  const totalStaff = users.length - totalCustomers;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Mobile-Native Dark Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shrink-0">
            <Users size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Users & Accounts</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {users.length} ACCOUNTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Gamers: <strong className="text-white">{totalCustomers}</strong> • Staff: <strong className="text-white">{totalStaff}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-indigo-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Invite Staff</span>
          </button>

          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Sub-Tabs & Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Accounts (${users.length})` },
          { id: 'customer', label: `Customers (${totalCustomers})` },
          { id: 'staff', label: `Staff & Admins (${totalStaff})` },
          { id: 'invitations', label: `Staff Invitations (${invitations.length})` },
        ].map((chip) => {
          const active = roleFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setRoleFilter(chip.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {roleFilter === 'invitations' ? (
        /* Staff Invitations Stream */
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-amber-600 shrink-0" />
              <span>
                Pending invitations allow invited team members to securely set up their staff password and activate administrative roles.
              </span>
            </div>
            <button
              type="button"
              onClick={fetchInvitations}
              className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 font-bold hover:bg-amber-100 text-amber-800 text-[11px] shrink-0"
            >
              Refresh
            </button>
          </div>

          {loadingInvitations ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={20} className="animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
              <Mail size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-800 text-sm">No Invitations Sent Yet</p>
              <p className="text-xs text-slate-500 mt-1">Click &quot;Invite Staff&quot; above to invite administrators or managers.</p>
            </div>
          ) : (
            invitations.map((inv, idx) => {
              const isAccepted = inv.status === 'accepted';
              const isExpired = inv.status === 'expired';
              const isPending = !isAccepted && !isExpired;
              const directLink = (inv.metadata as any)?.invite_link || (inv.metadata as any)?.redirectTo || `${window.location.origin}/auth/callback#type=invite`;

              return (
                <div
                  key={`admin-invitation-${inv.id || idx}-${idx}`}
                  className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-400 transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      <Mail size={18} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {inv.full_name || inv.email}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-700">
                          {inv.role}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isAccepted
                              ? 'bg-emerald-100 text-emerald-700'
                              : isExpired
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-700 animate-pulse'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-mono truncate">{inv.email}</p>
                      <p className="text-[10px] text-slate-400">
                        Invited {new Date(inv.invited_at).toLocaleDateString()} by {inv.invited_by_name || 'Admin'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(directLink)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy Invitation Link"
                        >
                          <Copy size={13} />
                          <span>Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResendInvite(inv.id, inv.email)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} />
                          <span>Resend</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                          title="Cancel Invitation"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {isAccepted && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={14} /> Accepted
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search gamer name, email, Gamer ID, phone..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Users Stream (Mobile Cards) */}
          <div className="space-y-2.5">
            {loadingUsers ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={20} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading user accounts...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
                <UserIcon size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-800 text-sm">No Accounts Found</p>
              </div>
            ) : (
              filteredUsers.map((u, idx) => {
                const role = String(u.role || 'CUSTOMER').toUpperCase();
                const isStaff = ['STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(role);
                const isKyc = u.verification_status === 'verified' || u.account_verified;

                return (
                  <div
                    key={`admin-user-${u.id || u.uid || idx}-${idx}`}
                    onClick={() => setSelectedUser(u)}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-indigo-400 transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                        {(u.name || u.full_name || u.email || 'U')[0].toUpperCase()}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {u.name || u.full_name || 'Gamer Account'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              isStaff ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {role}
                          </span>
                          {isKyc && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">
                              KYC
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 font-mono truncate">{u.email}</p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span>Orders: <strong className="text-slate-700">{u.ordersCount || 0}</strong></span>
                          <span>•</span>
                          <span>Spent: <strong className="text-slate-700">{formatNPR(u.totalSpent || 0)}</strong></span>
                          {u.gamer_id && <span>• UID: {u.gamer_id}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <ChevronRight size={18} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserIcon className="text-indigo-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">Account Details</h3>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-bold text-slate-900">{selectedUser.name || selectedUser.full_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-slate-900">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="text-indigo-600 font-bold uppercase">{selectedUser.role || 'CUSTOMER'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Spent:</span>
                  <span className="text-emerald-600 font-bold">{formatNPR(selectedUser.totalSpent || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Orders:</span>
                  <span className="font-bold text-slate-900">{selectedUser.ordersCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">User ID:</span>
                  <span className="text-slate-600 truncate max-w-[180px]">{selectedUser.id}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminSelectedUserId(selectedUser.id);
                    setAdminTab('user_detail');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
                >
                  Full Profile & KYC
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserPlus className="text-indigo-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900">Invite Staff Member</h3>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@unxgames.np"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Full Name (Optional)</label>
                  <input
                    type="text"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="e.g. Binod Thalal"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Administrative Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="SUPPORT_STAFF">Support Staff</option>
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingInvite}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {sendingInvite ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generated Invitation Link Success Modal */}
      <AnimatePresence>
        {showLinkModal && createdInviteLink && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <Check size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Invitation Ready!</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Link generated for team member</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-600 font-medium leading-relaxed">
                  Share this secure invitation link with the staff member so they can set their password and log in:
                </p>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all flex items-center justify-between gap-2">
                  <span className="truncate">{createdInviteLink}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(createdInviteLink)}
                    className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shrink-0 cursor-pointer"
                    title="Copy Link"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(createdInviteLink)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>Copy Invitation Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsersTab;
