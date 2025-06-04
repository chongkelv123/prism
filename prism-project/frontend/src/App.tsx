import { RouterProvider } from 'react-router-dom';
import router from './router';
import AuthDebug from './components/debug/AuthDebug';

function App() {  
    return <RouterProvider router={router} />;
}

export default App;