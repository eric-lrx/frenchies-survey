import { useState } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { homePath, ROLE_LABELS } from "./api.js";
import { useAuth } from "./auth/AuthContext.js";
import Login from "./pages/Login.js";

// Application shell (F-08) with sign-in and sign-out (F-01). Role navigation and route
// guards per role arrive with F-02; the role home screens are filled by F-03 and F-05.
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Shell>
        <p className="text-body-secondary" role="status">
          Loading…
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={homePath(user.role)} replace /> : <Login />} />
        <Route element={user ? <Outlet /> : <Navigate to="/login" replace />}>
          <Route path="/owner/surveys" element={<h1 className="h4">My surveys</h1>} />
          <Route path="/surveys" element={<h1 className="h4">Open surveys</h1>} />
        </Route>
        <Route path="*" element={<Navigate to={user ? homePath(user.role) : "/login"} replace />} />
      </Routes>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Header />
      <main className="container py-4">{children}</main>
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="app-header">
      <div className="container d-flex flex-wrap align-items-center gap-3 py-2">
        <span className="app-brand me-auto">Café Feedback</span>
        {user && (
          <>
            <span className="app-user">
              {user.name} — {ROLE_LABELS[user.role]}
            </span>
            <button type="button" className="btn btn-sm btn-outline-light" onClick={handleLogout} disabled={busy}>
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
