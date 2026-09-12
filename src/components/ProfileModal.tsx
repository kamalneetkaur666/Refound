import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  GraduationCap,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: () => void;
  onOpenFirebaseConfig?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
  onOpenFirebaseConfig,
}) => {
  const { user, isDemoMode, switchDemoUser, signOutUser, updateUserProfileData } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [campusRole, setCampusRole] = useState(user?.campusRole || 'Student');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfileData({
      displayName: displayName.trim(),
      phone: phone.trim(),
      studentId: studentId.trim(),
      campusRole,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="user-profile-modal"
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-200">
              <img
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {user.displayName}
              </h2>
              <span className="text-xs text-indigo-600 font-semibold">
                {user.campusRole || 'Campus Member'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Account Switcher */}
        <div className="px-6 py-3.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>{isDemoMode ? 'Demo Persona:' : 'Signed In As:'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200">
              {user.authProvider === 'password' ? 'Email & Password' : user.authProvider === 'google' ? 'Google Account' : 'Demo Mode'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isDemoMode ? (
              <>
                <button
                  type="button"
                  onClick={() => switchDemoUser('alex')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    user.uid === 'demo-user-alex'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-950 hover:bg-indigo-100'
                  }`}
                >
                  Alex
                </button>
                <button
                  type="button"
                  onClick={() => switchDemoUser('sam')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    user.uid === 'demo-user-sam'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-950 hover:bg-indigo-100'
                  }`}
                >
                  Sam
                </button>
                <button
                  type="button"
                  onClick={() => switchDemoUser('security')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    user.uid === 'demo-user-taylor'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-950 hover:bg-indigo-100'
                  }`}
                >
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white shadow-2xs ml-1"
                >
                  Switch Account
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
              >
                Switch Account
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
              Campus Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                Student / Staff ID
              </label>
              <input
                type="text"
                placeholder="e.g. ST-89021"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                Campus Role
              </label>
              <select
                value={campusRole}
                onChange={(e) => setCampusRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:border-indigo-500"
              >
                <option value="Undergraduate Student">Undergraduate Student</option>
                <option value="Graduate Student (RA)">Graduate Student (RA)</option>
                <option value="Faculty / Professor">Faculty / Professor</option>
                <option value="Campus Staff">Campus Staff</option>
                <option value="Campus Safety & Desk Lead">Campus Safety & Desk Lead</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
              Contact Phone (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {isSaved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profile changes saved successfully!</span>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="profile-sign-out-btn"
                onClick={async () => {
                  await signOutUser();
                  onClose();
                }}
                className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-xs sm:text-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              {onOpenFirebaseConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFirebaseConfig();
                  }}
                  className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors text-xs cursor-pointer"
                >
                  Firebase Settings
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                id="profile-save-btn"
                className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
