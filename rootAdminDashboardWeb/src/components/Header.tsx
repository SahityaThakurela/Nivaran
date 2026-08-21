import { useState } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/issues?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-gray-100 shrink-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id="global-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, teams..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400 transition-all"
          />
        </div>
      </form>

      {/* Spacer for title area if passed */}
      {(title || subtitle) && (
        <div className="flex-1">
          {title && <h1 className="text-lg font-bold text-gray-900">{title}</h1>}
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      )}

      <div className="flex items-center gap-3 ml-auto">
        {actions}

        {/* Notifications */}
        <button
          id="notifications-btn"
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Report Issue */}
        <button
          id="report-issue-btn"
          onClick={() => navigate('/issues/new')}
          className="flex items-center gap-1.5 bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Report Issue
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-800">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-gray-400">Admin Authority</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
