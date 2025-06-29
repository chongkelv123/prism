// frontend/src/router.tsx - FIXED VERSION (Shared ConnectionsProvider)
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
      <AuthDebug />
    </AuthProvider>
  );
};

// Protected layout WITH shared ConnectionsProvider for all authenticated pages
const ProtectedLayout = () => {
  console.log('ProtectedLayout: Providing shared ConnectionsProvider for all pages');
  
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
      // Public routes
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
      
      // Protected routes group - ALL routes share the same ConnectionsProvider
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          {
            // Shared ConnectionsProvider for ALL authenticated routes
            element: <ProtectedLayout />,
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
              {
                path: 'connections',
                element: <ConnectionsPage />, // NO ConnectionsProvider here anymore
              },
              {
                path: 'reports',
                element: <ReportsPage />,
              },
              {
                path: 'reports/create',
                element: <CreateReportPage />, // NO ConnectionsProvider here anymore
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