import { useEffect, useState } from "react";
import {
  fetchAdminAllHostels,
  fetchAdminAllOwners,
  fetchComplaints,
  fetchAdminHostels,
  fetchAdminOverview,
  fetchAdminOwners,
  fetchReviews,
  fetchTrustSummary,
  updateComplaint,
  updateAdminHostelModeration,
  updateAdminUser,
  updateReview,
} from "../api/staynestApi";

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "owners", label: "Owners" },
  { id: "hostels", label: "Hostels" },
  { id: "complaints", label: "Complaints" },
  { id: "reviews", label: "Reviews" },
];

export default function AdminDashboard({ adminName, onLogout, onToast, initialTab = "overview" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [overview, setOverview] = useState(null);
  const [owners, setOwners] = useState([]);
  const [allOwners, setAllOwners] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [allHostels, setAllHostels] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trustSummary, setTrustSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [hostelSearch, setHostelSearch] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [overviewData, ownersData, allOwnersData, hostelsData, allHostelsData, complaintData, reviewData, trustData] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminOwners(),
        fetchAdminAllOwners(),
        fetchAdminHostels(),
        fetchAdminAllHostels(),
        fetchComplaints(),
        fetchReviews(),
        fetchTrustSummary(),
      ]);
      setOverview(overviewData);
      setOwners(ownersData || []);
      setAllOwners(allOwnersData || []);
      setHostels(hostelsData || []);
      setAllHostels(allHostelsData || []);
      setComplaints(complaintData || []);
      setReviews(reviewData || []);
      setTrustSummary(trustData);
    } catch (error) {
      onToast(error.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab || "overview");
  }, [initialTab]);

  const handleOwnerAction = async (userId, payload, successMessage) => {
    const actionLabel = payload.verification_state || payload.status || "update";
    if (!window.confirm(`Are you sure you want to ${actionLabel} this owner?`)) return;
    try {
      await updateAdminUser(userId, payload);
      onToast(successMessage);
      await loadAll();
    } catch (error) {
      onToast(error.message || "Unable to update owner.");
    }
  };

  const handleHostelAction = async (hostelId, moderationStatus) => {
    if (!window.confirm(`Are you sure you want to mark this hostel as ${moderationStatus}?`)) return;
    try {
      await updateAdminHostelModeration(hostelId, { moderation_status: moderationStatus });
      onToast(`Hostel ${moderationStatus}.`);
      await loadAll();
    } catch (error) {
      onToast(error.message || "Unable to update hostel status.");
    }
  };

  const handleComplaintAction = async (complaintId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to mark this complaint as ${nextStatus}?`)) return;
    try {
      await updateComplaint(complaintId, {
        status: nextStatus,
        admin_decision: nextStatus === "resolved" ? "Complaint resolved after moderation." : "Complaint rejected after review.",
      });
      onToast(`Complaint ${nextStatus}.`);
      await loadAll();
    } catch (error) {
      onToast(error.message || "Unable to update complaint.");
    }
  };

  const handleReviewAction = async (reviewId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to mark this review as ${nextStatus}?`)) return;
    try {
      await updateReview(reviewId, { status: nextStatus });
      onToast(`Review ${nextStatus}.`);
      await loadAll();
    } catch (error) {
      onToast(error.message || "Unable to update review.");
    }
  };

  const filteredAllOwners = allOwners.filter((owner) => {
    const query = ownerSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      (owner.name || "").toLowerCase().includes(query)
      || (owner.email || "").toLowerCase().includes(query)
      || (owner.phone || "").toLowerCase().includes(query)
    );
  });

  const filteredAllHostels = allHostels.filter((hostel) => {
    const query = hostelSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      (hostel.name || "").toLowerCase().includes(query)
      || (hostel.owner_name || "").toLowerCase().includes(query)
      || (hostel.area || "").toLowerCase().includes(query)
      || (hostel.city || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          Stay
          <span>Nest</span>
          {" "}
          Admin
        </div>
        <div className="sidebar-section">Moderation</div>
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
        <div className="sidebar-item" onClick={onLogout}>Logout</div>
      </div>

      <div className="dash-main">
        <div className="dash-header">
          <div className="dash-greeting">Admin panel</div>
          <div className="dash-title">
            {loading ? "Loading..." : `Welcome, ${adminName}`}
          </div>
        </div>

        <div className="mobile-quick-grid">
          {[
            { label: "Owners", value: owners.length, onClick: () => setActiveTab("owners") },
            { label: "Hostels", value: hostels.length, onClick: () => setActiveTab("hostels") },
            { label: "Complaints", value: complaints.filter((item) => item.status !== "resolved" && item.status !== "rejected").length, onClick: () => setActiveTab("complaints") },
            { label: "Reviews", value: reviews.filter((item) => item.status === "pending").length, onClick: () => setActiveTab("reviews") },
          ].map((item) => (
            <button key={item.label} className="mobile-quick-card" onClick={item.onClick}>
              <span className="mobile-quick-label">{item.label}</span>
              <strong className="mobile-quick-value">{item.value}</strong>
            </button>
          ))}
        </div>

        {activeTab === "overview" && overview && (
          <>
            <div className="stats-row">
              {[
                ["Pending Owners", overview.pending_owners],
                ["Pending Hostels", overview.pending_hostels],
                ["Active Guests", overview.active_students],
                ["Suspended Users", overview.suspended_users],
              ].map(([label, num]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-num">{num}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            {trustSummary && (
              <div className="form-section">
                <div className="form-section-title">Trust Snapshot</div>
                <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
                  <div>Admin Trust Score: <strong>{trustSummary.trust_score}</strong></div>
                  <div>Complaints in Queue: <strong>{complaints.filter((item) => item.status !== "resolved" && item.status !== "rejected").length}</strong></div>
                  <div>Reviews Awaiting Moderation: <strong>{reviews.filter((item) => item.status === "pending").length}</strong></div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "owners" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Owner Verification Queue</div>
              {owners.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No pending owners found.</p>}
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{owner.name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {owner.email || "No email"} - {owner.phone}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Status: <strong>{owner.status}</strong> | Verification: <strong>{owner.verification_state}</strong>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="card-cta"
                      onClick={() =>
                        handleOwnerAction(
                          owner.id,
                          { status: "active", verification_state: "verified" },
                          "Owner approved.",
                        )}
                    >
                      Approve Owner
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() =>
                        handleOwnerAction(
                          owner.id,
                          { status: "suspended", verification_state: "rejected" },
                          "Owner rejected.",
                        )}
                    >
                      Reject Owner
                    </button>
                    {owner.status !== "suspended" && (
                      <button
                        className="nav-btn"
                        onClick={() =>
                          handleOwnerAction(owner.id, { status: "suspended" }, "Owner suspended.")}
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">All Owners</div>
              <input
                className="form-input"
                placeholder="Search by owner name, email, or phone"
                value={ownerSearch}
                onChange={(event) => setOwnerSearch(event.target.value)}
                style={{ marginBottom: 12 }}
              />
              {filteredAllOwners.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No owners found.</p>}
              {filteredAllOwners.map((owner) => (
                <div
                  key={`all-owner-${owner.id}`}
                  style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{owner.name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {owner.email || "No email"} - {owner.phone}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Status: <strong>{owner.status}</strong> | Verification: <strong>{owner.verification_state}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "hostels" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Hostel Moderation Queue</div>
              {hostels.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No pending hostels found.</p>}
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
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Owner: {hostel.owner_name} | {hostel.area}, {hostel.city}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Moderation: <strong>{hostel.moderation_status}</strong>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="card-cta"
                      onClick={() => handleHostelAction(hostel.id, "approved")}
                    >
                      Approve Hostel
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() => handleHostelAction(hostel.id, "rejected")}
                    >
                      Reject Hostel
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() => handleHostelAction(hostel.id, "pending")}
                    >
                      Mark Pending
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">All Hostels</div>
              <input
                className="form-input"
                placeholder="Search by hostel, owner, area, or city"
                value={hostelSearch}
                onChange={(event) => setHostelSearch(event.target.value)}
                style={{ marginBottom: 12 }}
              />
              {filteredAllHostels.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No hostels found.</p>}
              {filteredAllHostels.map((hostel) => (
                <div
                  key={`all-${hostel.id}`}
                  style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{hostel.name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Owner: {hostel.owner_name} | {hostel.area}, {hostel.city}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Moderation: <strong>{hostel.moderation_status}</strong> | Owner Status: <strong>{hostel.owner_status}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "complaints" && (
          <div className="form-section">
            <div className="form-section-title">Complaint Moderation</div>
            {complaints.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No complaints found.</p>}
            {complaints.map((complaint) => (
              <div key={complaint.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                <div style={{ fontWeight: 700 }}>{complaint.student_name}</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  {complaint.hostel_name} | Owner: {complaint.owner_name}
                </div>
                <div style={{ marginTop: 8, fontSize: 13 }}>{complaint.reason}</div>
                <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{complaint.status}</strong></div>
                {complaint.evidence?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Evidence: {complaint.evidence.map((item) => item.file_url).join(", ")}
                  </div>
                )}
                {complaint.admin_decision && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>Admin Note: {complaint.admin_decision}</div>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="card-cta" onClick={() => handleComplaintAction(complaint.id, "resolved")}>Resolve</button>
                  <button className="nav-btn" onClick={() => handleComplaintAction(complaint.id, "under_review")}>Under Review</button>
                  <button className="nav-btn" onClick={() => handleComplaintAction(complaint.id, "rejected")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="form-section">
            <div className="form-section-title">Review Moderation</div>
            {reviews.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No reviews found.</p>}
            {reviews.map((review) => (
              <div key={review.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                <div style={{ fontWeight: 700 }}>{review.hostel_name}</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Guest: {review.student_name} | Avg Rating: {review.average_rating}
                </div>
                {review.text && <div style={{ marginTop: 8, fontSize: 13 }}>{review.text}</div>}
                {review.owner_reply && <div style={{ marginTop: 8, fontSize: 13 }}>Owner Reply: {review.owner_reply}</div>}
                <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{review.status}</strong></div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="card-cta" onClick={() => handleReviewAction(review.id, "published")}>Publish</button>
                  <button className="nav-btn" onClick={() => handleReviewAction(review.id, "rejected")}>Reject</button>
                  <button className="nav-btn" onClick={() => handleReviewAction(review.id, "pending")}>Mark Pending</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
