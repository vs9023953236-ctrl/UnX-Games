import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import { formatNPR, formatDate, formatDisplayOrderId, getOrderAccountShortLabel, formatVerifierName } from '../../../utils/formatters';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { api } from '../../../services/api';
import { UserRole, UserStatus } from '../../../types';
import {
  ArrowLeft,
  ChevronLeft,
  ShoppingBag,
  TrendingUp,
  UserX,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageCircle,
  Edit2,
  Shield,
  Save,
  X,
  CheckCircle2,
  RotateCw,
  Clock,
  Gamepad2,
  Zap,
  Database,
  Copy,
  Check,
  ShieldCheck,
  KeyRound,
  Lock,
  XCircle,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { ThreeActionSlider, ActionItem } from '../../../components/common/ThreeActionSlider';
import { motion, AnimatePresence } from 'motion/react';

export const AdminUserDetailTab: React.FC = () => {
  const { users, currentUser, toggleUserStatus, adminUpdateUser, adminDeleteUser, refreshUsers, adminVerifyUserAccount } = useAuth();
  const {
    orders,
    adminSelectedUserId,
    setAdminTab,
    setAdminSelectedUserId,
    setAdminSelectedOrderId,
    sendNotification,
    showToast,
  } = useStore();

  const [dbData, setDbData] = useState<any | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);
  const [loadState, setLoadState] = useState<'LOADING' | 'USER_FOUND' | 'USER_NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'INVALID_USER_ID'>('LOADING');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isVerifyingAction, setIsVerifyingAction] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('CUSTOMER');
  const [isChangingRole, setIsChangingRole] = useState(false);

  const loadCustomerFromDb = useCallback(async () => {
    if (!adminSelectedUserId) {
      setLoadState('INVALID_USER_ID');
      return;
    }
    const cleanId = String(adminSelectedUserId).trim();
    if (!cleanId) {
      setLoadState('INVALID_USER_ID');
      return;
    }

    setIsLoadingDb(true);
    setLoadState('LOADING');
    try {
      const res = await api.customers.getById(cleanId);
      if (res && res.success) {
        setDbData(res);
        setLoadState('USER_FOUND');
      } else {
        const status = (res as any)?.status || 200;
        const msg = String((res as any)?.message || '').toLowerCase();
        if (status === 403 || status === 401 || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('permission')) {
          setLoadState('UNAUTHORIZED');
        } else {
          setLoadState('USER_NOT_FOUND');
        }
      }
    } catch (e: any) {
      console.error('Failed to load customer from DB:', e);
      const msg = String(e.message || '').toLowerCase();
      const status = e.status || 500;
      if (status === 403 || status === 401 || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('permission')) {
        setLoadState('UNAUTHORIZED');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('connection')) {
        setLoadState('NETWORK_ERROR');
      } else {
        setLoadState('SERVER_ERROR');
      }
    } finally {
      setIsLoadingDb(false);
    }
  }, [adminSelectedUserId]);

  useEffect(() => {
    loadCustomerFromDb();
  }, [loadCustomerFromDb]);

  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'STORE_MANAGER' || uRole === 'STORE_MANAGER' || isSuperAdmin;
  const isStaffOnly = !isManager && uRole === 'SUPPORT_STAFF';

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRole, setEditRole] = useState<any>('CUSTOMER');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [edit2FA, setEdit2FA] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isResetting2FA, setIsResetting2FA] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Delete User Confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Notification to this user
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Target User memo
  const targetUser = useMemo(() => {
    if (dbData?.customer) return dbData.customer;
    if (!adminSelectedUserId) return null;
    return users.find((u) => 
      u.uid === adminSelectedUserId || 
      u.id === adminSelectedUserId || 
      (u as any).supabase_auth_user_id === adminSelectedUserId
    ) || null;
  }, [dbData, users, adminSelectedUserId]);

  useEffect(() => {
    if (dbData?.customer) {
      setLoadState('USER_FOUND');
    } else if (targetUser) {
      setLoadState('USER_FOUND');
    } else if (!isLoadingDb) {
      setLoadState('USER_NOT_FOUND');
    }
  }, [dbData, targetUser, isLoadingDb]);

  // Orders placed by this user (from DB or fallback store)
  const userOrders = useMemo(() => {
    if (dbData?.orders && Array.isArray(dbData.orders)) {
      return dbData.orders;
    }
    if (!targetUser) return [];
    const uid = targetUser.uid || (targetUser as any).id;
    return orders.filter(
      (o: any) =>
        o.userId === uid ||
        o.customerId === uid ||
        o.customer_id === uid ||
        (targetUser.email &&
          (o.userEmail?.toLowerCase() === targetUser.email.toLowerCase() ||
            o.customerEmail?.toLowerCase() === targetUser.email.toLowerCase() ||
            o.customer_email_snapshot?.toLowerCase() === targetUser.email.toLowerCase()))
    );
  }, [orders, targetUser, dbData]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (dbData?.stats) {
      return dbData.stats;
    }
    const totalOrders = userOrders.length;
    const completedOrders = userOrders.filter(
      (o) => o.orderStatus === 'completed' || o.orderStatus === 'delivered'
    ).length;
    const totalSpent = userOrders
      .filter(
        (o) =>
          o.orderStatus === 'completed' ||
          o.orderStatus === 'delivered' ||
          o.orderStatus === 'payment_verified' ||
          o.orderStatus === 'processing'
      )
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    return { totalOrders, completedOrders, totalSpent };
  }, [userOrders, dbData]);

  const userUid = targetUser?.uid || targetUser?.supabase_auth_user_id || targetUser?.id || '';
  const isCurrent = currentUser?.uid === userUid;
  const cleanPhone = (targetUser?.phone || targetUser?.mobile) ? String(targetUser.phone || targetUser.mobile).replace(/[^0-9]/g, '') : '';
  const waNumber = cleanPhone.startsWith('977') ? cleanPhone : `977${cleanPhone}`;

  const is2FAActive = Boolean(targetUser?.two_factor_enabled || targetUser?.twoFactorEnabled);

  const handleStartEdit = () => {
    if (!targetUser) return;
    setEditName(targetUser.name);
    setEditPhone(targetUser.phone || targetUser.mobile || '');
    setEditLocation(targetUser.location || targetUser.city || 'Kathmandu, Nepal');
    setEditRole(String(targetUser.role || 'CUSTOMER').toUpperCase());
    setEditStatus(targetUser.status);
    setEdit2FA(is2FAActive);
    setIsEditing(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('error', 'Validation', 'Name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      const userId = userUid;
      await api.customers.update(userId, {
        name: editName.trim(),
        full_name: editName.trim(),
        phone: editPhone.trim(),
        mobile: editPhone.trim(),
        role: editRole,
        status: editStatus,
        two_factor_enabled: edit2FA,
      });

      if (adminUpdateUser) {
        await adminUpdateUser(userUid, {
          name: editName.trim(),
          phone: editPhone.trim(),
          location: editLocation.trim(),
          role: editRole,
          status: editStatus,
        });
      }
      await loadCustomerFromDb();
      if (refreshUsers) refreshUsers();
      showToast('success', 'Profile Updated', `Saved details for ${editName}`);
      setIsEditing(false);
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    const userId = userUid;
    const nextState = !is2FAActive;
    try {
      await api.customers.toggle2FA(userId, nextState);
      await loadCustomerFromDb();
      if (refreshUsers) refreshUsers();
      showToast('success', '2FA Status Updated', `2-Step Verification has been ${nextState ? 'Enabled' : 'Disabled'} for ${targetUser.name}.`);
    } catch (err: any) {
      showToast('error', '2FA Update Failed', err.message || 'Could not toggle 2FA.');
    }
  };

  const [isVerifyingMobile, setIsVerifyingMobile] = useState(false);

  const handleToggleMobileVerification = async () => {
    if (!targetUser) return;
    const nextState = !targetUser.mobile_verified;
    setIsVerifyingMobile(true);
    try {
      const res = await api.customers.verifyMobile(userUid, nextState);
      if (res && res.success) {
        showToast(
          'success',
          'Mobile Verification Updated',
          `Mobile number has been manually ${nextState ? 'Verified' : 'marked as Pending'}.`
        );
        await loadCustomerFromDb();
        if (refreshUsers) {
          await refreshUsers();
        }
      } else {
        showToast('error', 'Update Failed', res?.message || 'Could not update mobile verification status.');
      }
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'An error occurred while updating mobile verification.');
    } finally {
      setIsVerifyingMobile(false);
    }
  };

  const handleReset2FA = async () => {
    const userId = userUid;
    if (!window.confirm(`Are you sure you want to reset all MFA/2FA factors for ${targetUser.name}? This will remove their TOTP authenticator from Supabase Auth so they can log in without it or re-enroll.`)) {
      return;
    }
    setIsResetting2FA(true);
    try {
      const res = await api.customers.reset2FA(userId);
      if (res && res.success) {
        await loadCustomerFromDb();
        if (refreshUsers) refreshUsers();
        showToast('success', 'MFA Reset Complete', `All MFA factors removed from Supabase Auth for ${targetUser.name}.`);
      } else {
        showToast('error', 'Reset Failed', res?.message || 'Could not reset MFA.');
      }
    } catch (err: any) {
      showToast('error', 'Reset Failed', err?.message || 'Could not reset MFA.');
    } finally {
      setIsResetting2FA(false);
    }
  };

  const handleAdminVerifyAction = async (action: 'approve' | 'reject' | 'reset', reason?: string) => {
    if (!targetUser) return;
    const userId = userUid;
    setIsVerifyingAction(true);
    try {
      const res = await adminVerifyUserAccount(userId, action, reason || rejectionReasonInput);
      if (res && res.success) {
        showToast(
          'success',
          'Verification Updated',
          action === 'approve'
            ? `${targetUser.name}'s account is now 100% Unx Games Verified!`
            : action === 'reject'
            ? `Verification request rejected for ${targetUser.name}.`
            : `Verification status reset to unverified.`
        );
        await loadCustomerFromDb();
        if (refreshUsers) refreshUsers();
        setRejectionModalOpen(false);
        setRejectionReasonInput('');
      } else {
        showToast('error', 'Update Failed', res?.message || 'Could not update verification status.');
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Error executing verification action.');
    } finally {
      setIsVerifyingAction(false);
    }
  };

  const handleToggleStatus = async () => {
    if (isTogglingStatus) return;
    const tRole = String(targetUser.role || '').toUpperCase();
    if ((tRole === 'STORE_OWNER' || tRole === 'STORE_MANAGER') && !isStoreOwner) {
      showToast('error', 'Action Restricted', 'Store Manager and Store Owner accounts are permanently locked and protected against blocking.');
      return;
    }
    const userId = userUid;
    const isCurrentlyActive = String(targetUser.status || '').toLowerCase() === 'active';
    setIsTogglingStatus(true);
    try {
      if (isCurrentlyActive) {
        await api.customers.block(userId);
        showToast('info', 'Customer Blocked', `${targetUser.name} has been blocked and active sessions revoked.`);
      } else {
        await api.customers.unblock(userId);
        showToast('success', 'Customer Unblocked', `${targetUser.name} is now restored to Active status.`);
      }
      await loadCustomerFromDb();
      if (refreshUsers) refreshUsers();
    } catch (err: any) {
      showToast('error', 'Status Update Failed', err.message || 'Could not update customer status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDeleteUser = async () => {
    const tRole = String(targetUser.role || '').toUpperCase();
    if (tRole === 'STORE_OWNER') {
      showToast('error', 'Action Restricted', 'Store Owner accounts are permanently locked and cannot be deleted.');
      setShowDeleteModal(false);
      return;
    }
    if (tRole === 'SUPER_ADMIN' && !isStoreOwner) {
      showToast('error', 'Action Restricted', 'Only the Store Owner can delete a Super Admin account.');
      setShowDeleteModal(false);
      return;
    }
    if (deleteConfirmText.trim() !== 'DELETE ACCOUNT') {
      showToast('error', 'Confirmation Required', 'Please type DELETE ACCOUNT to confirm deletion.');
      return;
    }
    if (!adminDeleteUser) return;
    setIsDeleting(true);
    try {
      const success = await adminDeleteUser(userUid, deleteConfirmText.trim());
      if (success) {
        showToast('info', 'Account Deleted', `${targetUser.name}'s account credentials have been removed. Financial and order history safely preserved.`);
        setShowDeleteModal(false);
        setDeleteConfirmText('');
        setAdminSelectedUserId(null);
        setAdminTab('users');
      } else {
        showToast('error', 'Delete Failed', 'Failed to delete user account');
      }
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message || 'Could not delete user account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendDirectNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('error', 'Validation Error', 'Title and message are required.');
      return;
    }

    setIsSendingNotif(true);
    try {
      await sendNotification(
        {
          recipientUid: userUid,
          recipientRole: 'user',
          userId: userUid,
          isGlobal: false,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: 'announcement',
        },
        currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined
      );
      showToast('success', 'Alert Sent', `Notification delivered to ${targetUser.name}.`);
      setShowNotifModal(false);
      setNotifTitle('');
      setNotifMessage('');
    } catch (e: any) {
      showToast('error', 'Dispatch Error', e.message || 'Could not send notification.');
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleInspectOrder = (orderId: string) => {
    setAdminSelectedOrderId(orderId);
    setAdminTab('order_detail');
  };

  const userDetailActions: ActionItem[] = useMemo(() => {
    if (!targetUser) return [];
    const isOwnerTarget = String(targetUser.role || '').toUpperCase() === 'STORE_OWNER' || String(targetUser.role).toLowerCase() === 'super_admin';

    const actionsList: ActionItem[] = [
      {
        id: 'send_alert',
        label: 'Send Alert',
        shortLabel: 'Alert',
        icon: <Mail size={13} />,
        onClick: () => setShowNotifModal(true),
        variant: 'primary',
      },
    ];

    if (isManager) {
      actionsList.push({
        id: 'edit_profile',
        label: 'Edit Profile',
        shortLabel: 'Edit',
        icon: <Edit2 size={13} />,
        onClick: handleStartEdit,
        variant: 'outline',
      });

      actionsList.push({
        id: 'toggle_status',
        label: isOwnerTarget ? 'Suspend (Locked)' : targetUser.status === 'active' ? 'Suspend User' : 'Activate User',
        shortLabel: isOwnerTarget ? 'Suspend 🔒' : isTogglingStatus ? 'Updating...' : targetUser.status === 'active' ? 'Suspend' : 'Activate',
        icon: isTogglingStatus ? <RefreshCw size={13} className="animate-spin" /> : targetUser.status === 'active' ? <UserX size={13} /> : <UserCheck size={13} />,
        disabled: isTogglingStatus || isOwnerTarget,
        onClick: () => {
          if (isOwnerTarget) {
            showToast('error', 'Action Restricted', 'Platform Owner account is permanently locked as Store Owner and cannot be suspended.');
            return;
          }
          handleToggleStatus();
        },
        variant: isOwnerTarget ? 'outline' : targetUser.status === 'active' ? 'amber' : 'success',
      });
    }

    if (isSuperAdmin) {
      actionsList.push({
        id: 'delete_account',
        label: isOwnerTarget ? 'Delete (Locked)' : 'Delete Account',
        shortLabel: isOwnerTarget ? 'Delete 🔒' : 'Delete',
        icon: <UserX size={13} />,
        onClick: () => {
          if (isOwnerTarget) {
            showToast('error', 'Action Restricted', 'Platform Owner account is permanently locked as Store Owner and cannot be deleted.');
            return;
          }
          setDeleteConfirmText('');
          setShowDeleteModal(true);
        },
        variant: isOwnerTarget ? 'outline' : 'danger',
      });
    }

    return actionsList;
  }, [targetUser, handleStartEdit, handleToggleStatus, isManager, isSuperAdmin, showToast]);

  const cleanLocationString = useCallback((loc?: string) => {
    if (!loc) return 'Kathmandu, Nepal';
    const parts = loc.split(',').map((s) => s.trim()).filter(Boolean);
    const unique = Array.from(new Set(parts));
    return unique.join(', ') || 'Kathmandu, Nepal';
  }, []);

  if (loadState === 'LOADING') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-xs max-w-xl mx-auto my-8">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
            <Database size={24} className="text-indigo-600 animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin pointer-events-none" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">Retrieving Profile...</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Fetching customer account information from the secure database. Please wait a moment.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === 'UNAUTHORIZED') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide text-amber-700">Unauthorized Access</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your current administrative session does not have permissions to inspect or manage this user's profile.
          </p>
        </div>
        <button
          onClick={() => {
            setAdminSelectedUserId(null);
            setAdminTab('users');
          }}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition duration-200 shadow-xs cursor-pointer"
        >
          Return to User Directory
        </button>
      </div>
    );
  }

  if (loadState === 'NETWORK_ERROR') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center mx-auto">
          <Zap size={28} className="animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide text-red-600">Network Failure</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            A secure connection to the backend service could not be established. Please check your network and try again.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => loadCustomerFromDb()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition duration-200 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <RotateCw size={14} />
            Retry
          </button>
          <button
            onClick={() => {
              setAdminSelectedUserId(null);
              setAdminTab('users');
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition duration-200 cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loadState === 'SERVER_ERROR') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
          <Database size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide text-rose-600">Server Error</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The server encountered an unexpected error while retrieving this user record from the database.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => loadCustomerFromDb()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition duration-200 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <RotateCw size={14} />
            Retry
          </button>
          <button
            onClick={() => {
              setAdminSelectedUserId(null);
              setAdminTab('users');
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition duration-200 cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loadState === 'INVALID_USER_ID') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center mx-auto">
          <XCircle size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide text-amber-600">Invalid Identifier</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The provided user identifier is invalid, incomplete, or corrupted. Please return to the directory and try again.
          </p>
        </div>
        <button
          onClick={() => {
            setAdminSelectedUserId(null);
            setAdminTab('users');
          }}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition duration-200 shadow-xs cursor-pointer"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  if (loadState === 'USER_NOT_FOUND' || !targetUser) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <UserX size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">User Account Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The requested customer profile could not be located in our secure directory. It may have been permanently deleted.
          </p>
        </div>
        <button
          onClick={() => {
            setAdminSelectedUserId(null);
            setAdminTab('users');
          }}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition duration-200 shadow-xs cursor-pointer"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Staff Read-Only Notice Banner */}
      {isStaffOnly && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-amber-600 shrink-0" />
            <span>Support Staff Read-Only Mode: You can view customer records & KYC verification status. Approving/rejecting KYC or modifying user profiles requires Manager access.</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/90 text-amber-950 text-[10px] uppercase tracking-wider font-extrabold shrink-0 border border-amber-300">
            Staff View Only
          </span>
        </div>
      )}

      {/* 1. Advanced Mobile App Profile Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Subtle Ambient Glow Background Effect */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-purple-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar & User Details */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-900 overflow-hidden flex items-center justify-center text-xl font-black text-white">
                  {targetUser.photoURL ? (
                    <img src={targetUser.photoURL} alt={targetUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-2xl">{targetUser.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
              {/* Online/Active status badge */}
              <span
                className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-slate-900 shadow-md ${
                  targetUser.status === 'active'
                    ? 'bg-emerald-400 ring-4 ring-emerald-500/30 animate-pulse'
                    : targetUser.status === 'suspended'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                title={`Status: ${targetUser.status}`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{targetUser.name}</h1>
                <span
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                    ['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN'].includes(String(targetUser.role || '').toUpperCase())
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md'
                      : String(targetUser.role).toLowerCase() === 'admin'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30 backdrop-blur-md'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur-md'
                  }`}
                >
                  {['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN'].includes(String(targetUser.role || '').toUpperCase()) && (
                    <Lock size={11} className="text-indigo-400 shrink-0" />
                  )}
                  {String(targetUser.role || '').toUpperCase() === 'STORE_OWNER'
                    ? 'Store Owner'
                    : String(targetUser.role || '').toUpperCase() === 'STORE_MANAGER'
                    ? 'Store Manager'
                    : targetUser.role}
                </span>
                {['STORE_OWNER', 'SUPER_ADMIN'].includes(String(currentUser?.role || '').toUpperCase()) && (
                  <button
                    onClick={() => {
                      setSelectedNewRole(String(targetUser.role || 'CUSTOMER').toUpperCase() as UserRole);
                      setShowRoleModal(true);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-indigo-600/30 text-indigo-200 hover:bg-indigo-600/50 border border-indigo-500/40 transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                    title="Manage & Update Canonical User Role"
                  >
                    <Shield size={11} className="text-indigo-300" />
                    <span>Change Role</span>
                  </button>
                )}
                <span
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                    targetUser.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : targetUser.status === 'suspended'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}
                >
                  {targetUser.status}
                </span>
              </div>

              {/* Monospace UID Pill with Copy */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userUid);
                    setCopiedId('uid');
                    setTimeout(() => setCopiedId(null), 1500);
                    showToast('success', 'Copied', 'UID copied.');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 font-mono text-[11px] font-bold border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
                  title="Click to copy UID"
                >
                  <span>UID: {userUid ? `${userUid.slice(0, 16)}...` : 'N/A'}</span>
                  {copiedId === 'uid' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-indigo-300" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Contact & Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact Information Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={14} className="text-indigo-600" />
              <span>Contact & Profile</span>
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Mobile Phone */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" />
                <span>Mobile:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {targetUser.phone || targetUser.mobile || 'Not provided'}
                </span>
                {(targetUser.phone || targetUser.mobile) && (
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${targetUser.phone || targetUser.mobile}`}
                      className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold flex items-center gap-1"
                    >
                      <Phone size={10} /> Call
                    </a>
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold flex items-center gap-1"
                      >
                        <MessageCircle size={10} /> WA
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                <span>Email:</span>
              </span>
              <a
                href={`mailto:${targetUser.email}`}
                className="font-mono font-bold text-indigo-600 hover:underline max-w-[180px] truncate"
              >
                {targetUser.email}
              </a>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" />
                <span>City:</span>
              </span>
              <span className="font-bold text-slate-900 text-right max-w-[180px] truncate">
                {cleanLocationString(targetUser.location || targetUser.city || targetUser.district)}
              </span>
            </div>

            {/* Joined Date */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>Registered:</span>
              </span>
              <span className="text-slate-700 font-medium">{formatDate(targetUser.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Supabase Auth & Security Identity Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              <span>Supabase Auth & Security</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Synced
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Supabase Auth ID */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Zap size={13} className="text-amber-500" />
                <span>Supabase Auth ID:</span>
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800">
                <span className="max-w-[140px] truncate font-bold" title={targetUser.supabase_auth_user_id || targetUser.uid}>
                  {targetUser.supabase_auth_user_id || targetUser.uid || 'Synced'}
                </span>
                <button
                  onClick={() => {
                    const toCopy = targetUser.supabase_auth_user_id || targetUser.uid;
                    if (toCopy) {
                      navigator.clipboard.writeText(toCopy);
                      setCopiedId('supabase');
                      setTimeout(() => setCopiedId(null), 2000);
                      showToast('success', 'Copied', 'Supabase Auth ID copied.');
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                  title="Copy Auth ID"
                >
                  {copiedId === 'supabase' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Email Verified */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Email Verification:</span>
              <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-md ${
                targetUser.email_verified
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <CheckCircle2 size={11} />
                {targetUser.email_verified ? 'Verified (Supabase Auth)' : 'Unverified'}
              </span>
            </div>

            {/* Mobile Verified */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Mobile Verification:</span>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-md ${
                  targetUser.mobile_verified
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {targetUser.mobile_verified ? 'Verified' : 'Pending'}
                </span>

                <button
                  onClick={handleToggleMobileVerification}
                  disabled={isVerifyingMobile}
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md cursor-pointer transition-all border flex items-center gap-1 active:scale-95 ${
                    targetUser.mobile_verified
                      ? 'bg-slate-50 hover:bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-2xs'
                  }`}
                  title={targetUser.mobile_verified ? "Click to set verification back to Pending" : "Click to manually verify Mobile Number"}
                >
                  {isVerifyingMobile ? (
                    <span className="w-2 h-2 rounded-full border-t border-indigo-200 animate-spin" />
                  ) : targetUser.mobile_verified ? (
                    '❌ Reset'
                  ) : (
                    '✅ Verify Manual'
                  )}
                </button>
              </div>
            </div>

            {/* Database UUID */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Database size={13} className="text-slate-400" />
                <span>Database UUID:</span>
              </span>
              <span className="font-mono text-[11px] text-slate-700 font-bold max-w-[130px] truncate" title={targetUser.id || targetUser.uid}>
                #{targetUser.id || targetUser.uid}
              </span>
            </div>
          </div>
        </div>

        {/* 6-Step Account Setup & Gamer Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Gamepad2 size={15} className="text-indigo-600" />
              <span>6-Step Account Setup Status</span>
            </h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                targetUser.setup_completed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {targetUser.setup_completed
                ? 'Completed (6/6 Steps)'
                : `In Progress (Step ${Math.min(Math.max(Number(targetUser.setup_step) || 1, 1), 6)}/6)`}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Setup Progress:</span>
              <span className="font-bold text-slate-900">
                {targetUser.setup_completed ? '100% Finalized' : `${Math.round(((Number(targetUser.setup_step) || 1) / 6) * 100)}% Complete`}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Current Step:</span>
              <span className="font-bold text-indigo-700">
                {targetUser.setup_completed
                  ? 'Step 6/6 — Confirmation & Live Ready'
                  : `Step ${Math.min(Math.max(Number(targetUser.setup_step) || 1, 1), 6)} of 6`}
              </span>
            </div>

            {/* Favorite Games List if available */}
            {Array.isArray(targetUser.favorite_games) && targetUser.favorite_games.length > 0 && (
              <div className="py-1 border-b border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium block">Configured Game Accounts / UIDs:</span>
                <div className="flex flex-wrap gap-1.5">
                  {targetUser.favorite_games.map((fg: any, idx: number) => {
                    const gName = typeof fg === 'string' ? fg : (fg.game || fg.name || `Game ${idx + 1}`);
                    const gUid = typeof fg === 'object' && fg.playerId ? fg.playerId : (typeof fg === 'object' && fg.uid ? fg.uid : null);
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-800">
                        <span className="font-bold text-indigo-700">{gName}</span>
                        {gUid && <span className="text-slate-500 font-normal">({gUid})</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Verification & Document Review Card */}
        <div className="bg-white border border-indigo-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
            <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600" />
              <span>Identity & Account Verification System</span>
            </h2>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                targetUser.account_verified || targetUser.verification_status === 'verified'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : targetUser.verification_status === 'pending'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : targetUser.verification_status === 'rejected'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {targetUser.account_verified || targetUser.verification_status === 'verified'
                ? 'VERIFIED ✔'
                : targetUser.verification_status === 'pending'
                ? 'PENDING APPROVAL ⏳'
                : targetUser.verification_status === 'rejected'
                ? 'REJECTED ❌'
                : 'UNVERIFIED'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Document Type */}
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Document Type:</span>
              <span className="font-bold text-slate-900">
                {targetUser.verification_doc_type || 'Not Provided'}
              </span>
            </div>

            {/* Document Number */}
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">ID / Document Number:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {targetUser.verification_doc_number || 'N/A'}
              </span>
            </div>

            {/* Submission Date */}
            {targetUser.verification_submitted_at && (
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Submitted On:</span>
                <span className="font-medium text-slate-700">
                  {formatDate(targetUser.verification_submitted_at)}
                </span>
              </div>
            )}

            {/* Verification Notes */}
            {targetUser.verification_notes && (
              <div className="py-1 border-b border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium block">User Submitted Notes / Proof:</span>
                <p className="p-2 rounded-xl bg-slate-50 text-slate-800 font-mono text-[11px] leading-relaxed break-all border border-slate-200">
                  {targetUser.verification_notes}
                </p>
              </div>
            )}

            {/* Rejection Reason if present */}
            {targetUser.rejection_reason && (
              <div className="py-1 border-b border-slate-100 space-y-1">
                <span className="text-rose-600 font-bold block">Rejection Reason:</span>
                <p className="p-2 rounded-xl bg-rose-50 text-rose-800 text-[11px] leading-relaxed border border-rose-200 font-medium">
                  {targetUser.rejection_reason}
                </p>
              </div>
            )}

            {/* Verified By / Date */}
            {targetUser.verified_by && (
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 font-medium">Approved By:</span>
                <span className="font-bold text-emerald-700">
                  {formatVerifierName(targetUser.verified_by)} {targetUser.verified_at ? `(${formatDate(targetUser.verified_at)})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons for Admin / Notice for Staff */}
          {isManager ? (
            <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAdminSelectedUserId(targetUser.id || targetUser.uid);
                  setAdminTab('kyc');
                }}
                className="py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="View full KYC application and ID photos in dedicated KYC Hub"
              >
                <ShieldCheck size={14} />
                <span>KYC Verification Hub →</span>
              </button>

              {targetUser.verification_status !== 'verified' && (
                <button
                  type="button"
                  disabled={isVerifyingAction}
                  onClick={() => handleAdminVerifyAction('approve')}
                  className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve</span>
                </button>
              )}

              {targetUser.verification_status !== 'rejected' && (
                <button
                  type="button"
                  disabled={isVerifyingAction}
                  onClick={() => setRejectionModalOpen(true)}
                  className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </button>
              )}

              {(targetUser.account_verified || targetUser.verification_status !== 'unverified') && (
                <button
                  type="button"
                  disabled={isVerifyingAction}
                  onClick={() => handleAdminVerifyAction('reset')}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  title="Reset verification to unverified state"
                >
                  <RotateCw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
              <Lock size={14} className="text-amber-500 shrink-0" />
              <span>Staff Read-Only View: Manager approval required to change KYC verification state.</span>
            </div>
          )}
        </div>

        {/* 2-Step Verification (Supabase Auth TOTP MFA) Card */}
        <div className="bg-white border border-purple-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
            <h2 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-purple-600" />
              <span>Two-Factor Authentication (TOTP)</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                is2FAActive
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {is2FAActive ? 'TOTP Active (AAL2)' : 'Disabled (AAL1)'}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Auth Factor Type:</span>
              <span className="font-bold text-slate-900">
                Supabase Auth TOTP (App Authenticator)
              </span>
            </div>

            {is2FAActive ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Enrolled &amp; Protected</span>
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  The user must provide a valid 6-digit TOTP code from their mobile authenticator app at login.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                Two-Factor Authentication is currently not active for this account.
              </div>
            )}

            {/* Admin Action Buttons */}
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={handleToggle2FA}
                className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer border flex items-center justify-center gap-1 ${
                  is2FAActive
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                }`}
              >
                <ShieldCheck size={13} />
                <span>{is2FAActive ? 'Disable 2FA' : 'Enable 2FA'}</span>
              </button>

              <button
                onClick={handleReset2FA}
                disabled={isResetting2FA}
                className="flex-1 py-2 px-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 disabled:opacity-60"
                title="Deletes all MFA factors in Supabase Auth if user lost access"
              >
                {isResetting2FA ? (
                  <RotateCw size={12} className="animate-spin" />
                ) : (
                  <KeyRound size={13} />
                )}
                <span>Reset MFA Factors</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Orders</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShoppingBag size={14} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-mono font-black text-slate-900">{stats.totalOrders}</div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Total count</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Delivered</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-mono font-black text-emerald-600">{stats.completedOrders}</div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Fulfilled</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Spent</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <TrendingUp size={14} />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-xl font-mono font-black text-indigo-600 truncate">{formatNPR(stats.totalSpent)}</div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Total spent</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. User Orders History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag size={16} className="text-indigo-600" />
            <span>Order History for {targetUser.name}</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold">{userOrders.length} records</span>
        </div>

        {userOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            This user has not placed any orders yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Native App Order Cards */}
            <div className="block sm:hidden space-y-2.5">
              {userOrders.map((ord, idx) => {
                const ordStatus = ord.status || ord.orderStatus || ord.order_status || 'pending';
                const ordAmount = Number(ord.amount || ord.totalAmount || ord.total_amount || ord.totalPrice || ord.price || 0);
                const ordAccount = ord.gameUserId || ord.playerId || ord.game_user_id || ord.player_id || ord.gameUserId || ord.userId || 'N/A';
                return (
                  <div
                    key={`mobile-user-order-${ord.id || idx}`}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/90 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-slate-900">
                          {formatDisplayOrderId(ord)}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(formatDisplayOrderId(ord));
                            showToast('success', 'Copied', 'Order ID copied');
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                      <StatusBadge status={ordStatus} size="sm" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{ord.productName || ord.gameName || 'Item'}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">{ord.packageName || 'Standard'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-xs text-slate-900">{formatNPR(ordAmount)}</p>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{ord.paymentMethod || 'QR Pay'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                        <span>UID: {ordAccount}</span>
                      </div>
                      <button
                        onClick={() => handleInspectOrder(ord.id)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-600 active:scale-95 text-white font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Full Data Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Product & Package</th>
                    <th className="py-2.5 px-3">Account / UID</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userOrders.map((ord, idx) => {
                    const ordStatus = ord.status || ord.orderStatus || ord.order_status || 'pending';
                    const ordAmount = Number(ord.amount || ord.totalAmount || ord.total_amount || ord.totalPrice || ord.price || 0);
                    const ordAccount = ord.gameUserId || ord.playerId || ord.game_user_id || ord.player_id || ord.gameUserId || ord.userId || 'N/A';
                    return (
                      <tr key={`user-detail-order-${ord.id || idx}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900" title={`Database ID: ${ord.id}`}>
                          {formatDisplayOrderId(ord)}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-slate-900 font-bold">{ord.productName || ord.gameName || 'Item'}</p>
                          <p className="text-[10px] text-indigo-600 font-medium">{ord.packageName || 'Standard'}</p>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          <span className="text-[10px] text-slate-400 block font-normal">{getOrderAccountShortLabel(ord)}</span>
                          <span>{ordAccount}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatNPR(ordAmount)}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-600">
                          {ord.paymentMethod || ord.payment_method || 'QR Pay'}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={ordStatus} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {formatDate(ord.createdAt || ord.created_at)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleInspectOrder(ord.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 text-indigo-600">
                  <Edit2 size={18} />
                  <span>Edit Profile Details</span>
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Kathmandu, Nepal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Role</span>
                      {(String(targetUser.role || '').toUpperCase() === 'STORE_OWNER') && (
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                          <Lock size={10} /> Locked
                        </span>
                      )}
                    </label>
                    <select
                      value={String(targetUser.role || '').toUpperCase() === 'STORE_OWNER' ? 'STORE_OWNER' : editRole}
                      disabled={String(targetUser.role || '').toUpperCase() === 'STORE_OWNER'}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden ${
                        String(targetUser.role || '').toUpperCase() === 'STORE_OWNER'
                          ? 'bg-slate-100 border-amber-200 text-slate-700 cursor-not-allowed'
                          : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-600'
                      }`}
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="SUPPORT_STAFF">🎧 Support Staff</option>
                              <option value="STORE_MANAGER">💼 Store Manager</option>
                              <option value="SUPER_ADMIN">🌟 Super Admin</option>
                              <option value="STORE_OWNER">👑 Store Owner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Status</span>
                      {(String(targetUser.role || '').toUpperCase() === 'STORE_OWNER') && (
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                          <Lock size={10} /> Locked
                        </span>
                      )}
                    </label>
                    <select
                      value={String(targetUser.role || '').toUpperCase() === 'STORE_OWNER' ? 'active' : editStatus}
                      disabled={String(targetUser.role || '').toUpperCase() === 'STORE_OWNER'}
                      onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden ${
                        String(targetUser.role || '').toUpperCase() === 'STORE_OWNER'
                          ? 'bg-slate-100 border-amber-200 text-slate-700 cursor-not-allowed'
                          : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-600'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="deleted">Deactivated (Deleted)</option>
                    </select>
                  </div>
                </div>

                {String(targetUser.role || '').toUpperCase() === 'STORE_OWNER' && (
                  <p className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-1.5">
                    <Lock size={12} className="shrink-0 text-amber-600" />
                    <span>Platform Owner role is permanently locked as Store Owner and cannot be modified by any admin.</span>
                  </p>
                )}

                {/* 2FA Security setting in edit modal */}
                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-purple-600" />
                    <div>
                      <p className="text-xs font-bold text-purple-950">2-Step Verification (2FA)</p>
                      <p className="text-[11px] text-purple-700">Backup code authentication requirement</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={edit2FA}
                      onChange={(e) => setEdit2FA(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <UserX size={24} />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Permanently Delete Account?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will purge credentials and Supabase Auth access for <span className="font-bold text-slate-900">{targetUser.name}</span> ({targetUser.email}).
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 text-left space-y-1">
                  <p className="font-semibold text-slate-800">Compliance & Security Protection:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                    <li>Supabase Auth credentials & sessions are revoked</li>
                    <li>Personal data & contact info are anonymized</li>
                    <li>Past orders & payment transactions are preserved for audits</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Type <span className="text-rose-600 font-mono font-black">DELETE ACCOUNT</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE ACCOUNT"
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all text-slate-900 placeholder:text-slate-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConfirmText.trim() === 'DELETE ACCOUNT' && !isDeleting) {
                      e.preventDefault();
                      handleDeleteUser();
                    }
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting || deleteConfirmText.trim() !== 'DELETE ACCOUNT'}
                  onClick={handleDeleteUser}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direct Alert Notification Modal */}
      <AnimatePresence>
        {showNotifModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 text-indigo-600">
                  <Mail size={18} />
                  <span>Send Direct In-App Alert</span>
                </h3>
                <button
                  onClick={() => setShowNotifModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                This notification is private and will be visible only to{' '}
                <span className="font-bold text-slate-800">{targetUser.name}</span>.
              </p>

              <form onSubmit={handleSendDirectNotif} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alert Title *</label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Account Security Update"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message Body *</label>
                  <textarea
                    rows={3}
                    required
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Write private message to customer..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-indigo-600 focus:outline-hidden resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNotifModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingNotif}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSendingNotif ? 'Sending...' : 'Send Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                  <XCircle size={20} />
                  <span>Reject Account Verification</span>
                </div>
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Provide a reason for rejecting <strong className="text-slate-900">{targetUser.name}</strong>'s verification request. The user will see this explanation in their profile modal.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Rejection Reason</label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  rows={3}
                  placeholder="e.g., ID number mismatch or document photo invalid/unreadable."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-200 focus:border-rose-500 text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVerifyingAction}
                  onClick={() => handleAdminVerifyAction('reject', rejectionReasonInput)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingAction ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANONICAL ROLE CHANGE MODAL */}
      <AnimatePresence>
        {showRoleModal && targetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Change User Role</h3>
                    <p className="text-xs text-slate-400">Canonical Supabase RBAC Update</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Target User:</span>
                  <span className="font-bold text-white">{targetUser.name} ({targetUser.email})</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Select New Role:</label>
                  <select
                    value={selectedNewRole}
                    onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="CUSTOMER">Customer (Gamer Account)</option>
                    <option value="SUPPORT_STAFF">Support Staff (Customer Support)</option>
                    <option value="STORE_MANAGER">Store Manager (Store Operations)</option>
                    <option value="SUPER_ADMIN">Super Admin (System Administrator)</option>
                    {String(currentUser?.role || '').toUpperCase() === 'STORE_OWNER' && (
                      <option value="STORE_OWNER">Store Owner (Supreme Authority)</option>
                    )}
                  </select>
                </div>

                {['SUPER_ADMIN', 'STORE_OWNER'].includes(selectedNewRole) && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>
                      Assigning an Administrative role grants elevated store privileges. This action updates PostgreSQL DB, personnel_roles, and Supabase Auth metadata atomically.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowRoleModal(false)}
                  disabled={isChangingRole}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!targetUser) return;
                    setIsChangingRole(true);
                    try {
                      const res = await api.customers.updateRole(userUid, selectedNewRole);
                      if (res && res.success) {
                        showToast('success', 'Role Updated Successfully', `Role for ${targetUser.name} changed to ${selectedNewRole}.`);
                        setShowRoleModal(false);
                        await loadCustomerFromDb();
                        if (refreshUsers) refreshUsers();
                      } else {
                        showToast('error', 'Role Change Failed', res?.message || 'Could not update user role.');
                      }
                    } catch (err: any) {
                      showToast('error', 'Role Change Error', err.message || 'Error updating user role.');
                    } finally {
                      setIsChangingRole(false);
                    }
                  }}
                  disabled={isChangingRole}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isChangingRole ? (
                    <>
                      <RotateCw size={14} className="animate-spin" />
                      Updating Role...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Confirm Role Change
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
export default AdminUserDetailTab;
