import { useEffect, useMemo, useState } from "react";
import HostelCard from "../components/HostelCard";
import {
  createReview,
  fetchComplaints,
  createLeave,
  fetchFeeLedgers,
  fetchLeaves,
  fetchMenus,
  fetchNotifications,
  fetchReviews,
  fetchStudentOverview,
  fetchTrustSummary,
  updateComplaint,
  updateMyProfile,
} from "../api/staynestApi";

const STATUS_STEPS = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "checked_in", label: "Checked In" },
];

const STATUS_LABELS = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  checked_in: "Checked In",
  checked_out: "Checked Out",
};

function mapUiStatusToRaw(status) {
  if (status === "pending") return "requested";
  if (status === "accepted") return "approved";
  if (status === "rejected") return "rejected";
  return status || "requested";
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return value;
  }
}

function formatDate(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return value;
  }
}

function formatDueCountdown(dueDate) {
  if (!dueDate) return "";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((due - startOfToday) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(diffDays)) return "";
  if (diffDays > 0) return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (diffDays === 0) return "Due today";
  const overdueDays = Math.abs(diffDays);
  return `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
}

export default function StudentDashboard({ hostels, onHostelClick, requests = [], onToast = () => {} }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [feeLedgers, setFeeLedgers] = useState([]);
  const [menus, setMenus] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trustSummary, setTrustSummary] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    gender: "",
    college_company: "",
    emergency_contact: "",
  });
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [complaintEvidence, setComplaintEvidence] = useState("");
  const [reviewForm, setReviewForm] = useState({
    rating_cleanliness: "4",
    rating_food: "4",
    rating_owner: "4",
    rating_facilities: "4",
    rating_value: "4",
    text: "",
  });

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      try {
        const data = await fetchStudentOverview();
        setOverview(data);
        if (data?.user) {
          setProfileForm({
            name: data.user.name || "",
            phone: data.user.phone || "",
            email: data.user.email || "",
            age: data.user.student_profile?.age || "",
            gender: data.user.student_profile?.gender || "",
            college_company: data.user.student_profile?.college_company || "",
            emergency_contact: data.user.student_profile?.emergency_contact || "",
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const data = await fetchNotifications();
        setNotifications(data || []);
      } catch {
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    const loadOps = async () => {
      try {
        const [ledgerData, menuData, leaveData] = await Promise.all([
          fetchFeeLedgers(),
          fetchMenus(),
          fetchLeaves(),
        ]);
        setFeeLedgers(ledgerData || []);
        setMenus(menuData || []);
        setLeaves(leaveData || []);
      } catch {
        setFeeLedgers([]);
        setMenus([]);
        setLeaves([]);
      }
    };
    loadOps();
  }, []);

  useEffect(() => {
    const loadTrustAndFeedback = async () => {
      try {
        const [trustData, complaintData, reviewData] = await Promise.all([
          fetchTrustSummary(),
          fetchComplaints(),
          fetchReviews(),
        ]);
        setTrustSummary(trustData);
        setComplaints(complaintData || []);
        setReviews(reviewData || []);
      } catch {
        setTrustSummary(null);
        setComplaints([]);
        setReviews([]);
      }
    };
    loadTrustAndFeedback();
  }, []);

  const requestCards = useMemo(() => {
    return requests.map((request) => {
      const rawStatus = request.statusRaw || mapUiStatusToRaw(request.status);
      return {
        ...request,
        statusRaw: rawStatus,
        statusLabel: STATUS_LABELS[rawStatus] || rawStatus,
      };
    });
  }, [requests]);
  const guestOnboardingSteps = [
    "Browse verified hostels with live bed availability",
    "Compare move-in cost and room type",
    "Send request and track approval",
  ];

  if (loading) {
    return (
      <div className="section">
        <div className="section-title">Loading your dashboard...</div>
      </div>
    );
  }

  if (!overview?.joined) {
    return (
      <div className="section">
        <div className="section-title">Find a Hostel/PG</div>
        <div className="section-label">You have not joined any hostel yet.</div>
        <div className="card-signal-row" style={{ margin: "18px 0 0" }}>
          {guestOnboardingSteps.map((step) => (
            <span key={step} className="card-signal">{step}</span>
          ))}
        </div>

        <div className="form-section" style={{ marginTop: 20 }}>
          <div className="form-section-title">My Requests</div>
          {requestCards.length === 0 && (
            <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
              No requests yet. Pick a hostel and send a join request.
            </p>
          )}
          {requestCards.map((request) => (
            <div
              key={request.id}
              style={{
                border: "1px solid var(--cream-dark)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                background: "white",
              }}
            >
              <div style={{ fontWeight: 700 }}>{request.hostelName}</div>
              <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                Room:
                {" "}
                {request.roomType || "Not assigned"}
                {" "}
                -
                {" "}
                Move-in:
                {" "}
                {request.moveInDate ? formatDate(request.moveInDate) : "Not set"}
              </div>
              {request.message && (
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                  "{request.message}"
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12 }}>
                Status:
                {" "}
                <strong>{request.statusLabel}</strong>
              </div>
              {request.statusRaw !== "rejected" && request.statusRaw !== "cancelled" && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATUS_STEPS.map((step, index) => {
                    const currentIndex = STATUS_STEPS.findIndex((item) => item.key === request.statusRaw);
                    const active = currentIndex >= index;
                    return (
                      <span
                        key={`${request.id}-${step.key}`}
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: active ? "var(--terra)" : "var(--cream-dark)",
                          color: active ? "white" : "var(--warm-gray)",
                          fontWeight: 600,
                        }}
                      >
                        {step.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="form-section" style={{ marginTop: 20 }}>
          <div className="form-section-title">Notifications</div>
          {loadingNotifications && (
            <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>Loading notifications...</p>
          )}
          {!loadingNotifications && notifications.length === 0 && (
            <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
              No notifications yet.
            </p>
          )}
          {!loadingNotifications && notifications.map((note) => (
            <div
              key={note.id}
              style={{
                border: "1px solid var(--cream-dark)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                background: "white",
              }}
            >
              <div style={{ fontWeight: 700 }}>{note.title}</div>
              <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                {note.body}
              </div>
              <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 6 }}>
                {formatDateTime(note.created_at)}
              </div>
            </div>
          ))}
        </div>

        <div className="hostel-grid" style={{ marginTop: 20 }}>
          {hostels.map((hostel) => (
            <HostelCard key={hostel.id} hostel={hostel} onClick={() => onHostelClick(hostel)} />
          ))}
        </div>
      </div>
    );
  }

  const { hostel, upcoming_fee: upcomingFee } = overview;
  const dueCountdown = formatDueCountdown(upcomingFee?.due_date);
  const todaysMenu = menus.find((menu) => menu.is_override) || menus[0] || null;
  const joinedWorkflow = [
    `Current status: ${hostel.status}`,
    upcomingFee ? `Next due: ${formatDate(upcomingFee.due_date)}` : "No fee due right now",
    hostel.room_type ? `Room: ${hostel.room_type}` : "Room assignment pending",
  ];

  const handleProfileSave = async () => {
    try {
      await updateMyProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        email: profileForm.email,
        student_profile: {
          age: profileForm.age ? Number(profileForm.age) : null,
          gender: profileForm.gender,
          college_company: profileForm.college_company,
          emergency_contact: profileForm.emergency_contact,
        },
      });
      onToast("Profile updated.");
    } catch (error) {
      onToast(error.message || "Unable to update profile.");
    }
  };

  const handleLeaveRequest = async () => {
    try {
      await createLeave({
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        reason: leaveForm.reason,
      });
      setLeaveForm({ startDate: "", endDate: "", reason: "" });
      setLeaves(await fetchLeaves());
      onToast("Leave request submitted.");
    } catch (error) {
      onToast(error.message || "Unable to submit leave request.");
    }
  };

  const handleDisputeSubmit = async (complaintId) => {
    if (!complaintEvidence.trim()) {
      onToast("Add evidence link or dispute note first.");
      return;
    }
    try {
      await updateComplaint(complaintId, {
        evidence_urls: [complaintEvidence.trim()],
        dispute_note: "Guest submitted dispute evidence for review.",
      });
      setComplaintEvidence("");
      setComplaints(await fetchComplaints());
      setTrustSummary(await fetchTrustSummary());
      onToast("Dispute evidence submitted.");
    } catch (error) {
      onToast(error.message || "Unable to submit dispute evidence.");
    }
  };

  const handleReviewSubmit = async () => {
    if (!hostel?.id) {
      onToast("Join a hostel before submitting a review.");
      return;
    }
    try {
      await createReview({
        hostel: hostel.id,
        rating_cleanliness: Number(reviewForm.rating_cleanliness),
        rating_food: Number(reviewForm.rating_food),
        rating_owner: Number(reviewForm.rating_owner),
        rating_facilities: Number(reviewForm.rating_facilities),
        rating_value: Number(reviewForm.rating_value),
        text: reviewForm.text,
      });
      setReviewForm({
        rating_cleanliness: "4",
        rating_food: "4",
        rating_owner: "4",
        rating_facilities: "4",
        rating_value: "4",
        text: "",
      });
      setReviews(await fetchReviews());
      onToast("Review submitted for moderation.");
    } catch (error) {
      onToast(error.message || "Unable to submit review.");
    }
  };

  return (
    <div className="section">
      <div className="section-title">My Hostel/PG</div>
      <div className="mobile-quick-grid">
        {[
          { label: "Fee Due", value: upcomingFee ? `INR ${upcomingFee.amount_due}` : "None" },
          { label: "Menu", value: todaysMenu ? "Today" : "Pending" },
          { label: "Leaves", value: leaves.length },
          { label: "Trust", value: trustSummary?.trust_score ?? overview?.user?.trust_score ?? 0 },
        ].map((item) => (
          <div key={item.label} className="mobile-quick-card static">
            <span className="mobile-quick-label">{item.label}</span>
            <strong className="mobile-quick-value">{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="card-signal-row" style={{ marginBottom: 16 }}>
        {joinedWorkflow.map((item) => (
          <span key={item} className="card-signal">{item}</span>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{hostel.name}</div>
        <div style={{ color: "var(--warm-gray)", marginTop: 4 }}>
          {hostel.address}, {hostel.area}, {hostel.city}
        </div>
        <div style={{ marginTop: 6 }}>
          Room Type: <strong>{hostel.room_type || "Not assigned"}</strong>
        </div>
        <div style={{ marginTop: 6 }}>
          Contact: <strong>{hostel.contact_number || "Not provided"}</strong>
        </div>
        <div style={{ marginTop: 6 }}>
          Status: <strong>{hostel.status}</strong>
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Upcoming Fee</div>
        {!upcomingFee && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
            No upcoming fee found.
          </p>
        )}
        {upcomingFee && (
          <div style={{ display: "grid", gap: 6 }}>
            <div>Due Date: <strong>{formatDate(upcomingFee.due_date)}</strong></div>
            {dueCountdown && <div style={{ fontSize: 13, color: "var(--warm-gray)" }}>{dueCountdown}</div>}
            <div>Amount Due: <strong>INR {upcomingFee.amount_due}</strong></div>
            <div>Amount Paid: <strong>INR {upcomingFee.amount_paid}</strong></div>
            <div>Status: <strong>{upcomingFee.status}</strong></div>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Fee History</div>
        {feeLedgers.length === 0 && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No fee ledger entries yet.</p>
        )}
        {feeLedgers.map((ledger) => (
          <div
            key={ledger.id}
            style={{
              border: "1px solid var(--cream-dark)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 700 }}>{formatDate(ledger.month)}</div>
            <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
              Due INR {ledger.amount_due} | Paid INR {ledger.amount_paid} | Due date {formatDate(ledger.due_date)}
            </div>
            <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{ledger.status}</strong></div>
          </div>
        ))}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Today's Menu</div>
        {!todaysMenu && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No menu shared yet.</p>
        )}
        {todaysMenu && (
          <div style={{ display: "grid", gap: 8 }}>
            <div>Breakfast: <strong>{todaysMenu.breakfast || "-"}</strong></div>
            <div>Lunch: <strong>{todaysMenu.lunch || "-"}</strong></div>
            <div>Dinner: <strong>{todaysMenu.dinner || "-"}</strong></div>
            <div style={{ fontSize: 12, color: "var(--warm-gray)" }}>
              {todaysMenu.is_override ? "Today's override menu" : `Planned menu for ${formatDate(todaysMenu.date)}`}
            </div>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Leave Management</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-input" type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-input" type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} />
          </div>
          <div className="form-group full">
            <label className="form-label">Reason</label>
            <textarea className="form-textarea" value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} />
          </div>
        </div>
        <button className="submit-btn" onClick={handleLeaveRequest}>Request Leave</button>
        <div style={{ marginTop: 18 }}>
          {leaves.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No leave requests yet.</p>}
          {leaves.map((leave) => (
            <div key={leave.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
              <div style={{ fontWeight: 700 }}>{formatDate(leave.start_date)} to {formatDate(leave.end_date)}</div>
              {leave.reason && <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>{leave.reason}</div>}
              <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{leave.status}</strong></div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Trust Summary</div>
        <div style={{ display: "grid", gap: 6 }}>
          <div>Trust Score: <strong>{trustSummary?.trust_score ?? overview?.user?.trust_score ?? 0}</strong></div>
          <div>Verification: <strong>{trustSummary?.verification_state ?? overview?.user?.verification_state ?? "unverified"}</strong></div>
          <div>Complaints Against Me: <strong>{trustSummary?.complaints_against_me ?? 0}</strong></div>
          <div>Published Reviews: <strong>{trustSummary?.published_reviews_count ?? 0}</strong></div>
          {trustSummary?.average_review_rating && (
            <div>Average Hostel Rating Seen: <strong>{trustSummary.average_review_rating}</strong></div>
          )}
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">My Profile</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" value={profileForm.age} onChange={(event) => setProfileForm({ ...profileForm, age: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={profileForm.gender} onChange={(event) => setProfileForm({ ...profileForm, gender: event.target.value })}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">College / Company</label>
            <input className="form-input" value={profileForm.college_company} onChange={(event) => setProfileForm({ ...profileForm, college_company: event.target.value })} />
          </div>
          <div className="form-group full">
            <label className="form-label">Emergency Contact</label>
            <input className="form-input" value={profileForm.emergency_contact} onChange={(event) => setProfileForm({ ...profileForm, emergency_contact: event.target.value })} />
          </div>
        </div>
        <button className="submit-btn" onClick={handleProfileSave}>Save Profile</button>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Complaints & Disputes</div>
        {complaints.length === 0 && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No complaints filed against you.</p>
        )}
        {complaints.map((complaint) => (
          <div key={complaint.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
            <div style={{ fontWeight: 700 }}>{complaint.hostel_name}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>{complaint.reason}</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{complaint.status}</strong></div>
            {complaint.admin_decision && (
              <div style={{ marginTop: 6, fontSize: 13 }}>Note: {complaint.admin_decision}</div>
            )}
            {complaint.evidence?.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                Evidence: {complaint.evidence.map((item) => item.file_url).join(", ")}
              </div>
            )}
            {complaint.status !== "resolved" && (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Paste dispute evidence URL"
                  value={complaintEvidence}
                  onChange={(event) => setComplaintEvidence(event.target.value)}
                />
                <button className="submit-btn" onClick={() => handleDisputeSubmit(complaint.id)}>
                  Submit Dispute Evidence
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Reviews</div>
        <div className="form-grid">
          {[
            ["rating_cleanliness", "Cleanliness"],
            ["rating_food", "Food"],
            ["rating_owner", "Owner"],
            ["rating_facilities", "Facilities"],
            ["rating_value", "Value"],
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <select
                className="form-select"
                value={reviewForm[key]}
                onChange={(event) => setReviewForm({ ...reviewForm, [key]: event.target.value })}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={`${key}-${value}`} value={String(value)}>{value}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="form-group full">
            <label className="form-label">Review</label>
            <textarea
              className="form-textarea"
              value={reviewForm.text}
              onChange={(event) => setReviewForm({ ...reviewForm, text: event.target.value })}
            />
          </div>
        </div>
        <button className="submit-btn" onClick={handleReviewSubmit}>Submit Review</button>
        <div style={{ marginTop: 18 }}>
          {reviews.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No reviews submitted yet.</p>}
          {reviews.map((review) => (
            <div key={review.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
              <div style={{ fontWeight: 700 }}>{review.hostel_name}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                Avg Rating: {review.average_rating} | Status: {review.status}
              </div>
              {review.text && <div style={{ marginTop: 8, fontSize: 13 }}>{review.text}</div>}
              {review.owner_reply && <div style={{ marginTop: 8, fontSize: 13 }}>Owner Reply: {review.owner_reply}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">My Requests</div>
        {requestCards.length === 0 && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
            No requests yet.
          </p>
        )}
        {requestCards.map((request) => (
          <div
            key={request.id}
            style={{
              border: "1px solid var(--cream-dark)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 700 }}>{request.hostelName}</div>
            <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
            Room:
            {" "}
            {request.roomType || "Not assigned"}
            {" "}
            -
            {" "}
            Move-in:
            {" "}
            {request.moveInDate ? formatDate(request.moveInDate) : "Not set"}
            </div>
            {request.message && (
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                "{request.message}"
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 12 }}>
              Status:
              {" "}
              <strong>{request.statusLabel}</strong>
            </div>
            {request.statusRaw !== "rejected" && request.statusRaw !== "cancelled" && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUS_STEPS.map((step, index) => {
                  const currentIndex = STATUS_STEPS.findIndex((item) => item.key === request.statusRaw);
                  const active = currentIndex >= index;
                  return (
                    <span
                      key={`${request.id}-${step.key}`}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: active ? "var(--terra)" : "var(--cream-dark)",
                        color: active ? "white" : "var(--warm-gray)",
                        fontWeight: 600,
                      }}
                    >
                      {step.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Notifications</div>
        {loadingNotifications && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>Loading notifications...</p>
        )}
        {!loadingNotifications && notifications.length === 0 && (
          <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
            No notifications yet.
          </p>
        )}
        {!loadingNotifications && notifications.map((note) => (
          <div
            key={note.id}
            style={{
              border: "1px solid var(--cream-dark)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 700 }}>{note.title}</div>
            <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
              {note.body}
            </div>
            <div style={{ fontSize: 12, color: "var(--warm-gray)", marginTop: 6 }}>
              {formatDateTime(note.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
