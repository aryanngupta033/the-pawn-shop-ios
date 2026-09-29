import React, { useState, useEffect } from 'react';
import { Search, Users, User, MapPin, Eye, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { AdminUserWithListings } from '../../types';
import { getAdminUsers } from '../../services/adminService';
import { AdminUserDetailModal } from './AdminUserDetailModal';

interface AdminUsersSectionProps {
  onSelectListing?: (id: string) => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({ onSelectListing }) => {
  const [users, setUsers] = useState<AdminUserWithListings[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<AdminUserWithListings | null>(null);

  const loadUsers = async (query?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminUsers(query);
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err?.message || 'Failed to retrieve member profiles from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  return (
    <div className="space-y-6">
      {/* Search and Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
        <div>
          <h2 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-800" />
            <span>Marketplace Users Directory</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            View member profiles, registration dates, and linked catalog history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </form>

          <button
            type="button"
            onClick={() => loadUsers(searchQuery)}
            disabled={loading}
            className="p-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-stone-600 transition-colors cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table / List */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-700 mb-2" />
            <span>Loading user profiles from database...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-700">No members found</p>
            <p className="mt-1">Try clearing your search query filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4 hidden md:table-cell">Location</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Joined</th>
                  <th className="py-3 px-4 text-center">Listings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-200 border border-stone-300 overflow-hidden shrink-0 flex items-center justify-center font-bold text-stone-600 text-xs">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-stone-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">{user.full_name}</div>
                          <div className="text-[10px] font-mono text-stone-400">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{user.location || 'Not provided'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-stone-500 font-mono text-[11px]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 font-bold text-stone-800 text-[11px]">
                        {user.listings_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-500" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AdminUserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onSelectListing={onSelectListing}
      />
    </div>
  );
};
