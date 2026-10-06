import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ShieldAlert, LogOut, MessageCircle, Mail } from 'lucide-react';

export const AccountRestrictedScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { appSettings, setCurrentTab } = useStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setCurrentTab(appSettings?.maintenanceMode ? 'home' : 'login');
    } catch (e) {
      console.error(e);
      setCurrentTab(appSettings?.maintenanceMode ? 'home' : 'login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          Account Restricted
        </h1>

        {/* User Info */}
        {currentUser && (
          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 mb-6">
            <span>{currentUser.email}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="uppercase text-[10px] tracking-wider text-rose-600">
              {currentUser.status || 'Restricted'}
            </span>
          </div>
        )}

        {/* Message */}
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Your customer account has been suspended or restricted from accessing the platform. 
          If you believe this is a mistake or would like to request reinstatement, please reach 
          out to our official customer support team.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href="https://wa.me/9779800000000"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all duration-200"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support (WhatsApp)
          </a>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            {isLoggingOut ? 'Logging out...' : 'Log Out & Switch Account'}
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Mail className="w-3.5 h-3.5" />
          <span>info@unxgames.np</span>
        </div>
      </div>
    </div>
  );
};
