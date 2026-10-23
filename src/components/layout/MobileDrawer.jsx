export default function MobileDrawer({
  isOpen,
  onClose,
  user,
  onNavigateHome,
  onOpenAuth,
  onNavigateTo,
  onLogout,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="mobile-drawer-backdrop"
      onClick={onClose}
    >
      <div
        className="mobile-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">StayNest</div>
          <button
            className="mobile-icon-btn"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mobile-drawer-list">
          <button
            type="button"
            className="mobile-drawer-item"
            onClick={() => {
              onNavigateHome();
              onClose();
            }}
          >
            Browse Hostels
          </button>

          {!user ? (
            <>
              <button
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  onOpenAuth("guest");
                  onClose();
                }}
              >
                Guest Login
              </button>
              <button
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  onOpenAuth("owner");
                  onClose();
                }}
              >
                Owner Login
              </button>
              <button
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  onNavigateTo("admin");
                  onClose();
                }}
              >
                Admin Login
              </button>
            </>
          ) : (
            <>
              {user.role === "guest" && (
                <button
                  type="button"
                  className="mobile-drawer-item"
                  onClick={() => {
                    onNavigateTo("student");
                    onClose();
                  }}
                >
                  My Stay
                </button>
              )}
              {user.role === "owner" && (
                <button
                  type="button"
                  className="mobile-drawer-item"
                  onClick={() => {
                    onNavigateTo("owner");
                    onClose();
                  }}
                >
                  Owner Dashboard
                </button>
              )}
              {user.role === "admin" && (
                <button
                  type="button"
                  className="mobile-drawer-item"
                  onClick={() => {
                    onNavigateTo("admin");
                    onClose();
                  }}
                >
                  Admin Dashboard
                </button>
              )}
              <button
                type="button"
                className="mobile-drawer-item text-danger"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
