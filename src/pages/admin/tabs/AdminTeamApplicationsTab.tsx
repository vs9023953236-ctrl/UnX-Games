import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { 
  ShieldCheck, 
  User, 
  Clock, 
  Check, 
  X, 
  Search, 
  FileText, 
  Users, 
  Crown, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Phone, 
  Mail, 
  ShieldAlert,
  Award,
  ChevronRight,
  Eye,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Gamepad2,
  History,
  Activity,
  MessageSquare,
  Lock
} from 'lucide-react';

interface TeamApplication {
  id: string;
  user_id: string;
  full_name?: string;
  gamer_username?: string;
  email?: string;
  mobile_number?: string;
  role_applied_for: string;
  gaming_experience?: string;
  games_played?: string;
  game_uid?: string;
  discord_username?: string;
  why_join?: string;
  skills?: string;
  availability?: string;
  profile_image_url?: string;
  status: string;
  stage?: string;
  current_reviewer_name?: string;
  internal_notes?: string;
  applied_at: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
  reviews?: any[];
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  role: string;
  position_title: string;
  status: string;
  avatar_url?: string;
  created_at?: string;
  location?: string;
  is_owner?: boolean;
  is_locked?: boolean;
}

export const AdminTeamApplicationsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'applications' | 'audit'>('members');
  
  const [apps, setApps] = useState<TeamApplication[]>(() => {
    try {
      const cached = null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const cached = null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [stats, setStats] = useState<any>(() => {
    try {
      const cached = null;
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [activityLogs, setActivityLogs] = useState<any[]>(() => {
    try {
      const cached = null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Application detail modal state
  const [selectedApp, setSelectedApp] = useState<TeamApplication | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [processingAppId, setProcessingAppId] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Delete application modal state
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [deletingAppName, setDeletingAppName] = useState<string>('');

  // Edit role modal state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState('SUPPORT_STAFF');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const handleDeleteApplication = (appId: string, applicantName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingAppId(appId);
    setDeletingAppName(applicantName || 'Applicant');
  };

  const handleConfirmDelete = async () => {
    if (!deletingAppId) return;
    setProcessingAppId(deletingAppId);
    try {
      const res = await api.team.deleteApplication(deletingAppId);
      if (res.success) {
        if (selectedApp?.id === deletingAppId) {
          setSelectedApp(null);
        }
        setDeletingAppId(null);
        setDeletingAppName('');
        await fetchAllTeamData();
      } else {
        alert(res.message || 'Failed to delete application from database');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting application');
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleQuickApprove = async (appId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProcessingAppId(appId);
    try {
      const res = await api.team.approve(appId);
      if (res.success) {
        if (selectedApp?.id === appId) {
          handleOpenAppDetails(appId);
        }
        await fetchAllTeamData();
      } else {
        alert(res.message || 'Failed to approve application');
      }
    } catch (err: any) {
      alert(err.message || 'Error approving application');
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleQuickReject = (appId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectingAppId(appId);
    setRejectReason('Game Player UID or IGN is invalid/missing. Please re-submit with correct account details.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppId) return;
    setProcessingAppId(rejectingAppId);
    try {
      const res = await api.team.reject(rejectingAppId, rejectReason || 'Application details incomplete or criteria not met.');
      if (res.success) {
        if (selectedApp?.id === rejectingAppId) {
          handleOpenAppDetails(rejectingAppId);
        }
        setRejectingAppId(null);
        setRejectReason('');
        await fetchAllTeamData();
      } else {
        alert(res.message || 'Failed to reject application');
      }
    } catch (err: any) {
      alert(err.message || 'Error rejecting application');
    } finally {
      setProcessingAppId(null);
    }
  };

  useEffect(() => {
    fetchAllTeamData();
  }, []);

  const fetchAllTeamData = async () => {
    if (apps.length === 0 && members.length === 0) {
      setIsLoading(true);
    }
    try {
      const [appsRes, membersRes, statsRes, logsRes] = await Promise.all([
        api.team.getApplications({ status: statusFilter !== 'ALL' ? statusFilter : undefined }).catch(() => ({ success: false, applications: [] })),
        api.team.getMembers().catch(() => ({ success: false, members: [] })),
        api.team.getDashboardStats().catch(() => ({ success: false, stats: null })),
        api.team.getActivityLogs().catch(() => ({ success: false, logs: [] }))
      ]);

      if (appsRes.success && appsRes.applications) {
        setApps(appsRes.applications);

      }
      if (membersRes.success && membersRes.members) {
        setMembers(membersRes.members);

      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);

      }
      if (logsRes.success && logsRes.logs) {
        setActivityLogs(logsRes.logs);

      }
    } catch (err) {
      console.error('Error fetching admin team data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllTeamData();
  };

  const handleOpenAppDetails = async (appId: string) => {
    try {
      const res = await api.team.getApplicationDetails(appId);
      if (res.success && res.application) {
        setSelectedApp(res.application);
        setInternalNoteText(res.application.internal_notes || '');
        setReviewNote('');
      }
    } catch (err) {
      console.error('Failed to load application details', err);
    }
  };

  const handleUpdateStatus = async (targetStatus: string) => {
    if (!selectedApp) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.team.updateApplicationStatus(selectedApp.id, {
        status: targetStatus,
        review_note: reviewNote,
        stage: targetStatus === 'UNDER_REVIEW' ? 'INTERVIEW_STAGE' : targetStatus === 'SHORTLISTED' ? 'FINAL_EVALUATION' : targetStatus
      });

      if (res.success) {
        setReviewNote('');
        handleOpenAppDetails(selectedApp.id);
        fetchAllTeamData();
      } else {
        alert(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!selectedApp) return;
    try {
      const res = await api.team.saveApplicationNotes(selectedApp.id, internalNoteText);
      if (res.success) {
        alert('Internal notes saved successfully');
        handleOpenAppDetails(selectedApp.id);
      } else {
        alert(res.message || 'Failed to save notes');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving notes');
    }
  };

  const handleSaveRoleChange = async () => {
    if (!editingMember) return;
    setIsUpdatingRole(true);
    try {
      const res = await api.team.updateMemberRole(editingMember.id, newRole);
      if (res.success) {
        setEditingMember(null);
        fetchAllTeamData();
      } else {
        alert(res.message || 'Failed to update role');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.is_owner || member.role === 'OWNER') {
      alert('The Store Owner account cannot be removed.');
      return;
    }
    if (!window.confirm(`Demote ${member.full_name} (${member.email}) back to Customer?`)) return;
    try {
      const res = await api.team.removeMember(member.id);
      if (res.success) {
        fetchAllTeamData();
      } else {
        alert(res.message || 'Failed to demote team member');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to demote member');
    }
  };

  const filteredApps = apps.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      a.id.toLowerCase().includes(q) ||
      a.full_name?.toLowerCase().includes(q) ||
      a.user_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.gamer_username?.toLowerCase().includes(q) ||
      a.role_applied_for?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase()) ||
    m.mobile?.includes(search)
  );

  const pendingAppsCount = stats?.pending || apps.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-black uppercase tracking-wider">
              Unx Games Operations
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Team Management & Officer Hub</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">Review applicant rosters, evaluate gaming skills, and assign officer responsibilities.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all border border-slate-700 cursor-pointer"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-red-400' : ''} />
            <span>Sync DB</span>
          </button>
        </div>
      </div>

      {/* METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-bold block mb-1">Total Apps</span>
          <span className="text-2xl font-black text-slate-900">{stats?.total_applications || apps.length}</span>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-amber-800 text-xs font-bold block mb-1">Pending</span>
          <span className="text-2xl font-black text-amber-900">{pendingAppsCount}</span>
        </div>
        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 shadow-sm">
          <span className="text-sky-800 text-xs font-bold block mb-1">Under Review</span>
          <span className="text-2xl font-black text-sky-900">{stats?.under_review || 0}</span>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 shadow-sm">
          <span className="text-orange-800 text-xs font-bold block mb-1">Shortlisted</span>
          <span className="text-2xl font-black text-orange-900">{stats?.shortlisted || 0}</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-emerald-800 text-xs font-bold block mb-1">Approved</span>
          <span className="text-2xl font-black text-emerald-900">{stats?.approved || 0}</span>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
          <span className="text-slate-400 text-xs font-bold block mb-1">Active Officers</span>
          <span className="text-2xl font-black text-red-400">{stats?.active_officers || members.length}</span>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'members'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users size={16} />
            <span>Active Team Directory ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 relative whitespace-nowrap cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock size={16} />
            <span>Applications</span>
            {pendingAppsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {pendingAppsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Activity size={16} />
            <span>Activity Logs</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'applications' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: ACTIVE MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Users size={36} className="text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-black text-slate-900">No team members found</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Approve team applications or assign staff roles to see members here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member, idx) => (
                <div 
                  key={`team-member-${member.id || idx}-${idx}`} 
                  className={`bg-white rounded-3xl p-5 border shadow-sm relative flex flex-col justify-between transition-all ${
                    member.role === 'OWNER' ? 'border-amber-300 ring-2 ring-amber-400/30' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base text-white shrink-0 ${
                          member.role === 'OWNER' ? 'bg-amber-500 shadow-md shadow-amber-500/30' :
                          member.role === 'STORE_OWNER' ? 'bg-red-600' :
                          member.role === 'ADMIN' ? 'bg-sky-600' :
                          'bg-slate-700'
                        }`}>
                          {member.full_name?.charAt(0).toUpperCase() || 'T'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm">{member.full_name}</h3>
                            {member.role === 'OWNER' && (
                              <Crown size={14} className="text-amber-500 shrink-0" />
                            )}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                            member.role === 'OWNER' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            member.role === 'STORE_OWNER' ? 'bg-red-100 text-red-900' :
                            member.role === 'ADMIN' ? 'bg-sky-100 text-sky-900' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium mb-4">
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span>{member.mobile || 'No contact phone'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <Award size={13} className="text-red-500 shrink-0" />
                        <span>{member.position_title || member.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {member.role === 'OWNER' || member.role === 'STORE_OWNER' || member.role === 'STORE_MANAGER' || member.is_owner || member.is_locked ? (
                      <div className="flex-1 py-2 px-3 rounded-xl bg-amber-100/90 text-amber-900 font-black text-xs flex items-center justify-center gap-1.5 border border-amber-300/80 shadow-2xs">
                        <Lock size={13} className="text-amber-700 shrink-0" />
                        <span>{member.role === 'STORE_MANAGER' ? 'STORE MANAGER (LOCKED)' : 'OWNER (LOCKED)'}</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setNewRole(member.role || 'SUPPORT_STAFF');
                          }}
                          className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit3 size={14} /> Change Role
                        </button>

                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                          title="Demote Member"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPLICATIONS LIST */}
      {activeTab === 'applications' && (
        <div>
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <User size={32} className="text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-slate-900">No applications found</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">When users apply to join the team, they will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app, idx) => (
                <div 
                  key={`team-app-${app.id || idx}-${idx}`} 
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-red-300 transition-all cursor-pointer group space-y-3"
                  onClick={() => handleOpenAppDetails(app.id)}
                >
                  {app.status === 'PENDING' && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-amber-400" />
                  )}
                  {app.status === 'UNDER_REVIEW' && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-sky-500" />
                  )}
                  {app.status === 'SHORTLISTED' && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-orange-500" />
                  )}
                  {app.status === 'APPROVED' && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                  )}
                  {app.status === 'REJECTED' && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center font-black text-red-600 shrink-0">
                          <User size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-black text-red-600 tracking-wider block mb-0.5">{app.id}</span>
                          <h3 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-tight">
                            {app.full_name || app.user_name || 'Applicant'}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">{app.email || app.user_email}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        app.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        app.status === 'UNDER_REVIEW' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                        app.status === 'SHORTLISTED' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        <span>Requested Position:</span>
                        <span className="font-black text-red-600 uppercase">{app.role_applied_for}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <FileText size={15} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 italic text-slate-500">
                          {app.why_join || app.gaming_experience || 'No notes provided'}
                        </span>
                      </div>
                      {app.gamer_username && (
                        <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Gamer IGN / UID:</span>
                          <span className="font-bold text-slate-900">{app.gamer_username} ({app.game_uid || 'N/A'})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="text-[11px] flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" /> Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                      <span className="font-bold text-red-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                        Details <ChevronRight size={14} />
                      </span>
                    </div>

                    {/* ACTION BUTTONS DIRECTLY ON CARD */}
                    <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={processingAppId === app.id}
                        onClick={(e) => handleQuickReject(app.id, e)}
                        className={`py-2.5 px-2.5 rounded-2xl font-black text-xs border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          app.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200 shadow-xs'
                        }`}
                      >
                        <XCircle size={15} />
                        <span>{processingAppId === app.id ? 'Processing...' : 'Reject'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={processingAppId === app.id}
                        onClick={(e) => handleQuickApprove(app.id, e)}
                        className={`flex-1 py-2.5 px-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                      >
                        <CheckCircle2 size={15} />
                        <span>
                          {processingAppId === app.id
                            ? 'Processing...'
                            : app.status === 'APPROVED'
                            ? 'Role Assigned'
                            : 'Approve'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={processingAppId === app.id}
                        onClick={(e) => handleDeleteApplication(app.id, app.full_name || app.user_name, e)}
                        className="py-2.5 px-2.5 rounded-2xl font-black text-xs bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all flex items-center justify-center gap-1 shrink-0 shadow-xs cursor-pointer"
                        title="Delete application from database permanently"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVITY LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Activity size={18} className="text-red-600" />
            <span>Team Activity & Evaluation Audit Trail</span>
          </h3>

          {activityLogs.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center font-medium">No team activity logs recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {activityLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{log.actor_name || 'System Officer'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] uppercase font-bold">{log.actor_role}</span>
                    </div>
                    <p className="font-mono text-red-600 font-bold text-xs">{log.action}</p>
                    {log.metadata && (
                      <p className="text-slate-500 text-[11px] mt-0.5">{JSON.stringify(log.metadata)}</p>
                    )}
                  </div>
                  <span className="text-slate-400 font-medium text-[11px]">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPLICATION DETAILS & REVIEW MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-md bg-red-500/30 text-red-300 font-mono text-xs font-bold uppercase tracking-wider block w-fit mb-2">
                  {selectedApp.id}
                </span>
                <h3 className="text-xl font-black">{selectedApp.full_name || selectedApp.user_name || 'Applicant Profile'}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedApp.email || selectedApp.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleDeleteApplication(selectedApp.id, selectedApp.full_name || selectedApp.user_name, e)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-rose-500/30 transition-all cursor-pointer"
                  title="Delete Application permanently from database"
                >
                  <Trash2 size={14} />
                  <span>Delete App</span>
                </button>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {selectedApp.role_applied_for === 'LEAVE_REQUEST' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                  <strong className="font-black uppercase block mb-1 text-rose-950">🚨 Team Leave / Resignation Request</strong>
                  This staff member has requested to leave the team. Approving this request will instantly demote their account role to <strong className="text-red-700">CUSTOMER</strong> and remove them from active team membership.
                </div>
              )}

              {/* Applicant Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Role Applied</span>
                  <span className="font-black text-red-600 uppercase">{selectedApp.role_applied_for}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Gamer IGN</span>
                  <span className="font-bold text-slate-800">{selectedApp.gamer_username || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Game UID</span>
                  <span className="font-mono text-slate-800">{selectedApp.game_uid || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Mobile Phone</span>
                  <span className="font-bold text-slate-800">{selectedApp.mobile_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Discord Tag</span>
                  <span className="font-bold text-slate-800">{selectedApp.discord_username || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Availability</span>
                  <span className="font-bold text-slate-800">{selectedApp.availability || 'Flexible'}</span>
                </div>
              </div>

              {/* Games & Experience */}
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-1">Main Games Played</h4>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium text-slate-700">{selectedApp.games_played || 'Free Fire, PUBG Mobile, MLBB'}</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-1">Gaming Experience & Background</h4>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium text-slate-700 whitespace-pre-wrap">{selectedApp.gaming_experience || 'No notes provided'}</p>
                </div>
                {selectedApp.why_join && (
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-1">Why Join Unx Games</h4>
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium text-slate-700 whitespace-pre-wrap">{selectedApp.why_join}</p>
                  </div>
                )}
              </div>

              {/* Review Timeline */}
              {selectedApp.reviews && selectedApp.reviews.length > 0 && (
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                    <History size={14} className="text-red-600" /> Evaluation History Timeline
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedApp.reviews.map((rev, i) => (
                      <div key={rev.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800 mb-0.5">
                          <span>{rev.reviewer_name} ({rev.reviewer_role})</span>
                          <span className="text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 font-medium">{rev.review_note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Action Controls */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Update Application Status & Stage</h4>
                
                <input
                  type="text"
                  placeholder="Officer Review Note (Sent to applicant notification)..."
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                    disabled={isUpdatingStatus}
                    className="py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-black text-xs border border-sky-200 transition-colors cursor-pointer"
                  >
                    Under Review
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('SHORTLISTED')}
                    disabled={isUpdatingStatus}
                    className="py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-black text-xs border border-orange-200 transition-colors cursor-pointer"
                  >
                    Shortlist
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('APPROVED')}
                    disabled={isUpdatingStatus}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-colors cursor-pointer"
                  >
                    Approve & Promote
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('REJECTED')}
                    disabled={isUpdatingStatus}
                    className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs border border-rose-200 transition-colors cursor-pointer"
                  >
                    Reject App
                  </button>
                </div>
              </div>

              {/* Internal Notes Section */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-slate-500" /> Internal Officer Notes (Private)
                </h4>
                <textarea
                  rows={3}
                  value={internalNoteText}
                  onChange={e => setInternalNoteText(e.target.value)}
                  placeholder="Notes visible only to team officers..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none"
                />
                <button
                  onClick={handleSaveInternalNotes}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Internal Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Change Member Role</h3>
              <button 
                onClick={() => setEditingMember(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-5">
              <p className="text-xs font-bold text-slate-900">{editingMember.full_name}</p>
              <p className="text-xs text-slate-500 font-medium">{editingMember.email}</p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-black text-slate-700 uppercase block">Select New Role / Position</label>
              {[
                { id: 'SUPPORT_STAFF', name: 'Support Staff', desc: 'Basic support & monitoring' },
                { id: 'STORE_MANAGER', name: 'Store Manager', desc: 'Day-to-day operations & order management' },
                { id: 'SUPER_ADMIN', name: 'Super Admin', desc: 'Full administration access' },
                { id: 'STORE_OWNER', name: 'Store Owner', desc: 'Highest authority (Fixed)' },
              ].map((r, rIdx) => (
                <button
                  key={`team-pos-opt-${r.id || rIdx}-${rIdx}`}
                  type="button"
                  onClick={() => setNewRole(r.id)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                    newRole === r.id ? 'border-red-600 bg-red-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{r.name}</span>
                    <span className="text-[11px] text-slate-500">{r.desc}</span>
                  </div>
                  {newRole === r.id && (
                    <Check size={18} className="text-red-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoleChange}
                disabled={isUpdatingRole}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-xs hover:opacity-95 shadow-md shadow-red-600/20 disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUpdatingRole ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Reject Application</h3>
                  <p className="text-xs text-slate-500 font-medium">{rejectingAppId}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingAppId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Quick Rejection Reasons (Click to select)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Game Player UID or IGN is invalid/missing.',
                  'Insufficient gaming background or tournament experience.',
                  'Application details incomplete. Please fill out all required fields.',
                  'KYC verification incomplete or account status issue.',
                  'Positions currently filled. Re-apply in future recruitment drives.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left ${
                      rejectReason === preset 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1 mt-3">
                  Rejection Reason (Sent to Applicant in Notification)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Type specific reason why this application is being rejected..."
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 outline-none transition-all text-xs font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium mb-5">
              💡 The applicant will receive a push notification containing this rejection reason, and will be given an option to correct details and re-submit.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRejectingAppId(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingAppId === rejectingAppId}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-md shadow-rose-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {processingAppId === rejectingAppId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE APPLICATION CONFIRMATION MODAL */}
      {deletingAppId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete Application Permanently?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to permanently delete application <span className="font-bold font-mono text-red-600">{deletingAppId}</span> for <span className="font-bold text-slate-900">{deletingAppName}</span> from the database? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingAppId(null);
                  setDeletingAppName('');
                }}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={processingAppId === deletingAppId}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-md shadow-rose-600/20 disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
              >
                {processingAppId === deletingAppId ? 'Deleting...' : 'Yes, Delete Permanent'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminTeamApplicationsTab;
