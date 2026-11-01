import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import MapPickerModal from "../components/MapPickerModal";
import { geocodeAddress, reverseGeocodeLatLng } from "../utils/googleMaps";

const ROLE_META = {
  owner: {
    badge: "Owner Portal",
    title: "Property Owner Sign In",
    subtitle: "Manage your property listings, room allocations, food menu, and guest billing.",
    testEmail: "owner@staynest.local",
    testPass: "owner123",
  },
  guest: {
    badge: "Tenant Portal",
    title: "Tenant Sign In",
    subtitle: "Explore verified hostels, view booking status, and request room stays.",
    testEmail: "student@staynest.local",
    testPass: "student123",
  },
  admin: {
    badge: "Staff Only",
    title: "StayNest Staff & Admin Portal",
    subtitle: "Restricted administrative session for platform verification, moderation, and auditing.",
    testEmail: "admin@staynest.local",
    testPass: "admin123",
  },
};

export default function AuthPage({
  defaultRole = "guest",
  onBack,
  onSuccess,
  _hideGuest = false,
  _hideOwner = false,
  _lockRole = false,
}) {
  const {
    login,
    loginWithOtp,
    register,
    resetPassword,
    sendLoginOtp,
    sendPasswordResetOtp,
    sendRegistrationOtp,
  } = useAuth();
  const [mode, setMode] = useState("login");
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    guestGender: "",
    otpCode: "",
    password: "",
    confirmPassword: "",
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
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [currentLocationBusy, setCurrentLocationBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const isAdminAuth = role === "admin";

  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (mode === "signup" && (!form.phone || !form.password || !form.confirmPassword || !form.name.trim())) {
      setError("Please fill all required fields.");
      return;
    }
    if ((mode === "login" || recoveryMode) && !form.email) {
      setError("Please enter your email address.");
      return;
    }
    if (mode === "login" && !form.password) {
      setError("Please enter your password.");
      return;
    }
    if ((mode === "signup" || recoveryMode === "reset") && form.password !== form.confirmPassword) {
      setError("Password and confirm password must match.");
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

    if (mode === "signup" && role === "guest") {
      if (!form.guestGender) {
        setError("Please select your gender.");
        return;
      }
      payload.studentProfile = {
        gender: form.guestGender,
      };
    }

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
    const result = recoveryMode === "otp-login"
      ? await loginWithOtp(payload)
      : recoveryMode === "reset"
        ? await resetPassword(payload)
        : mode === "login"
          ? await login(payload)
          : await register(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (recoveryMode === "reset") {
      setRecoveryMode("");
      setShowRecoveryOptions(false);
      setMode("login");
      setForm((prev) => ({ ...prev, otpCode: "", password: "", confirmPassword: "" }));
      setOtpSent(false);
      setInfo("Password changed successfully. Please login with your new password.");
      return;
    }

    onSuccess(result.session);
  };

  const handleSendOtp = async () => {
    setError("");
    setInfo("");
    setOtpBusy(true);
    const result = recoveryMode === "otp-login"
      ? await sendLoginOtp(form.email, role)
      : recoveryMode === "reset"
        ? await sendPasswordResetOtp(form.email, role)
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

  const applyPickedHostelLocation = (location) => {
    setForm((prev) => ({
      ...prev,
      hostelAddress: location.formattedAddress || prev.hostelAddress,
      hostelArea: location.area || prev.hostelArea,
      hostelCity: location.city || prev.hostelCity,
      hostelPincode: location.pincode || prev.hostelPincode,
      hostelGeoLat: String(location.lat),
      hostelGeoLng: String(location.lng),
    }));
    setShowMapPicker(false);
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("Current location is not supported on this device.");
      return;
    }
    setError("");
    setCurrentLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const location = await reverseGeocodeLatLng(
            position.coords.latitude,
            position.coords.longitude,
          );
          applyPickedHostelLocation(location);
        } catch (geoError) {
          setError(geoError.message || "Unable to use current location.");
        } finally {
          setCurrentLocationBusy(false);
        }
      },
      () => {
        setCurrentLocationBusy(false);
        setError("Location permission denied. Please allow access or pick on map.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <div className="auth-wrap">
      <MapPickerModal
        isOpen={showMapPicker}
        title="Pick Hostel Location"
        initialLat={form.hostelGeoLat}
        initialLng={form.hostelGeoLng}
        initialQuery={[form.hostelArea, form.hostelAddress, form.hostelCity].filter(Boolean).join(", ")}
        onClose={() => setShowMapPicker(false)}
        onPick={applyPickedHostelLocation}
      />
      <div className="auth-card">
        <button className="back-btn auth-back" onClick={onBack}>
          Back
        </button>

        <div className="auth-header">
          <div className="section-label">Authentication</div>
          <h1 className="auth-title">{ROLE_META[role].title}</h1>
          <p className="auth-sub">{ROLE_META[role].subtitle}</p>
        </div>

        {isAdminAuth && (
          <div className="admin-security-banner">
            <div className="admin-security-icon">🔒</div>
            <div>
              <strong>Staff Compliance &amp; Moderation Access</strong>
              <p>Restricted administrative session for platform auditing, KYC verification, and dispute resolution.</p>
            </div>
          </div>
        )}

        <div style={{ background: "rgba(185, 103, 68, 0.08)", border: "1px solid rgba(185, 103, 68, 0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontWeight: 600 }}>Default Login:</span> {ROLE_META[role].testEmail}
            <span style={{ color: "var(--warm-gray)", marginLeft: 6 }}>({ROLE_META[role].testPass})</span>
          </div>
          <button
            type="button"
            className="nav-btn"
            style={{ padding: "4px 10px", fontSize: 12, height: "auto" }}
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                email: ROLE_META[role].testEmail,
                password: ROLE_META[role].testPass,
              }));
            }}
          >
            Auto-fill
          </button>
        </div>

        {!isAdminAuth && (
          <div className="auth-toggle-row">
            <button
              className={`filter-chip${mode === "login" ? " active" : ""}`}
              onClick={() => {
                setMode("login");
                setShowRecoveryOptions(false);
                setRecoveryMode("");
                setOtpSent(false);
                setError("");
                setInfo("");
              }}
              type="button"
            >
              {role === "owner" ? "Owner Sign In" : "Tenant Sign In"}
            </button>
            <button
              className={`filter-chip${mode === "signup" ? " active" : ""}`}
              onClick={() => {
                setMode("signup");
                setShowRecoveryOptions(false);
                setRecoveryMode("");
                setOtpSent(false);
                setError("");
                setInfo("");
              }}
              type="button"
            >
              {role === "owner" ? "List Property / Sign Up" : "Create Tenant Account"}
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

              {role === "guest" && (
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={form.guestGender}
                    onChange={(event) => setForm({ ...form, guestGender: event.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Prefer Co-Live</option>
                  </select>
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

              {!recoveryMode && (
                <>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    className="auth-link-btn"
                    type="button"
                    onClick={() => {
                      setShowRecoveryOptions((prev) => !prev);
                      setRecoveryMode("");
                      setOtpSent(false);
                      setError("");
                      setInfo("");
                    }}
                  >
                    Forgot Password?
                  </button>
                </>
              )}

              {!!recoveryMode && (
                <div className="auth-info" style={{ marginBottom: 12 }}>
                  {recoveryMode === "otp-login"
                    ? "Use OTP once if you forgot your password and just want to sign in."
                    : "Verify with OTP and set a new password for future logins."}
                </div>
              )}

              {!!recoveryMode && (
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
              )}

              {recoveryMode === "reset" && (
                <>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      placeholder="Set a new password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                      placeholder="Enter the new password again"
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}

              {otpSent && recoveryMode && (
                <div className="auth-info">
                  {recoveryMode === "otp-login"
                    ? "Login OTP sent to your email. Use the latest code only."
                    : "Password reset OTP sent to your email. Use the latest code only."}
                </div>
              )}

              {showRecoveryOptions && !recoveryMode && (
                <div className="auth-recovery-box">
                  <div className="auth-recovery-title">Choose how you want to recover access</div>
                  <div className="auth-toggle-row" style={{ justifyContent: "space-between", gap: 10, marginBottom: 0 }}>
                    <button
                      className="filter-chip"
                      type="button"
                      onClick={() => {
                        setRecoveryMode("otp-login");
                        setOtpSent(false);
                        setError("");
                        setInfo("");
                      }}
                    >
                      Login with OTP
                    </button>
                    <button
                      className="filter-chip"
                      type="button"
                      onClick={() => {
                        setRecoveryMode("reset");
                        setOtpSent(false);
                        setError("");
                        setInfo("");
                      }}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              )}

              {!!recoveryMode && (
                <button
                  className="auth-link-btn"
                  type="button"
                  onClick={() => {
                    setRecoveryMode("");
                    setOtpSent(false);
                    setError("");
                    setInfo("");
                  }}
                >
                  Back to recovery options
                </button>
              )}
            </>
          )}

          {mode === "signup" && (
            <>
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
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                  placeholder="Enter the password again"
                />
              </div>
            </>
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
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="nav-btn"
                    type="button"
                    onClick={handleLocateHostel}
                    disabled={locationBusy}
                  >
                    {locationBusy ? "Locating..." : "Quick Fill by Address"}
                  </button>
                  <button
                    className="nav-btn"
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={currentLocationBusy}
                  >
                    {currentLocationBusy ? "Fetching..." : "Use Current Location"}
                  </button>
                  <button
                    className="nav-btn"
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                  >
                    Pick Exact Pin on Map
                  </button>
                </div>
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

          {info && <div className="auth-info">{info}</div>}
          {error && <div className="auth-error">{error}</div>}

          <button className="book-now-btn" type="submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : recoveryMode === "otp-login"
                ? "Login with OTP"
                : recoveryMode === "reset"
                  ? "Change Password"
                  : mode === "login"
                    ? (role === "owner" ? "Sign In as Property Owner" : role === "admin" ? "Sign In as Administrator" : "Sign In as Tenant")
                    : (role === "owner" ? "Register Property & Host" : "Create Tenant Account")}
          </button>
        </form>
      </div>
    </div>
  );
}
