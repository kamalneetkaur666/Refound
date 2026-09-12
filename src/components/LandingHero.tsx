import React from 'react';
import {
  Sparkles,
  Search,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  BrainCircuit,
  Lock,
  ArrowRight,
  Compass,
  Check,
  Building,
  Users,
  Clock,
} from 'lucide-react';
import { ItemReport, PotentialMatch } from '../types';
import { useAuth } from '../context/AuthContext';

interface LandingHeroProps {
  onNavigateBrowse: (filter?: 'all' | 'lost' | 'found') => void;
  onOpenReportModal: (type: 'lost' | 'found') => void;
  onSelectItem: (item: ItemReport) => void;
  onOpenMatchModal: (match: PotentialMatch) => void;
  onOpenAuthModal?: () => void;
  recentItems: ItemReport[];
  potentialMatches: PotentialMatch[];
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onNavigateBrowse,
  onOpenReportModal,
  onSelectItem,
  onOpenMatchModal,
  onOpenAuthModal,
  recentItems,
  potentialMatches,
}) => {
  const { user } = useAuth();
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200/80 bg-linear-to-b from-indigo-50/50 via-white to-slate-50/30">
        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Smart Campus Lost & Found Network</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            Lost it. Someone found it. <br className="hidden sm:inline" />
            <span className="text-indigo-600">Let&apos;s connect the dots.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            ReFound replaces chaotic campus group chats and bulletin boards with an intelligent,
            centralized lost & found platform powered by Gemini AI matching.
          </p>

          {/* 3 Main Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md sm:max-w-xl mx-auto">
            <button
              id="hero-report-lost-cta"
              onClick={() => onOpenReportModal('lost')}
              className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <PlusCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
              Report Lost Item
            </button>

            <button
              id="hero-report-found-cta"
              onClick={() => onOpenReportModal('found')}
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <CheckCircle2 className="w-5 h-5 transition-transform group-hover:scale-110" />
              Report Found Item
            </button>

            <button
              id="hero-browse-cta"
              onClick={() => onNavigateBrowse('all')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5 text-slate-500" />
              Browse Items
            </button>
          </div>

          {!user && onOpenAuthModal && (
            <div className="mt-4">
              <button
                type="button"
                id="hero-signin-link-btn"
                onClick={onOpenAuthModal}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline underline-offset-4 decoration-indigo-300 hover:decoration-indigo-600 transition-all"
              >
                Sign In with your Campus Email &amp; Password or Register &rarr;
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-3xl mx-auto">
            <div>
              <span className="block text-2xl sm:text-3xl font-bold text-slate-900">92%</span>
              <span className="text-xs font-medium text-slate-500">Matching Plausibility</span>
            </div>
            <div>
              <span className="block text-2xl sm:text-3xl font-bold text-slate-900">&lt; 4 hrs</span>
              <span className="text-xs font-medium text-slate-500">Average Match Discovery</span>
            </div>
            <div>
              <span className="block text-2xl sm:text-3xl font-bold text-slate-900">Zero</span>
              <span className="text-xs font-medium text-slate-500">Public Contact Leaks</span>
            </div>
            <div>
              <span className="block text-2xl sm:text-3xl font-bold text-slate-900">100%</span>
              <span className="text-xs font-medium text-slate-500">Verified Campus Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Campus Workflow
          </span>
          <h2 className="text-3xl font-bold text-slate-900 mt-2">
            How ReFound Works
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            A secure, modern 3-step loop designed specifically for university campuses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 1</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
              Report with Private Clues
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Snap a photo and state where you saw or found the item. Crucially, specify private identifying details (hidden engraving, lock screen wallpaper, sticker under case) that are kept strictly confidential.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-5">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Step 2</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
              Gemini AI Analyzes Matches
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Our secure Gemini engine semantically cross-references item descriptions, categories, campus building locations, and timelines to flag candidate matches with transparent similarity scores.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 3</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
              Verify Claim & Handover
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Before revealing personal phone or email, the claimant answers verification questions. The reporter confirms accuracy, approves the claim, and coordinates safe pickup at campus security or library desks.
            </p>
          </div>
        </div>
      </section>

      {/* Live AI Matches Spotlight */}
      {potentialMatches.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 text-xs font-semibold text-indigo-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Gemini AI Active Match Scanner
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Potential Matches Awaiting Confirmation
                </h2>
                <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                  AI suggestions are potential matches only. ReFound never automatically declares items belong to the same person.
                </p>
              </div>
              <button
                id="hero-view-all-matches-btn"
                onClick={() => onNavigateBrowse('all')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                Browse All Reports
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {potentialMatches.slice(0, 2).map((match) => (
                <div
                  key={match.id}
                  id={`match-spotlight-${match.id}`}
                  onClick={() => onOpenMatchModal(match)}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {match.confidenceScore}% Match Confidence
                    </span>
                    <span className="text-[11px] text-indigo-200">
                      Tap to Compare &rarr;
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-200 border border-rose-400/30">
                        Lost
                      </span>
                      <span className="font-semibold text-white truncate">{match.lostItemTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        Found
                      </span>
                      <span className="font-semibold text-white truncate">{match.foundItemTitle}</span>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-100/80 mt-3 line-clamp-2 italic">
                    &ldquo;{match.matchReasons}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Campus Reports Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Campus Reports</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Active lost and found notices logged across buildings today
            </p>
          </div>
          <button
            id="hero-recent-view-all-btn"
            onClick={() => onNavigateBrowse('all')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View all {recentItems.length} items
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recentItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              id={`hero-item-card-${item.id}`}
              onClick={() => onSelectItem(item)}
              className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col group"
            >
              {/* Image */}
              <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                    <Compass className="w-8 h-8 opacity-40" />
                  </div>
                )}
                {/* Type Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-2xs ${
                      item.type === 'lost'
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
                {item.status === 'potential_match' && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Match
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                    {item.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1 mt-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1.5">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[130px]" title={item.location}>
                    {item.location}
                  </span>
                  <span>{item.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
