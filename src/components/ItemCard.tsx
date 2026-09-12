import React from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Eye,
  Handshake,
} from 'lucide-react';
import { ItemReport, PotentialMatch } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface ItemCardProps {
  item: ItemReport;
  onSelect: (item: ItemReport) => void;
  onClaim?: (item: ItemReport) => void;
  potentialMatch?: PotentialMatch;
  onOpenMatchModal?: (match: PotentialMatch) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onSelect,
  onClaim,
  potentialMatch,
  onOpenMatchModal,
}) => {
  const isLost = item.type === 'lost';

  const getStatusBadge = () => {
    switch (item.status) {
      case 'potential_match':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Possible Match
          </span>
        );
      case 'claimed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            Claim Pending
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle className="w-3 h-3 text-slate-500" />
            Returned
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
    }
  };

  return (
    <div
      id={`item-card-${item.id}`}
      className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group hover:border-slate-300"
    >
      {/* Visual Photo Header */}
      <div
        className="relative aspect-16/10 bg-slate-100 overflow-hidden cursor-pointer"
        onClick={() => onSelect(item)}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-linear-to-b from-slate-50 to-slate-100 p-4">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-indigo-500/75 mb-1.5">
              <CategoryIcon category={item.category} className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{item.category}</span>
          </div>
        )}

        {/* Type Ribbon */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs ${
              isLost
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {item.type}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">{getStatusBadge()}</div>

        {/* Optional Turn-in Location Flag for Found items */}
        {item.turnInLocation && (
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">At: {item.turnInLocation}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Date */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-indigo-600">{item.category}</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.date}</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect(item)}
            className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
          >
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
            {item.description}
          </p>

          {/* Campus Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={item.location}>
              {item.location}
            </span>
            {item.approximateTime && (
              <>
                <span className="text-slate-300">•</span>
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="shrink-0">{item.approximateTime}</span>
              </>
            )}
          </div>

          {/* Potential AI Match Indicator Bar if connected */}
          {potentialMatch && (
            <div
              id={`card-match-preview-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenMatchModal) onOpenMatchModal(potentialMatch);
              }}
              className="mt-3 p-2.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/60 cursor-pointer transition-colors text-left"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Gemini Match ({potentialMatch.confidenceScore}%)
                </span>
                <span className="text-[10px] font-semibold text-indigo-600">
                  Compare &rarr;
                </span>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                {potentialMatch.matchReasons}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            id={`item-view-btn-${item.id}`}
            onClick={() => onSelect(item)}
            className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            View Details
          </button>

          {item.status !== 'returned' && item.status !== 'closed' && onClaim && (
            <button
              id={`item-claim-btn-${item.id}`}
              onClick={() => onClaim(item)}
              className="py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Handshake className="w-3.5 h-3.5" />
              Claim
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
