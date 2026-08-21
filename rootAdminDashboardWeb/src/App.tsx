import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';

// Pages
import Login from './pages/Login';
import Overview from './pages/Overview';
import IssueQueue from './pages/IssueQueue';
import IssueDetail from './pages/IssueDetail';
import MapView from './pages/MapView';
import TaskView from './pages/TaskView';
import Analytics from './pages/Analytics';
import AdminManagement from './pages/AdminManagement';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Overview />} />
        <Route path="/issues" element={<IssueQueue />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/tasks" element={<TaskView />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/teams" element={<AdminManagement />} />
        <Route path="/departments" element={<AdminManagement />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
