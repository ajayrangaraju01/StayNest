import { useMemo, useState } from "react";

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "enquiries", label: "Booking Requests" },
  { id: "settings", label: "Settings" },
];

export default function OwnerDashboard({
  ownerName = "Owner",
  ownerPhone = "",
  ownerRole = "owner",
  ownerStatus,
  hostels,
  requests,
  onRequestStatusChange,
  onBack,
  onToast,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const stats = useMemo(() => {
    const totalBeds = hostels.reduce(
      (count, hostel) => count + hostel.rooms.reduce((roomCount, room) => roomCount + room.total, 0),
      0,
    );
    const availableBeds = hostels.reduce(
      (count, hostel) =>
        count + hostel.rooms.reduce((roomCount, room) => roomCount + room.available, 0),
      0,
    );
    return {
      totalHostels: hostels.length,
      totalBeds,
      availableBeds,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
    };
  }, [hostels, requests]);


  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          Stay
          <span>Nest</span>
          {" "}
          Owner
        </div>
        <div className="sidebar-section">Management</div>
        {sidebarItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item${activeTab === item.id ? " active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </div>
        ))}
        <div className="sidebar-section">Account</div>
        <div className="sidebar-item" onClick={onBack}>Exit Dashboard</div>
        <div className="sidebar-item" onClick={onLogout}>Logout</div>
      </div>

      <div className="dash-main">
        {ownerStatus !== "active" && (
          <div className="form-section" style={{ marginBottom: 20, background: "#fff7ed" }}>
            <div className="form-section-title">Verification Status</div>
            <p style={{ color: "#9a3412", fontSize: 14 }}>
              Your owner account is pending admin verification. You can submit listings now; they stay
              hidden until approved.
            </p>
          </div>
        )}

        <div className="dash-header">
          <div className="dash-greeting">Welcome back, {ownerName}</div>
          <div className="dash-title">
            {sidebarItems.find((item) => item.id === activeTab)?.label}
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="form-section" style={{ marginBottom: 18 }}>
              <div className="form-section-title">Owner Profile</div>
              <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
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
              </div>
            </div>
            <div className="stats-row">
              {[
                { label: "Your Hostels", num: stats.totalHostels },
                { label: "Total Beds", num: stats.totalBeds },
                { label: "Available Beds", num: stats.availableBeds },
                { label: "Pending Requests", num: stats.pendingRequests },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-num">{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">Your Listings</div>
              {hostels.length === 0 && (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                  You have not listed any hostels yet.
                </p>
              )}
              {hostels.map((hostel) => (
                <div
                  key={hostel.id}
                  style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{hostel.name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 2 }}>
                    {hostel.location}
                    ,{" "}
                    {hostel.city}
                    {" "}
                    •
                    {" "}
                    {hostel.gender}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {hostel.address}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Contact:
                    {" "}
                    <strong>{hostel.contact_number || "Not provided"}</strong>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Amenities:
                    {" "}
                    {(hostel.amenities && hostel.amenities.length > 0)
                      ? hostel.amenities.join(", ")
                      : "Not provided"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Rooms:
                    {" "}
                    {(hostel.rooms && hostel.rooms.length > 0)
                      ? hostel.rooms.map((room) =>
                        `${room.type} - INR ${room.price} (${room.available}/${room.total} beds)`).join(", ")
                      : "Not provided"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Photos:
                    {" "}
                    {hostel.images ? hostel.images.length : 0}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Status:
                    {" "}
                    <strong>{hostel.moderationStatus}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}


        {activeTab === "enquiries" && (
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
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Hostel:
                  {" "}
                  {request.hostelName}
                  {" "}
                  • Move-in:
                  {" "}
                  {request.moveInDate}
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
        )}

        {activeTab === "settings" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Profile Settings</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" defaultValue={ownerName} />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" placeholder="name@upi" />
                </div>
              </div>
            </div>
            <button className="submit-btn" onClick={() => onToast("Settings saved.")}>
              Save Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
