import { useState, useEffect } from "react";
import { generateQrDataUrl } from "../../../utils/qr";
import { updateMyProfile, authMe } from "../../../api/staynestApi";

export default function OwnerSettingsTab({
  ownerName,
  ownerPhone,
  ownerRole,
  ownerStatus,
  trustSummary,
  ownerHighlights = [],
  onToast = () => {},
}) {
  const defaultUpi = ownerPhone ? `${ownerPhone.replace(/\D/g, "").slice(-10)}@upi` : "staynest@bank";
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewQr, setPreviewQr] = useState("");

  // Load existing UPI ID from profile
  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const user = await authMe();
        if (active) {
          const savedUpi = user?.owner_profile?.payout_method;
          setUpiId(savedUpi || defaultUpi);
        }
      } catch {
        if (active) setUpiId(defaultUpi);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [defaultUpi]);

  // Generate a preview QR for the owner's UPI ID
  useEffect(() => {
    if (!upiId) return;
    const sampleUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(ownerName || "StayNest Hostel")}&cu=INR&tn=HostelFee`;
    generateQrDataUrl(sampleUri, {
      width: 160,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
    })
      .then((url) => setPreviewQr(url))
      .catch(() => {});
  }, [upiId, ownerName]);

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    const cleanUpi = upiId.trim();
    if (!cleanUpi) {
      onToast("Please enter a valid Bank UPI ID / VPA.");
      return;
    }
    if (!cleanUpi.includes("@")) {
      onToast("Bank UPI ID must contain '@' (e.g., yourname@okhdfcbank or phone@upi).");
      return;
    }

    try {
      setSaving(true);
      await updateMyProfile({
        owner_profile: {
          payout_method: cleanUpi,
        },
      });
      onToast("Direct Bank UPI ID updated successfully! Tenants will now pay to this VPA.");
    } catch (err) {
      onToast(err.message || "Failed to update UPI ID.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Profile Settings Card */}
      <div className="form-section">
        <div className="form-section-title">Profile Settings</div>
        <div style={{ display: "grid", gap: 10, fontSize: 14, marginBottom: 18 }}>
          <div>
            Name: <strong>{ownerName}</strong>
          </div>
          <div>
            Phone: <strong>{ownerPhone || "Not provided"}</strong>
          </div>
          <div>
            Role: <strong>{ownerRole}</strong>
          </div>
          <div>
            Status: <strong>{ownerStatus}</strong>
          </div>
          {trustSummary && (
            <div>
              Published Reviews: <strong>{trustSummary.published_reviews_count}</strong>
            </div>
          )}
        </div>
        <div className="card-signal-row" style={{ marginBottom: 18 }}>
          {ownerHighlights.map((item) => (
            <span key={item} className="card-signal">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Direct Bank UPI Payout Settings */}
      <div className="form-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div className="form-section-title" style={{ margin: 0 }}>
            Direct Bank UPI Payout (0% Commission)
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--forest, #1e3a1e)",
              background: "rgba(30, 58, 30, 0.08)",
              padding: "3px 8px",
              borderRadius: 4,
            }}
          >
            ✓ Zero Gateway Cut
          </span>
        </div>

        <p style={{ color: "var(--warm-gray)", fontSize: 13, margin: "0 0 16px" }}>
          Tenants scan this UPI QR code or launch Google Pay / PhonePe / Paytm / BHIM directly to transfer rent straight into your bank account. No intermediaries or payment gateway fees.
        </p>

        <form onSubmit={handleSaveUpi}>
          <div style={{ display: "grid", gridTemplateColumns: previewQr ? "1fr auto" : "1fr", gap: 18, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Hostel Bank UPI ID / VPA <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. yourname@okhdfcbank, 9876543210@upi, hostel@okicici"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  disabled={loading || saving}
                  required
                  style={{ fontFamily: "monospace", width: "100%", boxSizing: "border-box" }}
                />
                <div style={{ fontSize: 11, color: "var(--warm-gray)", marginTop: 4 }}>
                  Available from your BHIM, Google Pay, PhonePe, Paytm, or mobile banking profile.
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="submit-btn"
                  style={{
                    padding: "8px 18px",
                    fontSize: 13,
                    background: "var(--forest, #1e3a1e)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving UPI ID..." : "Save Bank UPI ID"}
                </button>
              </div>
            </div>

            {previewQr && (
              <div
                style={{
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 10,
                  padding: 12,
                  background: "#ffffff",
                  textAlign: "center",
                  maxWidth: 180,
                }}
              >
                <img
                  src={previewQr}
                  alt="Owner UPI Preview"
                  style={{ width: 140, height: 140, display: "block", margin: "0 auto", borderRadius: 6 }}
                />
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--warm-gray)", marginTop: 6 }}>
                  Live Tenant Preview
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
