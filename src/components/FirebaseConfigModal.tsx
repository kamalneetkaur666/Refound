import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import {
  firebaseConfig,
  isUsingCustomFirebaseConfig,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
} from '../firebase/config';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [pasteSnippet, setPasteSnippet] = useState('');
  const [apiKey, setApiKey] = useState(firebaseConfig.apiKey || '');
  const [authDomain, setAuthDomain] = useState(firebaseConfig.authDomain || '');
  const [projectId, setProjectId] = useState(firebaseConfig.projectId || '');
  const [storageBucket, setStorageBucket] = useState(firebaseConfig.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(firebaseConfig.messagingSenderId || '');
  const [appId, setAppId] = useState(firebaseConfig.appId || '');
  const [databaseId, setDatabaseId] = useState(firebaseConfig.firestoreDatabaseId || '(default)');
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'refound-olive.vercel.app';
  const isCustom = isUsingCustomFirebaseConfig();

  const handleParseSnippet = () => {
    setParseError(null);
    if (!pasteSnippet.trim()) {
      setParseError('Please paste your Firebase config snippet or JSON.');
      return;
    }

    try {
      // Try direct JSON parse
      let parsed: any;
      try {
        parsed = JSON.parse(pasteSnippet.trim());
      } catch {
        // Try regex extract from standard JS snippet
        const extractField = (name: string) => {
          const match = pasteSnippet.match(new RegExp(`${name}["']?\\s*:\\s*["']([^"']+)["']`));
          return match ? match[1] : '';
        };

        parsed = {
          apiKey: extractField('apiKey'),
          authDomain: extractField('authDomain'),
          projectId: extractField('projectId'),
          storageBucket: extractField('storageBucket'),
          messagingSenderId: extractField('messagingSenderId'),
          appId: extractField('appId'),
        };
      }

      if (parsed.projectId || parsed.apiKey) {
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.authDomain) setAuthDomain(parsed.authDomain);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
        if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
        if (parsed.appId) setAppId(parsed.appId);
        if (parsed.firestoreDatabaseId) setDatabaseId(parsed.firestoreDatabaseId);
        setPasteSnippet('');
      } else {
        setParseError('Could not extract Firebase credentials. Please verify your snippet or enter fields manually below.');
      }
    } catch (e: any) {
      setParseError('Error parsing snippet: ' + (e?.message || 'Invalid format'));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) {
      setParseError('Project ID and API Key are required.');
      return;
    }

    saveCustomFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
      firestoreDatabaseId: databaseId.trim() || '(default)',
    });
  };

  const handleReset = () => {
    clearCustomFirebaseConfig();
  };

  const copyHost = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="firebase-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 id="firebase-modal-title" className="text-base font-bold text-slate-900">
                Firebase Project Settings
              </h2>
              <p className="text-xs text-slate-500">
                Connect your custom Firebase project or check configuration status
              </p>
            </div>
          </div>
          <button
            id="firebase-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm">
          {/* Active status */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isCustom
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="mt-0.5">
              {isCustom ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold">
                {isCustom ? 'Connected to Custom Firebase Project' : 'Using Default Project'}
              </p>
              <p className="mt-0.5 opacity-90 font-mono text-[11px]">
                Project: {firebaseConfig.projectId} &bull; DB: {firebaseConfig.firestoreDatabaseId || '(default)'}
              </p>
            </div>
            {isCustom && (
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Quick Guide for "Stuck on processing" / New Firebase Project */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Why Google Sign-In or Submit was stuck in your new project:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-amber-800/90 pl-1 leading-relaxed">
              <li>
                <strong>Authorized Domains:</strong> In Firebase Console &gt; Authentication &gt; Settings &gt;
                Authorized domains, add your host:
                <div className="mt-1 flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] text-slate-800">
                    {currentHost}
                  </code>
                  <button
                    type="button"
                    onClick={copyHost}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedDomain ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </li>
              <li>
                <strong>Enable Sign-in Providers:</strong> In Authentication &gt; Sign-in method, turn ON{' '}
                <strong>Email/Password</strong> and <strong>Google</strong>.
              </li>
              <li>
                <strong>Firestore Database:</strong> In Firestore Database, click &quot;Create Database&quot; and start in Test
                Mode.
              </li>
            </ol>
          </div>

          {/* Paste Snippet Option */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Paste Firebase SDK Config (Auto-Fill)
            </label>
            <div className="flex gap-2">
              <textarea
                value={pasteSnippet}
                onChange={(e) => setPasteSnippet(e.target.value)}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "my-lost-and-found",\n  ...\n};`}
                rows={3}
                className="flex-1 p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseSnippet}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                Auto-Fill Fields
              </button>
            </div>
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g. lost-found-2026"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Auth Domain</label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="project-id.firebaseapp.com"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456:web:abcd..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between gap-3">
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Open Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save &amp; Connect
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
