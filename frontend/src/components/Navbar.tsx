import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
    setMobileOpen(false);
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/" className="flex items-center gap-2 group transition-all" onClick={closeMobile}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 group-hover:scale-105 transition-transform duration-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
            Karma<span className="text-emerald-600">Map</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4 text-xs sm:text-sm font-bold">
          {user && profile ? (
            <>
              {profile.role === 'volunteer' && (
                <>
                  <Link to="/map" className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200">Discovery Map</Link>
                  <Link to="/portfolio" className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200">My Portfolio</Link>
                  <Link to="/leaderboard" className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200">Leaderboard</Link>
                  <Badge variant="default" className="px-3 py-1.5 text-xs">{profile.karma_points} Karma Points</Badge>
                </>
              )}
              {profile.role === 'ngo' && (
                <>
                  <Link to="/ngo/dashboard" className="px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200">NGO Dashboard</Link>
                  <Link to="/ngo/create-gig"><Button size="sm">Create Opportunity</Button></Link>
                </>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-slate-400 hover:text-amber-400 transition-colors" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors" />
                )}
              </button>
              <NotificationBell />
              <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link to="/signup"><Button size="sm">Get Started</Button></Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <svg className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95 animate-fade-in">
          <div className="px-4 py-3 space-y-2">
            {user && profile ? (
              <>
                {profile.role === 'volunteer' && (
                  <>
                    <Link to="/map" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Discovery Map
                    </Link>
                    <Link to="/portfolio" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      My Portfolio
                    </Link>
                    <Link to="/leaderboard" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Leaderboard
                    </Link>
                    <div className="px-3 py-2"><Badge variant="default" className="text-xs">{profile.karma_points} Karma Points</Badge></div>
                  </>
                )}
                {profile.role === 'ngo' && (
                  <>
                    <Link to="/ngo/dashboard" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      NGO Dashboard
                    </Link>
                    <Link to="/ngo/create-gig" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      Create Opportunity
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                    <Sun className="h-5 w-5 text-slate-400 dark:text-slate-300" />
                  ) : (
                    <Moon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    )}
                  </button>
                  <NotificationBell />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={handleSignOut} className="w-full px-3 py-3 text-sm font-bold text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-left">Sign Out</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMobile} className="flex items-center px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">Sign In</Link>
                <Link to="/signup" onClick={closeMobile} className="flex items-center px-3 py-3 text-sm font-bold text-emerald-700 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 transition-colors">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
