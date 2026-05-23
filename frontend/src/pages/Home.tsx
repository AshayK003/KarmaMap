import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const { user, profile } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-emerald-50/20 via-slate-50 to-white">
      {/* Glow Blur Blobs */}
      <div className="absolute top-1/4 left-1/10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/10 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none animate-float" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
        {/* ─── Hero Section ─── */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1 text-xs font-black text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hyper-Local Geospatial Volunteer Network
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-slate-800 sm:text-6xl max-w-4xl mx-auto leading-[1.1]">
            Volunteer Locally.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Impact Globally.
            </span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-base sm:text-lg font-medium text-slate-500 leading-relaxed">
            KarmaMap connects verified local NGOs with skilled volunteers using intelligent geospatial coordinates, dynamic matching algorithms, and automated completion verification.
          </p>

          {user && profile ? (
            <div className="pt-4">
              <Link
                to={profile.role === 'ngo' ? '/ngo/dashboard' : '/map'}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-8 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/15 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                Go to {profile.role === 'ngo' ? 'NGO Dashboard' : 'Discovery Map'}
              </Link>
            </div>
          ) : (
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                to="/signup?role=volunteer"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-slate-900 hover:bg-slate-800 px-7 py-4 text-sm font-black text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                Join as Volunteer
              </Link>
              <Link
                to="/signup?role=ngo"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-7 py-4 text-sm font-black text-slate-700 shadow-2xs hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                Register NGO Organization
              </Link>
            </div>
          )}
        </section>

        {/* ─── Stats Grid Section ─── */}
        <section className="mt-20 border-y border-slate-100 py-10 bg-white/40 backdrop-blur-xs rounded-3xl px-6 grid gap-8 sm:grid-cols-3 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-800">12,500+</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hours Logged</p>
          </div>
          <div className="border-y sm:border-y-0 sm:border-x border-slate-100 py-6 sm:py-0">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600">98.4%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Match Accuracy</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-800">450+</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Partners</p>
          </div>
        </section>

        {/* ─── Features Grid ─── */}
        <section className="mt-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-black text-slate-800 sm:text-3xl">Engineered for Community Impact</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Advanced technologies driving local transformations daily.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Map Discovery',
                desc: 'Find open volunteer opportunities within custom search radii on an interactive live map.',
                svg: (
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                )
              },
              {
                title: 'Smart Skill Matching',
                desc: 'Instant matching system that dynamically aligns opportunity requirements with volunteer skills.',
                svg: (
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              },
              {
                title: 'Verified Impact Ledger',
                desc: 'Cryptographically secured records detailing completed service hours and downloadable certificates.',
                svg: (
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )
              }
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-slate-100 bg-white p-6 hover:shadow-md hover:border-emerald-100/50 transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform duration-200">
                  {f.svg}
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-800">{f.title}</h3>
                <p className="mt-2 text-xs font-semibold text-slate-500 leading-normal">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

