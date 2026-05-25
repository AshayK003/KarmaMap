import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const VolunteerMap = lazy(() => import('./pages/VolunteerMap').then((m) => ({ default: m.VolunteerMap })));
const GigDetail = lazy(() => import('./pages/GigDetail').then((m) => ({ default: m.GigDetail })));
const ParticipateGig = lazy(() => import('./pages/ParticipateGig').then((m) => ({ default: m.ParticipateGig })));
const NgoDashboard = lazy(() => import('./pages/NgoDashboard').then((m) => ({ default: m.NgoDashboard })));
const CreateGig = lazy(() => import('./pages/CreateGig').then((m) => ({ default: m.CreateGig })));
const VolunteerPortfolio = lazy(() => import('./pages/VolunteerPortfolio').then((m) => ({ default: m.VolunteerPortfolio })));
const PublicPortfolio = lazy(() => import('./pages/PublicPortfolio').then((m) => ({ default: m.PublicPortfolio })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then((m) => ({ default: m.Leaderboard })));
const CorporateDashboard = lazy(() => import('./pages/CorporateDashboard').then((m) => ({ default: m.CorporateDashboard })));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
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
          <Navbar />
          <main className="flex-1 animate-fade-in">
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
                  path="/corporate/dashboard"
                  element={
                    <ProtectedRoute roles={['volunteer', 'ngo']}>
                      <CorporateDashboard />
                    </ProtectedRoute>
                  }
                />
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
