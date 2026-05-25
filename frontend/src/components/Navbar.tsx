import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from './NotificationBell';
import {
  MapPinIcon,
  AwardIcon,
  ClipboardListIcon,
  PlusCircleIcon,
  LogOutIcon,
  LogInIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  XIcon,
  LayoutDashboardIcon,
  UserCircleIcon,
  Building2Icon,
  UsersIcon,
} from './NavIcons';

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

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/" className="flex items-center gap-2 group transition-all" onClick={closeMobile}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 group-hover:scale-105 transition-transform duration-200">
            <MapPinIcon className="h-5 w-5" />
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
                  <Link to="/map" className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"><MapPinIcon className="h-4 w-4" /> Discovery Map</Link>
                  <Link to="/portfolio" className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"><UserCircleIcon className="h-4 w-4" /> My Portfolio</Link>
                  <Link to="/leaderboard" className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"><AwardIcon className="h-4 w-4" /> Leaderboard</Link>
                  <Link to="/corporate/dashboard" className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"><Building2Icon className="h-4 w-4" /> CSR Dashboard</Link>
                  <Link to="/corporate/manage" className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"><UsersIcon className="h-4 w-4" /> Manage Team</Link>
                  <Badge variant="default" className="px-3 py-1.5 text-xs">{profile.karma_points} Karma Points</Badge>
                </>
              )}
              {profile.role === 'ngo' && (
                <>
                  <Link to="/ngo/dashboard" className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"><LayoutDashboardIcon className="h-4 w-4" /> NGO Dashboard</Link>
                  <Link to="/ngo/create-gig"><Button size="sm"><PlusCircleIcon className="h-4 w-4 mr-1" /> Create Opportunity</Button></Link>
                </>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5 text-slate-400 hover:text-amber-400 transition-colors" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors" />
                )}
              </button>
              <NotificationBell />
              <Button variant="ghost" onClick={handleSignOut}><LogOutIcon className="h-4 w-4 mr-1" /> Sign Out</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm"><LogInIcon className="h-4 w-4 mr-1" /> Sign In</Button></Link>
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
            <XIcon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          ) : (
            <MenuIcon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          )}
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden bg-black/20 backdrop-blur-xs" onClick={closeMobile} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="relative z-50 sm:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95 animate-fade-in">
          <div className="px-4 py-3 space-y-2">
            {user && profile ? (
              <>
                {profile.role === 'volunteer' && (
                  <>
                    <Link to="/map" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <MapPinIcon className="h-4 w-4 shrink-0" />
                      Discovery Map
                    </Link>
                    <Link to="/portfolio" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <ClipboardListIcon className="h-4 w-4 shrink-0" />
                      My Portfolio
                    </Link>
                    <Link to="/leaderboard" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <AwardIcon className="h-4 w-4 shrink-0" />
                      Leaderboard
                    </Link>
                    <Link to="/corporate/dashboard" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <Building2Icon className="h-4 w-4 shrink-0" />
                      CSR Dashboard
                    </Link>
                    <Link to="/corporate/manage" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <UsersIcon className="h-4 w-4 shrink-0" />
                      Manage Team
                    </Link>
                    <div className="px-3 py-2"><Badge variant="default" className="text-xs">{profile.karma_points} Karma Points</Badge></div>
                  </>
                )}
                {profile.role === 'ngo' && (
                  <>
                    <Link to="/ngo/dashboard" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <LayoutDashboardIcon className="h-4 w-4 shrink-0" />
                      NGO Dashboard
                    </Link>
                    <Link to="/ngo/create-gig" onClick={closeMobile} className="flex items-center gap-2.5 px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors">
                      <PlusCircleIcon className="h-4 w-4 shrink-0" />
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
                      <SunIcon className="h-5 w-5 text-slate-400 dark:text-slate-300" />
                    ) : (
                      <MoonIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
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
                <Link to="/login" onClick={closeMobile} className="flex items-center px-3 py-3 text-sm font-bold text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"><LogInIcon className="h-4 w-4 mr-2" /> Sign In</Link>
                <Link to="/signup" onClick={closeMobile} className="flex items-center px-3 py-3 text-sm font-bold text-emerald-700 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 transition-colors">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
