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
    <nav className="sticky top-0 z-50 border-b border-emerald-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-emerald-700">
          KarmaMap
        </Link>

        {user && profile && (
          <div className="flex items-center gap-3 text-sm">
            {profile.role === 'volunteer' && (
              <>
                <Link to="/map" className="text-gray-600 hover:text-emerald-700">
                  Map
                </Link>
                <Link
                  to="/portfolio"
                  className="text-gray-600 hover:text-emerald-700"
                >
                  Portfolio
                </Link>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                  {profile.karma_points} karma
                </span>
              </>
            )}
            {profile.role === 'ngo' && (
              <>
                <Link
                  to="/ngo/dashboard"
                  className="text-gray-600 hover:text-emerald-700"
                >
                  Dashboard
                </Link>
                <Link
                  to="/ngo/create-gig"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                >
                  New Gig
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        )}

        {!user && (
          <div className="flex gap-2">
            <Link to="/login" className="text-gray-600 hover:text-emerald-700">
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
