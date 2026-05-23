import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { VolunteerMap } from './pages/VolunteerMap';
import { GigDetail } from './pages/GigDetail';
import { ParticipateGig } from './pages/ParticipateGig';
import { NgoDashboard } from './pages/NgoDashboard';
import { CreateGig } from './pages/CreateGig';
import { VolunteerPortfolio } from './pages/VolunteerPortfolio';
import { PublicPortfolio } from './pages/PublicPortfolio';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
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
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
