import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, homePath } from "../api.js";
import { useAuth } from "../auth/AuthContext.js";

// F-01 contract, section 3: labelled fields, a disabled button while signing in, one generic
// message on failure, and the email kept in the field.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(homePath(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-card mx-auto" aria-labelledby="login-title">
      <h1 id="login-title" className="h4 mb-1">
        Sign in
      </h1>
      <p className="text-body-secondary mb-3">Use the account given to you by the café.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="form-control"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="form-control"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-danger mb-3">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-cafe w-100" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
