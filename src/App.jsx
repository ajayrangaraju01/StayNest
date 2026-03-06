import { useState } from "react";
import { useAuth } from "./auth/useAuth";
import Toast from "./components/Toast";
import HomePage from "./pages/HomePage";
import HostelDetail from "./pages/HostelDetail";
import OwnerDashboard from "./pages/OwnerDashboard";
import AuthPage from "./pages/AuthPage";
import "./styles/staynest.css";

export default function App() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("home");
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [authRole, setAuthRole] = useState("guest");

  const showToast = (message) => setToastMessage(message);

  const openAuth = (role) => {
    setAuthRole(role);
    setPage("auth");
  };

  const handleAuthSuccess = (session) => {
    showToast(`Welcome, ${session.name}!`);
    if (session.role === "owner") {
      setPage("owner");
      return;
    }
    setPage("home");
  };

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
              {user?.role === "guest" ? `Hi, ${user.name}` : "Guest Login"}
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
          onSearch={() => {}}
          onHostelClick={(hostel) => {
            setSelectedHostel(hostel);
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
        />
      )}

      {page === "owner" && user?.role === "owner" && (
        <OwnerDashboard
          ownerName={user.name}
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
