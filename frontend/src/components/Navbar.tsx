import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
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
                <Badge variant="default" className="hidden sm:inline-flex px-3 py-1.5 text-xs">{profile.karma_points} Karma Points</Badge>
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
                <Link to="/ngo/create-gig">
                  <Button size="sm">Create Opportunity</Button>
                </Link>
              </>
            )}
            <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="secondary" size="sm">Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

