import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const { user, profile } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-emerald-800 sm:text-5xl">
          Volunteer locally.
          <br />
          <span className="text-emerald-600">Impact globally.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          KarmaMap connects NGOs with nearby volunteers using smart geospatial matching,
          real-time updates, and verified impact tracking.
        </p>

        {user && profile ? (
          <Link
            to={profile.role === 'ngo' ? '/ngo/dashboard' : '/map'}
            className="mt-8 inline-block rounded-xl bg-emerald-600 px-8 py-3 font-medium text-white shadow-lg hover:bg-emerald-700"
          >
            Go to {profile.role === 'ngo' ? 'Dashboard' : 'Map'}
          </Link>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup?role=volunteer"
              className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
            >
              Join as Volunteer
            </Link>
            <Link
              to="/signup?role=ngo"
              className="rounded-xl border-2 border-emerald-600 px-6 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Register NGO
            </Link>
          </div>
        )}
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          { icon: '🗺️', title: 'Map Discovery', desc: 'Find nearby gigs on an interactive map' },
          { icon: '🎯', title: 'Smart Matching', desc: 'Distance + skill overlap scoring' },
          { icon: '📸', title: 'Verified Impact', desc: 'Before/after photo proof & certificates' },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-emerald-100 bg-white p-6 text-center shadow-sm"
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
