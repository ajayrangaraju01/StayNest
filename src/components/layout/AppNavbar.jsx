import { useMemo } from "react";

export function formatNotificationTime(value) {
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

export function mapGuestGenderToAllowedHostelGenders(gender) {
  if (gender === "male") return ["Boys", "Co-Live"];
  if (gender === "female") return ["Girls", "Co-Live"];
  return ["Co-Live"];
}

export default function AppNavbar({
  user,
  page,
  authRole,
  selectedHostel,
  unreadCount,
  showNotifications,
  notifications,
  bellRef,
  onNotificationToggle,
  onNotificationClick,
  onRefreshNotifications,
  onOpenMobileMenu,
  onNavigateHome,
  onOpenAuth,
  onNavigateTo,
  onLogout,
}) {
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
    <>
      <div className="mobile-topbar">
        <button
          className="mobile-topbar-brand"
          type="button"
          onClick={onNavigateHome}
        >
          Stay<span>Nest</span>
        </button>
        <div className="mobile-topbar-title">{mobileTitle}</div>
        <div className="mobile-topbar-actions">
          {user && (
            <button
              className="mobile-icon-btn"
              type="button"
              onClick={onNotificationToggle}
              aria-label="Open notifications"
            >
              Updates
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            className="mobile-icon-btn"
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>
      </div>

      {user && (
        <div className="notification-shell" ref={bellRef}>
          <button
            className="notification-bell"
            onClick={onNotificationToggle}
            aria-label="Open notifications"
          >
            <span className="notification-bell-icon">🔔</span>
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <div>
                  <strong>Updates</strong>
                  <div className="notification-panel-subtitle">
                    Requests, approvals, payments and other activity
                  </div>
                </div>
                <button
                  className="notification-refresh-btn"
                  onClick={onRefreshNotifications}
                >
                  Refresh
                </button>
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
                    onClick={() => onNotificationClick(note)}
                  >
                    <div className="notification-item-title">{note.title}</div>
                    <div className="notification-item-body">{note.body}</div>
                    <div className="notification-item-meta">
                      {formatNotificationTime(note.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
