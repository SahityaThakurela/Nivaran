import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  BarChart3,
  Users,
  Building2,
  Handshake,
  Bell,
  Settings,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    icon: <LayoutDashboard size={18} />,
    label: 'Overview',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN'],
  },
  {
    to: '/issues',
    icon: <AlertTriangle size={18} />,
    label: 'Challenges',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN'],
  },
  {
    to: '/map',
    icon: <Map size={18} />,
    label: 'Live Map',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN'],
  },
  {
    to: '/analytics',
    icon: <BarChart3 size={18} />,
    label: 'Analytics',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN'],
  },
  {
    to: '/teams',
    icon: <Users size={18} />,
    label: 'Staff Accounts',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN'],
  },
  {
    to: '/universities',
    icon: <Building2 size={18} />,
    label: 'Universities',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN'],
  },
  {
    to: '/industry-partners',
    icon: <Handshake size={18} />,
    label: 'Industry Partners',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN', 'UNIVERSITY_ADMIN'],
  },
  {
    to: '/audit',
    icon: <Shield size={18} />,
    label: 'Audit Log',
    roles: ['GOVERNMENT_ADMIN', 'SUPER_ADMIN'],
  },
];

export function Sidebar() {
  const { user, effectiveRole, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !effectiveRole || item.roles.includes(effectiveRole)
  );

  return (
    <aside className="flex flex-col h-full w-56 bg-white border-r border-gray-100 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white font-black text-sm">
          N
        </div>
        <span className="font-bold text-gray-900 tracking-tight text-base">NIVARAN</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
              ${isActive
                ? 'bg-blue-700 text-white'
                : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
              }`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight
              size={14}
              className="opacity-0 group-hover:opacity-60 transition-opacity"
            />
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-gray-100 pt-3">
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
            ${isActive ? 'bg-blue-700 text-white' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'}`
          }
        >
          <Bell size={18} />
          Notifications
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
            ${isActive ? 'bg-blue-700 text-white' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'}`
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>

        {/* User avatar row */}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg hover:bg-red-50 hover:text-red-700 text-gray-500 transition-all text-sm font-medium text-left"
        >
          <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-gray-400 truncate">{effectiveRole?.replace(/_/g, ' ')}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
