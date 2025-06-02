import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import CreateReportPage from './pages/CreateReportPage';
import TemplatesPage from './pages/TemplatesPage';
import ConnectionsPage from './pages/ConnectionsPage';
// import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Connect } from 'vite';

// Create a layout component that provides auth context
const AppProviders = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ConnectionsProvider>
        <Outlet />
        </ConnectionsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

const router = createBrowserRouter([
  {
    element: <AppProviders />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },
          {
            path: '/reports/create',
            element: <CreateReportPage />,
          },
          {
            path: '/templates',
            element: <TemplatesPage />,
          },
          {
            path: '/connections',
            element: <ConnectionsPage />,
          },
          // {
          //   path: '/settings',
          //   element: <SettingsPage />,
          // },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;