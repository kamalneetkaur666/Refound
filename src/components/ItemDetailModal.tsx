import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  Handshake,
  Trash2,
  Edit,
  Flag,
  CheckCircle,
  ExternalLink,
  Info,
  Camera,
  ImageOff,
} from 'lucide-react';
import { ItemReport, PotentialMatch } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { runGeminiMatching } from '../services/aiService';
import { CategoryIcon } from './CategoryIcon';

interface ItemDetailModalProps {
  item: ItemReport | null;
  onClose: () => void;
  onClaim: (item: ItemReport) => void;
  onOpenMatchModal: (match: PotentialMatch) => void;
  onItemUpdated: () => void;
  onOpenFlagModal: (itemId: string) => void;
  allItems: ItemReport[];
  potentialMatches: PotentialMatch[];
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onClaim,
  onOpenMatchModal,
  onItemUpdated,
  onOpenFlagModal,
  allItems,
  potentialMatches,
}) => {
  const { user } = useAuth();
  const [privateDetails, setPrivateDetails] = useState<string | null>(null);
  const [isRunningAI, setIsRunningAI] = useState<boolean>(false);
  const [aiScanStatus, setAiScanStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string>('');

  const isOwner = user && item && user.uid === item.ownerId;

  // Find matches linked to this item
  const itemMatches = item
    ? potentialMatches.filter((m) => m.lostItemId === item.id || m.foundItemId === item.id)
    : [];

  useEffect(() => {
    if (item && isOwner) {
      dataService.getItemPrivateDetails(item.id, user.uid).then((details) => {
        setPrivateDetails(details);
      });
      setEditTitle(item.title);
      setEditDescription(item.description);
      setEditLocation(item.location);
      setEditImageUrl(item.imageUrl || '');
    } else {
      setPrivateDetails(null);
      setIsEditing(false);
      setEditImageUrl(item?.imageUrl || '');
    }
  }, [item, isOwner, user]);

  if (!item) return null;

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhotoDirectly = async () => {
    if (!item) return;
    await dataService.updateItem(item.id, {
      imageUrl: '',
    });
    setEditImageUrl('');
    onItemUpdated();
  };

  const handleRunAiMatch = async () => {
    setIsRunningAI(true);
    setAiScanStatus('Comparing with active campus reports using Gemini AI...');
    try {
      const newMatches = await runGeminiMatching(item, allItems);
      if (newMatches.length > 0) {
        setAiScanStatus(`Found ${newMatches.length} potential match candidate(s)!`);
        onItemUpdated();
      } else {
        setAiScanStatus('No high-probability matches found among current campus reports.');
      }
    } catch (err: any) {
      setAiScanStatus('Scan note: ' + (err.message || 'Matching complete.'));
    } finally {
      setIsRunningAI(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    await dataService.updateItem(item.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      location: editLocation.trim(),
      imageUrl: editImageUrl.trim() ? editImageUrl.trim() : '',
    });
    setIsEditing(false);
    onItemUpdated();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove this item report?')) {
      await dataService.deleteItem(item.id);
      onItemUpdated();
      onClose();
    }
  };

  const handleMarkReturned = async () => {
    await dataService.updateItem(item.id, { status: 'returned' });
    onItemUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="item-detail-modal"
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                item.type === 'lost' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {item.type} Item
            </span>
            <span className="text-xs text-slate-500 font-medium capitalize">
              Status: {item.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="detail-flag-btn"
              onClick={() => onOpenFlagModal(item.id)}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Report inappropriate or suspicious listing"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              id="close-detail-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Main Visual Header */}
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Image & Photo Controls */}
            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-4/3 relative flex flex-col items-center justify-center">
              {isEditing ? (
                editImageUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={editImageUrl}
                      alt={editTitle}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center gap-2 p-4">
                      <button
                        type="button"
                        onClick={() => setEditImageUrl('')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Photo
                      </button>
                      <label className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 transition-colors">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        Replace Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-500 text-center">
                    <CategoryIcon category={item.category} className="w-12 h-12 text-slate-300 mb-2" />
                    <span className="text-xs font-semibold text-slate-700 mb-1">No Photo Attached</span>
                    <p className="text-[11px] text-slate-400 mb-3">You can attach a real photo if you have one</p>
                    <label className="px-3.5 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 text-indigo-600 text-xs font-bold rounded-xl cursor-pointer shadow-2xs flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )
              ) : item.imageUrl ? (
                <div className="relative w-full h-full group">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleRemovePhotoDirectly}
                      title="Remove photo from report"
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-900/75 hover:bg-rose-600 text-white text-[11px] font-semibold rounded-lg shadow-sm backdrop-blur-xs flex items-center gap-1 transition-colors"
                    >
                      <ImageOff className="w-3 h-3" />
                      Remove Photo
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-linear-to-b from-slate-50 to-slate-100/70 p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-400 mb-3">
                    <CategoryIcon category={item.category} className="w-8 h-8 text-indigo-500/70" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{item.category}</span>
                  <span className="text-xs text-slate-400 mt-0.5">No photo uploaded with this report</span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Add a photo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Metadata */}
            <div className="space-y-3.5">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                {item.category}
              </span>

              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-base font-bold text-slate-900 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg"
                  />
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-md"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs text-slate-600 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-extrabold text-slate-900 leading-snug">
                    {item.title}
                  </h1>

                  <div className="space-y-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Reported on {item.date}{' '}
                        {item.approximateTime && `around ${item.approximateTime}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Reported by {item.reporterName}</span>
                    </div>
                  </div>

                  {item.turnInLocation && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block">Holding Location:</span>
                        <span>{item.turnInLocation}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Public Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          </div>

          {/* Owner Only: Private Details Box */}
          {isOwner && privateDetails && (
            <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Your Private Verification Details (Protected)</span>
              </div>
              <p className="text-xs text-indigo-950 italic bg-white/70 p-3 rounded-xl border border-indigo-100">
                &ldquo;{privateDetails}&rdquo;
              </p>
              <p className="text-[11px] text-indigo-700 mt-2">
                This text is hidden from all public viewers. Use this to cross-check answers when claimants step forward!
              </p>
            </div>
          )}

          {/* Connected AI Matches Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Potential Matches ({itemMatches.length})
                </h3>
              </div>
              <button
                id="item-run-ai-match-btn"
                onClick={handleRunAiMatch}
                disabled={isRunningAI}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRunningAI ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Scanning with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Re-scan AI Matches
                  </>
                )}
              </button>
            </div>

            {aiScanStatus && (
              <p className="text-xs text-indigo-600 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                {aiScanStatus}
              </p>
            )}

            {itemMatches.length > 0 ? (
              <div className="grid gap-3">
                {itemMatches.map((m) => (
                  <div
                    key={m.id}
                    id={`detail-match-row-${m.id}`}
                    onClick={() => onOpenMatchModal(m)}
                    className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                          {m.confidenceScore}% Confidence
                        </span>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {item.type === 'lost' ? m.foundItemTitle : m.lostItemTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 italic">
                        {m.matchReasons}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 shrink-0">
                      Compare &rarr;
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                No potential matches currently linked. You can click &ldquo;Re-scan AI Matches&rdquo; to evaluate against campus records.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          {/* Owner options */}
          {isOwner ? (
            <div className="flex items-center gap-2">
              <button
                id="owner-edit-btn"
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              {item.status !== 'returned' && (
                <button
                  id="owner-mark-returned-btn"
                  onClick={handleMarkReturned}
                  className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark as Returned
                </button>
              )}
              <button
                id="owner-delete-btn"
                onClick={handleDelete}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>Contact info is exchanged after verification.</span>
            </div>
          )}

          {/* Primary Action Button (Claim) */}
          <div className="flex items-center gap-2">
            {!isOwner && item.status !== 'returned' && (
              <button
                id="detail-claim-btn"
                onClick={() => onClaim(item)}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <Handshake className="w-4 h-4" />
                Claim This Item
              </button>
            )}
            <button
              id="detail-close-btn"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
