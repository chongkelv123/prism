// frontend/src/router.tsx - FIXED VERSION
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

// Create a layout component that provides auth context
const AppProviders = () => {
  return (
    <AuthProvider>
      <Outlet />
      <AuthDebug />
    </AuthProvider>
  );
};

// Protected layout that includes all providers after authentication
const ProtectedLayout = () => {
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
      // Public routes MUST come before protected routes to avoid conflicts
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
      
      
      // Protected routes group - handles root and all protected paths
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          {
            // Nested layout for authenticated users with all providers
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
                path: 'reports',
                element: <ReportsPage />,
              },
              {
                path: 'reports/create',
                element: <CreateReportPage />,
              },
              {
                path: 'templates',
                element: <TemplatesPage />,
              },
              {
                path: 'connections',
                element: <ConnectionsPage />,
              },
            ],
          },
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