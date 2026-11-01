import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/useAuth";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminDashboard from "./pages/AdminDashboard";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
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

function mapGuestGenderToAllowedHostelGenders(gender) {
  if (gender === "male") return ["Boys", "Co-Live"];
  if (gender === "female") return ["Girls", "Co-Live"];
  return ["Co-Live"];
}

export const ADMIN_HASH_ROUTE = "admin";

const ROUTE_SLUGS = {
  landing: "",
  home: "explore",
  detail: "stay-detail",
  student: "resident-portal",
  owner: "owner-portal",
  admin: "admin",
  auth_guest: "tenant-login",
  auth_owner: "owner-login",
  auth_admin: "admin",
};

function getSlugForPage(p, role) {
  if (p === "admin" || (p === "auth" && role === "admin")) {
    return "admin";
  }
  if (p === "owner" || (p === "auth" && role === "owner")) {
    return "owner-login";
  }
  if (p === "student" || (p === "auth" && role === "guest")) {
    return "tenant-login";
  }
  if (p === "home") return "explore";
  return ROUTE_SLUGS[p] || "";
}

function parseUrlRoute() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.replace(/\/+$/, "");
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");

  // Hidden admin page accessible at /admin or #/admin
  if (path === "/admin" || hash === "admin" || hash === "admin/") {
    return { page: "admin", authRole: "admin" };
  }

  // Tenant routes
  if (hash === "tenant-login" || path === "/tenant-login" || hash === "login" || path === "/login") {
    return { page: "auth", authRole: "guest" };
  }
  if (hash === "resident-portal" || path === "/resident-portal" || hash === "tenant" || path === "/tenant") {
    return { page: "student", authRole: "guest" };
  }

  // Owner routes
  if (hash === "owner-login" || path === "/owner-login") {
    return { page: "auth", authRole: "owner" };
  }
  if (hash === "owner-portal" || path === "/owner-portal" || hash === "owner" || path === "/owner") {
    return { page: "owner", authRole: "owner" };
  }

  if (hash === "explore" || path === "/explore") {
    return { page: "home" };
  }
  return null;
}

