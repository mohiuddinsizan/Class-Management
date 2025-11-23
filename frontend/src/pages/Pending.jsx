// src/pages/Pending.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Toolbar from "../components/Toolbar";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import Empty from "../components/Empty";
import "../styles/pages/pending.css";

export default function Pending() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Editor upload dialog state
  const [uploadDialog, setUploadDialog] = useState({
    open: false,
    task: null,
    url: "",
    error: "",
  });

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor";
  const isTeacher = user?.role === "teacher";

  const load = async () => {
    setLoading(true);
    try {
      if (isEditor) {
        // Editor: load pending upload tasks
        const { data } = await api.get("/upload/pending");
        setRows(data || []);
      } else {
        // Admin/Teacher: existing pending class flow
        const { data } = await api.get("/classes/pending");
        // Client-side guard: teachers only see their own items
        const filtered = isAdmin
          ? data
          : data.filter(
              (x) =>
                String(x.teacherId || x.teacher?._id || "") ===
                  String(user?._id || "") ||
                String(x.teacherTpin || "") === String(user?.tpin || "")
            );
        setRows(filtered);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

    // You can add simple URL sanity check if you want
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

  // Table columns
  const classColumns = [
    { key: "name", label: "Class" },
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "hours", label: "Hours" },
    ...(isAdmin ? [{ key: "hourlyRate", label: "Rate/hr" }] : []),
    { key: "_actions", label: "Actions" },
  ];

  // Editor view: based on UploadedVideo + populated classSession
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
        meta={<div className="badge">Total: {rows.length}</div>}
      />

      <Toolbar right={<div className="badge">{toolbarText}</div>}>
        {/* reserved for future quick filters */}
      </Toolbar>

      {/* Scrollable main content area (fixed height within the viewport) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        <Section>
          {rows.length === 0 ? (
            <Empty icon="⏳" title={loading ? "Loading..." : emptyTitle} />
          ) : (
            <Table
              columns={columns}
              rows={rows}
              renderCell={(c, row) => {
                // Editor mode: data is UploadedVideo with populated classSession
                if (isEditor) {
                  const session = row.classSession || {};
                  if (c.key === "course") return session.course?.name || "-";
                  if (c.key === "name")
                    return session.name || (
                      <span className="subtle">—</span>
                    );
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

                // Existing behavior for admin/teacher
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
