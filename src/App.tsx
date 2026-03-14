import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { OracleDashboard } from './pages/OracleDashboard';
import { TreasuryDashboard } from './pages/TreasuryDashboard';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Compliance } from './pages/Compliance';
import { AdminRoute } from './components/AdminRoute';
import { useAuth } from './contexts/AuthContext';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import { ProposeMarketModal } from './components/ProposeMarketModal';

function App() {
  const { user } = useAuth();
  useRealtimeNotifications(user?.id);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/:tab"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="/market/:marketAddress" element={<MarketDetailPage />} />
        <Route path="/oracle" element={<OracleDashboard />} />
        <Route path="/treasury" element={<TreasuryDashboard />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/compliance" element={<Compliance />} />
      </Routes>
      <ProposeMarketModal />
    </>
  );
}

export default App;
