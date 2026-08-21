import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../api/types';

const ROLES: { role: UserRole; label: string; color: string }[] = [
  { role: 'SUPER_ADMIN',        label: 'Super Admin',       color: 'bg-purple-600' },
  { role: 'MUNICIPAL_ADMIN',    label: 'Municipal Admin',   color: 'bg-blue-600' },
  { role: 'DEPARTMENT_OPERATOR',label: 'Dept. Operator',    color: 'bg-teal-600' },
  { role: 'FIELD_WORKER',       label: 'Field Worker',      color: 'bg-amber-500' },
];

export function RoleSwitcher() {
  const { effectiveRole, setActiveRole } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-card-lg border border-gray-200 p-3 w-52">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
        ⚡ Dev Role Switcher
      </p>
      <div className="flex flex-col gap-1">
        {ROLES.map(({ role, label, color }) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
              ${effectiveRole === role
                ? `${color} text-white shadow-sm`
                : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${effectiveRole === role ? 'bg-white/70' : color}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
