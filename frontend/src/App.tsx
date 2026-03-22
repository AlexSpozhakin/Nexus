import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import TaskDetail from './pages/TaskDetail';
import NotificationManager from './components/NotificationManager';
import GlobalSearch from './components/GlobalSearch';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

function AppRoutes() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const eventHandler = () => setSearchOpen(true);
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('open-global-search', eventHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('open-global-search', eventHandler);
    };
  }, []);

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/team/:id" element={
          <PrivateRoute>
            <Team />
          </PrivateRoute>
        } />

        <Route path="/task/:id" element={
          <PrivateRoute>
            <TaskDetail key={location.pathname} />
          </PrivateRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  const theme = useStore((state) => state.settings.theme);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <NotificationManager />
      <AppRoutes />
    </BrowserRouter>
  );
}