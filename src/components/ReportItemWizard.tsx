import React, { useState } from 'react';
import {
  X,
  Upload,
  Camera,
  MapPin,
  Calendar,
  Clock,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { ItemCategory, ItemReport, ItemType } from '../types';
import { useAuth } from '../context/AuthContext';
import { SAMPLE_CAMPUS_LOCATIONS } from '../services/sampleData';

const ALL_CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Wallets & IDs',
  'Keys',
  'Books & Notebooks',
  'Bags & Backpacks',
  'Clothing & Accessories',
  'Jewelry & Watches',
  'Audio & Headphones',
  'Bottles & Containers',
  'Sports & Gym',
  'Other',
];

const PRESET_SAMPLE_PHOTOS = [
  {
    name: 'Water Bottle',
    url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Headphones',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'AirPods',
    url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dorm Keys',
    url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Calculator',
    url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Backpack',
    url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  },
];

interface ReportItemWizardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: ItemType;
  onSubmit: (itemData: Omit<ItemReport, 'id' | 'createdAt' | 'updatedAt'>, privateDetails?: string) => Promise<ItemReport>;
  onReportSubmitted: (newItem: ItemReport) => void;
}

export const ReportItemWizard: React.FC<ReportItemWizardProps> = ({
  isOpen,
  onClose,
  defaultType = 'lost',
  onSubmit,
  onReportSubmitted,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [type, setType] = useState<ItemType>(defaultType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [approximateTime, setApproximateTime] = useState('2:00 PM');
  const [imageUrl, setImageUrl] = useState('');
  const [turnInLocation, setTurnInLocation] = useState('');
  const [privateDetails, setPrivateDetails] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64 data URL with automatic canvas compression
    // Ensures photos taken on high-res phone cameras fit seamlessly in Firestore & LocalStorage
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.75);
            setImageUrl(compressed);
            return;
          }
        } catch (e) {
          console.warn('Canvas compression note:', e);
        }
        setImageUrl(rawResult);
      };
      img.onerror = () => {
        setImageUrl(rawResult);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!title.trim()) {
        setErrorMsg('Please enter an item name');
        return;
      }
      if (!description.trim()) {
        setErrorMsg('Please provide a brief public description');
        return;
      }
    } else if (currentStep === 2) {
      const finalLoc = location === 'Other / Custom' ? customLocation : location;
      if (!finalLoc.trim()) {
        setErrorMsg('Please specify the campus location');
        return;
      }
      if (!date) {
        setErrorMsg('Please specify the date');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleSubmitReport = async () => {
    if (!user) {
      setErrorMsg('You must be signed in to submit a report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const finalLocation = location === 'Other / Custom' ? customLocation : (location || 'Campus Center');

    try {
      const newItem = await onSubmit(
        {
          ownerId: user.uid,
          reporterName: user.displayName,
          reporterEmail: user.email,
          type,
          title: title.trim(),
          category,
          description: description.trim(),
          location: finalLocation.trim(),
          date,
          approximateTime,
          imageUrl: imageUrl.trim() ? imageUrl.trim() : undefined,
          turnInLocation: type === 'found' ? turnInLocation.trim() || 'Handed to Campus Desk' : undefined,
          status: 'active',
        },
        privateDetails.trim() || undefined
      );

      setIsSubmitting(false);
      onReportSubmitted(newItem);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit report. Please check required fields.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="report-wizard-modal"
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  type === 'lost'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {type === 'lost' ? 'Lost Item' : 'Found Item'}
              </span>
              <span className="text-xs text-slate-400">Step {currentStep} of 4</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {currentStep === 1 && 'Item Basics & Photo'}
              {currentStep === 2 && 'Location & Campus Timeline'}
              {currentStep === 3 && 'Private Verification Clues'}
              {currentStep === 4 && 'Review & Confirm Report'}
            </h2>
          </div>

          <button
            id="close-report-wizard-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="w-full bg-slate-100 h-1.5 flex">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: BASICS & PHOTO */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  What are you reporting?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="wizard-type-lost-btn"
                    onClick={() => setType('lost')}
                    className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      type === 'lost'
                        ? 'border-rose-600 bg-rose-50/70 text-rose-700 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    I Lost Something
                  </button>

                  <button
                    type="button"
                    id="wizard-type-found-btn"
                    onClick={() => setType('found')}
                    className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      type === 'found'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    I Found Something
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Item Name *
                </label>
                <input
                  id="wizard-title-input"
                  type="text"
                  placeholder={type === 'lost' ? 'e.g. Midnight Blue Hydro Flask (32oz)' : 'e.g. Navy Insulated Water Bottle'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  maxLength={100}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  id="wizard-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Public Description *
                </label>
                <textarea
                  id="wizard-description-input"
                  rows={3}
                  placeholder="Describe visible features, color, brand, stickers, or general condition. (Do NOT include your secret identifying details here!)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  maxLength={1000}
                />
              </div>

              {/* Photo Upload or Preset Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Item Photo (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {imageUrl ? 'Photo attached' : 'Optional - can be left blank'}
                  </span>
                </div>
                
                {/* Upload drag drop zone */}
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center bg-slate-50/50 transition-colors relative">
                  {imageUrl ? (
                    <div className="relative aspect-16/9 max-w-sm mx-auto rounded-xl overflow-hidden shadow-xs">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 font-medium">
                        Drag & drop a photo, or{' '}
                        <label className="text-indigo-600 hover:underline cursor-pointer font-bold">
                          browse files
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, or WEBP up to 5MB</p>
                    </div>
                  )}
                </div>

                {/* Quick preset thumbnail pills */}
                {!imageUrl && (
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                      Or select a campus preset photo:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_SAMPLE_PHOTOS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
                        >
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & TIMELINE */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campus Location {type === 'lost' ? 'Last Seen' : 'Found'} *
                </label>
                <select
                  id="wizard-location-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white mb-2"
                >
                  <option value="">-- Choose a campus building or area --</option>
                  {SAMPLE_CAMPUS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="Other / Custom">Other / Custom Location...</option>
                </select>

                {(location === 'Other / Custom' || !location) && (
                  <input
                    type="text"
                    placeholder="Specific room, floor, or landmark (e.g. Science Building 3rd Floor Lab B)"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date *
                  </label>
                  <input
                    id="wizard-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Approximate Time
                  </label>
                  <input
                    id="wizard-time-input"
                    type="text"
                    placeholder="e.g. 2:15 PM or Midday"
                    value={approximateTime}
                    onChange={(e) => setApproximateTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {type === 'found' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Where is the item currently held? (Optional)
                  </label>
                  <input
                    id="wizard-turnin-input"
                    type="text"
                    placeholder="e.g. Handed to Student Center Security Desk Room 102, or With Me"
                    value={turnInLocation}
                    onChange={(e) => setTurnInLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    We recommend surrendering valuable items to campus safety desks for secure holding.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PRIVATE VERIFICATION CLUES */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-start gap-3">
                <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 space-y-1">
                  <p className="font-bold text-sm">Protected Claim Verification Feature</p>
                  <p className="leading-relaxed">
                    To prevent fraudulent claims or theft, provide identifying information{' '}
                    <strong className="font-semibold">not shown in the photo or public description</strong>.
                  </p>
                  <p className="leading-relaxed text-indigo-700">
                    Examples: A specific sticker underneath a case, an engraved initial, a lock-screen
                    wallpaper photo, internal contents, or a hidden scratch.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Private Verification Details (Kept Strictly Secret)
                </label>
                <textarea
                  id="wizard-private-details-input"
                  rows={4}
                  placeholder="e.g. Small dent on bottom rim with 'AR' written in marker under the rubber boot. Lock screen is a photo of a golden retriever."
                  value={privateDetails}
                  onChange={(e) => setPrivateDetails(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  maxLength={1000}
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  When someone submits a claim, they will be required to describe this detail to you before contact information is shared.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {currentStep === 4 && (
            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-xs font-semibold text-slate-500">Report Type</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      type === 'lost' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {type}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-xs font-semibold text-slate-500">Item Name</span>
                  <span className="font-bold text-slate-900">{title}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-xs font-semibold text-slate-500">Category</span>
                  <span className="font-medium text-slate-800">{category}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-xs font-semibold text-slate-500">Campus Location</span>
                  <span className="font-medium text-slate-800 truncate max-w-[260px]">
                    {location === 'Other / Custom' ? customLocation : location}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-xs font-semibold text-slate-500">Date & Time</span>
                  <span className="font-medium text-slate-800">
                    {date} {approximateTime && `at ${approximateTime}`}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Public Description</span>
                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                    {description}
                  </p>
                </div>

                {privateDetails && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1 mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      Private Verification Clues (Encrypted)
                    </span>
                    <p className="text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 italic">
                      &ldquo;{privateDetails}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  After submission, ReFound&apos;s Gemini AI will automatically scan active reports for potential matches.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              id="wizard-next-step-btn"
              onClick={handleNextStep}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="wizard-submit-report-btn"
              onClick={handleSubmitReport}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing Report...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Publish Report
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
