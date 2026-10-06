import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ShieldAlert, ArrowLeft, LogOut, Smartphone } from 'lucide-react';
import { AdminDashboard } from '../../pages/admin/AdminDashboard';
import { PerfectAppSpinner } from '../common/PerfectAppSpinner';

export const ProtectedAdminRoute: React.FC = () => {
  const { currentUser, isAdmin, loading, logout } = useAuth();
  const { appSettings, setIsAdminView, setCurrentTab } = useStore();

  React.useEffect(() => {
    if (!loading && !currentUser) {
      setIsAdminView(false);
      setCurrentTab(appSettings?.maintenanceMode ? 'home' : 'login');
    }
  }, [loading, currentUser, setIsAdminView, setCurrentTab, appSettings]);

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 p-6 text-slate-400">
        <PerfectAppSpinner size="md" theme="violet" title="Checking Admin Privileges..." showDots={false} />
      </div>
    );
  }

  // If not authenticated, exit admin view so top-level layout renders the unified Login page
  if (!currentUser) {
    return null;
  }

  const roleUpper = String(currentUser.role || '').toUpperCase();
  const isAuthorizedAdmin =
    isAdmin ||
    ['STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(roleUpper);

  // If authenticated but not an admin (customer account)
  if (!isAuthorizedAdmin || currentUser.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#0F0C20] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#171329] border border-red-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Access Restricted</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Signed in as <strong className="text-orange-400">{currentUser.email}</strong> (Role: {currentUser.role || 'Gamer'}). This portal is restricted to store administrators only.
            </p>
          </div>
          <div className="pt-3 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setIsAdminView(false);
                setCurrentTab('home');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40 transition-all cursor-pointer"
            >
              <Smartphone size={16} />
              <span>Go to User App (Storefront)</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                setCurrentTab(appSettings?.maintenanceMode ? 'home' : 'login');
              }}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
            >
              <LogOut size={15} />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated as Administrator -> Render the Admin Console
  return <AdminDashboard />;
};

