import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/database';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

/**
 * Grace period for the profile fetch on role-restricted routes. If the profile
 * still hasn't loaded after this window (failed query, stale session), the
 * user is sent to login instead of spinning forever.
 */
const PROFILE_GRACE_MS = 8000;

function Spinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

function ProfileWaitGrace() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), PROFILE_GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  if (timedOut) return <Navigate to="/login" replace />;
  return <Spinner />;
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !profile) {
    return <ProfileWaitGrace />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'ngo' ? '/ngo/dashboard' : '/map'} replace />;
  }

  return <>{children}</>;
}
