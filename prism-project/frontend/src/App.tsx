import { BrowserRouter, Routes, Route, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import router from './router';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </BrowserRouter>
  );
  // return <RouterProvider router={router} />;
}

export default App;