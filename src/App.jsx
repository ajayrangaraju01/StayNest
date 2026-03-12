import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import Toast from "./components/Toast";
import HomePage from "./pages/HomePage";
import HostelDetail from "./pages/HostelDetail";
import OwnerDashboard from "./pages/OwnerDashboard";
import AuthPage from "./pages/AuthPage";
import {
  createBookingRequest,
  getHostels,
  getOwnerBookingRequests,
  getStudentBookingRequests,
  updateBookingRequestStatus,
} from "./data/appStore";
import { HOSTELS } from "./data/hostels";
import "./styles/staynest.css";

export default function App() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("home");
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [authRole, setAuthRole] = useState("guest");
  const [hostels, setHostels] = useState([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [ownerRequests, setOwnerRequests] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);

  const refreshHostels = async () => {
    setLoadingHostels(true);
    const useAuth = user?.role === "owner" || user?.role === "admin";
    try {
      const data = await getHostels({ useAuth });
      setHostels(data);
    } catch (error) {
      setHostels(HOSTELS);
      showToast("Backend not reachable. Showing sample data.");
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
      const data = await getStudentBookingRequests(user.id);
      setStudentRequests(data);
      setOwnerRequests([]);
    }
  };

  useEffect(() => {
    refreshHostels();
  }, [user]);

  useEffect(() => {
    refreshRequests();
  }, [user, hostels]);
  const publicHostels = useMemo(
    () => hostels.filter((hostel) => hostel.moderationStatus === "approved"),
    [hostels],
  );
  const selectedHostel = useMemo(
    () => hostels.find((hostel) => hostel.id === selectedHostelId) || null,
    [hostels, selectedHostelId],
  );

  const showToast = (message) => setToastMessage(message);

  const openAuth = (role) => {
    setAuthRole(role);
    setPage("auth");
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
    setPage("home");
  };


  const handleBookingRequest = async ({ roomType, moveInDate, message }) => {
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
      roomType,
      roomId: matchingRoom?.id || null,
      moveInDate,
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

  return (
    <div className="app">
      {page !== "owner" && (
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
            <button className="nav-btn" onClick={() => openAuth("guest")}>
              {user?.role === "guest" ? `My Requests (${studentRequests.length})` : "Guest Login"}
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
          onBack={() => setPage("home")}
          onToast={showToast}
          onRequireGuestLogin={() => openAuth("guest")}
          onBookingRequest={handleBookingRequest}
        />
      )}

      {page === "owner" && user?.role === "owner" && (
        <OwnerDashboard
          ownerName={user.name}
          ownerPhone={user.phone}
          ownerRole={user.role}
          ownerStatus={user.status}
          hostels={ownerHostels}
          requests={ownerRequests}
          onRequestStatusChange={handleOwnerRequestAction}
          onBack={() => setPage("home")}
          onToast={showToast}
          onLogout={() => {
            logout();
            setPage("home");
            showToast("Owner logged out.");
          }}
        />
      )}

      {page === "owner" && user?.role !== "owner" && (
        <AuthPage
          defaultRole="owner"
          hideGuest
          onBack={() => setPage("home")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {page === "auth" && (
        <AuthPage defaultRole={authRole} onBack={() => setPage("home")} onSuccess={handleAuthSuccess} />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
