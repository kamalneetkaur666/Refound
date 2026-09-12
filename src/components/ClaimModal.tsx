import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Send,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import { ItemReport, Claim } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

interface ClaimModalProps {
  item: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimSubmitted: (claim: Claim) => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  item,
  isOpen,
  onClose,
  onClaimSubmitted,
}) => {
  const { user } = useAuth();
  const [identifyingAnswers, setIdentifyingAnswers] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please sign in to submit an ownership claim.');
      return;
    }

    if (!identifyingAnswers.trim() || identifyingAnswers.trim().length < 15) {
      setErrorMsg('Please provide a detailed description of hidden identifying details to prove ownership (at least 15 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newClaim = await dataService.submitClaim({
        itemId: item.id,
        itemTitle: item.title,
        itemOwnerId: item.ownerId,
        claimantId: user.uid,
        claimantName: user.displayName,
        claimantEmail: user.email,
        claimantPhone: phone.trim() || undefined,
        identifyingAnswers: identifyingAnswers.trim(),
        proofImageUrl: proofImageUrl || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClaimSubmitted(newClaim);
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="claim-verification-modal"
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Verify Ownership Claim
              </h2>
              <span className="text-xs text-slate-500">
                Safe campus verification for {item.title}
              </span>
            </div>
          </div>

          <button
            id="close-claim-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Claim Submitted!</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Your verification answers have been forwarded to the reporter. Once they verify your details,
              they can coordinate safe return!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Target Item summary card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No img
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-semibold text-indigo-600 block">{item.category}</span>
                <h4 className="font-bold text-slate-900 truncate text-sm">{item.title}</h4>
                <p className="text-slate-500 truncate">{item.location} • {item.date}</p>
              </div>
            </div>

            {/* Anti-Theft Explanation Box */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 flex items-start gap-2.5 text-xs text-indigo-950">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Why is this required?</span>
                <span>
                  To prevent fraudulent claims, the reporter has sealed secret identifying details.
                  Describe hidden clues that only the real owner would know.
                </span>
              </div>
            </div>

            {/* Secret Verification Description Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hidden Identifying Details *
              </label>
              <textarea
                id="claim-identifying-answers"
                rows={4}
                required
                placeholder="Describe details not visible in public photos, e.g.:
• Exact stickers or markings under a case
• Lock screen wallpaper or device serial/IMEI digits
• Specific scratch, dent, or engraving location
• Contents of the bag or wallet"
                value={identifyingAnswers}
                onChange={(e) => setIdentifyingAnswers(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                The reporter will review this text to confirm you are the true owner.
              </span>
            </div>

            {/* Contact details */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Your Contact Information
              </span>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1">Claimant Name</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user?.displayName || 'Guest'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Campus Email</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Phone Number (Optional - Shared only after approval)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="claim-phone-input"
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                id="cancel-claim-btn"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-claim-btn"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Claim
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
