// src/pages/Pending.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Toolbar from "../components/Toolbar";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import { Field } from "../components/Field";
import Empty from "../components/Empty";
import "../styles/pages/pending.css";

export default function Pending() {
  const [rows, setRows] = useState([]); // raw rows from server
  const [loading, setLoading] = useState(false);

  // Editor upload dialog state
  const [uploadDialog, setUploadDialog] = useState({
    open: false,
    task: null,
    url: "",
    error: "",
  });

  // Filters + lookup lists (no date filters)
  const [filters, setFilters] = useState({
    courseId: "",
    teacherId: "",
    tpin: "",
  });
  const [courses, setCourses] = useState([]);
  const [people, setPeople] = useState([]); // teachers + admins

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor";
  const isTeacher = user?.role === "teacher";

  const buildQueryParams = (obj) =>
    new URLSearchParams(
      Object.entries(obj).filter(([_, v]) => v !== "" && v != null)
    ).toString();

  // Client-side filter function used for both admin/teacher and editor views
  const applyClientFilters = (items, currentFilters) => {
    const { courseId, teacherId, tpin } = currentFilters || filters;
    return (items || []).filter((row) => {
      // Determine session/course/teacher fields for both class rows and upload rows
      const session =
        row.classSession ||
        row.session ||
        row.class ||
        (typeof row.course === "object" ? row : {});
      // course id possibilities
      const sessionCourseId =
        (session && (session.course?._id || session.courseId || session.course)) ||
        row.course?._id ||
        row.courseId ||
        row.course ||
        "";
      if (courseId && String(sessionCourseId) !== String(courseId)) return false;

      // teacher id possibilities
      const sessionTeacherId =
        (session && (session.teacher?._id || session.teacherId || session.teacher)) ||
        row.teacherId ||
        (row.teacher && row.teacher._id) ||
        "";
      if (teacherId && String(sessionTeacherId) !== String(teacherId))
        return false;

      // tpin possibilities (partial match)
      if (tpin) {
        const sessionTpin =
          (session && (session.teacher?.tpin || session.tpin)) ||
          row.teacherTpin ||
          row.tpin ||
          "";
        if (!String(sessionTpin).includes(String(tpin))) return false;
      }

      // For teacher role, additionally restrict to current user
      if (isTeacher && !isAdmin && !isEditor) {
        const ownerTeacherId =
          row.teacherId || (row.teacher && row.teacher._id) || "";
        const ownerTpin = row.teacherTpin || (row.teacher && row.teacher.tpin) || "";
        if (
          String(ownerTeacherId) !== String(user?._id || "") &&
          String(ownerTpin) !== String(user?.tpin || "")
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // Load raw rows from server, then apply client-side filters always
  const load = async (opts = {}) => {
    setLoading(true);
    try {
      if (isEditor) {
        // Editor: fetch pending uploads (server-side may return all); we'll client-filter below
        const { data } = await api.get("/upload/pending");
        const list = data || [];
        setRows(list);
      } else {
        // Admin/Teacher: ask server (may ignore params) but still apply client-side filters
        const params = buildQueryParams(opts.filters || filters);
        const url = params ? `/classes/pending?${params}` : "/classes/pending";
        const { data } = await api.get(url);
        const list = data || [];
        setRows(list);
      }
    } catch (err) {
      console.error("Failed to load pending items", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // preload courses and people if admin/editor (for filter dropdowns)
    if (isAdmin || isEditor) {
      api
        .get("/courses?status=active")
        .then((r) => setCourses(r.data || []))
        .catch(() => setCourses([]));

      Promise.all([
        api.get("/users", { params: { role: "teacher" } }),
        api.get("/users", { params: { role: "admin" } }),
      ])
        .then(([t, a]) => setPeople([...(t.data || []), ...(a.data || [])]))
        .catch(() => setPeople([]));
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔒 Lock window scroll while this page is mounted
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const complete = async (id) => {
    if (isEditor) return; // safety
    setLoading(true);
    try {
      await api.patch(`/classes/${id}/complete`);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (isEditor) return; // safety
    if (!confirm("Delete this pending class?")) return;
    setLoading(true);
    try {
      await api.delete(`/classes/${id}`);
      await load();
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- EDITOR: Upload dialog ---------------------- */

  const openUploadDialog = (task) => {
    const existingUrl = task.videoUrl || "";
    setUploadDialog({
      open: true,
      task,
      url: existingUrl,
      error: "",
    });
  };

  const closeUploadDialog = () => {
    setUploadDialog({
      open: false,
      task: null,
      url: "",
      error: "",
    });
  };

  const submitUploadDialog = async () => {
    const url = uploadDialog.url.trim();

    if (!url) {
      setUploadDialog((s) => ({
        ...s,
        error: "Video URL is required.",
      }));
      return;
    }

    const looksLikeUrl = /^https?:\/\/.+/i.test(url);
    if (!looksLikeUrl) {
      setUploadDialog((s) => ({
        ...s,
        error: "Please enter a valid URL starting with http:// or https://",
      }));
      return;
    }

    if (!uploadDialog.task?._id) return;

    setLoading(true);
    try {
      await api.patch(`/upload/${uploadDialog.task._id}/uploaded`, {
        videoUrl: url,
      });
      closeUploadDialog();
      await load();
    } finally {
      setLoading(false);
    }
  };

  // Editor: mark uploaded → open modal
  const markUploaded = (task) => {
    if (!isEditor) return;
    openUploadDialog(task);
  };

  /* ----------------------------- FILTER HELPERS ----------------------------- */

  const resetFilters = () => {
    const base = { courseId: "", teacherId: "", tpin: "" };
    setFilters(base);
    // reload raw rows and client-filter will use empty filters
    load({ filters: base });
  };

  // Display rows are always rows filtered by current filters
  const displayRows = useMemo(() => {
    return applyClientFilters(rows, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, isAdmin, isEditor, isTeacher, user]);

  /* ----------------------------- COLUMNS ----------------------------- */

  const classColumns = [
    { key: "name", label: "Class" },
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "hours", label: "Hours" },
    ...(isAdmin ? [{ key: "hourlyRate", label: "Rate/hr" }] : []),
    { key: "_actions", label: "Actions" },
  ];

  const editorColumns = [
    { key: "name", label: "Class" },
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "hours", label: "Hours" },
    { key: "_actions", label: "Actions" },
  ];

  const columns = isEditor ? editorColumns : classColumns;

  const headerTitle = isEditor ? "Pending Uploads" : "Pending Classes";
  const emptyTitle = isEditor ? "No pending uploads" : "No pending classes";

  const toolbarText = isAdmin
    ? "Visible to admins"
    : isEditor
    ? "Videos to upload (only you + admins)"
    : "Only you + admins can see your items";

  // Helper to show info in dialog
  const dialogSession = uploadDialog.task?.classSession || {};

  /* ----------------------------- RENDER ----------------------------- */

  return (
    <div
      className="page page-pending"
      style={{
        height: "100vh",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PageHeader
        // icon="/bigbang.svg"
        title={headerTitle}
        meta={<div className="badge">Total: {displayRows.length}</div>}
      />

      <Toolbar
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="badge">{toolbarText}</div>
            <Button variant="ghost" onClick={resetFilters} disabled={loading}>
              Reset Filters
            </Button>
            <Button
              variant="ghost"
              onClick={() => load({ filters })}
              disabled={loading}
            >
              Apply Filters
            </Button>
          </div>
        }
      >
        <div className="filters-grid">
          <Field label="Course">
            <select
              value={filters.courseId}
              onChange={(e) =>
                setFilters((s) => ({ ...s, courseId: e.target.value }))
              }
            >
              <option value="">All</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Teacher/Admin">
            <select
              value={filters.teacherId}
              onChange={(e) =>
                setFilters((s) => ({ ...s, teacherId: e.target.value }))
              }
            >
              <option value="">All</option>
              {people.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </Field>

          <Field label="TPIN">
            <input
              value={filters.tpin}
              onChange={(e) =>
                setFilters((s) => ({ ...s, tpin: e.target.value }))
              }
              placeholder="Optional"
            />
          </Field>
        </div>
      </Toolbar>

      {/* Scrollable main content area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        <Section>
          {displayRows.length === 0 ? (
            <Empty icon="⏳" title={loading ? "Loading..." : emptyTitle} />
          ) : (
            <Table
              columns={columns}
              rows={displayRows}
              renderCell={(c, row) => {
                // Editor mode: data is UploadedVideo with populated classSession
                if (isEditor) {
                  const session = row.classSession || {};
                  if (c.key === "course") return session.course?.name || "-";
                  if (c.key === "name")
                    return session.name || <span className="subtle">—</span>;
                  if (c.key === "teacherName")
                    return session.teacher?.name || "-";
                  if (c.key === "teacherTpin")
                    return session.teacher?.tpin || "-";
                  if (c.key === "hours") return session.hours ?? "-";
                  if (c.key === "_actions") {
                    return (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          variant="ghost"
                          disabled={loading}
                          onClick={() => markUploaded(row)}
                        >
                          Mark uploaded
                        </Button>
                      </div>
                    );
                  }
                  return null;
                }

                // Admin/Teacher view
                if (c.key === "course") return row.course?.name || "-";
                if (c.key === "name")
                  return row.name || <span className="subtle">—</span>;
                if (c.key === "_actions") {
                  return (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="ghost"
                        disabled={loading}
                        onClick={() => complete(row._id)}
                      >
                        Complete
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          disabled={loading}
                          onClick={() => remove(row._id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  );
                }
                return row[c.key];
              }}
            />
          )}
        </Section>
      </div>

      {/* -------------------- Upload URL Dialog (Editor) -------------------- */}
      {isEditor && uploadDialog.open && (
        <div
          className="upload-dialog-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            className="upload-dialog-panel"
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#0b1020",
              borderRadius: 16,
              border: "1px solid rgba(148, 163, 184, 0.4)",
              boxShadow:
                "0 18px 45px rgba(15, 23, 42, 0.8), 0 0 0 1px rgba(15, 23, 42, 0.7)",
              padding: 20,
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  Mark Video as Uploaded
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "#9ca3af",
                  }}
                >
                  Add the final video URL for this class. This field is{" "}
                  <b>mandatory</b>.
                </p>
              </div>
              <button
                onClick={closeUploadDialog}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Class context */}
            <div
              style={{
                fontSize: 12,
                background: "rgba(15, 23, 42, 0.9)",
                borderRadius: 10,
                padding: "8px 10px",
                border: "1px solid rgba(55, 65, 81, 0.8)",
                marginBottom: 14,
              }}
            >
              <div>
                <span style={{ color: "#9ca3af" }}>Class: </span>
                <b>{dialogSession.name || "—"}</b>
              </div>
              <div>
                <span style={{ color: "#9ca3af" }}>Course: </span>
                {dialogSession.course?.name || "-"}
              </div>
              <div>
                <span style={{ color: "#9ca3af" }}>Teacher: </span>
                {dialogSession.teacher?.name || "-"}{" "}
                {dialogSession.teacher?.tpin
                  ? `· TPIN ${dialogSession.teacher.tpin}`
                  : ""}
              </div>
            </div>

            {/* URL input */}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Video URL <span style={{ color: "#f97373" }}>*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={uploadDialog.url}
                onChange={(e) =>
                  setUploadDialog((s) => ({
                    ...s,
                    url: e.target.value,
                    error: "",
                  }))
                }
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${
                    uploadDialog.error
                      ? "#f97373"
                      : "rgba(75, 85, 99, 0.9)"
                  }`,
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              {uploadDialog.error && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#f97373",
                  }}
                >
                  {uploadDialog.error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <Button
                variant="ghost"
                onClick={closeUploadDialog}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={submitUploadDialog} disabled={loading}>
                {loading ? "Saving…" : "Mark Uploaded"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
