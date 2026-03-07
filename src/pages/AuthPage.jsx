import { useState } from "react";
import { useAuth } from "../auth/useAuth";

const ROLE_META = {
  owner: { title: "Hostel Owner", subtitle: "Manage listings, menus, enquiries, and bookings." },
  guest: { title: "Guest", subtitle: "Find hostels and send booking requests." },
};

export default function AuthPage({ defaultRole = "guest", onBack, onSuccess }) {
  const { requestOtp, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({ name: "", phone: "", otp: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const handleOtpSend = () => {
    setError("");
    const result = requestOtp({ phone: form.phone });
    if (!result.ok) {
      setInfo("");
      setError(result.error);
      return;
    }
    setInfo(`OTP sent. Demo code: ${result.otp}`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!form.phone || !form.otp || (mode === "signup" && !form.name.trim())) {
      setError("Please fill all required fields and verify OTP.");
      return;
    }

    const payload = {
      role,
      phone: form.phone,
      otp: form.otp,
      name: form.name,
    };

    setBusy(true);
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
            <label className="form-label">Mobile Number</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="10-digit number"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label className="form-label">OTP</label>
            <div className="auth-otp-row">
              <input
                className="form-input"
                value={form.otp}
                onChange={(event) => setForm({ ...form, otp: event.target.value })}
                placeholder="6-digit OTP"
                inputMode="numeric"
              />
              <button type="button" className="nav-btn primary auth-otp-btn" onClick={handleOtpSend}>
                Send OTP
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button className="book-now-btn" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
