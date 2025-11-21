import { Link, useLocation } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const { pathname } = useLocation();

  const Tab = ({ to, children }) => (
    <Link
      to={to}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid #2a2f59",
        background:
          pathname === to
            ? "linear-gradient(135deg, var(--primary), var(--primary-2))"
            : "#121530",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {children}
    </Link>
  );

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="container row">
        <Link
          to="/"
          className="h1"
          style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 20,
              background: "var(--accent)",
            }}
          />
          Class<span style={{ color: "var(--primary)" }}>Manage</span>
        </Link>

        {user && (
          <>
            <nav className="row" style={{ gap: 10 }}>
              {/* Home: keep as before (admin/teacher UX thing in App.jsx) */}
              <Tab to="/home">Home</Tab>

              {/* Pending for everyone (behavior differs per role in Pending.jsx) */}
              <Tab to="/pending">Pending</Tab>

              {/* Free Days for everyone (admin, teacher, editor) */}
              <Tab to="/free-days">Free Days</Tab>

              {/* Contact directory for everyone */}
              <Tab to="/contacts">Contact</Tab>

              {/* Admin-only block */}
              {isAdmin && (
                <>
                  <Tab to="/confirmation">Confirm</Tab>
                  <Tab to="/completed">Completed</Tab>
                  <Tab to="/unpaid">Unpaid</Tab>
                  <Tab to="/users">Users</Tab>
                  <Tab to="/reports">Reports</Tab>
                  {/* Ratings tab for admin only */}
                  <Tab to="/ratings">Ratings</Tab>
                </>
              )}

              {/* Editor can also see Completed (uploaded videos view) */}
              {isEditor && (
                <Tab to="/completed">Completed</Tab>
              )}

              <Tab to="/profile">Profile</Tab>
            </nav>

            <div className="right row">
              <div className="badge">
                {user.name} · {user.role} · TPIN {user.tpin}
              </div>
              <button className="btn-ghost" onClick={onLogout}>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
      <div className="hr" />
    </header>
  );
}
