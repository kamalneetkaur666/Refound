import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  Users,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth, formatAuthError, AuthErrorDetails } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signInWithDemoEmail,
    switchDemoUser,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Student');
  const [studentId, setStudentId] = useState('');
  const [errorDetails, setErrorDetails] = useState<AuthErrorDetails | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setErrorDetails({
            code: 'custom/missing-name',
            message: 'Please enter your full name.',
          });
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorDetails({
            code: 'auth/weak-password',
            message: 'Password must be at least 6 characters.',
          });
          setLoading(false);
          return;
        }
        await signUpWithEmail(email.trim(), password, name.trim(), role, studentId.trim());
      } else if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorDetails(formatted);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorDetails({
        code: 'custom/empty-email',
        message: 'Please enter your registered campus email address.',
      });
      return;
    }

    setErrorDetails(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err: any) {
      setErrorDetails(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorDetails(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorDetails(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFallback = () => {
    signInWithDemoEmail(email.trim() || 'student@campus.edu', name.trim() || 'Campus Student', role);
    onClose();
  };

  const handleQuickDemo = (persona: 'alex' | 'sam' | 'security') => {
    switchDemoUser(persona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        id="auth-modal"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {mode === 'forgot'
                ? 'Reset Password'
                : mode === 'signup'
                ? 'Create Campus Account'
                : 'Sign in to ReFound'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'forgot'
                ? 'We will send a password reset link to your email'
                : mode === 'signup'
                ? 'Register with your campus email to report & claim items'
                : 'Access your lost & found reports, claims, and matches'}
            </p>
          </div>
          <button
            id="auth-close-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-slate-200 bg-slate-100/70 p-1">
            <button
              type="button"
              id="tab-auth-signin"
              onClick={() => {
                setMode('signin');
                setErrorDetails(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-auth-signup"
              onClick={() => {
                setMode('signup');
                setErrorDetails(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Main Content Form */}
        <div className="p-6 space-y-5">
          {/* Error Message */}
          {errorDetails && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1.5 leading-relaxed">
                  <div>{errorDetails.message}</div>
                  {errorDetails.code === 'auth/unauthorized-domain' && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setErrorDetails(null);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                      >
                        Sign in with Campus Email instead
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {mode === 'forgot' ? (
            <div className="space-y-4">
              {resetSent ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reset Email Sent!</span>
                  </div>
                  <p className="leading-relaxed">
                    Instructions to reset your password have been sent to{' '}
                    <strong className="underline">{email}</strong>. Please check your inbox and spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(false);
                      setMode('signin');
                    }}
                    className="w-full py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Campus Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="student@campus.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {loading ? 'Sending...' : 'Send Password Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* SIGN IN OR SIGN UP FORM */
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        id="signup-fullname-input"
                        placeholder="e.g. Jordan Lee"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Campus Role
                      </label>
                      <select
                        id="signup-role-select"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="Student">Undergraduate</option>
                        <option value="Graduate Student (RA)">Graduate Student</option>
                        <option value="Faculty">Faculty / Professor</option>
                        <option value="Campus Staff">Staff</option>
                        <option value="Campus Security">Security</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Student / Staff ID
                      </label>
                      <input
                        type="text"
                        id="signup-id-input"
                        placeholder="e.g. ST-4029"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campus Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    id="auth-email-input"
                    placeholder="student@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Password *
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorDetails(null);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="auth-password-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Must be at least 6 characters
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-xs transition-colors mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === 'signup' ? (
                  <span>Create Account</span>
                ) : (
                  <span>Sign In with Email</span>
                )}
              </button>
            </form>
          )}

          {mode !== 'forgot' && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px bg-slate-200 flex-1" />
                <span>or continue with</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 px-4 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Quick Demo Personas Box */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Instant Campus Demo Accounts:</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-normal normal-case">No password needed</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    id="demo-alex-btn"
                    onClick={() => handleQuickDemo('alex')}
                    className="px-2 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-semibold shadow-2xs text-center transition-colors"
                  >
                    Alex (Student)
                  </button>
                  <button
                    type="button"
                    id="demo-sam-btn"
                    onClick={() => handleQuickDemo('sam')}
                    className="px-2 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-semibold shadow-2xs text-center transition-colors"
                  >
                    Sam (Finder)
                  </button>
                  <button
                    type="button"
                    id="demo-security-btn"
                    onClick={() => handleQuickDemo('security')}
                    className="px-2 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-semibold shadow-2xs text-center transition-colors"
                  >
                    Campus Safety
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
