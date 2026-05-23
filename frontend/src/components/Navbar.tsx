import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        {/* Brand Emblem Logo */}
        <Link to="/" className="flex items-center gap-2 group transition-all">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-slate-800">
            Karma<span className="text-emerald-600">Map</span>
          </span>
        </Link>

        {user && profile ? (
          <div className="flex items-center gap-4 text-xs sm:text-sm font-bold">
            {profile.role === 'volunteer' && (
              <>
                <Link
                  to="/map"
                  className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  Discovery Map
                </Link>
                <Link
                  to="/portfolio"
                  className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  My Portfolio
                </Link>
                <span className="hidden sm:inline-flex items-center rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
                  {profile.karma_points} Karma Points
                </span>
              </>
            )}
            {profile.role === 'ngo' && (
              <>
                <Link
                  to="/ngo/dashboard"
                  className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  NGO Dashboard
                </Link>
                <Link
                  to="/ngo/create-gig"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-sm transition-all active:scale-95 duration-200"
                >
                  Create Opportunity
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Link
              to="/login"
              className="px-4 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all duration-200 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

