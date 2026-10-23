export default function OwnerEnquiriesTab({
  requests, onRequestStatusChange
}) {
  return (
    <>
      <div className="form-section">
            <div className="form-section-title">Booking Requests</div>
            {requests.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No booking requests yet.
              </p>
            )}
            {requests.map((request) => (
              <div
                key={request.id}
                style={{
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {request.studentName}
                  {" "}
                  requested
                  {" "}
                  {request.roomType}
                </div>
                {request.studentPhone && (
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Phone:
                    {" "}
                    {request.studentPhone}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Hostel:
                  {" "}
                  {request.hostelName}
                  {" "}
                  - Move-in:
                  {" "}
                  {request.moveInDate ? formatDisplayDate(request.moveInDate) : "Not set"}
                </div>
                {request.message && (
                  <div style={{ marginTop: 8, fontSize: 14 }}>"{request.message}"</div>
                )}
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  Status:
                  {" "}
                  <strong>{request.status}</strong>
                </div>

                {request.status === "pending" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      className="card-cta"
                      onClick={() => onRequestStatusChange(request.id, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() => onRequestStatusChange(request.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
    </>
  );
}
