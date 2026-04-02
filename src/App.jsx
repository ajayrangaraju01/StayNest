import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/useAuth";
import Toast from "./components/Toast";
import AdminDashboard from "./pages/AdminDashboard";
import HomePage from "./pages/HomePage";
import HostelDetail from "./pages/HostelDetail";
import OwnerDashboard from "./pages/OwnerDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AuthPage from "./pages/AuthPage";
import { fetchNotifications } from "./api/staynestApi";
import {
  createBookingRequest,
  getHostels,
  getOwnerBookingRequests,
  getStudentBookingRequests,
  updateBookingRequestStatus,
} from "./data/appStore";
import "./styles/staynest.css";

function formatNotificationTime(value) {
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

export default function App() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("staynest_last_page");
    return saved || "home";
  });
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [authRole, setAuthRole] = useState("guest");
  const [hostels, setHostels] = useState([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [ownerRequests, setOwnerRequests] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [ownerInitialTab, setOwnerInitialTab] = useState("overview");
  const [adminInitialTab, setAdminInitialTab] = useState("overview");
  const [studentInitialTab, setStudentInitialTab] = useState("overview");
  const bellRef = useRef(null);

  const refreshHostels = async () => {
    setLoadingHostels(true);
    const useAuth = user?.role === "owner" || user?.role === "admin";
    try {
      const data = await getHostels({ useAuth });
      setHostels(data);
    } catch (error) {
      setHostels([]);
      showToast(error.message || "Backend not reachable.");
    } finally {
      setLoadingHostels(false);
    }
  };

  const refreshRequests = async () => {
    if (!user) {
      setOwnerRequests([]);
      setStudentRequests([]);
      return;
    }

    if (user.role === "owner") {
      const data = await getOwnerBookingRequests(user.id, hostels);
      setOwnerRequests(data);
      setStudentRequests([]);
      return;
    }

    if (user.role === "guest") {
      const data = await getStudentBookingRequests(user.id, hostels);
      setStudentRequests(data);
      setOwnerRequests([]);
    }
  };

  const getNotificationSeenKey = () => {
    if (!user?.id) return null;
    return `staynest_notifications_seen_${user.id}`;
  };

  const refreshNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const data = await fetchNotifications();
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    refreshHostels();
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [user]);

  useEffect(() => {
    if (page === "home" || page === "student") {
      refreshHostels();
    }
  }, [page]);

  useEffect(() => {
    if (!showNotifications) return undefined;
    const handleClickOutside = (event) => {
      if (!bellRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    refreshRequests();
  }, [user, hostels]);
  const publicHostels = useMemo(() => {
    return hostels.filter((hostel) => hostel.moderationStatus === "approved");
  }, [hostels]);
  const selectedHostel = useMemo(
    () => hostels.find((hostel) => hostel.id === selectedHostelId) || null,
    [hostels, selectedHostelId],
  );

  const showToast = (message) => setToastMessage(message);

  useEffect(() => {
    if (user?.role === "owner") {
      setPage("owner");
    }
    if (user?.role === "guest") {
      setPage("student");
    }
    if (user?.role === "admin") {
      setPage("admin");
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("staynest_last_page", page);
  }, [page]);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(() => {
      refreshNotifications();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [user]);

  const openAuth = (role) => {
    setAuthRole(role);
    setPage("auth");
  };

  const seenKey = getNotificationSeenKey();
  const lastSeenAt = seenKey ? localStorage.getItem(seenKey) : null;
  const unreadCount = notifications.filter((note) => {
    if (!lastSeenAt) return true;
    return new Date(note.created_at).getTime() > new Date(lastSeenAt).getTime();
  }).length;

  const handleNotificationToggle = () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    if (nextOpen && seenKey) {
      localStorage.setItem(seenKey, new Date().toISOString());
    }
  };

  const handleAuthSuccess = (session) => {
    if (session.role === "owner" && session.status === "pending") {
      showToast("Owner account created. Verification pending admin approval.");
      setPage("owner");
      return;
    }

    showToast(`Welcome, ${session.name}!`);
    if (session.role === "owner") {
      setPage("owner");
      return;
    }
    if (session.role === "admin") {
      setPage("admin");
      return;
    }
    if (session.role === "guest") {
      setPage("student");
      return;
    }
    setPage("home");
  };


  const handleBookingRequest = async ({
    roomType,
    moveInDate,
    moveOutDate,
    stayType,
    totalDays,
    message,
  }) => {
    if (!selectedHostel) return;

    if (!user || user.role !== "guest") {
      openAuth("guest");
      return;
    }

    const matchingRoom = selectedHostel.rooms.find((room) => room.type === roomType);
    const result = await createBookingRequest({
      hostelId: selectedHostel.id,
      hostelName: selectedHostel.name,
      studentId: user.id,
      studentName: user.name,
      studentPhone: user.phone,
      roomType,
      roomId: matchingRoom?.id || null,
      moveInDate,
      moveOutDate,
      stayType,
      totalDays,
      message,
    });

    if (!result.ok) {
      showToast(result.error);
      return;
    }

    showToast("Join request sent to owner.");
    refreshRequests();
  };

  const handleOwnerRequestAction = async (requestId, status) => {
    const confirmed = window.confirm(`Are you sure you want to mark this request as ${status}?`);
    if (!confirmed) return;
    const result = await updateBookingRequestStatus({ requestId, status });
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    refreshHostels();
    refreshRequests();
    showToast(`Request ${status}.`);
  };

  const ownerHostels = user?.role === "owner"
    ? hostels.filter((hostel) => hostel.ownerId === user.id)
    : [];

  const mobileNavItems = useMemo(() => {
    if (user?.role === "guest") {
      return [
        { id: "home", label: "Browse" },
        { id: "student", label: "My Stay" },
      ];
    }
    if (user?.role === "owner") {
      return [
        { id: "owner", label: "Overview" },
        { id: "home", label: "Browse" },
      ];
    }
    if (user?.role === "admin") {
      return [
        { id: "admin", label: "Admin" },
        { id: "home", label: "Browse" },
      ];
    }
    return [
      { id: "home", label: "Home" },
      { id: "auth-guest", label: "Guest" },
      { id: "auth-owner", label: "Owner" },
    ];
  }, [user]);

  const handleMobileNav = (itemId) => {
    if (itemId === "auth-guest") {
      openAuth("guest");
      return;
    }
    if (itemId === "auth-owner") {
      openAuth("owner");
      return;
    }
    setPage(itemId);
  };

  const handleNotificationClick = (note) => {
    setShowNotifications(false);
    if (seenKey) {
      localStorage.setItem(seenKey, new Date().toISOString());
    }

    if (user?.role === "owner") {
      setPage("owner");
      if (note.type === "booking_request") setOwnerInitialTab("enquiries");
      else if (note.type === "leave_request") setOwnerInitialTab("leaves");
      else if (note.type === "review_submitted") setOwnerInitialTab("reviews");
      else setOwnerInitialTab("overview");
      return;
    }

    if (user?.role === "guest") {
      setPage("student");
      if (note.type === "complaint_created" || note.type === "complaint_status") setStudentInitialTab("complaints");
      else if (note.type === "booking_status" || note.type === "walkin_checkin") setStudentInitialTab("overview");
      else setStudentInitialTab("overview");
      return;
    }

    if (user?.role === "admin") {
      setPage("admin");
      if ((note.type || "").includes("complaint")) setAdminInitialTab("complaints");
      else if ((note.type || "").includes("review")) setAdminInitialTab("reviews");
      else setAdminInitialTab("overview");
    }
  };

  return (
    <div className={`app${mobileNavItems.length ? " app-mobile-shell" : ""}`}>
      {user && (
        <div className="notification-shell" ref={bellRef}>
          <button className="notification-bell" onClick={handleNotificationToggle} aria-label="Open notifications">
            <span className="notification-bell-icon">🔔</span>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <div>
                  <strong>Updates</strong>
                  <div className="notification-panel-subtitle">Requests, approvals, payments and other activity</div>
                </div>
                <button className="notification-refresh-btn" onClick={refreshNotifications}>Refresh</button>
              </div>
              <div className="notification-panel-list">
                {notifications.length === 0 && (
                  <div className="notification-empty">No updates yet.</div>
                )}
                {notifications.slice(0, 12).map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="notification-item notification-item-button"
                    onClick={() => handleNotificationClick(note)}
                  >
                    <div className="notification-item-title">{note.title}</div>
                    <div className="notification-item-body">{note.body}</div>
                    <div className="notification-item-meta">{formatNotificationTime(note.created_at)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {page !== "owner" && page !== "admin" && (
        <nav className="nav">
          <div className="nav-logo" onClick={() => setPage("home")}>
            Stay
            <span>Nest</span>
          </div>
          <div className="nav-links">
            {user?.role !== "owner" && (
              <button className="nav-btn" onClick={() => setPage("home")}>
                Browse Hostels
              </button>
            )}
            {user?.role === "admin" && (
              <button className="nav-btn" onClick={() => setPage("admin")}>
                Admin Dashboard
              </button>
            )}
            <button
              className="nav-btn"
              onClick={() => {
                if (user?.role === "guest") {
                  setPage("student");
                  return;
                }
                openAuth("guest");
              }}
            >
              {user?.role === "guest" ? "My Hostel/PG" : "Guest Login"}
            </button>
            <button
              className="nav-btn"
              onClick={() => {
                if (user?.role === "owner") {
                  setPage("owner");
                  return;
                }
                openAuth("owner");
              }}
            >
              {user?.role === "owner" ? "Owner Dashboard" : "Owner Login"}
            </button>
            <button
              className="nav-btn"
              onClick={() => {
                if (user?.role === "admin") {
                  setPage("admin");
                  return;
                }
                setPage("admin");
              }}
            >
              {user?.role === "admin" ? "Admin Dashboard" : "Admin Login"}
            </button>
            {user ? (
              <button
                className="nav-btn primary"
                onClick={() => {
                  logout();
                  showToast("Logged out successfully.");
                  setPage("home");
                }}
              >
                Logout
              </button>
            ) : (
              <button className="nav-btn primary" onClick={() => openAuth("owner")}>
                List Your Hostel
              </button>
            )}
          </div>
        </nav>
      )}

      {page === "home" && (
        <HomePage
          hostels={publicHostels}
          onSearch={() => {}}
          onHostelClick={(hostel) => {
            setSelectedHostelId(hostel.id);
            setPage("detail");
          }}
          onOwnerClick={() => openAuth("owner")}
          isLoading={loadingHostels}
        />
      )}

      {page === "detail" && selectedHostel && (
        <HostelDetail
          hostel={selectedHostel}
          user={user}
          onBack={() => setPage(user?.role === "guest" ? "student" : "home")}
          onToast={showToast}
          onRequireStudentLogin={() => openAuth("guest")}
          onBookingRequest={handleBookingRequest}
        />
      )}

      {page === "student" && user?.role === "guest" && (
        <StudentDashboard
          initialTab={studentInitialTab}
          hostels={publicHostels}
          requests={studentRequests}
          onToast={showToast}
          onHostelClick={(hostel) => {
            setSelectedHostelId(hostel.id);
            setPage("detail");
          }}
        />
      )}

      {page === "owner" && user?.role === "owner" && (
        <OwnerDashboard
          initialTab={ownerInitialTab}
          ownerName={user.name}
          ownerPhone={user.phone}
          ownerRole={user.role}
          ownerStatus={user.status}
          hostels={ownerHostels}
          requests={ownerRequests}
          onRequestStatusChange={handleOwnerRequestAction}
          onBack={() => setPage("home")}
          onToast={showToast}
          onRefreshHostels={refreshHostels}
          onLogout={() => {
            logout();
            setPage("home");
            showToast("Owner logged out.");
          }}
        />
      )}

      {page === "admin" && user?.role === "admin" && (
        <AdminDashboard
          initialTab={adminInitialTab}
          adminName={user.name}
          onToast={showToast}
          onLogout={() => {
            logout();
            setPage("home");
            showToast("Admin logged out.");
          }}
        />
      )}

      {page === "owner" && user?.role !== "owner" && (
        <AuthPage
          defaultRole="owner"
          lockRole
          onBack={() => setPage("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "admin" && user?.role !== "admin" && (
        <AuthPage
          defaultRole="admin"
          lockRole
          onBack={() => setPage("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "auth" && (
        <AuthPage
          defaultRole={authRole}
          hideOwner={authRole === "guest"}
          onBack={() => setPage("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div className="mobile-bottom-nav">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            className={`mobile-bottom-nav-item${
              (item.id === page || (item.id === "auth-guest" && page === "auth" && authRole === "guest") || (item.id === "auth-owner" && page === "auth" && authRole === "owner"))
                ? " active"
                : ""
            }`}
            onClick={() => handleMobileNav(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
