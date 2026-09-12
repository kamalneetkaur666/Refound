import React from 'react';
import {
  Compass,
  PlusCircle,
  FolderHeart,
  Bell,
  User as UserIcon,
  Search,
  CheckCircle2,
  LogIn,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: 'home' | 'browse' | 'my-reports';
  onNavigate: (view: 'home' | 'browse' | 'my-reports') => void;
  onOpenReportModal: (defaultType?: 'lost' | 'found') => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenReportModal,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenNotifications,
  unreadCount,
}) => {
  const { user, isDemoMode, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <button
              id="refound-logo-btn"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 transition-transform group-hover:scale-105">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-slate-900 block leading-tight">
                  Re<span className="text-indigo-600">Found</span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
                  Campus Lost & Found
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                id="nav-home-btn"
                onClick={() => onNavigate('home')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'home'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Home
              </button>
              <button
                id="nav-browse-btn"
                onClick={() => onNavigate('browse')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'browse'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Browse Items
              </button>
              <button
                id="nav-my-reports-btn"
                onClick={() => onNavigate('my-reports')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  currentView === 'my-reports'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FolderHeart className="w-4 h-4" />
                My Reports
              </button>
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Report CTA */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                id="header-report-lost-btn"
                onClick={() => onOpenReportModal('lost')}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-rose-600" />
                Report Lost
              </button>
              <button
                id="header-report-found-btn"
                onClick={() => onOpenReportModal('found')}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Report Found
              </button>
            </div>

            {/* Notification Bell */}
            <button
              id="header-notifications-btn"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-white bg-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile / Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  id="header-user-profile-btn"
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 transition-colors"
                >
                  <img
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user.displayName}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-300"
                  />
                  <div className="text-left hidden lg:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 block leading-none">
                        {user.displayName.split(' ')[0]}
                      </span>
                      {isDemoMode ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Demo
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          Live
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-none mt-0.5">
                      {user.campusRole || 'Student'}
                    </span>
                  </div>
                </button>
              </div>
            ) : loading ? (
              <div className="w-20 h-9 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <button
                id="header-signin-btn"
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 items-center justify-around text-xs">
          <button
            id="mobile-nav-home-btn"
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center py-1 px-3 rounded-md ${
              currentView === 'home' ? 'text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
          >
            Home
          </button>
          <button
            id="mobile-nav-browse-btn"
            onClick={() => onNavigate('browse')}
            className={`flex flex-col items-center py-1 px-3 rounded-md ${
              currentView === 'browse' ? 'text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
          >
            Browse
          </button>
          <button
            id="mobile-nav-report-btn"
            onClick={() => onOpenReportModal('lost')}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Report
          </button>
          <button
            id="mobile-nav-my-reports-btn"
            onClick={() => onNavigate('my-reports')}
            className={`flex flex-col items-center py-1 px-3 rounded-md ${
              currentView === 'my-reports' ? 'text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
          >
            My Reports
          </button>
        </div>
      </div>
    </header>
  );
};
