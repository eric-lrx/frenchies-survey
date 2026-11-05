import { Navigate, Route, Routes } from "react-router-dom";

// Application shell (F-08). Each Sprint 1 feature adds its screens and the
// role navigation (F-01, F-02); for now every path shows the shell.
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="container d-flex align-items-center py-2">
          <span className="app-brand">Café Feedback</span>
        </div>
      </header>
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<p>Welcome to Café Feedback.</p>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
