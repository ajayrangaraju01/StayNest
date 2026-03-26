import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";

const ROLE_META = {
  owner: { title: "Hostel Owner", subtitle: "Manage listings, menus, enquiries, and bookings." },
  guest: { title: "Student/Guest", subtitle: "Find hostels and send booking requests." },
};

const ROOM_FIELDS = [
  { label: "2 Share", type: "double", bedsKey: "room2Beds", priceKey: "room2Price" },
  { label: "3 Share", type: "triple", bedsKey: "room3Beds", priceKey: "room3Price" },
  { label: "4 Share", type: "four", bedsKey: "room4Beds", priceKey: "room4Price" },
  { label: "5 Share", type: "five", bedsKey: "room5Beds", priceKey: "room5Price" },
  { label: "6 Share", type: "six", bedsKey: "room6Beds", priceKey: "room6Price" },
];

export default function AuthPage({
  defaultRole = "guest",
  onBack,
  onSuccess,
  hideGuest = false,
  hideOwner = false,
}) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    hostelName: "",
    hostelArea: "",
    hostelCity: "Hyderabad",
    hostelAddress: "",
    hostelPincode: "",
    hostelGender: "Boys",
    hostelContact: "",
    hostelDescription: "",
    hostelRules: "",
    hostelAmenities: "WiFi, CCTV, Power Backup",
    hostelPhotoFiles: [],
    room2Beds: "",
    room2Price: "",
    room3Beds: "",
    room3Price: "",
    room4Beds: "",
    room4Price: "",
    room5Beds: "",
    room5Price: "",
    room6Beds: "",
    room6Price: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handlePhotoFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setForm({ ...form, hostelPhotoFiles: [] });
      return;
    }
    const readers = files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    }));
    try {
      const results = await Promise.all(readers);
      setForm({ ...form, hostelPhotoFiles: results });
    } catch {
      setError("Unable to read one or more images.");
    }
  };

  useEffect(() => {
    if (hideGuest && role !== "owner") {
      setRole("owner");
    }
    if (hideOwner && role !== "guest") {
      setRole("guest");
    }
  }, [hideGuest, hideOwner, role]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.phone || !form.password || (mode === "signup" && !form.name.trim())) {
      setError("Please fill all required fields.");
      return;
    }

    const payload = {
      role,
      phone: form.phone,
      password: form.password,
      name: form.name,
    };

    if (mode === "signup" && role === "owner") {
      const amenities = form.hostelAmenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const photos = form.hostelPhotoFiles || [];
      const rooms = ROOM_FIELDS.map((field) => {
        const beds = Number(form[field.bedsKey] || 0);
        const price = Number(form[field.priceKey] || 0);
        if (!beds || !price) return null;
        return {
          type: field.type,
          monthly_rent: price,
          total_beds: beds,
          occupied_beds: 0,
        };
      }).filter(Boolean);

      if (!form.hostelName || !form.hostelArea || !form.hostelAddress || !form.hostelContact) {
        setError("Please fill all hostel details.");
        return;
      }
      if (photos.length === 0) {
        setError("Please upload at least one hostel photo.");
        return;
      }
      if (rooms.length === 0) {
        setError("Please add at least one room type.");
        return;
      }

      payload.hostel = {
        name: form.hostelName,
        address: form.hostelAddress,
        area: form.hostelArea,
        city: form.hostelCity || "Hyderabad",
        pincode: form.hostelPincode || "",
        gender_type: form.hostelGender === "Boys" ? "boys" : form.hostelGender === "Girls" ? "girls" : "coed",
        description: form.hostelDescription,
        rules: form.hostelRules,
        contact_number: form.hostelContact,
        amenities,
        photos: photos.map((url) => ({ url })),
        rooms,
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

        {!hideGuest && !hideOwner && (
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
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Minimum 6 characters"
            />
          </div>

          {mode === "signup" && role === "owner" && (
            <>
              <div className="form-section-title" style={{ marginTop: 16 }}>Hostel Details</div>
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
                  <option>Co-ed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  className="form-input"
                  value={form.hostelContact}
                  onChange={(event) => setForm({ ...form, hostelContact: event.target.value })}
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
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={form.hostelDescription}
                  onChange={(event) => setForm({ ...form, hostelDescription: event.target.value })}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Rules / Other Details</label>
                <textarea
                  className="form-textarea"
                  value={form.hostelRules}
                  onChange={(event) => setForm({ ...form, hostelRules: event.target.value })}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Amenities (comma separated)</label>
                <input
                  className="form-input"
                  value={form.hostelAmenities}
                  onChange={(event) => setForm({ ...form, hostelAmenities: event.target.value })}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Hostel/PG Photos</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFiles}
                />
                {form.hostelPhotoFiles.length > 0 && (
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    {form.hostelPhotoFiles.length}
                    {" "}
                    image(s) selected.
                  </div>
                )}
              </div>

              <div className="form-section-title" style={{ marginTop: 16 }}>Room Types</div>
              {ROOM_FIELDS.map((field) => (
                <div key={field.type} className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="form-group">
                    <label className="form-label">{field.label} Total Beds</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form[field.bedsKey]}
                      onChange={(event) =>
                        setForm({ ...form, [field.bedsKey]: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{field.label} Price (INR)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form[field.priceKey]}
                      onChange={(event) =>
                        setForm({ ...form, [field.priceKey]: event.target.value })}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="book-now-btn" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
