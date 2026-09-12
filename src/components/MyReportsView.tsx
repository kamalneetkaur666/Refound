import React, { useState } from 'react';
import {
  FolderHeart,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  Handshake,
  Clock,
  MapPin,
  Calendar,
  Lock,
  XCircle,
  Check,
  ChevronRight,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { ItemReport, PotentialMatch, Claim } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

interface MyReportsViewProps {
  items: ItemReport[];
  potentialMatches: PotentialMatch[];
  claims: Claim[];
  onSelectItem: (item: ItemReport) => void;
  onOpenMatchModal: (match: PotentialMatch) => void;
  onOpenReportModal: (type?: 'lost' | 'found') => void;
  onDataChanged: () => void;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({
  items,
  potentialMatches,
  claims,
  onSelectItem,
  onOpenMatchModal,
  onOpenReportModal,
  onDataChanged,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'matches' | 'received-claims' | 'sent-claims'>('lost');
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<Claim | null>(null);
  const [privateClue, setPrivateClue] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const myLostItems = items.filter((i) => i.ownerId === user?.uid && i.type === 'lost');
  const myFoundItems = items.filter((i) => i.ownerId === user?.uid && i.type === 'found');
  
  // Detect reports submitted from this device/browser under previous demo/guest sessions
  const deviceCreatedLostItems = items.filter(
    (i) => i.type === 'lost' && i.ownerId !== user?.uid && dataService.isDeviceCreatedItem(i.id)
  );
  const deviceCreatedFoundItems = items.filter(
    (i) => i.type === 'found' && i.ownerId !== user?.uid && dataService.isDeviceCreatedItem(i.id)
  );

  const myMatches = potentialMatches.filter(
    (m) => m.lostItemOwnerId === user?.uid || m.foundItemOwnerId === user?.uid
  );
  const claimsReceived = claims.filter((c) => c.itemOwnerId === user?.uid);
  const claimsSent = claims.filter((c) => c.claimantId === user?.uid);

  const handleTransferOwnership = async (item: ItemReport) => {
    if (!user) return;
    await dataService.transferItemOwnership(
      item.id,
      user.uid,
      user.displayName || user.email?.split('@')[0],
      user.email
    );
    onDataChanged();
  };

  const handleOpenClaimReview = async (claim: Claim) => {
    setSelectedClaimForReview(claim);
    setIsRejecting(false);
    setRejectReasonInput('');
    // Fetch private details of the item to compare against claimant's answers!
    if (user) {
      const details = await dataService.getItemPrivateDetails(claim.itemId, user.uid);
      setPrivateClue(details);
    }
  };

  const handleApproveReturn = async (claim: Claim) => {
    await dataService.updateClaimStatus(claim.id, 'returned');
    setSelectedClaimForReview(null);
    onDataChanged();
  };

  const handleRejectClaim = async (claim: Claim) => {
    await dataService.updateClaimStatus(claim.id, 'rejected', rejectReasonInput.trim() || 'Identifying details did not match');
    setSelectedClaimForReview(null);
    setIsRejecting(false);
    onDataChanged();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Delete this report?')) {
      await dataService.deleteItem(itemId);
      onDataChanged();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Campus Reports &amp; Claims
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your reported items, inspect verification answers, and view AI matches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="myreports-create-lost-btn"
            onClick={() => onOpenReportModal('lost')}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-rose-600" />
            Report Lost
          </button>
          <button
            id="myreports-create-found-btn"
            onClick={() => onOpenReportModal('found')}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Report Found
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          id="tab-my-lost-btn"
          onClick={() => setActiveTab('lost')}
          className={`py-2 px-3.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'lost'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lost Items ({myLostItems.length})
        </button>
        <button
          id="tab-my-found-btn"
          onClick={() => setActiveTab('found')}
          className={`py-2 px-3.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'found'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Found Items ({myFoundItems.length})
        </button>
        <button
          id="tab-my-matches-btn"
          onClick={() => setActiveTab('matches')}
          className={`py-2 px-3.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'matches'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          AI Matches ({myMatches.length})
        </button>
        <button
          id="tab-received-claims-btn"
          onClick={() => setActiveTab('received-claims')}
          className={`py-2 px-3.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'received-claims'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Verification Inbox ({claimsReceived.length})
        </button>
        <button
          id="tab-sent-claims-btn"
          onClick={() => setActiveTab('sent-claims')}
          className={`py-2 px-3.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'sent-claims'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Claims ({claimsSent.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* LOST ITEMS TAB */}
        {activeTab === 'lost' && (
          <div>
            {/* Notice banner if reports were created on this browser under another session */}
            {deviceCreatedLostItems.length > 0 && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Found {deviceCreatedLostItems.length} lost report{deviceCreatedLostItems.length > 1 ? 's' : ''} submitted from this device in a previous session
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      &ldquo;{deviceCreatedLostItems[0].title}&rdquo;{deviceCreatedLostItems.length > 1 ? ` and ${deviceCreatedLostItems.length - 1} other report` : ''} was uploaded here. Would you like to link it to your active account ({user?.displayName || user?.email || 'Active User'})?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="link-lost-device-items-btn"
                    onClick={async () => {
                      for (const it of deviceCreatedLostItems) {
                        await handleTransferOwnership(it);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Link to My Account
                  </button>
                </div>
              </div>
            )}

            {myLostItems.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myLostItems.map((item) => (
                  <div
                    key={item.id}
                    id={`my-lost-card-${item.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                          Lost
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                      <div className="aspect-16/9 rounded-xl overflow-hidden bg-slate-100 mb-2">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectItem(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        View Full
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : deviceCreatedLostItems.length > 0 ? (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Reports Submitted From This Device (Pending Link to Account):
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {deviceCreatedLostItems.map((item) => (
                    <div
                      key={item.id}
                      id={`device-lost-card-${item.id}`}
                      className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            On This Device
                          </span>
                          <span className="text-xs text-slate-400 capitalize">{item.status.replace('_', ' ')}</span>
                        </div>
                        <div className="aspect-16/9 rounded-xl overflow-hidden bg-slate-100 mb-2">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleTransferOwnership(item)}
                          className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Link to My Account
                        </button>
                        <button
                          onClick={() => onSelectItem(item)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-500 text-sm">You haven&apos;t reported any lost items yet.</p>
                <button
                  onClick={() => onOpenReportModal('lost')}
                  className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
                >
                  Report Lost Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* FOUND ITEMS TAB */}
        {activeTab === 'found' && (
          <div>
            {/* Notice banner if found reports were created on this browser under another session */}
            {deviceCreatedFoundItems.length > 0 && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Found {deviceCreatedFoundItems.length} found report{deviceCreatedFoundItems.length > 1 ? 's' : ''} submitted from this device in a previous session
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      &ldquo;{deviceCreatedFoundItems[0].title}&rdquo; was submitted here. Would you like to link it to your active account ({user?.displayName || user?.email || 'Active User'})?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="link-found-device-items-btn"
                    onClick={async () => {
                      for (const it of deviceCreatedFoundItems) {
                        await handleTransferOwnership(it);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Link to My Account
                  </button>
                </div>
              </div>
            )}

            {myFoundItems.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myFoundItems.map((item) => (
                  <div
                    key={item.id}
                    id={`my-found-card-${item.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                          Found
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                      <div className="aspect-16/9 rounded-xl overflow-hidden bg-slate-100 mb-2">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectItem(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        View Full
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : deviceCreatedFoundItems.length > 0 ? (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Reports Submitted From This Device (Pending Link to Account):
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {deviceCreatedFoundItems.map((item) => (
                    <div
                      key={item.id}
                      id={`device-found-card-${item.id}`}
                      className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            On This Device
                          </span>
                          <span className="text-xs text-slate-400 capitalize">{item.status.replace('_', ' ')}</span>
                        </div>
                        <div className="aspect-16/9 rounded-xl overflow-hidden bg-slate-100 mb-2">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleTransferOwnership(item)}
                          className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Link to My Account
                        </button>
                        <button
                          onClick={() => onSelectItem(item)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-500 text-sm">You haven&apos;t reported any found items yet.</p>
                <button
                  onClick={() => onOpenReportModal('found')}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Report Found Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI MATCHES TAB */}
        {activeTab === 'matches' && (
          <div>
            {myMatches.length > 0 ? (
              <div className="grid gap-4">
                {myMatches.map((match) => (
                  <div
                    key={match.id}
                    id={`my-match-row-${match.id}`}
                    onClick={() => onOpenMatchModal(match)}
                    className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          {match.confidenceScore}% Match
                        </span>
                        <span className="text-xs text-slate-400">
                          Detected on {match.createdAt.split('T')[0]}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-900">
                        <span className="text-rose-600">[Lost] {match.lostItemTitle}</span>
                        <span className="text-slate-300">&harr;</span>
                        <span className="text-emerald-600">[Found] {match.foundItemTitle}</span>
                      </div>
                      <p className="text-xs text-slate-600 italic line-clamp-2">
                        {match.matchReasons}
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenMatchModal(match)}
                      className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      Compare Side-by-Side
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No active AI matches found for your reports yet.</p>
              </div>
            )}
          </div>
        )}

        {/* RECEIVED CLAIMS INBOX */}
        {activeTab === 'received-claims' && (
          <div>
            {claimsReceived.length > 0 ? (
              <div className="grid gap-4">
                {claimsReceived.map((claim) => (
                  <div
                    key={claim.id}
                    id={`received-claim-row-${claim.id}`}
                    className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                          Verification Claim Received
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">
                          Item: {claim.itemTitle}
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                          claim.status === 'returned'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>

                    {/* Claimant info */}
                    <div className="text-xs text-slate-600 grid sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-400 block">Claimant:</span>
                        <span className="font-semibold text-slate-800">{claim.claimantName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Email:</span>
                        <span className="font-medium text-slate-800">{claim.claimantEmail}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Phone:</span>
                        <span className="font-medium text-slate-800">{claim.claimantPhone || 'Not provided'}</span>
                      </div>
                    </div>

                    {/* Claimant's Answers */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-xs font-bold text-slate-700 block mb-1">
                        Claimant&apos;s Submitted Verification Clues:
                      </span>
                      <p className="text-xs text-slate-800 italic leading-relaxed whitespace-pre-line">
                        &ldquo;{claim.identifyingAnswers}&rdquo;
                      </p>
                    </div>

                    {/* Actions */}
                    {claim.status === 'pending' && (
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenClaimReview(claim)}
                          className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Review Against Secret Clues
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No verification claims received yet.</p>
              </div>
            )}
          </div>
        )}

        {/* CLAIMS I SUBMITTED */}
        {activeTab === 'sent-claims' && (
          <div>
            {claimsSent.length > 0 ? (
              <div className="grid gap-4">
                {claimsSent.map((claim) => (
                  <div
                    key={claim.id}
                    id={`sent-claim-row-${claim.id}`}
                    className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Claim for: {claim.itemTitle}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          claim.status === 'returned'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic">
                      Your answer: &ldquo;{claim.identifyingAnswers}&rdquo;
                    </p>
                    {claim.rejectionReason && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        Feedback: {claim.rejectionReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-500 text-sm">You haven&apos;t filed any claims yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Review Modal */}
      {selectedClaimForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">
                Review Verification Claim
              </h3>
              <button
                onClick={() => setSelectedClaimForReview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                &times;
              </button>
            </div>

            {/* Comparison of secret clue vs claimant answer */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <span className="font-bold text-indigo-900 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Your Encrypted Private Clue (Owner Reference):
                </span>
                <p className="text-indigo-950 italic">
                  {privateClue || 'No secret clue was provided during initial report.'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">
                  Claimant&apos;s Submitted Answer ({selectedClaimForReview.claimantName}):
                </span>
                <p className="text-slate-900 italic">
                  {selectedClaimForReview.identifyingAnswers}
                </p>
              </div>
            </div>

            {isRejecting ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">
                  Optional Reason for Declining Claim:
                </label>
                <input
                  type="text"
                  placeholder="e.g. The engraving initials do not match the item"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsRejecting(false)}
                    className="px-3 py-1.5 text-xs text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRejectClaim(selectedClaimForReview)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg"
                  >
                    Confirm Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setIsRejecting(true)}
                  className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Decline Claim
                </button>
                <button
                  onClick={() => handleApproveReturn(selectedClaimForReview)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve &amp; Mark as Returned
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
