import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminRoute } from './components/AdminRoute';
import { useAuth } from './contexts/AuthContext';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import { ProposeMarketModal } from './components/ProposeMarketModal';

// Heavy pages loaded lazily
const UserDashboard = lazy(() => import('./pages/UserDashboard').then((m) => ({ default: m.UserDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const OracleDashboard = lazy(() => import('./pages/OracleDashboard').then((m) => ({ default: m.OracleDashboard })));
const TreasuryDashboard = lazy(() => import('./pages/TreasuryDashboard').then((m) => ({ default: m.TreasuryDashboard })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then((m) => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })));
const Compliance = lazy(() => import('./pages/Compliance').then((m) => ({ default: m.Compliance })));

const PageLoader = () => (
  <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--purple-primary)] border-t-transparent animate-spin" />
  </div>
);

function App() {
  const { user } = useAuth();
  useRealtimeNotifications(user?.id);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/user-dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <UserDashboard />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/:tab"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route path="/market/:marketAddress" element={<MarketDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route
          path="/oracle"
          element={
            <Suspense fallback={<PageLoader />}>
              <OracleDashboard />
            </Suspense>
          }
        />
        <Route
          path="/treasury"
          element={
            <Suspense fallback={<PageLoader />}>
              <TreasuryDashboard />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<PageLoader />}>
              <TermsOfService />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<PageLoader />}>
              <PrivacyPolicy />
            </Suspense>
          }
        />
        <Route
          path="/compliance"
          element={
            <Suspense fallback={<PageLoader />}>
              <Compliance />
            </Suspense>
          }
        />
      </Routes>
      <ProposeMarketModal />
    </>
  );
}

export default App;
