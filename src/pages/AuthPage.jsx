import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { geocodeAddress } from "../utils/googleMaps";

const ROLE_META = {
  owner: { title: "Hostel Owner", subtitle: "Manage listings, menus, enquiries, and bookings." },
  guest: { title: "Guest", subtitle: "Find hostels and send booking requests." },
  admin: { title: "Admin", subtitle: "Moderate owners, hostels, and platform activity." },
};

export default function AuthPage({
  defaultRole = "guest",
  onBack,
  onSuccess,
  hideGuest = false,
  hideOwner = false,
  lockRole = false,
}) {
  const { login, register, sendLoginOtp, sendRegistrationOtp } = useAuth();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    otpCode: "",
    password: "",
    hostelName: "",
    hostelArea: "",
    hostelCity: "Hyderabad",
    hostelAddress: "",
    hostelPincode: "",
    hostelGender: "Boys",
    hostelContact: "",
    hostelGeoLat: "",
    hostelGeoLng: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const isAdminAuth = role === "admin";

  useEffect(() => {
    if (lockRole) return;
    if (hideGuest && role !== "owner") {
      setRole("owner");
    }
    if (hideOwner && role !== "guest") {
      setRole("guest");
    }
  }, [hideGuest, hideOwner, lockRole, role]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "signup" && (!form.phone || !form.password || !form.name.trim())) {
      setError("Please fill all required fields.");
      return;
    }
    if (mode === "login" && !form.email) {
      setError("Please enter your email address.");
      return;
    }

    const payload = {
      role,
      phone: form.phone,
      email: form.email,
      otpCode: form.otpCode,
      password: form.password,
      name: form.name,
    };

    if (mode === "signup" && role === "owner") {
      if (!form.hostelName || !form.hostelArea || !form.hostelAddress || !form.hostelContact) {
        setError("Please fill all hostel details.");
        return;
      }

      payload.hostel = {
        name: form.hostelName,
        address: form.hostelAddress,
        area: form.hostelArea,
        city: form.hostelCity || "Hyderabad",
        pincode: form.hostelPincode || "",
        geo_lat: form.hostelGeoLat ? Number(form.hostelGeoLat) : null,
        geo_lng: form.hostelGeoLng ? Number(form.hostelGeoLng) : null,
        gender_type: form.hostelGender === "Boys" ? "boys" : form.hostelGender === "Girls" ? "girls" : "coed",
        description: "",
        rules: "",
        contact_number: form.hostelContact,
        amenities: ["WiFi", "CCTV", "Power Backup"],
      };
    }

    setBusy(true);
    const result = mode === "login" ? await login(payload) : await register(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSuccess(result.session);
  };

  const handleSendOtp = async () => {
    setError("");
    setOtpBusy(true);
    const result = mode === "login"
      ? await sendLoginOtp(form.email, role)
      : await sendRegistrationOtp(form.email);
    setOtpBusy(false);

    if (!result.ok) {
      setOtpSent(false);
      setError(result.error);
      return;
    }

    setOtpSent(true);
  };

  const handleLocateHostel = async () => {
    setError("");
    const query = [form.hostelAddress, form.hostelArea, form.hostelCity, form.hostelPincode]
      .filter(Boolean)
      .join(", ");
    if (!query.trim()) {
      setError("Enter hostel area or address before locating it on the map.");
      return;
    }
    setLocationBusy(true);
    try {
      const location = await geocodeAddress(query);
      setForm((prev) => ({
        ...prev,
        hostelAddress: location.formattedAddress || prev.hostelAddress,
        hostelArea: location.area || prev.hostelArea,
        hostelCity: location.city || prev.hostelCity,
        hostelPincode: location.pincode || prev.hostelPincode,
        hostelGeoLat: String(location.lat),
        hostelGeoLng: String(location.lng),
      }));
    } catch (geoError) {
      setError(geoError.message || "Unable to find this hostel location.");
    } finally {
      setLocationBusy(false);
    }
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

        {!lockRole && !hideGuest && !hideOwner && (
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
        )}

        {!isAdminAuth && (
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
        )}

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

          {mode === "signup" && (
            <>
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
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>

              <div className="auth-otp-row">
                <input
                  className="form-input"
                  value={form.otpCode}
                  onChange={(event) => setForm({ ...form, otpCode: event.target.value })}
                  placeholder="Enter 6-digit email OTP"
                  inputMode="numeric"
                  maxLength={6}
                />
                <button
                  className="nav-btn auth-otp-btn"
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpBusy}
                >
                  {otpBusy ? "Sending..." : "Send OTP"}
                </button>
              </div>

              {otpSent && (
                <div className="auth-info">
                  OTP sent to your email. It is valid for 10 minutes.
                </div>
              )}
            </>
          )}

          {mode === "login" && (
            <>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="Enter your registered email"
                  autoComplete="email"
                />
              </div>

              <div className="auth-otp-row">
                <input
                  className="form-input"
                  value={form.otpCode}
                  onChange={(event) => setForm({ ...form, otpCode: event.target.value })}
                  placeholder="Enter 6-digit login OTP"
                  inputMode="numeric"
                  maxLength={6}
                />
                <button
                  className="nav-btn auth-otp-btn"
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpBusy}
                >
                  {otpBusy ? "Sending..." : "Send OTP"}
                </button>
              </div>

              {otpSent && (
                <div className="auth-info">
                  Login OTP sent to your email. Use the latest code only.
                </div>
              )}
            </>
          )}

          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
          )}

          {mode === "signup" && role === "owner" && (
            <>
              <div className="form-section-title" style={{ marginTop: 16 }}>PG Details</div>
              <div className="form-group">
                <label className="form-label">Hostel/PG Name</label>
                <input
                  className="form-input"
                  value={form.hostelName}
                  onChange={(event) => setForm({ ...form, hostelName: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Area / Location</label>
                <input
                  className="form-input"
                  value={form.hostelArea}
                  onChange={(event) => setForm({ ...form, hostelArea: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  value={form.hostelCity}
                  onChange={(event) => setForm({ ...form, hostelCity: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hostel Type</label>
                <select
                  className="form-select"
                  value={form.hostelGender}
                  onChange={(event) => setForm({ ...form, hostelGender: event.target.value })}
                >
                  <option>Boys</option>
                  <option>Girls</option>
                  <option>Co-Live</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  className="form-input"
                  value={form.hostelContact}
                  onChange={(event) => setForm({ ...form, hostelContact: event.target.value })}
                  placeholder="Use your PG contact number"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input
                  className="form-input"
                  value={form.hostelPincode}
                  onChange={(event) => setForm({ ...form, hostelPincode: event.target.value })}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  value={form.hostelAddress}
                  onChange={(event) => setForm({ ...form, hostelAddress: event.target.value })}
                />
              </div>
              <div className="form-group full">
                <button
                  className="nav-btn"
                  type="button"
                  onClick={handleLocateHostel}
                  disabled={locationBusy}
                >
                  {locationBusy ? "Locating..." : "Locate Hostel on Google Maps"}
                </button>
              </div>
              {(form.hostelGeoLat || form.hostelGeoLng) && (
                <div className="auth-info">
                  Map location saved:
                  {" "}
                  {form.hostelGeoLat}
                  {", "}
                  {form.hostelGeoLng}
                </div>
              )}
            </>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="book-now-btn" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Login with OTP" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
