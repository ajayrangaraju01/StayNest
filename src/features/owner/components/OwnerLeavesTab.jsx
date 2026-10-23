export default function OwnerLeavesTab({
  leaves, formatDisplayDate, handleLeaveDecision
}) {
  return (
    <>
      <div className="form-section">
            <div className="form-section-title">Guest Leave Requests</div>
            {leaves.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No leave requests yet.</p>}
            {leaves.map((leave) => (
              <div key={leave.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                <div style={{ fontWeight: 700 }}>{leave.student_name}</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  {formatDisplayDate(leave.start_date)} to {formatDisplayDate(leave.end_date)}
                </div>
                {leave.reason && <div style={{ marginTop: 8, fontSize: 13 }}>"{leave.reason}"</div>}
                <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{leave.status}</strong></div>
                {leave.status === "requested" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button className="card-cta" onClick={() => handleLeaveStatus(leave.id, "approved")}>Approve</button>
                    <button className="nav-btn" onClick={() => handleLeaveStatus(leave.id, "rejected")}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
    </>
  );
}
