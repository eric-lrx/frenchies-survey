import { useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { homePath, ROLE_LABELS, type Role } from "./api.js";
import { useAuth } from "./auth/AuthContext.js";
import Login from "./pages/Login.js";
import MySurveys from "./pages/owner/MySurveys.js";
import NewSurvey from "./pages/owner/NewSurvey.js";
import SurveyDetail from "./pages/owner/SurveyDetail.js";
import OpenSurveys from "./pages/respondent/OpenSurveys.js";
import SurveyPage from "./pages/respondent/SurveyPage.js";

// Application shell (F-08), sign-in and sign-out (F-01), role navigation and role routes
// (F-02). The screens of each role are filled by F-03 to F-07.
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
        <Route element={<RoleRoute role="SURVEY_OWNER" />}>
          <Route path="/owner/surveys" element={<MySurveys />} />
          <Route path="/owner/surveys/new" element={<NewSurvey />} />
          <Route path="/owner/surveys/:id" element={<SurveyDetail />} />
        </Route>
        <Route element={<RoleRoute role="RESPONDENT" />}>
          <Route path="/surveys" element={<OpenSurveys />} />
          <Route path="/surveys/:id" element={<SurveyPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? homePath(user.role) : "/login"} replace />} />
      </Routes>
    </Shell>
  );
}

// A route of the other role sends the user to their own home; without a session, to the
// login screen. Convenience only: the API refuses the calls anyway (F-02 contract, section 3).
function RoleRoute({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}

const NAV_LINKS: Record<Role, { to: string; label: string }[]> = {
  SURVEY_OWNER: [
    { to: "/owner/surveys", label: "My surveys" },
    { to: "/owner/surveys/new", label: "New survey" },
  ],
  RESPONDENT: [{ to: "/surveys", label: "Open surveys" }],
};

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
        <span className="app-brand">Café Feedback</span>
        {user && (
          <nav aria-label="Main" className="app-nav me-auto">
            {NAV_LINKS[user.role].map((link) => (
              <NavLink key={link.to} to={link.to} end className="app-nav-link">
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
        {user && (
          <>
            <span className="app-user ms-auto">
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
