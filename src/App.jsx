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

const NAV_STATE_KEY = "staynest_nav_state";

function readSavedNavState() {
  try {
    const raw = localStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
  const isHandlingPopState = useRef(false);
  const savedNavState = useMemo(() => readSavedNavState(), []);
  const [page, setPage] = useState(() => savedNavState?.page || localStorage.getItem("staynest_last_page") || "home");
  const [selectedHostelId, setSelectedHostelId] = useState(savedNavState?.selectedHostelId ?? null);
  const [toastMessage, setToastMessage] = useState(null);
  const [authRole, setAuthRole] = useState(savedNavState?.authRole || "guest");
  const [hostels, setHostels] = useState([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [ownerRequests, setOwnerRequests] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [ownerInitialTab, setOwnerInitialTab] = useState(savedNavState?.ownerInitialTab || "overview");
  const [adminInitialTab, setAdminInitialTab] = useState(savedNavState?.adminInitialTab || "overview");
  const [studentInitialTab, setStudentInitialTab] = useState(savedNavState?.studentInitialTab || "overview");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const bellRef = useRef(null);

  const navigateTo = (nextPage, options = {}) => {
    if (options.selectedHostelId !== undefined) {
      setSelectedHostelId(options.selectedHostelId);
    }
    setPage(nextPage);
  };

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
      setPage((current) => (current === "auth" ? "owner" : current));
    }
    if (user?.role === "guest") {
      setPage((current) => (current === "auth" ? "student" : current));
    }
    if (user?.role === "admin") {
      setPage((current) => (current === "auth" ? "admin" : current));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("staynest_last_page", page);
  }, [page]);

  useEffect(() => {
    localStorage.setItem(
      NAV_STATE_KEY,
      JSON.stringify({
        page,
        authRole,
        selectedHostelId,
        ownerInitialTab,
        adminInitialTab,
        studentInitialTab,
      }),
    );
  }, [page, authRole, selectedHostelId, ownerInitialTab, adminInitialTab, studentInitialTab]);

  useEffect(() => {
    window.history.replaceState({
      page,
      authRole,
      selectedHostelId,
      ownerInitialTab,
      adminInitialTab,
      studentInitialTab,
    }, "");
  }, []);

  useEffect(() => {
    const nextState = { page, authRole, selectedHostelId, ownerInitialTab, adminInitialTab, studentInitialTab };
    if (isHandlingPopState.current) {
      isHandlingPopState.current = false;
      window.history.replaceState(nextState, "");
      return;
    }
    window.history.pushState(nextState, "");
    setShowMobileMenu(false);
  }, [page, authRole, selectedHostelId, ownerInitialTab, adminInitialTab, studentInitialTab]);

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (!state) {
        navigateTo("home", { selectedHostelId: null });
        return;
      }
      isHandlingPopState.current = true;
      setAuthRole(state.authRole || "guest");
      setSelectedHostelId(state.selectedHostelId ?? null);
      setOwnerInitialTab(state.ownerInitialTab || "overview");
      setAdminInitialTab(state.adminInitialTab || "overview");
      setStudentInitialTab(state.studentInitialTab || "overview");
      setPage(state.page || "home");
      setShowMobileMenu(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(() => {
      refreshNotifications();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [user]);

  const openAuth = (role) => {
    setAuthRole(role);
    navigateTo("auth");
  };

  const handleOwnerTabChange = (tab) => {
    setOwnerInitialTab((current) => (current === (tab || "overview") ? current : (tab || "overview")));
  };

  const handleAdminTabChange = (tab) => {
    setAdminInitialTab((current) => (current === (tab || "overview") ? current : (tab || "overview")));
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
      navigateTo("owner");
      return;
    }

    showToast(`Welcome, ${session.name}!`);
    if (session.role === "owner") {
      navigateTo("owner");
      return;
    }
    if (session.role === "admin") {
      navigateTo("admin");
      return;
    }
    if (session.role === "guest") {
      navigateTo("student");
      return;
    }
    navigateTo("home");
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
    navigateTo(itemId);
  };

  const handleNotificationClick = (note) => {
    setShowNotifications(false);
    if (seenKey) {
      localStorage.setItem(seenKey, new Date().toISOString());
    }

    if (user?.role === "owner") {
      navigateTo("owner");
      if (note.type === "booking_request") setOwnerInitialTab("enquiries");
      else if (note.type === "leave_request") setOwnerInitialTab("leaves");
      else if (note.type === "review_submitted") setOwnerInitialTab("reviews");
      else setOwnerInitialTab("overview");
      return;
    }

    if (user?.role === "guest") {
      navigateTo("student");
      if (note.type === "complaint_created" || note.type === "complaint_status") setStudentInitialTab("complaints");
      else if (note.type === "booking_status" || note.type === "walkin_checkin") setStudentInitialTab("overview");
      else setStudentInitialTab("overview");
      return;
    }

    if (user?.role === "admin") {
      navigateTo("admin");
      if ((note.type || "").includes("complaint")) setAdminInitialTab("complaints");
      else if ((note.type || "").includes("review")) setAdminInitialTab("reviews");
      else setAdminInitialTab("overview");
    }
  };

  const mobileMenuItems = useMemo(() => {
    if (!user) {
      return [
        { id: "home", label: "Browse Hostels", action: () => navigateTo("home", { selectedHostelId: null }) },
        { id: "auth-guest", label: "Guest Login", action: () => openAuth("guest") },
        { id: "auth-owner", label: "Owner Login", action: () => openAuth("owner") },
        { id: "admin", label: "Admin Login", action: () => navigateTo("admin") },
      ];
    }

    const items = [{ id: "home", label: "Browse Hostels", action: () => navigateTo("home", { selectedHostelId: null }) }];
    if (user.role === "guest") items.push({ id: "student", label: "My Stay", action: () => navigateTo("student") });
    if (user.role === "owner") items.push({ id: "owner", label: "Owner Dashboard", action: () => navigateTo("owner") });
    if (user.role === "admin") items.push({ id: "admin", label: "Admin Dashboard", action: () => navigateTo("admin") });
    items.push({
      id: "logout",
      label: "Logout",
      action: () => {
        logout();
        showToast("Logged out successfully.");
        navigateTo("home", { selectedHostelId: null });
      },
    });
    return items;
  }, [user]);

  const mobileTitle = useMemo(() => {
    if (page === "detail" && selectedHostel) return selectedHostel.name;
    if (page === "student") return "My Stay";
    if (page === "owner") return "Owner Dashboard";
    if (page === "admin") return "Admin Dashboard";
    if (page === "auth") {
      if (authRole === "owner") return "Owner Access";
      if (authRole === "admin") return "Admin Access";
      return "Guest Access";
    }
    return "Browse Hostels";
  }, [page, selectedHostel, authRole]);

  return (
    <div className="app app-mobile-shell">
      <div className="mobile-topbar">
        <button
          className="mobile-topbar-brand"
          type="button"
          onClick={() => navigateTo("home", { selectedHostelId: null })}
        >
          Stay<span>Nest</span>
        </button>
        <div className="mobile-topbar-title">{mobileTitle}</div>
        <div className="mobile-topbar-actions">
          {user && (
            <button className="mobile-icon-btn" type="button" onClick={handleNotificationToggle} aria-label="Open notifications">
              Updates
              {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
          )}
          <button className="mobile-icon-btn" type="button" onClick={() => setShowMobileMenu(true)} aria-label="Open menu">
            Menu
          </button>
        </div>
      </div>
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

      {showMobileMenu && (
        <div className="mobile-menu-backdrop" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-menu-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-header">
              <strong>{user?.name || "StayNest"}</strong>
              <button className="back-btn" type="button" onClick={() => setShowMobileMenu(false)}>
                Close
              </button>
            </div>
            <div className="mobile-menu-list">
              {mobileMenuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="mobile-menu-item"
                  onClick={item.action}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {page !== "owner" && page !== "admin" && (
        <nav className="nav">
          <div className="nav-logo" onClick={() => navigateTo("home", { selectedHostelId: null })}>
            Stay
            <span>Nest</span>
          </div>
          <div className="nav-links">
            {user?.role !== "owner" && (
              <button className="nav-btn" onClick={() => navigateTo("home", { selectedHostelId: null })}>
                Browse Hostels
              </button>
            )}
            {user?.role === "admin" && (
              <button className="nav-btn" onClick={() => navigateTo("admin")}>
                Admin Dashboard
              </button>
            )}
            <button
              className="nav-btn"
              onClick={() => {
                if (user?.role === "guest") {
                  navigateTo("student");
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
                  navigateTo("owner");
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
                  navigateTo("admin");
                  return;
                }
                navigateTo("admin");
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
                  navigateTo("home", { selectedHostelId: null });
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
            navigateTo("detail", { selectedHostelId: hostel.id });
          }}
          onOwnerClick={() => openAuth("owner")}
          isLoading={loadingHostels}
        />
      )}

      {page === "detail" && selectedHostel && (
        <HostelDetail
          hostel={selectedHostel}
          user={user}
          onBack={() => navigateTo(user?.role === "guest" ? "student" : "home")}
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
            navigateTo("detail", { selectedHostelId: hostel.id });
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
          onBack={() => navigateTo("home")}
          onTabChange={handleOwnerTabChange}
          onToast={showToast}
          onRefreshHostels={refreshHostels}
          onLogout={() => {
            logout();
            navigateTo("home", { selectedHostelId: null });
            showToast("Owner logged out.");
          }}
        />
      )}

      {page === "admin" && user?.role === "admin" && (
        <AdminDashboard
          initialTab={adminInitialTab}
          adminName={user.name}
          onTabChange={handleAdminTabChange}
          onToast={showToast}
          onLogout={() => {
            logout();
            navigateTo("home", { selectedHostelId: null });
            showToast("Admin logged out.");
          }}
        />
      )}

      {page === "owner" && user?.role !== "owner" && (
        <AuthPage
          defaultRole="owner"
          lockRole
          onBack={() => navigateTo("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "admin" && user?.role !== "admin" && (
        <AuthPage
          defaultRole="admin"
          lockRole
          onBack={() => navigateTo("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "auth" && (
        <AuthPage
          defaultRole={authRole}
          hideOwner={authRole === "guest"}
          onBack={() => navigateTo("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

    </div>
  );
}
