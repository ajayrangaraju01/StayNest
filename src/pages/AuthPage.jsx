import { useState } from "react";
import { useAuth } from "../auth/useAuth";

const ROLE_META = {
  owner: { title: "Hostel Owner", subtitle: "Manage listings, menus, enquiries, and bookings." },
  guest: { title: "Guest", subtitle: "Browse hostels, request bookings, and track your plans." },
};

export default function AuthPage({ defaultRole = "guest", onBack, onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password || (mode === "signup" && !form.name.trim())) {
      setError("Please fill all required fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    const payload = {
      role,
      email: form.email,
      password: form.password,
      name: form.name,
    };
    const result = mode === "login" ? login(payload) : register(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSuccess(result.session);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <button className="back-btn auth-back" onClick={onBack}>
          Back
        </button>

        <div className="auth-header">
          <div className="section-label">Authentication</div>
          <h1 className="auth-title">{ROLE_META[role].title}</h1>
          <p className="auth-sub">{ROLE_META[role].subtitle}</p>
        </div>

        <div className="auth-toggle-row">
          <button
            className={`filter-chip${role === "guest" ? " active" : ""}`}
            onClick={() => setRole("guest")}
            type="button"
          >
            Guest
          </button>
          <button
            className={`filter-chip${role === "owner" ? " active" : ""}`}
            onClick={() => setRole("owner")}
            type="button"
          >
            Hostel Owner
          </button>
        </div>

        <div className="auth-toggle-row">
          <button
            className={`filter-chip${mode === "login" ? " active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`filter-chip${mode === "signup" ? " active" : ""}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Minimum 6 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="book-now-btn" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
