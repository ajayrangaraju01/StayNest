export default function OwnerSettingsTab({
  ownerName, ownerPhone, ownerRole, ownerStatus, trustSummary, ownerHighlights
}) {
  return (
    <>
      <div className="form-section">
            <div className="form-section-title">Profile Settings</div>
            <div style={{ display: "grid", gap: 10, fontSize: 14, marginBottom: 18 }}>
              <div>
                Name:
                {" "}
                <strong>{ownerName}</strong>
              </div>
              <div>
                Phone:
                {" "}
                <strong>{ownerPhone || "Not provided"}</strong>
              </div>
              <div>
                Role:
                {" "}
                <strong>{ownerRole}</strong>
              </div>
              <div>
                Status:
                {" "}
                <strong>{ownerStatus}</strong>
              </div>
              {trustSummary && (
                <div>
                  Published Reviews:
                  {" "}
                  <strong>{trustSummary.published_reviews_count}</strong>
                </div>
              )}
            </div>
            <div className="card-signal-row" style={{ marginBottom: 18 }}>
              {ownerHighlights.map((item) => (
                <span key={item} className="card-signal">{item}</span>
              ))}
            </div>
            <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
              More owner settings and payout preferences can be added here in the next phase.
            </p>
          </div>
    </>
  );
}