export default function App() {
  const { user, logout } = useAuth();
  const isHandlingPopState = useRef(false);
  const urlRoute = useMemo(() => parseUrlRoute(), []);
  const savedNavState = useMemo(() => readSavedNavState(), []);
  const [page, setPage] = useState(() => {
    if (urlRoute) return urlRoute.page;
    return savedNavState?.page || localStorage.getItem("staynest_last_page") || "landing";
  });
  const [selectedHostelId, setSelectedHostelId] = useState(savedNavState?.selectedHostelId ?? null);
  const [toastMessage, setToastMessage] = useState(null);
  const [authRole, setAuthRole] = useState(() => {
    if (urlRoute?.authRole) return urlRoute.authRole;
    return savedNavState?.authRole || "guest";
  });

  useEffect(() => {
    const handleHash = () => {
      const route = parseUrlRoute();
      if (route) {
        setPage(route.page);
        if (route.authRole) setAuthRole(route.authRole);
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Secret key combination: Ctrl + Shift + A (or Cmd + Shift + A) opens Staff Compliance Portal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setAuthRole("admin");
        setPage("auth");
        showToast("Staff Compliance Portal opened.");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
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
    const slug = getSlugForPage(nextPage, authRole);
    const nextUrl = slug ? `/#/${slug}` : "/#/";
    if (window.location.hash !== (slug ? `#/${slug}` : "#/")) {
      window.history.pushState(
        { page: nextPage, authRole, selectedHostelId: options.selectedHostelId ?? selectedHostelId },
        "",
        nextUrl
      );
    }
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
    const approvedHostels = hostels.filter((hostel) => hostel.moderationStatus === "approved");
    if (user?.role !== "guest" || !user.gender) {
      return approvedHostels;
    }

    const allowedGenders = mapGuestGenderToAllowedHostelGenders(user.gender);
    return approvedHostels.filter((hostel) => allowedGenders.includes(hostel.gender));
  }, [hostels, user]);
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
    const slug = getSlugForPage(page, authRole);
    const targetUrl = slug ? `/#/${slug}` : "/#/";
    window.history.replaceState({
      page,
      authRole,
      selectedHostelId,
      ownerInitialTab,
      adminInitialTab,
      studentInitialTab,
    }, "", targetUrl);
  }, []);

  useEffect(() => {
    const nextState = { page, authRole, selectedHostelId, ownerInitialTab, adminInitialTab, studentInitialTab };
    if (isHandlingPopState.current) {
      isHandlingPopState.current = false;
      return;
    }
    const slug = getSlugForPage(page, authRole);
    const targetUrl = slug ? `/#/${slug}` : "/#/";
    if (window.location.hash !== (slug ? `#/${slug}` : "#/")) {
      window.history.pushState(nextState, "", targetUrl);
    }
    setShowMobileMenu(false);
  }, [page, authRole, selectedHostelId]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (page === "owner" && ownerInitialTab !== "overview") {
        const fallbackState = {
          page: "owner",
          authRole,
          selectedHostelId,
          ownerInitialTab: "overview",
          adminInitialTab,
          studentInitialTab,
        };
        setOwnerInitialTab("overview");
        setShowMobileMenu(false);
        window.history.pushState(fallbackState, "");
        return;
      }

      if (page === "admin" && adminInitialTab !== "overview") {
        const fallbackState = {
          page: "admin",
          authRole,
          selectedHostelId,
          ownerInitialTab,
          adminInitialTab: "overview",
          studentInitialTab,
        };
        setAdminInitialTab("overview");
        setShowMobileMenu(false);
        window.history.pushState(fallbackState, "");
        return;
      }

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
  }, [page, authRole, selectedHostelId, ownerInitialTab, adminInitialTab, studentInitialTab]);

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
      return result;
    }

    showToast("Join request sent to owner.");
    refreshRequests();
    return result;
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
        { id: "landing", label: "About StayNest", action: () => navigateTo("landing", { selectedHostelId: null }) },
        { id: "home", label: "Browse Hostels", action: () => navigateTo("home", { selectedHostelId: null }) },
        { id: "auth-guest", label: "Tenant Login", action: () => openAuth("guest") },
        { id: "auth-owner", label: "Owner Login", action: () => openAuth("owner") },
      ];
    }

    const items = [
      { id: "landing", label: "Home", action: () => navigateTo("landing", { selectedHostelId: null }) },
      { id: "home", label: "Browse Hostels", action: () => navigateTo("home", { selectedHostelId: null }) },
    ];
    if (user.role === "guest") items.push({ id: "student", label: "Tenant Portal", action: () => navigateTo("student") });
    if (user.role === "owner") items.push({ id: "owner", label: "Owner Dashboard", action: () => navigateTo("owner") });
    if (user.role === "admin") items.push({ id: "admin", label: "Security & Compliance", action: () => navigateTo("admin") });
    items.push({
      id: "logout",
      label: "Logout",
      action: () => {
        logout();
        showToast("Logged out successfully.");
        navigateTo("landing", { selectedHostelId: null });
      },
    });
    return items;
  }, [user]);

  const mobileTitle = useMemo(() => {
    if (page === "landing") return "StayNest";
    if (page === "detail" && selectedHostel) return selectedHostel.name;
    if (page === "student") return "Tenant Portal";
    if (page === "owner") return "Owner Dashboard";
    if (page === "admin") return "Security & Compliance";
    if (page === "auth") {
      if (authRole === "owner") return "Owner Access";
      if (authRole === "admin") return "Staff Access";
      return "Tenant Access";
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
          <div className="nav-logo" onClick={() => navigateTo("landing", { selectedHostelId: null })}>
            Stay
            <span>Nest</span>
          </div>
          <div className="nav-links">
            <button
              className={`nav-btn${page === "landing" ? " active" : ""}`}
              onClick={() => navigateTo("landing", { selectedHostelId: null })}
            >
              Home
            </button>
            <button
              className={`nav-btn${page === "home" ? " active" : ""}`}
              onClick={() => navigateTo("home", { selectedHostelId: null })}
            >
              Explore Stays
            </button>
            {user?.role === "admin" && (
              <button className="nav-btn" onClick={() => navigateTo("admin")}>
                Security &amp; Compliance
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
              {user?.role === "guest" ? "Tenant Portal" : "Tenant Login"}
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
            {user ? (
              <button
                className="nav-btn primary"
                onClick={() => {
                  logout();
                  showToast("Logged out successfully.");
                  navigateTo("landing", { selectedHostelId: null });
                }}
              >
                Logout
              </button>
            ) : (
              <button className="nav-btn primary" onClick={() => openAuth("owner")}>
                List Property
              </button>
            )}
          </div>
        </nav>
      )}

      {page === "landing" && (
        <LandingPage
          hostels={publicHostels}
          onNavigateTo={navigateTo}
          onOpenAuth={openAuth}
          onHostelClick={(hostel) => {
            navigateTo("detail", { selectedHostelId: hostel.id });
          }}
        />
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
          studentRequests={studentRequests}
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
        <ErrorBoundary>
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
        </ErrorBoundary>
      )}

      {page === "admin" && user?.role === "admin" && (
        <ErrorBoundary>
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
        </ErrorBoundary>
      )}

      {page === "student" && user?.role !== "guest" && (
        <AuthPage
          defaultRole="guest"
          lockRole
          onBack={() => navigateTo("landing")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "owner" && user?.role !== "owner" && (
        <AuthPage
          defaultRole="owner"
          lockRole
          onBack={() => navigateTo("landing")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "admin" && user?.role !== "admin" && (
        <AuthPage
          defaultRole="admin"
          lockRole
          onBack={() => navigateTo("landing")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "auth" && (
        <AuthPage
          defaultRole={authRole}
          lockRole
          onBack={() => navigateTo(authRole === "admin" ? "landing" : "home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

    </div>
  );
}
