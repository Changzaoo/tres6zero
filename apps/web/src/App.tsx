import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingState';
import { AppShell } from '@/components/layout/AppShell';

// Public
import LandingPage from '@/pages/public/LandingPage';
import PricingPage from '@/pages/public/PricingPage';
import GalleryPage from '@/pages/public/GalleryPage';
import VideoPage from '@/pages/public/VideoPage';

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

// App
import DashboardPage from '@/pages/app/DashboardPage';
import EventsPage from '@/pages/app/EventsPage';
import EventFormPage from '@/pages/app/EventFormPage';
import OperatorPage from '@/pages/app/OperatorPage';
import VideosPage from '@/pages/app/VideosPage';
import TemplatesPage from '@/pages/app/TemplatesPage';
import LeadsPage from '@/pages/app/LeadsPage';
import AnalyticsPage from '@/pages/app/AnalyticsPage';
import SettingsPage from '@/pages/app/SettingsPage';
import AdminPage from '@/pages/app/AdminPage';
import BillingPage from '@/pages/app/BillingPage';
import LockedFeaturePage from '@/pages/app/LockedFeaturePage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function PaidRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized, hasActiveSubscription } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasActiveSubscription) return <LockedFeaturePage />;
  return <>{children}</>;
}

export default function App() {
  const { initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/plans" element={<PricingPage />} />
      <Route path="/g/:eventSlug" element={<GalleryPage />} />
      <Route path="/g/:eventSlug/:videoId" element={<VideoPage />} />

      {/* Auth */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* App (private) */}
      <Route path="/app" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<Navigate to="billing" replace />} />
        <Route path="dashboard" element={<PaidRoute><DashboardPage /></PaidRoute>} />
        <Route path="events" element={<PaidRoute><EventsPage /></PaidRoute>} />
        <Route path="events/new" element={<PaidRoute><EventFormPage /></PaidRoute>} />
        <Route path="events/:id" element={<PaidRoute><EventsPage /></PaidRoute>} />
        <Route path="events/:id/edit" element={<PaidRoute><EventFormPage /></PaidRoute>} />
        <Route path="operator" element={<PaidRoute><OperatorPage /></PaidRoute>} />
        <Route path="videos" element={<PaidRoute><VideosPage /></PaidRoute>} />
        <Route path="templates" element={<PaidRoute><TemplatesPage /></PaidRoute>} />
        <Route path="leads" element={<PaidRoute><LeadsPage /></PaidRoute>} />
        <Route path="analytics" element={<PaidRoute><AnalyticsPage /></PaidRoute>} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<PaidRoute><AdminPage /></PaidRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
