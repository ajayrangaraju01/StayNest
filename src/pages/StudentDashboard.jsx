import { useEffect, useMemo, useState } from "react";
import HostelCard from "../components/HostelCard";
import { fetchNotifications, fetchStudentOverview } from "../api/staynestApi";

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
    return new Date(value).toLocaleString();
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

export default function StudentDashboard({ hostels, onHostelClick, requests = [] }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      try {
        const data = await fetchStudentOverview();
        setOverview(data);
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
                {request.moveInDate || "Not set"}
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

  return (
    <div className="section">
      <div className="section-title">My Hostel/PG</div>
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
            <div>Due Date: <strong>{upcomingFee.due_date}</strong></div>
            {dueCountdown && <div style={{ fontSize: 13, color: "var(--warm-gray)" }}>{dueCountdown}</div>}
            <div>Amount Due: <strong>INR {upcomingFee.amount_due}</strong></div>
            <div>Amount Paid: <strong>INR {upcomingFee.amount_paid}</strong></div>
            <div>Status: <strong>{upcomingFee.status}</strong></div>
          </div>
        )}
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
            {request.moveInDate || "Not set"}
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
