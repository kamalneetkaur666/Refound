import React from 'react';
import {
  X,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Handshake,
  ShieldCheck,
  Check,
  Ban,
  Info,
} from 'lucide-react';
import { ItemReport, PotentialMatch } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface MatchComparisonModalProps {
  match: PotentialMatch | null;
  lostItem: ItemReport | null;
  foundItem: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimFoundItem: (item: ItemReport) => void;
  onDismissMatch: (matchId: string) => void;
}

export const MatchComparisonModal: React.FC<MatchComparisonModalProps> = ({
  match,
  lostItem,
  foundItem,
  isOpen,
  onClose,
  onClaimFoundItem,
  onDismissMatch,
}) => {
  if (!isOpen || !match || !lostItem || !foundItem) return null;

  const score = match.confidenceScore;
  const scoreColor =
    score >= 85 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
    score >= 65 ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
    'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="match-comparison-modal"
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  Gemini AI Match Analysis
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreColor}`}>
                  {score}% Match Plausibility
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Comparing Lost #{lostItem.id.slice(-6)} and Found #{foundItem.id.slice(-6)}
              </span>
            </div>
          </div>

          <button
            id="close-match-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Important AI Disclaimer Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Potential Match Notice</span>
              <p className="leading-relaxed">
                AI suggestions are potential matches only. ReFound never automatically declares items belong to the same person. Always inspect physical traits and verify private ownership clues before meeting.
              </p>
            </div>
          </div>

          {/* Side-by-Side Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Lost Item Side */}
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-600 text-white">
                  Lost Item
                </span>
                <span className="text-xs font-medium text-slate-500">{lostItem.category}</span>
              </div>

              <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {lostItem.imageUrl ? (
                  <img src={lostItem.imageUrl} alt={lostItem.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 gap-1">
                    <CategoryIcon category={lostItem.category} className="w-6 h-6 text-slate-300" />
                    <span className="text-[11px] font-medium text-slate-400">No photo provided</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{lostItem.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                  {lostItem.description}
                </p>
              </div>

              <div className="pt-2 border-t border-rose-100 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span className="truncate">{lostItem.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>{lostItem.date} {lostItem.approximateTime && `(${lostItem.approximateTime})`}</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Reported by {lostItem.reporterName}
                </div>
              </div>
            </div>

            {/* Found Item Side */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white">
                  Found Item
                </span>
                <span className="text-xs font-medium text-slate-500">{foundItem.category}</span>
              </div>

              <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {foundItem.imageUrl ? (
                  <img src={foundItem.imageUrl} alt={foundItem.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 gap-1">
                    <CategoryIcon category={foundItem.category} className="w-6 h-6 text-slate-300" />
                    <span className="text-[11px] font-medium text-slate-400">No photo provided</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{foundItem.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                  {foundItem.description}
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-100 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate">{foundItem.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{foundItem.date} {foundItem.approximateTime && `(${foundItem.approximateTime})`}</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Reported by {foundItem.reporterName}
                </div>
              </div>
            </div>
          </div>

          {/* AI Comparison Analysis Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                Gemini Reasoning & Overlap
              </span>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {match.matchReasons}
              </p>
            </div>

            {/* Key Similarities */}
            {match.keySimilarities && match.keySimilarities.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-emerald-700 block mb-1.5">
                  Key Similarities:
                </span>
                <ul className="space-y-1">
                  {match.keySimilarities.map((sim, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{sim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Differences */}
            {match.keyDifferences && match.keyDifferences.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-amber-700 block mb-1.5">
                  Notable Discrepancies to Verify:
                </span>
                <ul className="space-y-1">
                  {match.keyDifferences.map((diff, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            id="dismiss-match-btn"
            onClick={() => {
              onDismissMatch(match.id);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" />
            Dismiss this Match
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="match-close-btn"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              id="match-initiate-claim-btn"
              onClick={() => {
                onClose();
                onClaimFoundItem(foundItem);
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Handshake className="w-4 h-4" />
              File Verification Claim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
