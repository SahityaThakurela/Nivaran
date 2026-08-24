import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getStaffUsers, createStaff } from '../api/auth';
import { getUniversities } from '../api/universities';
import { getIndustryPartners } from '../api/industryPartners';
import { getAuthorities, createAuthority, updateAuthority } from '../api/authorities';
import { getCities } from '../api/cities';
import { useAuth } from '../context/AuthContext';
import type {
  SafeUser, University, IndustryPartner, Authority, City,
  UserRole, PartnerType, ChallengeDomain,
} from '../api/types';
import {
  Loader2, Plus, RefreshCw, Users, Building2, Handshake,
  UserCog, Phone, Mail, X, AlertCircle,
} from 'lucide-react';

type Tab = 'users' | 'universities' | 'partners' | 'authorities';

function tabForPath(pathname: string): Tab {
  if (pathname.startsWith('/universities')) return 'universities';
  if (pathname.startsWith('/industry-partners')) return 'partners';
  if (pathname.startsWith('/authorities')) return 'authorities';
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

const DOMAIN_OPTIONS: ChallengeDomain[] = [
  'EDUCATION', 'HEALTHCARE', 'AGRICULTURE', 'WATER_RESOURCES', 'ENVIRONMENT',
  'ENERGY', 'URBAN_DEVELOPMENT', 'ACCESSIBILITY', 'PUBLIC_ADMINISTRATION', 'RURAL_LIVELIHOODS', 'OTHER',
];

export default function AdminManagement() {
  const location = useLocation();
  const { effectiveRole } = useAuth();
  const [tab, setTab] = useState<Tab>(tabForPath(location.pathname));
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddAuthority, setShowAddAuthority] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isUniversityAdmin = effectiveRole === 'UNIVERSITY_ADMIN';
  const visibleTabs: Tab[] = isUniversityAdmin
    ? ['authorities', 'partners']
    : ['users', 'authorities', 'universities', 'partners'];

  useEffect(() => {
    const next = tabForPath(location.pathname);
    setTab(isUniversityAdmin && next === 'users' ? 'authorities' : next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isUniversityAdmin]);

  useEffect(() => {
    setLoading(true);
    setUsersError(null);
    Promise.all([
      getStaffUsers().catch((e) => {
        setUsersError(e instanceof Error ? e.message : 'Failed to load staff accounts');
        return { users: [] as SafeUser[] };
      }),
      getUniversities().catch(() => ({ universities: [] as University[] })),
      getIndustryPartners().catch(() => ({ partners: [] as IndustryPartner[] })),
      getAuthorities({ includeInactive: true }).catch(() => ({ authorities: [] as Authority[] })),
      getCities().catch(() => ({ cities: [] as City[] })),
    ])
      .then(([u, uni, p, auth, c]) => {
        setUsers(u.users);
        setUniversities(uni.universities);
        setPartners(p.partners);
        setAuthorities(auth.authorities);
        setCities(c.cities);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function scopeLabel(a: Authority): string {
    if (a.universityId) return universities.find((u) => u.id === a.universityId)?.name ?? 'University';
    if (a.cityId) return cities.find((c) => c.id === a.cityId)?.name ?? 'District';
    return '—';
  }

  async function toggleAuthorityActive(a: Authority) {
    try {
      await updateAuthority(a.id, { isActive: !a.isActive });
      refresh();
    } catch {
      // Swallow — the row simply won't visually update if this fails.
    }
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage staff accounts, universities, industry partners, and assignable authorities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {tab === 'authorities' ? (
            <button
              onClick={() => setShowAddAuthority(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-teal-700 px-3.5 py-2 rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
            >
              <Plus size={15} />
              Add Authority
            </button>
          ) : tab === 'users' && effectiveRole !== 'UNIVERSITY_ADMIN' ? (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-700 px-3.5 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
            >
              <Plus size={15} />
              Invite Staff
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all
              ${tab === t ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'users' ? <Users size={15} /> : t === 'authorities' ? <UserCog size={15} /> : t === 'universities' ? <Building2 size={15} /> : <Handshake size={15} />}
            {t === 'users' ? 'Staff Accounts' : t === 'authorities' ? 'Authorities' : t === 'universities' ? 'Universities' : 'Industry Partners'}
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
          ) : usersError ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              <AlertCircle size={36} className="text-gray-200 mx-auto mb-3" />
              <p>{usersError}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              <Users size={36} className="text-gray-200 mx-auto mb-3" />
              <p>No staff accounts found in your scope.</p>
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                  <span className="text-xs text-gray-300">—</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'authorities' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Name</span>
            <span>Designation / Dept.</span>
            <span>Scope</span>
            <span>Contact</span>
            <span>Active</span>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              Loading authorities…
            </div>
          ) : authorities.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              <UserCog size={36} className="text-gray-200 mx-auto mb-3" />
              <p>No authorities in your scope yet.</p>
              <p className="text-xs text-gray-300 mt-1">Click "Add Authority" to add an official issues can be assigned to.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {authorities.map((a) => (
                <div key={a.id} className={`grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 items-center px-5 py-3.5 ${!a.isActive ? 'opacity-50' : ''}`}>
                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 truncate">{a.designation ?? '—'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{a.department ?? ''}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-600 truncate">{scopeLabel(a)}</span>
                  <div className="min-w-0">
                    {a.phone && <p className="flex items-center gap-1 text-[11px] text-gray-500"><Phone size={10} /> {a.phone}</p>}
                    {a.email && <p className="flex items-center gap-1 text-[11px] text-gray-500 truncate"><Mail size={10} /> {a.email}</p>}
                  </div>
                  <button
                    onClick={() => toggleAuthorityActive(a)}
                    className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                      a.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {a.isActive ? 'Deactivate' : 'Activate'}
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

      {showInvite && (
        <InviteStaffModal
          effectiveRole={effectiveRole}
          universities={universities}
          cities={cities}
          onClose={() => setShowInvite(false)}
          onCreated={() => {
            setShowInvite(false);
            refresh();
          }}
        />
      )}

      {showAddAuthority && (
        <AddAuthorityModal
          effectiveRole={effectiveRole}
          universities={universities}
          cities={cities}
          onClose={() => setShowAddAuthority(false)}
          onCreated={() => {
            setShowAddAuthority(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function InviteStaffModal({
  effectiveRole,
  universities,
  cities,
  onClose,
  onCreated,
}: {
  effectiveRole: UserRole | null;
  universities: University[];
  cities: City[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const isSuperAdmin = effectiveRole === 'SUPER_ADMIN';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'GOVERNMENT_ADMIN' | 'UNIVERSITY_ADMIN' | 'SUPER_ADMIN'>(
    isSuperAdmin ? 'GOVERNMENT_ADMIN' : 'GOVERNMENT_ADMIN',
  );
  const [cityId, setCityId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }
    if (isSuperAdmin && role === 'GOVERNMENT_ADMIN' && !cityId) {
      setError('Select a district for this government admin.');
      return;
    }
    if (isSuperAdmin && role === 'UNIVERSITY_ADMIN' && !universityId) {
      setError('Select a university for this university admin.');
      return;
    }
    setSubmitting(true);
    try {
      await createStaff({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        cityId: role === 'GOVERNMENT_ADMIN' ? cityId || undefined : undefined,
        universityId: role === 'UNIVERSITY_ADMIN' ? universityId || undefined : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-slide-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Invite Staff Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jharkhand.gov.in"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Temporary Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          {isSuperAdmin && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="GOVERNMENT_ADMIN">Government Admin</option>
                <option value="UNIVERSITY_ADMIN">University Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          )}
          {role === 'GOVERNMENT_ADMIN' && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">District</label>
              {isSuperAdmin ? (
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  <option value="">Select district…</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">Your own district (set automatically)</p>
              )}
            </div>
          )}
          {isSuperAdmin && role === 'UNIVERSITY_ADMIN' && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">University</label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Select university…</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-700 py-2.5 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddAuthorityModal({
  effectiveRole,
  universities,
  cities,
  onClose,
  onCreated,
}: {
  effectiveRole: UserRole | null;
  universities: University[];
  cities: City[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const isSuperAdmin = effectiveRole === 'SUPER_ADMIN';
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [domains, setDomains] = useState<ChallengeDomain[]>([]);
  const [scopeType, setScopeType] = useState<'city' | 'university'>('city');
  const [cityId, setCityId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDomain(d: ChallengeDomain) {
    setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (isSuperAdmin && scopeType === 'city' && !cityId) {
      setError('Select a district.');
      return;
    }
    if (isSuperAdmin && scopeType === 'university' && !universityId) {
      setError('Select a university.');
      return;
    }
    setSubmitting(true);
    try {
      await createAuthority({
        name: name.trim(),
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        domains,
        cityId: isSuperAdmin && scopeType === 'city' ? cityId : undefined,
        universityId: isSuperAdmin && scopeType === 'university' ? universityId : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add authority');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Add Authority</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Er. Ramesh Oraon"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Junior Engineer"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Public Works Department"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 90000 00000"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@dept.gov.in"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Domains</label>
            <div className="flex flex-wrap gap-1.5">
              {DOMAIN_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDomain(d)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-full border transition-colors ${
                    domains.includes(d)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'
                  }`}
                >
                  {d.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {isSuperAdmin ? (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Scope</label>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-2 w-fit">
                <button
                  type="button"
                  onClick={() => setScopeType('city')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${scopeType === 'city' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500'}`}
                >
                  District
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('university')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${scopeType === 'university' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500'}`}
                >
                  University
                </button>
              </div>
              {scopeType === 'city' ? (
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                >
                  <option value="">Select district…</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                >
                  <option value="">Select university…</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              Scoped automatically to your own {effectiveRole === 'UNIVERSITY_ADMIN' ? 'university' : 'district'}.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-teal-700 py-2.5 rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Add Authority
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
