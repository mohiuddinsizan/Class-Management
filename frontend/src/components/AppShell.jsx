// src/components/AppShell.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
// src/components/AppShell.jsx



/* ---------- tiny inline icon set (no external deps) ---------- */
function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11l9-8 9 8" />
          <path d="M9 22V12h6v10" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "pending":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l3 3" />
        </svg>
      );
    case "confirm":
      return (
        <svg {...common}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "completed":
      return (
        <svg {...common}>
          <path d="M21 7l-9 10-5-5" />
          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
        </svg>
      );
    case "money":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M13 12h.01" />
          <path d="M7 12h.01" />
          <path d="M2 10h20" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20a6 6 0 0 1 12 0" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="17" x2="8" y2="11" />
          <line x1="12" y1="17" x2="12" y2="7" />
          <line x1="16" y1="17" x2="16" y2="13" />
        </svg>
      );
    case "star": // Ratings icon
      return (
        <svg {...common}>
          <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      );
    case "contact": // Contact directory icon
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8a3 3 0 1 1 6 0v1a3 3 0 0 1-6 0Z" />
          <path d="M9 17a5 5 0 0 1 6 0" />
          <line x1="3" y1="7" x2="5" y2="7" />
          <line x1="3" y1="12" x2="5" y2="12" />
          <line x1="3" y1="17" x2="5" y2="17" />
        </svg>
      );
      case "suitcase": // NEW: Tours icon (distinct from Free Days calendar)
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M7 7v13" />
          <path d="M17 7v13" />
        </svg>
      );
    default:
      return null;
  }
}

function NavItem({ to, label, icon, onNavigate }) {
  const loc = useLocation();
  const active =
    loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onNavigate}
    >
      <span className="nav-ico">
        <Icon name={icon} />
      </span>
      <span className="nav-text">{label}</span>
    </Link>
  );
}

/* ... icons + NavItem unchanged ... */

export default function AppShell({ children, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor";
  const [open, setOpen] = useState(false);

  // Close drawer with ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close drawer on desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    const handler = () => {
      if (mq.matches) setOpen(false);
    };
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const onNavigate = () => setOpen(false);

  const LogoutItem = () => (
    <a
      href="/login"
      className="nav-item"
      onClick={(e) => {
        e.preventDefault();
        onNavigate();
        onLogout();
      }}
    >
      <span className="nav-ico">
        <Icon name="logout" />
      </span>
      <span className="nav-text">Logout</span>
    </a>
  );

  return (
    <div className={`layout ${open ? "drawer-open" : ""}`}>
      {/* Mobile App Bar */}
      <header className="appbar">
        <button
          className="icon-btn"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" />
        </button>
        <div className="brand-row">
          <img src="/bigbang.png" alt="" className="brand-icon" />
          <div className="brand-texts">
            <div className="brand-name">BIG BANG</div>
            <div className="brand-sub">BIGBANG CLASSES</div>
          </div>
        </div>
        {user ? (
          <button
            className="icon-btn"
            aria-label="Logout"
            onClick={onLogout}
            title="Logout"
          >
            <Icon name="logout" />
          </button>
        ) : (
          <div style={{ width: 32 }} />
        )}
      </header>

      {/* Desktop Sidebar + Mobile Drawer */}
      <aside
        id="mobile-drawer"
        className={`sidebar ${open ? "open" : ""}`}
        aria-hidden={!open}
        // 🔥 Make the sidebar scrollable so all items (incl. Logout) are reachable on mobile
        style={{
          maxHeight: "100vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="brand desktop-only">
          <img src="/bigbang.png" alt="" /> BIG BANG
        </div>

        {isAdmin && (
          <>
            <NavItem
              to="/home"
              label="Home"
              icon="home"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/courses/new"
              label="New Course"
              icon="plus"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/confirmation"
              label="Confirmation"
              icon="confirm"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/completed"
              label="Completed"
              icon="completed"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/unpaid"
              label="Unpaid"
              icon="money"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/users"
              label="Users"
              icon="users"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/reports"
              label="Reports"
              icon="reports"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/ratings"
              label="Ratings"
              icon="star"
              onNavigate={onNavigate}
            />
            <NavItem
              to="/tours"
              label="Tours"
              icon="suitcase"
              onNavigate={onNavigate}
            />
          </>
        )}

        {/* Editor-specific: show Completed (uploaded videos) */}
        {isEditor && (
          <NavItem
            to="/completed"
            label="Completed"
            icon="completed"
            onNavigate={onNavigate}
          />
        )}

        {/* Common (all roles) */}
        <NavItem
          to="/"
          label="Pending"
          icon="pending"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/free-days"
          label="Free Days"
          icon="calendar"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/contacts"
          label="Contact"
          icon="contact"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/profile"
          label="Profile"
          icon="profile"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/password"
          label="Password"
          icon="lock"
          onNavigate={onNavigate}
        />

        {user && (
          <div style={{ marginTop: "auto" }}>
            <div
              style={{
                padding: "12px 12px 6px",
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              Signed in as <b>{user.name || user.email}</b>
            </div>
            <LogoutItem />
          </div>
        )}
      </aside>

      {/* Backdrop for drawer */}
      <div
        className={`backdrop ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Main content */}
      <main className="content">{children}</main>
    </div>
  );
}
