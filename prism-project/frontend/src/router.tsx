import { createBrowserRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
// import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
// import DashboardPage from './pages/DashboardPage';
// import ReportsPage from './pages/ReportsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // {
  //   path: '/register',
  //   element: <RegisterPage />,
  // },
  // {
  //   path: '/dashboard',
  //   element: <DashboardPage />,
  // },
  // {
  //   path: '/home',
  //   element: <HomePage />,
  // },
  // {
  //   path: '/reports',
  //   element: <ReportsPage />,
  // },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;