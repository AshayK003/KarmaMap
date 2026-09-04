import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const VolunteerMap = lazy(() =>
  import('./pages/VolunteerMap').then((m) => ({ default: m.VolunteerMap })),
);
const GigDetail = lazy(() => import('./pages/GigDetail').then((m) => ({ default: m.GigDetail })));
const ParticipateGig = lazy(() =>
  import('./pages/ParticipateGig').then((m) => ({ default: m.ParticipateGig })),
);
const NgoDashboard = lazy(() =>
  import('./pages/NgoDashboard').then((m) => ({ default: m.NgoDashboard })),
);
const CreateGig = lazy(() => import('./pages/CreateGig').then((m) => ({ default: m.CreateGig })));
const VolunteerPortfolio = lazy(() =>
  import('./pages/VolunteerPortfolio').then((m) => ({ default: m.VolunteerPortfolio })),
);
const PublicPortfolio = lazy(() =>
  import('./pages/PublicPortfolio').then((m) => ({ default: m.PublicPortfolio })),
);
const Leaderboard = lazy(() =>
  import('./pages/Leaderboard').then((m) => ({ default: m.Leaderboard })),
);
const OrganizationDashboard = lazy(() =>
  import('./pages/OrganizationDashboard').then((m) => ({ default: m.OrganizationDashboard })),
);
const OrganizationManage = lazy(() =>
  import('./pages/OrganizationManage').then((m) => ({ default: m.OrganizationManage })),
);
const NgoProfile = lazy(() =>
  import('./pages/NgoProfile').then((m) => ({ default: m.NgoProfile })),
);
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-emerald-700"
            >
              Skip to content
            </a>
            <ErrorBoundary
              fallback={
                <div className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="mx-auto flex max-w-7xl items-center px-4 sm:px-6 py-3">
                    <span className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
                      Karma<span className="text-emerald-600">Map</span>
                    </span>
                  </div>
                </div>
              }
            >
              <Navbar />
            </ErrorBoundary>
            <main id="main-content" className="flex-1 animate-fade-in">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/p/:slug" element={<PublicPortfolio />} />
                    <Route
                      path="/map"
                      element={
                        <ProtectedRoute roles={['volunteer']}>
                          <VolunteerMap />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/portfolio"
                      element={
                        <ProtectedRoute roles={['volunteer']}>
                          <VolunteerPortfolio />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/gigs/:id" element={<GigDetail />} />
                    <Route
                      path="/leaderboard"
                      element={
                        <ProtectedRoute>
                          <Leaderboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/gigs/:id/participate"
                      element={
                        <ProtectedRoute roles={['volunteer']}>
                          <ParticipateGig />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ngo/dashboard"
                      element={
                        <ProtectedRoute roles={['ngo']}>
                          <NgoDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ngo/create-gig"
                      element={
                        <ProtectedRoute roles={['ngo']}>
                          <CreateGig />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organization/dashboard"
                      element={
                        <ProtectedRoute roles={['volunteer', 'ngo']}>
                          <OrganizationDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organization/manage"
                      element={
                        <ProtectedRoute>
                          <OrganizationManage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/corporate/dashboard"
                      element={<Navigate to="/organization/dashboard" replace />}
                    />
                    <Route
                      path="/corporate/manage"
                      element={<Navigate to="/organization/manage" replace />}
                    />
                    <Route path="/ngo/:id" element={<NgoProfile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </BrowserRouter>
        <Toaster richColors closeButton position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
