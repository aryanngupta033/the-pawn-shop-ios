import React, { useState, useEffect } from 'react';
import { User, MapPin, Calendar, Edit3, CheckCircle2, AlertCircle, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/formatters';

interface ProfileScreenProps {
  onRequireAuth: () => void;
  onOpenSettings?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onRequireAuth, onOpenSettings }) => {
  const { user, profile, updateProfileData, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xs">
          <User className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Collector Profile</h2>
          <p className="text-xs text-stone-600 mb-6">
            Sign in to manage your collector identity, verified location, and marketplace reputation.
          </p>
          <button
            onClick={onRequireAuth}
            className="w-full py-2.5 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await updateProfileData({
        full_name: fullName.trim(),
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refreshProfile();
      setEditing(false);
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Collector Identity
        </h1>
        <p className="text-xs text-stone-500">
          Your public identity shown to buyers and sellers during negotiations.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Avatar & Header */}
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-stone-400" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-stone-900">
              {profile?.full_name || 'Marketplace Member'}
            </h2>
            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{profile?.location || 'Location not specified'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Joined {formatDate(profile?.created_at || new Date().toISOString())}</span>
              </span>
            </div>
            <span className="text-[11px] text-stone-400 font-mono block">
              UID: {user.id.slice(0, 13)}...
            </span>
          </div>
        </div>

        {/* Edit Form or View Details */}
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Location (City / Area)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector 18, Noida / Ghaziabad"
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Avatar Photo URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex-1 py-2 px-4 border border-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-4 bg-stone-900 text-stone-100 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-4 border-t border-stone-100 flex items-center justify-start">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="py-2 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
