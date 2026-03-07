import { useMemo, useState } from "react";
import { LOCATIONS } from "../data/hostels";

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "list", label: "List Hostel" },
  { id: "enquiries", label: "Booking Requests" },
  { id: "settings", label: "Settings" },
];

function defaultListingForm() {
  return {
    name: "",
    location: "",
    city: "Hyderabad",
    address: "",
    gender: "Boys",
    description: "",
    amenitiesText: "WiFi, CCTV, Power Backup",
    imageText:
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80, https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
    roomType: "3 Share",
    roomPrice: "5000",
    roomTotalBeds: "8",
    distance: "",
  };
}

export default function OwnerDashboard({
  ownerName = "Owner",
  ownerStatus,
  hostels,
  requests,
  onCreateListing,
  onRequestStatusChange,
  onBack,
  onToast,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [listingForm, setListingForm] = useState(defaultListingForm());

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

  const handleListingSubmit = () => {
    if (!listingForm.name || !listingForm.location || !listingForm.address || !listingForm.roomPrice) {
      onToast("Please fill all required hostel fields.");
      return;
    }

    const price = Number(listingForm.roomPrice);
    const totalBeds = Number(listingForm.roomTotalBeds);
    if (!price || !totalBeds) {
      onToast("Room price and total beds must be valid numbers.");
      return;
    }

    onCreateListing({
      name: listingForm.name,
      location: listingForm.location,
      city: listingForm.city || "Hyderabad",
      address: listingForm.address,
      gender: listingForm.gender,
      description: listingForm.description || "Description pending owner update.",
      amenities: listingForm.amenitiesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      images: listingForm.imageText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      rooms: [
        {
          type: listingForm.roomType,
          price,
          total: totalBeds,
          available: totalBeds,
        },
      ],
      distance: listingForm.distance || "Distance not set",
    });

    setListingForm(defaultListingForm());
    setActiveTab("overview");
  };

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

        {activeTab === "list" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Create Hostel Listing</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel Name</label>
                  <input
                    className="form-input"
                    value={listingForm.name}
                    onChange={(event) => setListingForm({ ...listingForm, name: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Area</label>
                  <select
                    className="form-select"
                    value={listingForm.location}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, location: event.target.value })}
                  >
                    <option value="">Select area</option>
                    {LOCATIONS.slice(1).map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    className="form-input"
                    value={listingForm.city}
                    onChange={(event) => setListingForm({ ...listingForm, city: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hostel Type</label>
                  <select
                    className="form-select"
                    value={listingForm.gender}
                    onChange={(event) => setListingForm({ ...listingForm, gender: event.target.value })}
                  >
                    <option>Boys</option>
                    <option>Girls</option>
                    <option>Co-ed</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Address</label>
                  <input
                    className="form-input"
                    value={listingForm.address}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, address: event.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={listingForm.description}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, description: event.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Amenities (comma separated)</label>
                  <input
                    className="form-input"
                    value={listingForm.amenitiesText}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, amenitiesText: event.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Image URLs (comma separated)</label>
                  <textarea
                    className="form-textarea"
                    value={listingForm.imageText}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, imageText: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Room Type</label>
                  <select
                    className="form-select"
                    value={listingForm.roomType}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, roomType: event.target.value })}
                  >
                    {["Single", "2 Share", "3 Share", "4 Share", "5 Share"].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room Price (INR)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={listingForm.roomPrice}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, roomPrice: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Beds</label>
                  <input
                    className="form-input"
                    type="number"
                    value={listingForm.roomTotalBeds}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, roomTotalBeds: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Distance</label>
                  <input
                    className="form-input"
                    value={listingForm.distance}
                    onChange={(event) =>
                      setListingForm({ ...listingForm, distance: event.target.value })}
                    placeholder="e.g. 0.8 km from Metro"
                  />
                </div>
              </div>
            </div>
            <button className="submit-btn" onClick={handleListingSubmit}>
              Submit for Verification
            </button>
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
