import { useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import Toast from "./components/Toast";
import HomePage from "./pages/HomePage";
import HostelDetail from "./pages/HostelDetail";
import OwnerDashboard from "./pages/OwnerDashboard";
import AuthPage from "./pages/AuthPage";
import {
  addHostelListing,
  createBookingRequest,
  getHostels,
  getOwnerBookingRequests,
  getOwnerHostels,
  getStudentBookingRequests,
  updateBookingRequestStatus,
} from "./data/appStore";
import "./styles/staynest.css";

export default function App() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("home");
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [authRole, setAuthRole] = useState("guest");
  const [hostels, setHostels] = useState(() => getHostels());

  const refreshHostels = () => setHostels(getHostels());
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
    if (session.role === "owner" && session.status === "pending_verification") {
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

  const handleCreateListing = (listingPayload) => {
    if (!user || user.role !== "owner") {
      openAuth("owner");
      return;
    }
    const newHostel = addHostelListing({
      ownerId: user.id,
      ownerName: user.name,
      hostel: listingPayload,
    });
    refreshHostels();
    showToast(`${newHostel.name} submitted for admin approval.`);
  };

  const handleBookingRequest = ({ roomType, moveInDate, message }) => {
    if (!selectedHostel) return;

    if (!user || user.role !== "guest") {
      openAuth("guest");
      return;
    }

    const result = createBookingRequest({
      hostelId: selectedHostel.id,
      hostelName: selectedHostel.name,
      studentId: user.id,
      studentName: user.name,
      roomType,
      moveInDate,
      message,
    });

    if (!result.ok) {
      showToast(result.error);
      return;
    }

    showToast("Join request sent to owner.");
  };

  const handleOwnerRequestAction = (requestId, status) => {
    const result = updateBookingRequestStatus({ requestId, status });
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    refreshHostels();
    showToast(`Request ${status}.`);
  };

  const ownerHostels = user?.role === "owner" ? getOwnerHostels(user.id) : [];
  const ownerRequests = user?.role === "owner" ? getOwnerBookingRequests(user.id) : [];
  const studentRequests = user?.role === "guest" ? getStudentBookingRequests(user.id) : [];

  return (
    <div className="app">
      {page !== "owner" && (
        <nav className="nav">
          <div className="nav-logo" onClick={() => setPage("home")}>
            Stay
            <span>Nest</span>
          </div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => setPage("home")}>
              Browse Hostels
            </button>
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
          ownerStatus={user.status}
          hostels={ownerHostels}
          requests={ownerRequests}
          onCreateListing={handleCreateListing}
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
        <AuthPage defaultRole="owner" onBack={() => setPage("home")} onSuccess={handleAuthSuccess} />
      )}

      {page === "auth" && (
        <AuthPage defaultRole={authRole} onBack={() => setPage("home")} onSuccess={handleAuthSuccess} />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
