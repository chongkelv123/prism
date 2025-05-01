import { BrowserRouter, Routes, Route, RouterProvider } from 'react-router-dom';
import router from './router';
// import LandingPage from './pages/LandingPage';

function App() {
  // return (
  //   <BrowserRouter>
  //     <Routes>
  //       <Route path="/" element={<LandingPage />} />
  //     </Routes>
  //   </BrowserRouter>
  // );
  return <RouterProvider router={router} />;
}

export default App;