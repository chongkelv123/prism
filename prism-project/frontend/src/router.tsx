// frontend/src/router.tsx - FIXED VERSION (No Nested ConnectionsProvider)
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

// Simple protected layout without any additional providers
const ProtectedLayout = () => {
  return <Outlet />;
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
      
      // Protected routes group - ALL routes use the same simple layout
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          {
            // Single protected layout for ALL authenticated routes
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
                element: <ConnectionsPage />, // ConnectionsProvider will be inside this component
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