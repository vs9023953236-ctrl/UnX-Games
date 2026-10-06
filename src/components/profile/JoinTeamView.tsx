import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  UserSquare2, 
  ShieldAlert, 
  Lock, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Sparkles,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Crown,
  Users,
  Award,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Gamepad2,
  FileText,
  History,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api';

interface ReviewEntry {
  id: string;
  reviewer_name: string;
  reviewer_role: string;
  new_status: string;
  review_note: string;
  created_at: string;
}

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
  status: 'PENDING' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  stage?: string;
  applied_at: string;
  reviewed_at?: string;
  internal_notes?: string;
  reviews?: ReviewEntry[];
}

interface OwnerContact {
  owner_name: string;
  title: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  store_name: string;
  operating_hours: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  gamer_username?: string;
  email: string;
  mobile: string;
  role: string;
  position_title: string;
  status: string;
  avatar_url?: string;
  created_at?: string;
  location?: string;
  is_owner?: boolean;
}

const DEFAULT_OFFICERS: TeamMember[] = [
  {
    id: 'owner-binod',
    full_name: 'Binod Thalal',
    gamer_username: 'GHN_BinodOwner',
    email: 'hii.binodthalal@gmail.com',
    mobile: '9768914027',
    role: 'STORE_OWNER',
    position_title: 'Founder & Owner (Unx Games)',
    status: 'ACTIVE',
    is_owner: true,
    location: 'Deelasaini-6, Baitadi, Nepal'
  },
  {
    id: 'staff-nabin',
    full_name: 'Nabin Thalal',
    gamer_username: 'GHN_NabinStaff',
    email: 'nabinthalal96@gmail.com',
    mobile: '9748878187',
    role: 'SUPPORT_STAFF',
    position_title: 'Support Staff & Store Ops',
    status: 'ACTIVE',
    location: 'Kathmandu, Lalitpur, Nepal'
  }
];

