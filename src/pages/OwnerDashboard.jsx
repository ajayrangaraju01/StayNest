import { useState } from "react";
import { LOCATIONS } from "../data/hostels";

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "list", label: "List Hostel" },
  { id: "menu", label: "Daily Menu" },
  { id: "enquiries", label: "Enquiries" },
  { id: "settings", label: "Settings" },
];

export default function OwnerDashboard({ ownerName = "Owner", onBack, onToast, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [menuData, setMenuData] = useState({
    breakfast: "Idli, Vada, Sambar, Tea",
    lunch: "Rice, Dal, Curry, Roti",
    dinner: "Rice, Chapati, Dal, Sabzi",
  });

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
                { label: "Total Occupants", num: "28" },
                { label: "Available Beds", num: "10" },
                { label: "New Enquiries", num: "7" },
                { label: "Monthly Revenue", num: "INR 1.4L" },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-num">{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="form-section">
              <div className="form-section-title">Recent Enquiries</div>
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                New enquiries will appear here. Connect this with your API to make it live.
              </p>
            </div>
          </>
        )}

        {activeTab === "list" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Basic Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel Name</label>
                  <input className="form-input" placeholder="e.g. The Nest Hostel" />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Area</label>
                  <select className="form-select" defaultValue="">
                    <option value="" disabled>Select area</option>
                    {LOCATIONS.slice(1).map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Address</label>
                  <input className="form-input" placeholder="Full address" />
                </div>
                <div className="form-group full">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Hostel details" />
                </div>
              </div>
            </div>
            <button className="submit-btn" onClick={() => onToast("Hostel listing saved.")}>
              Save Listing
            </button>
          </>
        )}

        {activeTab === "menu" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Update Daily Menu</div>
              <div className="menu-update-grid">
                {[
                  { key: "breakfast", label: "Breakfast" },
                  { key: "lunch", label: "Lunch" },
                  { key: "dinner", label: "Dinner" },
                ].map(({ key, label }) => (
                  <div className="menu-update-card" key={key}>
                    <div className="menu-update-label">{label}</div>
                    <textarea
                      className="menu-update-textarea"
                      value={menuData[key]}
                      onChange={(event) => setMenuData({ ...menuData, [key]: event.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button className="submit-btn" onClick={() => onToast("Menu updated.")}>
              Save Menu
            </button>
          </>
        )}

        {activeTab === "enquiries" && (
          <div className="form-section">
            <div className="form-section-title">Student Enquiries</div>
            <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
              Hook this section to your backend to show enquiry feed, reply actions, and status changes.
            </p>
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
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" />
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
