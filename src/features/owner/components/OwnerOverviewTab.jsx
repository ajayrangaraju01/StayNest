export default function OwnerOverviewTab({
  stats = {},
  selectTab = () => {},
  hostels = [],
  ownerAnalytics = {},
  approvedStudents = [],
  expectedThisMonth = 0,
  collectedThisMonth = 0,
  outstandingThisMonth = 0,
  dueTodayGuests = [],
  overdueGuests = [],
  setGuestDetailId = () => {},
  formatDisplayDate = (d) => d || "",
  ownerActionItems = [],
}) {
  const safeDueToday = Array.isArray(dueTodayGuests) ? dueTodayGuests : [];
  const safeOverdue = Array.isArray(overdueGuests) ? overdueGuests : [];
  const safeHostels = Array.isArray(hostels) ? hostels : [];
  const safeActionItems = Array.isArray(ownerActionItems) ? ownerActionItems : [];
  const safeStudents = Array.isArray(approvedStudents) ? approvedStudents : [];

  const availableBeds = Number(stats?.availableBeds || 0);
  const totalBeds = Number(stats?.totalBeds || 0);
  const occupiedBeds = Math.max(0, totalBeds - availableBeds);
  const totalHostels = Number(stats?.totalHostels || safeHostels.length || 0);
  const pendingRequests = Number(stats?.pendingRequests || 0);

  return (
    <>
      <div className="mobile-quick-grid">
        {[
          { label: "Available Beds", value: availableBeds },
          { label: "Occupied Beds", value: occupiedBeds },
        ].map((item) => (
          <div key={item.label} className="mobile-quick-card static">
            <span className="mobile-quick-label">{item.label}</span>
            <strong className="mobile-quick-value">{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="stats-row">
        {[
          { label: "Your Hostels", num: totalHostels },
          { label: "Active Guests", num: ownerAnalytics?.active_guests_count ?? safeStudents.length },
          { label: "Expected This Month", num: `INR ${expectedThisMonth}` },
          { label: "Collected This Month", num: `INR ${collectedThisMonth}` },
          { label: "Outstanding This Month", num: `INR ${outstandingThisMonth}` },
          { label: "Occupancy %", num: `${ownerAnalytics?.occupancy_rate ?? 0}%` },
          { label: "Check-ins Today", num: ownerAnalytics?.checkins_today ?? 0 },
          { label: "Check-outs Today", num: ownerAnalytics?.checkouts_today ?? 0 },
          { label: "Pending Requests", num: pendingRequests },
        ].map((stat) => (
          <div className="stat-card" key={stat.label}>
                  <div className="stat-num">{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="form-section" style={{ marginTop: 18, marginBottom: 18 }}>
              <div className="form-section-title">Room Type Occupancy</div>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {(ownerAnalytics?.room_type_occupancy || []).length === 0 && (
                  <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No room occupancy data yet.</p>
                )}
                {(ownerAnalytics?.room_type_occupancy || []).map((item) => (
                  <div key={item.type} className="edit-compact-card">
                    <div style={{ fontWeight: 700, color: "var(--espresso)" }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: "var(--warm-gray)" }}>
                      {item.occupied_beds}/{item.total_beds} beds occupied
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {item.occupancy_rate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-section" style={{ marginTop: 18, marginBottom: 18 }}>
              <div className="form-section-title">Payment Attention</div>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                <div className="edit-compact-card">
                  <div style={{ fontWeight: 700, color: "var(--espresso)" }}>Due Today</div>
                  {safeDueToday.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--warm-gray)" }}>No guests are due today.</div>
                  ) : (
                    safeDueToday.slice(0, 5).map((student) => (
                      <button
                        key={`due-today-${student.student_id}`}
                        type="button"
                        className="mobile-menu-item"
                        style={{ padding: "12px 14px", background: "#fffaf3" }}
                        onClick={() => {
                          selectTab("students");
                          setGuestDetailId(student.student_id);
                        }}
                      >
                        {student.student_name} | INR {student.upcoming_fee_amount || "0"} | {formatDisplayDate(student.upcoming_fee_due_date)}
                      </button>
                    ))
                  )}
                </div>
                <div className="edit-compact-card">
                  <div style={{ fontWeight: 700, color: "#b91c1c" }}>Overdue Payments</div>
                  {safeOverdue.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--warm-gray)" }}>No overdue payments right now.</div>
                  ) : (
                    safeOverdue.slice(0, 5).map((student) => (
                      <button
                        key={`overdue-${student.student_id}`}
                        type="button"
                        className="mobile-menu-item"
                        style={{ padding: "12px 14px", background: "#fff7f7", borderColor: "#fecaca", color: "#991b1b" }}
                        onClick={() => {
                          selectTab("students");
                          setGuestDetailId(student.student_id);
                        }}
                      >
                        {student.student_name} | INR {student.upcoming_fee_amount || "0"} | {formatDisplayDate(student.upcoming_fee_due_date)}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">Your Listings</div>
              {safeHostels.length === 0 && (
                <div className="empty-state" style={{ padding: "28px 12px" }}>
                  <span className="empty-icon">Listing</span>
                  <div className="empty-title">Your listing will appear here</div>
                  <p className="empty-sub">Once your hostel is approved, this section becomes your command center for pricing, occupancy, and guest operations.</p>
                </div>
              )}
              {safeHostels.map((hostel) => (
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
                    -
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
                    Listing Status:
                    {" "}
                    <strong>{hostel.moderationStatus}</strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="form-section" style={{ marginTop: 18 }}>
              <div className="form-section-title">Next Best Actions</div>
              <div className="workflow-grid">
                {safeActionItems.map((item) => (
                  <div key={item.title} className="workflow-card">
                    <div className="workflow-card-title">{item.title}</div>
                    <p className="workflow-card-desc">{item.desc}</p>
                    <button className="card-cta" onClick={() => selectTab(item.tab)}>
                      {item.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
  );
}
