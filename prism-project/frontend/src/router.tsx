// frontend/src/router.tsx - IMPROVED VERSION WITH LAZY CONNECTIONS
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import CreateReportPage from './pages/CreateReportPage';
import TemplatesPage from './pages/TemplatesPage';
import ConnectionsPage from './pages/ConnectionsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthDebug from './components/debug/AuthDebug';

// Create a layout component that provides auth context only
const AppProviders = () => {
  return (
    <AuthProvider>
      <Outlet />      
    </AuthProvider>
  );
};

// Basic protected layout without connections (fast loading)
const BasicProtectedLayout = () => {
  return <Outlet />;
};

// Protected layout WITH connections (lazy loaded)
const ConnectionsProtectedLayout = () => {
  return (
    <ConnectionsProvider>
      <Outlet />
    </ConnectionsProvider>
  );
};

const router = createBrowserRouter([
  {
    element: <AppProviders />,
    children: [
      // Public routes - MUST come first to avoid conflicts
      {
        path: '/landing',
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
      
      // Protected routes group
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          // Basic routes that DON'T need connections (fast loading)
          {
            element: <BasicProtectedLayout />,
            children: [
              {
                index: true, // This handles the root "/" path
                element: <DashboardPage />,
              },
              {
                path: 'dashboard',
                element: <DashboardPage />,
              },
              {
                path: 'templates',
                element: <TemplatesPage />,
              },
            ],
          },
          
          // Routes that DO need connections (lazy loaded)
          {
            element: <ConnectionsProtectedLayout />,
            children: [
              {
                path: 'connections',
                element: <ConnectionsPage />,
              },
              {
                path: 'reports',
                element: <ReportsPage />,
              },
              {
                path: 'reports/create',
                element: <CreateReportPage />,
              },
            ],
          },
        ],
      },
      
      // 404 handler
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;