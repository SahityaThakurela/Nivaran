import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { SafeUser, UserRole } from '../api/types';
import { Loader2, Plus, RefreshCw, Users, Building2 } from 'lucide-react';

type Tab = 'users' | 'departments';

interface UsersResponse {
  users: SafeUser[];
}

export default function AdminManagement() {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Use the issues endpoint to infer users; a real /api/users endpoint would be ideal
    // For now we fetch what the API exposes
    apiClient.get<UsersResponse>('/auth/users').catch(() => ({ users: [] as SafeUser[] }))
      .then((r) => setUsers(r.users))
      .finally(() => setLoading(false));
  }, []);

  const ROLE_LABEL: Record<UserRole, string> = {
    CITIZEN:              'Citizen',
    FIELD_WORKER:         'Field Worker',
    DEPARTMENT_OPERATOR:  'Dept. Operator',
    MUNICIPAL_ADMIN:      'Municipal Admin',
    SUPER_ADMIN:          'Super Admin',
  };

  const ROLE_COLORS: Record<UserRole, string> = {
    CITIZEN:             'bg-gray-100 text-gray-600',
    FIELD_WORKER:        'bg-amber-100 text-amber-700',
    DEPARTMENT_OPERATOR: 'bg-teal-100 text-teal-700',
    MUNICIPAL_ADMIN:     'bg-blue-100 text-blue-700',
    SUPER_ADMIN:         'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage staff accounts and departments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLoading(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-700 px-3.5 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Invite Staff
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['users', 'departments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all
              ${tab === t ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'users' ? <Users size={15} /> : <Building2 size={15} />}
            {t === 'users' ? 'Staff Accounts' : 'Departments'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_160px_120px_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Name</span>
            <span>Email / Phone</span>
            <span>Role</span>
            <span>Actions</span>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              <Users size={36} className="text-gray-200 mx-auto mb-3" />
              <p>No staff accounts found.</p>
              <p className="text-xs text-gray-300 mt-1">The /api/auth/users endpoint may not be available yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.filter((u) => u.role !== 'CITIZEN').map((u) => (
                <div key={u.id} className="grid grid-cols-[1fr_160px_120px_100px] gap-4 items-center px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email ?? u.phone ?? '—'}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                  <button className="text-xs text-gray-400 hover:text-red-600 transition-colors">
                    Deactivate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'departments' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-8 text-center">
          <Building2 size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Department management coming soon.</p>
          <p className="text-xs text-gray-400 mt-1">Configure which department handles each issue category per city.</p>
        </div>
      )}

      {/* Invite modal placeholder */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-slide-in">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Invite Staff Member</h3>
            <p className="text-sm text-gray-400 mb-4">
              Register a new staff account using the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/api/auth/register</code> endpoint with the appropriate role.
            </p>
            <button
              onClick={() => setShowInvite(false)}
              className="w-full text-sm font-medium text-gray-600 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
