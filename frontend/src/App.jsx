// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import AppShell from "./components/AppShell";
import { Protected } from "./components/Guard";

// pages
import Login from "./pages/Login";
import Home from "./pages/Home";
import CourseDetail from "./pages/CourseDetail";
import Pending from "./pages/Pending";
import Confirmation from "./pages/Confirmation";
import Completed from "./pages/Completed";
import Unpaid from "./pages/Unpaid";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Password from "./pages/Password";
import CourseCreate from "./pages/CourseCreate";
import FreeDays from "./pages/FreeDays";
import AdminRatings from "./pages/AdminRating"; // <-- Ratings
import Contact from "./pages/Contact";          // <-- Contact directory

// Redirect to /login when unauthenticated, preserving intended route
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const { setUser } = useAuth();

  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login setUser={setUser} />} />

      {/* Protected area */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell onLogout={onLogout}>
              <Routes>
                <Route
                  path="/home"
                  element={
                    <Protected roles={["admin", "teacher"]}>
                      <Home />
                    </Protected>
                  }
                />

                {/* Default route -> Pending; now allows editor too */}
                <Route
                  path="/"
                  element={
                    <Protected roles={["admin", "teacher", "editor"]}>
                      <Pending />
                    </Protected>
                  }
                />

                <Route
                  path="/courses/:id"
                  element={
                    <Protected roles={["admin", "teacher"]}>
                      <CourseDetail />
                    </Protected>
                  }
                />

                {/* Pending page: admin, teacher, editor */}
                <Route
                  path="/pending"
                  element={
                    <Protected roles={["admin", "teacher", "editor"]}>
                      <Pending />
                    </Protected>
                  }
                />

                <Route
                  path="/confirmation"
                  element={
                    <Protected roles={["admin"]}>
                      <Confirmation />
                    </Protected>
                  }
                />

                {/* ✅ Completed: admin + editor */}
                <Route
                  path="/completed"
                  element={
                    <Protected roles={["admin", "editor"]}>
                      <Completed />
                    </Protected>
                  }
                />

                <Route
                  path="/unpaid"
                  element={
                    <Protected roles={["admin"]}>
                      <Unpaid />
                    </Protected>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <Protected roles={["admin"]}>
                      <Users />
                    </Protected>
                  }
                />

                {/* Profile: admin, teacher, editor */}
                <Route
                  path="/profile"
                  element={
                    <Protected roles={["admin", "teacher", "editor"]}>
                      <Profile />
                    </Protected>
                  }
                />

                {/* Password: admin, teacher, editor */}
                <Route
                  path="/password"
                  element={
                    <Protected roles={["admin", "teacher", "editor"]}>
                      <Password />
                    </Protected>
                  }
                />

                <Route
                  path="/courses/new"
                  element={
                    <Protected roles={["admin"]}>
                      <CourseCreate />
                    </Protected>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Protected roles={["admin"]}>
                      <Reports />
                    </Protected>
                  }
                />

                {/* Free days: admin, teacher, editor */}
                <Route
                  path="/free-days"
                  element={
                    <Protected roles={["admin", "teacher", "editor"]}>
                      <FreeDays />
                    </Protected>
                  }
                />

                {/* Contact directory: admin, teacher, editor */}
                <Route
                  path="/contacts"
                  element={
                    <Protected roles={["admin", "teacher", "editor"]}>
                      <Contact />
                    </Protected>
                  }
                />

                {/* Ratings page for admin only */}
                <Route
                  path="/ratings"
                  element={
                    <Protected roles={["admin"]}>
                      <AdminRatings />
                    </Protected>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
