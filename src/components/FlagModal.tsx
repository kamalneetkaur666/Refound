import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

interface FlagModalProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FlagModal: React.FC<FlagModalProps> = ({ itemId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('Inappropriate content or harassment');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !itemId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await dataService.submitFlag(itemId, user.uid, reason, details.trim());
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="flag-report-modal"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-rose-600">
            <Flag className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-base">Report Listing</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-slate-900 text-base">Report Received</h4>
            <p className="text-xs text-slate-600">
              Campus administrators have been notified and will review this listing shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1.5">
                Reason for Reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="Inappropriate content or harassment">Inappropriate content or harassment</option>
                <option value="Spam or fraudulent post">Spam or fraudulent post</option>
                <option value="Item does not exist or false report">Item does not exist or false report</option>
                <option value="Contains sensitive personal info">Contains sensitive personal info</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this listing violates campus guidelines..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-2xs"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
