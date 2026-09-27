import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router'
import type { ReactElement } from 'react';
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import CoursePage from './pages/CoursePage'
import Workspace from './app/Workspace'
import { getCurrentUser } from './services/auth'

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // "/#explore" style links from sub-pages: scroll to the section, not to top
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Auth gate for the workspace: unauthenticated visitors land on /login and
 * come back to where they were headed after signing in. */
function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation();
  if (!getCurrentUser()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ai-tutor/:slug" element={<CoursePage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Workspace />
            </RequireAuth>
          }
        />
        <Route
          path="/app/s/:sessionId"
          element={
            <RequireAuth>
              <Workspace />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
