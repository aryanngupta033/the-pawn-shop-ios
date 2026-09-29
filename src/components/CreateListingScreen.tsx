import React, { useState } from 'react';
import { 
  ArrowLeft, 
  UploadCloud, 
  X, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Image as ImageIcon,
  DollarSign,
  MapPin,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createListing } from '../services/listingsService';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import type { ListingWithDetails } from '../types';

interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: (listingId: string) => void;
  onRequireAuth: () => void;
}

const CONDITIONS = [
  'Mint / Pristine',
  'Excellent',
  'Very Good',
  'Good',
  'Fair / Restorable',
];

const PRESET_VINTAGE_PHOTOS = [
  {
    name: '1964 HMT Janata Watch',
    url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
  },
  {
    name: 'Antique Brass Compass',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
  },
  {
    name: '1972 Vintage Camera',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
  },
  {
    name: 'Vintage Gramophone',
    url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800',
  },
];

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({
  onBack,
  onSuccess,
  onRequireAuth,
}) => {
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Excellent');
  const [year, setYear] = useState('');
  const [brand, setBrand] = useState('');
  const [location, setLocation] = useState(profile?.location || 'Noida, Uttar Pradesh');

  // Images state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedPresetUrls, setSelectedPresetUrls] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedListingId, setSubmittedListingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Authentication Required</h2>
          <p className="text-xs text-stone-600 mb-6">
            You must sign in to publish vintage listings on The Pawn Shop.
          </p>
          <button
            onClick={onRequireAuth}
            className="w-full py-2.5 px-4 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];

    // Limit to max 6 images
    const remainingSlots = 6 - (imageFiles.length + selectedPresetUrls.length);
    if (files.length > remainingSlots) {
      setError(`You can only upload up to 6 images total. ${remainingSlots} slots remaining.`);
    }

    const allowed = files.slice(0, remainingSlots);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of allowed) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 5MB limit.`);
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`File "${file.name}" is not a supported format (JPEG, PNG, WebP).`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePresetUrl = (url: string) => {
    if (selectedPresetUrls.includes(url)) {
      setSelectedPresetUrls((prev) => prev.filter((u) => u !== url));
    } else {
      if (imageFiles.length + selectedPresetUrls.length >= 6) {
        setError('Maximum 6 images allowed per listing.');
        return;
      }
      setSelectedPresetUrls((prev) => [...prev, url]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client Validations
    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (title.length > 150) {
      setError('Title cannot exceed 150 characters.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please provide a valid price greater than zero.');
      return;
    }
    if (!location.trim()) {
      setError('Location is required for offline peer-to-peer verification.');
      return;
    }

    if (imageFiles.length === 0 && selectedPresetUrls.length === 0) {
      setError('Please attach at least one photograph of the item.');
      return;
    }

    try {
      setSubmitting(true);

      const newListing = await createListing(
        {
          title: title.trim(),
          description: description.trim(),
          price: priceNum,
          condition,
          year: year ? parseInt(year, 10) : null,
          brand: brand.trim() || null,
          location: location.trim(),
          imageFiles,
          imageUrls: selectedPresetUrls,
        },
        user.id // seller_id automatically locked to current user's authenticated Supabase ID
      );

      setSubmittedListingId(newListing.id);
    } catch (err: any) {
      console.error('Create listing error:', err);
      setError(err?.message || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedListingId) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#e7e2d9] shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Listing Submitted
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Your listing has been submitted for curator review. It will become publicly visible once approved by our curating team.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onSuccess(submittedListingId)}
              className="w-full py-2.5 px-4 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
            >
              View My Listing Status
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-4 bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 text-stone-500 hover:text-stone-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Publish Curated Listing
          </h1>
          <p className="text-xs text-stone-500">
            Catalog a vintage timepiece, antique, or rare collectible.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#e7e2d9] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
            Listing Title *
          </label>
          <input
            id="create-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 1964 Vintage HMT Janata Mechanical Watch"
            maxLength={150}
            required
            className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
          />
          <span className="text-[10px] text-stone-400 block text-right mt-1">
            {title.length}/150
          </span>
        </div>

        {/* Brand & Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
              Brand / Manufacturer
            </label>
            <input
              id="create-brand-input"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. HMT, Omega, Leica"
              className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
              Year of Manufacture
            </label>
            <input
              id="create-year-input"
              type="number"
              min="1500"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 1964"
              className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50 font-mono"
            />
          </div>
        </div>

        {/* Price & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
              Asking Price (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-serif font-bold text-stone-500">₹</span>
              <input
                id="create-price-input"
                type="number"
                step="1"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="56000"
                required
                className="w-full pl-7 pr-3 py-2.5 text-xs font-bold border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
              Item Condition *
            </label>
            <select
              id="create-condition-select"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50 cursor-pointer"
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
            Physical Inspection Location *
          </label>
          <LocationAutocompleteInput
            id="create-location-input"
            value={location}
            onChange={(val) => setLocation(val)}
            placeholder="e.g. Sector 18, Noida / Indirapuram, Ghaziabad"
            required
          />
          <span className="text-[10px] text-stone-400 block mt-1">
            General city or neighborhood where buyer and seller will inspect the item in person.
          </span>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
            Detailed Provenance & Description *
          </label>
          <textarea
            id="create-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Include condition notes, patina details, mechanical servicing history, box/papers availability, and provenance."
            rows={4}
            required
            className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
          />
        </div>

        {/* Image Upload Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Photographs ({imageFiles.length + selectedPresetUrls.length}/6) *
            </label>
            <span className="text-[10px] text-stone-400">Max 5MB • JPG, PNG, WebP</span>
          </div>

          {/* Upload Button */}
          <label
            htmlFor="listing-image-upload"
            className="border-2 border-dashed border-stone-300 hover:border-amber-700 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-stone-50/50"
          >
            <UploadCloud className="w-6 h-6 text-stone-400 mb-1" />
            <span className="text-xs font-semibold text-stone-700">Click to upload photos</span>
            <span className="text-[11px] text-stone-400 mt-0.5">High-resolution daylight shots recommended</span>
            <input
              id="listing-image-upload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Preset Vintage Assets (Fast-select for testing) */}
          <div className="mt-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 block mb-1.5">
              Quick Test Gallery (Click to attach sample vintage photos):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_VINTAGE_PHOTOS.map((preset) => {
                const isSelected = selectedPresetUrls.includes(preset.url);
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => togglePresetUrl(preset.url)}
                    className={`p-1.5 rounded-lg border text-left flex items-center gap-2 text-[11px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-700 bg-amber-50 text-amber-900'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 object-cover rounded flex-shrink-0"
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected File Previews */}
          {(imagePreviews.length > 0 || selectedPresetUrls.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {imagePreviews.map((previewUrl, idx) => (
                <div key={previewUrl} className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-300">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {selectedPresetUrls.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-amber-600">
                  <img src={url} alt="Preset Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => togglePresetUrl(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-stone-100 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="flex-1 py-3 px-4 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="create-listing-submit-btn"
            type="submit"
            disabled={submitting}
            className="flex-2 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Publishing to Marketplace...</span>
              </>
            ) : (
              <span>Publish Listing</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
