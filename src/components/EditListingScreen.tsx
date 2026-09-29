import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { fetchListingById, updateListing, removeListing } from '../services/listingsService';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import type { ListingWithDetails, ListingStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface EditListingScreenProps {
  listingId: string;
  onBack: () => void;
  onSuccess: () => void;
}

const CONDITIONS = [
  'Mint / Pristine',
  'Excellent',
  'Very Good',
  'Good',
  'Fair / Restorable',
];

export const EditListingScreen: React.FC<EditListingScreenProps> = ({
  listingId,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Excellent');
  const [year, setYear] = useState('');
  const [brand, setBrand] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<ListingStatus>('available');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchListingById(listingId);
        if (!data) {
          setError('Listing could not be retrieved.');
          return;
        }

        // Verify owner
        if (user && data.seller_id !== user.id) {
          setError('Unauthorized: You are not the owner of this listing.');
          return;
        }

        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price.toString());
        setCondition(data.condition);
        setYear(data.year ? data.year.toString() : '');
        setBrand(data.brand || '');
        setLocation(data.location);
        setStatus(data.status);
      } catch (err: any) {
        setError(err?.message || 'Failed to load listing.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [listingId, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be greater than zero.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateListing(listingId, {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        condition,
        year: year ? parseInt(year, 10) : null,
        brand: brand.trim() || null,
        location: location.trim(),
        status,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to update listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setSaving(true);
      await removeListing(listingId);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove listing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
        <p className="text-xs text-stone-500">Loading listing for editing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        {showRemoveConfirm ? (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-1 px-2">
            <span className="text-xs text-rose-800 font-medium">Remove listing?</span>
            <button
              type="button"
              disabled={saving}
              onClick={handleRemove}
              className="px-2 py-0.5 bg-rose-700 text-white rounded text-xs font-bold hover:bg-rose-800 cursor-pointer"
            >
              Yes, Remove
            </button>
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(false)}
              className="px-1.5 py-0.5 text-stone-600 hover:text-stone-800 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRemoveConfirm(true)}
            disabled={saving}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Listing</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 sm:p-8 shadow-xs">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 mb-6">
          Edit Vintage Listing
        </h1>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ListingStatus)}
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50 font-semibold"
              >
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="removed">Removed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
              Location
            </label>
            <LocationAutocompleteInput
              id="edit-location-input"
              value={location}
              onChange={(val) => setLocation(val)}
              placeholder="e.g. Sector 18, Noida / Ghaziabad"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
            />
          </div>

          <div className="pt-4 border-t border-stone-100 flex gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="flex-1 py-2.5 border border-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-2 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
