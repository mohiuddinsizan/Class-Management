// src/components/AppShell.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

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
    case "menu":
      return (
        <svg {...common}>
          <path d="M3 6h18M3 12h18M3 18h18" />
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

export default function AppShell({ children, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";
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

  // Logout item that looks exactly like other nav items (no extra CSS needed)
  const LogoutItem = () => (
    <a
      href="/login"
      className="nav-item"
      onClick={(e) => {
        e.preventDefault(); // keep SPA feel
        onNavigate();
        onLogout(); // clears storage + redirects
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
        {/* small logout icon on the right (optional, uses same redirect) */}
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
      >
        <div className="brand desktop-only">
          <img src="/bigbang.png" alt="" /> BIG BANG
        </div>

        {/* Common (both roles) */}
        <NavItem
          to="/pending"
          label="Pending"
          icon="pending"
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

        {/* Admin-only */}
        {isAdmin && (
          <>
            <NavItem to="/" label="Home" icon="home" onNavigate={onNavigate} />
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
          </>
        )}

        {/* Footer for user + logout (no new CSS) */}
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
