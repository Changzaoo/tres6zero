import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingState';
import { AppShell } from '@/components/layout/AppShell';

// Public
import LandingPage from '@/pages/public/LandingPage';
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

export default function App() {
  const { initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/g/:eventSlug" element={<GalleryPage />} />
      <Route path="/g/:eventSlug/:videoId" element={<VideoPage />} />

      {/* Auth */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* App (private) */}
      <Route path="/app" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/new" element={<EventFormPage />} />
        <Route path="events/:id" element={<EventsPage />} />
        <Route path="events/:id/edit" element={<EventFormPage />} />
        <Route path="operator" element={<OperatorPage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