export const JoinTeamView: React.FC = () => {
  const { setCurrentTab } = useStore();
  const { currentUser } = useAuth();

  const [existingApp, setExistingApp] = useState<TeamApplication | null>(null);
  const [previousApp, setPreviousApp] = useState<TeamApplication | null>(null);
  const [loadingApp, setLoadingApp] = useState(false);

  const [ownerContact, setOwnerContact] = useState<OwnerContact | null>({
    owner_name: 'Binod Thalal',
    title: 'Founder & Owner (Unx Games)',
    phone: '9768914027',
    whatsapp: '9768914027',
    email: 'hii.binodthalal@gmail.com',
    address: 'Deelasaini-6, Baitadi, Nepal',
    store_name: 'Unx Games',
    operating_hours: '24/7 Unx Games Management & Direct Escalation'
  });
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const cached = localStorage.getItem('ghn_cached_team_members');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return DEFAULT_OFFICERS;
  });

  // Form State
  const [fullName, setFullName] = useState(currentUser?.full_name || currentUser?.username || '');
  const [gamerUsername, setGamerUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.mobile || currentUser?.phone || '');
  const [role, setRole] = useState('SUPPORT_STAFF');
  const [selectedGames, setSelectedGames] = useState<string[]>(['Free Fire', 'PUBG Mobile']);
  const [gameUid, setGameUid] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [gamingExperience, setGamingExperience] = useState('');
  const [whyJoin, setWhyJoin] = useState('');
  const [availability, setAvailability] = useState('Flexible (4+ hours daily)');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Leave / Resignation modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState('');

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      alert('Please provide a reason for leaving the team.');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      const res = await api.team.leaveRequest(leaveReason);
      if (res.success) {
        setLeaveMsg(res.message || 'Leave request submitted successfully.');
        setShowLeaveModal(false);
        setLeaveReason('');
        fetchTeamData();
      } else {
        alert(res.message || 'Failed to submit leave request');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting leave request');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const isKycVerified = currentUser?.verification_status === 'verified' || currentUser?.account_verified === true;

  const roles = [
    { id: 'SUPPORT_STAFF', name: 'Support Staff', icon: UserSquare2, desc: 'Customer support, inquiries & basic store operations' },
    { id: 'STORE_MANAGER', name: 'Store Manager', icon: ShieldCheck, desc: 'Catalog, orders, products & store operations' },
    { id: 'SUPER_ADMIN', name: 'Super Admin', icon: Crown, desc: 'Full administrative access and team management' }
  ];

  const availableGamesList = [
    'Free Fire', 'PUBG Mobile', 'Mobile Legends', 'Brawl Stars', 'Clash of Clans', 'FC Mobile', 'Valorant'
  ];

  const fetchTeamData = async () => {
    try {
      const [appRes, teamRes] = await Promise.all([
        api.team.getMyApplication().catch(() => ({ success: false })) as Promise<any>,
        api.team.getMembers().catch(() => ({ success: false })) as Promise<any>
      ]);

      if (appRes.success) {
        if (appRes.application) {
          const app = appRes.application;
          setExistingApp(app);

          // Pre-fill form state for easy re-submission
          if (app.full_name) setFullName(app.full_name);
          if (app.gamer_username) setGamerUsername(app.gamer_username);
          if (app.email) setEmail(app.email);
          if (app.mobile_number) setMobileNumber(app.mobile_number);
          if (app.role_applied_for) setRole(app.role_applied_for);
          if (app.game_uid) setGameUid(app.game_uid);
          if (app.discord_username) setDiscordUsername(app.discord_username);
          if (app.gaming_experience) setGamingExperience(app.gaming_experience);
          if (app.why_join) setWhyJoin(app.why_join);
          if (app.availability) setAvailability(app.availability);
          if (app.games_played) {
            const parsed = typeof app.games_played === 'string'
              ? app.games_played.split(',').map((g: string) => g.trim())
              : Array.isArray(app.games_played) ? app.games_played : ['Free Fire'];
            setSelectedGames(parsed);
          }
        } else {
          setExistingApp(null);
        }

        if (appRes.previousApplication) {
          setPreviousApp(appRes.previousApplication);
        } else if (appRes.application?.status === 'REJECTED') {
          setPreviousApp(appRes.application);
        } else {
          setPreviousApp(null);
        }
      }

      if (teamRes.success) {
        if (teamRes.owner_contact) setOwnerContact(teamRes.owner_contact);
        if (teamRes.members && Array.isArray(teamRes.members)) {
          // Exclude any CUSTOMER roles from Active Team Members list
          const activeMembers = teamRes.members.filter((m: any) => (m.role || '').toUpperCase() !== 'CUSTOMER');
          if (activeMembers.length > 0) {
            setTeamMembers(activeMembers);
            try {
              localStorage.setItem('ghn_cached_team_members', JSON.stringify(activeMembers));
            } catch (_e) {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch team details:', err);
    } finally {
      setLoadingApp(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTeamData();
  };

  const toggleGameSelection = (game: string) => {
    if (selectedGames.includes(game)) {
      setSelectedGames(selectedGames.filter(g => g !== game));
    } else {
      setSelectedGames([...selectedGames, game]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await api.team.apply({
        full_name: fullName,
        gamer_username: gamerUsername,
        email,
        mobile_number: mobileNumber,
        role_applied_for: role,
        gaming_experience: gamingExperience,
        games_played: selectedGames,
        game_uid: gameUid,
        discord_username: discordUsername,
        why_join: whyJoin,
        availability
      });

      if (res.success && res.application) {
        setExistingApp(res.application);
        setIsReapplying(false);
        setSuccessMsg(res.message || 'Application submitted successfully!');
      } else {
        setError(res.message || 'Application submission failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw your team application?')) return;
    setIsWithdrawing(true);
    try {
      const res = await api.team.withdrawMyApplication();
      if (res.success) {
        fetchTeamData();
      } else {
        alert(res.message || 'Failed to withdraw application');
      }
    } catch (err: any) {
      alert(err.message || 'Error withdrawing application');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const cleanPhone = ownerContact?.phone?.replace(/\D/g, '') || '9768914027';
  const whatsappUrl = `https://wa.me/977${cleanPhone.replace(/^977/, '')}?text=Hello%20Gamer%20Hub%20Nepal%20Owner%2FManagement%20Team!`;

  const staffRoles = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF'];
  const userRoleUpper = String(currentUser?.role || 'CUSTOMER').toUpperCase();
  const isCustomerRole = userRoleUpper === 'CUSTOMER';

  // A Customer role account is NEVER an active officer and cannot access admin dashboard
  const isTeamOfficer = !isCustomerRole && staffRoles.includes(userRoleUpper);

  const isActiveApplication = existingApp && ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED'].includes(existingApp.status);

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col pb-2 sm:pb-2">
      <div className="pt-1 sm:pt-2 px-2 sm:px-2 max-w-7xl mx-auto w-full space-y-2 sm:space-y-2">

        {/* TOP HERO BADGE */}
        <div className="bg-gradient-to-br from-white via-red-50 to-orange-50 rounded-3xl p-6 text-slate-900 shadow-xl border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2 border border-amber-200">
                <Crown size={14} className="text-amber-600" />
                Unx Games Official
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Staff & Operations Recruitment Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Apply to become an official staff member and lead esports operations.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 border border-slate-200 transition-all self-end sm:self-auto"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* OWNER & MANAGEMENT OFFICIAL CONTACT CARD */}
        {ownerContact && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-amber-200/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-100/60 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 border-2 border-amber-400/80 shadow-lg shrink-0 overflow-hidden relative group">
                  <img
                    src="https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/IMG_20260630_172545.png"
                    alt="Binod Thalal - Founder & Owner"
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-black">
                    <Crown size={24} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {ownerContact.owner_name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase border border-amber-200">
                      FOUNDER & OWNER
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">{ownerContact.title}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 text-xs relative z-10">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center gap-2.5">
                <Phone size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Owner Hotline</span>
                  <span className="font-black text-slate-800 text-sm">{ownerContact.phone}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center gap-2.5">
                <Mail size={16} className="text-red-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Official Email</span>
                  <span className="font-bold text-slate-800 truncate block">{ownerContact.email}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 relative z-10 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.98]"
              >
                <MessageCircle size={16} />
                <span>Chat with Owner on WhatsApp</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>

              <a
                href={`tel:${ownerContact.phone}`}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <Phone size={16} />
                <span>Call Hotline</span>
              </a>
            </div>
          </div>
        )}

        {/* ACTIVE TEAM OFFICERS DIRECTORY */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Active Team Members & Officers
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {teamMembers.length} Verified Officers in Unx Games
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {teamMembers.map((member, mIdx) => (
              <div 
                key={`team-member-${member.id || mIdx}-${mIdx}`} 
                className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-red-200 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                    member.role === 'OWNER' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' :
                    member.role === 'STORE_OWNER' ? 'bg-red-600 text-white' :
                    member.role === 'ADMIN' ? 'bg-orange-500 text-white' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {member.full_name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {member.full_name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        member.role === 'OWNER' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        member.role === 'STORE_OWNER' ? 'bg-red-100 text-red-900' :
                        member.role === 'ADMIN' ? 'bg-orange-100 text-orange-900' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {member.position_title || member.role} • {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://wa.me/977${member.mobile?.replace(/\D/g, '') || '9768914027'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
                  >
                    <MessageCircle size={15} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* APPLICATION STATUS / RECRUITMENT FORM */}
        <div className="pt-2">
          {/* IF USER IS AN ACTIVE OFFICER */}
          {isTeamOfficer ? (
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-200 relative overflow-hidden text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
                ACTIVE TEAM MEMBER
              </span>
              <h2 className="text-xl font-black text-slate-900">You Are an Active Team Member!</h2>
              <p className="text-xs text-slate-500 font-medium mt-1 mb-5">
                Assigned Role: <strong className="text-red-600">{currentUser?.role || existingApp?.role_applied_for || 'SUPPORT_STAFF'}</strong>
              </p>

              {existingApp?.role_applied_for === 'LEAVE_REQUEST' && existingApp?.status === 'PENDING' && (
                <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase mb-1">
                    <Clock size={15} className="text-amber-600 animate-pulse" />
                    <span>Leave & Resignation Request Pending Review</span>
                  </div>
                  <p className="text-xs text-amber-800 font-medium">
                    Your request to leave the team has been submitted to store management database. Once accepted, your account role will automatically switch to <strong className="text-red-700">CUSTOMER</strong>.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-amber-700 font-semibold">Submitted: {new Date(existingApp.applied_at || Date.now()).toLocaleDateString()}</span>
                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing}
                      className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-colors shadow-2xs"
                    >
                      {isWithdrawing ? 'Withdrawing...' : 'Withdraw Request'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentTab('admin')}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Open Admin Dashboard
                </button>
                {currentUser?.role !== 'STORE_OWNER' && (
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Leave Team / Resign
                  </button>
                )}
              </div>
            </div>
          ) : isActiveApplication ? (
            /* ACTIVE APPLICATION VIEW (PENDING / UNDER REVIEW / SHORTLISTED) */
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Clock size={24} className="text-sky-600 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-600 block">{existingApp.id}</span>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      Application Status: {existingApp.status}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Submitted on {new Date(existingApp.applied_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  existingApp.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  existingApp.status === 'UNDER_REVIEW' ? 'bg-sky-100 text-sky-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {existingApp.status}
                </span>
              </div>

              {/* Progress Stage Tracker */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Evaluation Stage:</span>
                  <span className="text-red-700 font-black uppercase">{existingApp.stage || 'INITIAL_SUBMISSION'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className={`p-2 rounded-xl text-center text-[10px] font-bold ${
                    ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED'].includes(existingApp.status) ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    1. Received
                  </div>
                  <div className={`p-2 rounded-xl text-center text-[10px] font-bold ${
                    ['UNDER_REVIEW', 'SHORTLISTED'].includes(existingApp.status) ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    2. Under Review
                  </div>
                  <div className={`p-2 rounded-xl text-center text-[10px] font-bold ${
                    existingApp.status === 'SHORTLISTED' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    3. Shortlisted
                  </div>
                </div>
              </div>

              {/* Application details summary */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs mb-5">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-bold">Role Requested:</span>
                  <span className="font-black text-slate-800 uppercase">{existingApp.role_applied_for}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-bold">Gamer IGN:</span>
                  <span className="font-bold text-slate-800">{existingApp.gamer_username || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-bold">Games Played:</span>
                  <span className="font-bold text-slate-800">{existingApp.games_played || 'N/A'}</span>
                </div>
                {existingApp.gaming_experience && (
                  <div>
                    <span className="text-slate-500 font-bold block mb-1">Gaming Background:</span>
                    <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 font-medium">{existingApp.gaming_experience}</p>
                  </div>
                )}
              </div>

              {/* Duplicate protection warning notice */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium mb-5 flex items-start gap-2">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <span>You have an active team application under evaluation. Duplicate applications are blocked until this application is completed or withdrawn.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-xs hover:from-red-700 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-600/20"
                >
                  <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Check Status Sync</span>
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={15} /> Withdraw
                </button>
              </div>
            </div>
          ) : (false) ? (
            /* REJECTED APPLICATION CARD WITH EXPLICIT REASON & RE-SUBMIT OPTION */
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-rose-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                    <XCircle size={26} className="text-rose-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-rose-600 block">{existingApp.id}</span>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      Application Status: REJECTED
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Reviewed on {existingApp.reviewed_at ? new Date(existingApp.reviewed_at).toLocaleDateString() : 'Recent Review'}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  REJECTED
                </span>
              </div>

              {/* REJECTION REASON ALERT BOX */}
              <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs mb-5">
                <div className="flex items-center gap-2 text-rose-900 font-black uppercase tracking-wider mb-2">
                  <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                  <span>Reason For Rejection</span>
                </div>
                <p className="text-slate-900 font-bold bg-white p-3.5 rounded-xl border border-rose-200/60 shadow-2xs leading-relaxed">
                  "{existingApp.reviews?.[0]?.review_note || existingApp.internal_notes?.replace(/.*Rejected Reason:/, '').trim() || 'Application details incomplete or account criteria not met.'}"
                </p>
                <p className="text-[11px] text-rose-700 font-medium mt-2.5">
                  💡 You can revise your details below (e.g. correct your IGN, player UID, gaming experience) and re-submit a fresh application for officer review.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsReapplying(true)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-red-600/20 active:scale-[0.98]"
                >
                  <RefreshCw size={16} />
                  <span>Re-Submit Revised Application</span>
                </button>
              </div>
            </div>
          ) : (
            /* SUBMIT NEW RECRUITMENT APPLICATION FORM */
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                  <UserCheck size={24} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {existingApp?.status === 'REJECTED' ? 'Re-Submit Team Application' : 'Apply for Team Position'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Submit request to join Unx Games operational staff.</p>
                </div>
              </div>

              {existingApp?.status === 'REJECTED' && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 font-medium mb-5 flex items-start gap-2 relative z-10">
                  <Sparkles className="text-red-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <strong className="font-bold block">Re-submitting Application ({existingApp.id})</strong>
                    <span>Your previous details have been pre-filled below. Please correct the noted reason and click Submit.</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {error && (
                  <div className="p-3.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl text-xs font-bold">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold">
                    {successMsg}
                  </div>
                )}

                {/* Personal Profile Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Gamer Username (IGN)</label>
                    <input
                      type="text"
                      required
                      value={gamerUsername}
                      onChange={e => setGamerUsername(e.target.value)}
                      placeholder="e.g. GHN_Rider99"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Mobile Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Role Position Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Position Applying For</label>
                  <div className="grid grid-cols-1 gap-2">
                    {roles.map((r, rIdx) => {
                      const RoleIcon = r.icon;
                      const isActive = role === r.id;
                      return (
                        <button
                          key={`team-role-opt-${r.id || rIdx}-${rIdx}`}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`w-full p-3 rounded-2xl border-2 flex items-center gap-3 transition-all text-left ${isActive ? 'border-red-600 bg-red-50/50' : 'border-slate-100 bg-white hover:border-red-200'}`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <RoleIcon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold ${isActive ? 'text-red-900' : 'text-slate-700'}`}>{r.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium truncate">{r.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Games Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Main Games You Play / Moderate</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableGamesList.map((g, gIdx) => {
                      const isSel = selectedGames.includes(g);
                      return (
                        <button
                          key={`team-game-opt-${g}-${gIdx}`}
                          type="button"
                          onClick={() => toggleGameSelection(g)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSel ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {g} {isSel ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Game Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Game Player UID (Free Fire/PUBG)</label>
                    <input
                      type="text"
                      value={gameUid}
                      onChange={e => setGameUid(e.target.value)}
                      placeholder="e.g. 1234567890"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Discord Tag / Username</label>
                    <input
                      type="text"
                      value={discordUsername}
                      onChange={e => setDiscordUsername(e.target.value)}
                      placeholder="username#0000 or @username"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Experience & Notes */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Gaming & Tournament Background</label>
                  <textarea
                    rows={2}
                    value={gamingExperience}
                    onChange={e => setGamingExperience(e.target.value)}
                    placeholder="Mention past esports achievements, top-ups experience, guild leadership, etc."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-red-500 outline-none transition-all text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Why Do You Want to Join Unx Games?</label>
                  <textarea
                    rows={2}
                    value={whyJoin}
                    onChange={e => setWhyJoin(e.target.value)}
                    placeholder="Describe why you are interested in serving as an officer for Unx Games..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-red-500 outline-none transition-all text-xs font-medium text-slate-900"
                  />
                </div>

                {!isKycVerified ? (
                  <div className="w-full pt-2">
                    <div className="mb-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900">KYC Verification Required</h4>
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">You must complete KYC verification before applying for an officer position.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs cursor-not-allowed flex items-center justify-center gap-2 border border-slate-200"
                    >
                      <Lock size={16} /> Submit Application
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-sm hover:from-red-700 hover:to-orange-700 active:scale-[0.98] transition-all shadow-md shadow-red-600/20 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Submit Team Application'}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* PREVIOUS TEAM APPLICATION SECTION (Shown at bottom if rejected) */}
        {previousApp && previousApp.status === 'REJECTED' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-rose-200 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Previous Team Application
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Application ID: <strong className="font-mono text-rose-700">{previousApp.id}</strong></p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                REJECTED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Applied Position</span>
                <span className="font-bold text-slate-800 uppercase">{previousApp.role_applied_for || 'SUPPORT_STAFF'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Submitted Date</span>
                <span className="font-bold text-slate-800">{new Date(previousApp.applied_at).toLocaleDateString()}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Reviewed Date</span>
                <span className="font-bold text-slate-800">{previousApp.reviewed_at ? new Date(previousApp.reviewed_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-rose-900 font-black uppercase text-[10px]">
                <ShieldAlert size={14} className="text-rose-600" />
                <span>Rejection Reason</span>
              </div>
              <p className="text-slate-800 font-medium italic">
                "{previousApp.reviews?.[0]?.review_note || previousApp.internal_notes?.replace(/.*Rejected Reason:/, '').trim() || 'Application details incomplete or account criteria not met.'}"
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsReapplying(true);
                if (previousApp.full_name) setFullName(previousApp.full_name);
                if (previousApp.gamer_username) setGamerUsername(previousApp.gamer_username);
                if (previousApp.email) setEmail(previousApp.email);
                if (previousApp.mobile_number) setMobileNumber(previousApp.mobile_number);
                if (previousApp.role_applied_for) setRole(previousApp.role_applied_for);
                if (previousApp.game_uid) setGameUid(previousApp.game_uid);
                if (previousApp.discord_username) setDiscordUsername(previousApp.discord_username);
                if (previousApp.gaming_experience) setGamingExperience(previousApp.gaming_experience);
                if (previousApp.why_join) setWhyJoin(previousApp.why_join);
                if (previousApp.availability) setAvailability(previousApp.availability);
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-600/20 active:scale-[0.98]"
            >
              <RefreshCw size={14} />
              <span>Re-apply Now</span>
            </button>
          </div>
        )}

        {/* LEAVE / RESIGNATION MODAL */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" size={20} />
                  Apply to Leave / Resign from Team
                </h3>
                <button 
                  onClick={() => setShowLeaveModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Submitting a leave request will notify store management. Once store management accepts your live leave request, your staff role will automatically return to <strong className="text-slate-800">CUSTOMER</strong>.
              </p>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leaving / Resigning *</label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="e.g., Personal time constraints, changing focus..."
                    rows={3}
                    required
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLeave}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-2"
                  >
                    {isSubmittingLeave && <RefreshCw size={14} className="animate-spin" />}
                    <span>Submit Leave Request</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
