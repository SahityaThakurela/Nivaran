import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-blue-700 p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
              N
            </div>
            <span className="font-bold text-2xl tracking-tight">NIVARAN</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-balance mb-4">
            Societal Innovation<br />Collaboration Portal
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
            Government of Jharkhand · Department of Higher &amp; Technical Education. Route citizen challenges to universities, coordinate faculty-led teams, and bring in industry partners — all from one dashboard.
          </p>
        </div>

        {/* Stats teaser */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Challenges Routed', value: '1,240+' },
            { label: 'Universities Engaged', value: '8' },
            { label: 'Districts Active', value: '6' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-blue-200 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-black text-sm">N</div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">NIVARAN</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in to the Innovation Portal</p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5 animate-slide-in">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@highereducation.jharkhand.gov.in"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-8">
            Nivaran Societal Innovation Platform · Govt. of Jharkhand
          </p>
        </div>
      </div>
    </div>
  );
}
