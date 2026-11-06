import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AdminPage} from './components/AdminPage.tsx';
import './index.css';

// /admin is the Vetter team's own page, separate from the app
const isAdminPath = /^\/admin\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(isAdminPath ? <AdminPage /> : <App />);
