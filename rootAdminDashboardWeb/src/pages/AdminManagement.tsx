import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getUniversities } from '../api/universities';
import { getIndustryPartners } from '../api/industryPartners';
import type { SafeUser, University, IndustryPartner, UserRole, PartnerType } from '../api/types';
import { Loader2, Plus, RefreshCw, Users, Building2, Handshake } from 'lucide-react';

type Tab = 'users' | 'universities' | 'partners';

interface UsersResponse {
  users: SafeUser[];
}

function tabForPath(pathname: string): Tab {
  if (pathname.startsWith('/universities')) return 'universities';
  if (pathname.startsWith('/industry-partners')) return 'partners';
  return 'users';
}

const ROLE_LABEL: Record<UserRole, string> = {
  CITIZEN: 'Citizen',
  UNIVERSITY_ADMIN: 'University Admin',
  GOVERNMENT_ADMIN: 'Government Admin',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  CITIZEN: 'bg-gray-100 text-gray-600',
  UNIVERSITY_ADMIN: 'bg-teal-100 text-teal-700',
  GOVERNMENT_ADMIN: 'bg-blue-100 text-blue-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
};

const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  STARTUP: 'Startup',
  MSME: 'MSME',
  CORPORATE: 'Corporate',
  CSR: 'CSR',
  RESEARCH_LAB: 'Research Lab',
};

const PARTNER_TYPE_COLORS: Record<PartnerType, string> = {
  STARTUP: 'bg-purple-100 text-purple-700',
  MSME: 'bg-teal-100 text-teal-700',
  CORPORATE: 'bg-blue-100 text-blue-700',
  CSR: 'bg-green-100 text-green-700',
  RESEARCH_LAB: 'bg-amber-100 text-amber-700',
};

export default function AdminManagement() {
  const location = useLocation();
  const [tab, setTab] = useState<Tab>(tabForPath(location.pathname));
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    setTab(tabForPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get<UsersResponse>('/auth/users').catch(() => ({ users: [] as SafeUser[] })),
      getUniversities().catch(() => ({ universities: [] as University[] })),
      getIndustryPartners().catch(() => ({ partners: [] as IndustryPartner[] })),
    ])
      .then(([u, uni, p]) => {
        setUsers(u.users);
        setUniversities(uni.universities);
        setPartners(p.partners);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage staff accounts, universities, and industry partners.
          </p>
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
        {(['users', 'universities', 'partners'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all
              ${tab === t ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'users' ? <Users size={15} /> : t === 'universities' ? <Building2 size={15} /> : <Handshake size={15} />}
            {t === 'users' ? 'Staff Accounts' : t === 'universities' ? 'Universities' : 'Industry Partners'}
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

      {tab === 'universities' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Institution</span>
            <span>Type</span>
            <span>Specializations</span>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              Loading universities…
            </div>
          ) : universities.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              <Building2 size={36} className="text-gray-200 mx-auto mb-3" />
              <p>No universities seeded yet.</p>
              <p className="text-xs text-gray-300 mt-1">Run `pnpm prisma:seed` in apps/api to load placeholder Jharkhand institutions.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {universities.map((u) => (
                <div key={u.id} className="grid grid-cols-[1fr_140px_1fr] gap-4 items-center px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.city?.name ?? '—'}, Jharkhand</p>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{u.type ?? '—'}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {u.specializations.map((d) => (
                      <span key={d} className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {d.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'partners' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Partner</span>
            <span>Type</span>
            <span>Domains</span>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              Loading industry partners…
            </div>
          ) : partners.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              <Handshake size={36} className="text-gray-200 mx-auto mb-3" />
              <p>No industry partners seeded yet.</p>
              <p className="text-xs text-gray-300 mt-1">Run `pnpm prisma:seed` in apps/api to load placeholder partners.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {partners.map((p) => (
                <div key={p.id} className="grid grid-cols-[1fr_120px_1fr] gap-4 items-center px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.contactEmail ?? '—'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${PARTNER_TYPE_COLORS[p.type]}`}>
                    {PARTNER_TYPE_LABEL[p.type]}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.domains.map((d) => (
                      <span key={d} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {d.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
