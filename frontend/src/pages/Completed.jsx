// src/pages/Completed.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Toolbar from "../components/Toolbar";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import { Field } from "../components/Field";
import Empty from "../components/Empty";
import "../styles/pages/completed.css";

const today = new Date().toISOString().slice(0, 10);

export default function Completed() {
  const [classRows, setClassRows] = useState([]); // completed class rows (admin)
  const [uploadedRows, setUploadedRows] = useState([]); // uploaded videos (editor + admin)
  const [courses, setCourses] = useState([]);
  const [people, setPeople] = useState([]); // teachers + admins
  const [loading, setLoading] = useState(false);

  // separate downloading flags
  const [downloadingClasses, setDownloadingClasses] = useState(false);
  const [downloadingUploads, setDownloadingUploads] = useState(false);

  const [filters, setFilters] = useState({
    courseId: "",
    teacherId: "",
    tpin: "",
    start: today, // default: today
    end: today, // default: today
  });

  // which tab admin is viewing
  const [adminView, setAdminView] = useState("classes"); // "classes" | "uploads"

  // modal state for uploaded videos billing
  const [showUploadBillModal, setShowUploadBillModal] = useState(false);
  const [uploadBillRate, setUploadBillRate] = useState("");
  const [uploadBillTip, setUploadBillTip] = useState("");
  const [uploadBillError, setUploadBillError] = useState("");

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );
  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor";

  /* ----------------------------- helpers ----------------------------- */
  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "-";
    }
  };

  const onlyDate = (d) => {
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
    });

  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (m) => (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m]
    ));

  /* ----------------------------- ADMIN LOGIC (CLASSES) ----------------------------- */

  const loadRows = async (q = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(
        Object.entries(q).filter(([_, v]) => v)
      );
      const r = await api.get(`/classes/completed?${params.toString()}`);
      setClassRows(r.data || []);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const base = {
      courseId: "",
      teacherId: "",
      tpin: "",
      start: today, // reset back to today
      end: today,
    };
    setFilters(base);
    // Only auto-reload classes if admin is on the "classes" tab
    if (isAdmin && adminView === "classes") {
      loadRows(base); // only today's completed classes
    }
  };

  // If Start == End → that day; else if only Start → that day; else default today
  const billDay = useMemo(() => {
    if (filters.start && filters.end && filters.start === filters.end)
      return filters.start;
    if (filters.start && !filters.end) return filters.start;
    return today;
  }, [filters.start, filters.end]);

  const rowsForBill = useMemo(() => {
    if (!isAdmin) return [];
    const day = billDay;
    return classRows.filter((r) => onlyDate(r.confirmedAt) === day);
  }, [classRows, billDay, isAdmin]);

  // Try bulk; else patch individually (like Unpaid.jsx)
  const markBillAsPaid = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      await api.post(`/classes/paid/batch`, { ids });
    } catch {
      await Promise.all(ids.map((id) => api.patch(`/classes/${id}/paid`)));
    }
  };

  // Print via hidden iframe using srcdoc (no popup windows)
  const printViaIframe = (html) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.zIndex = "9999";
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } finally {
          setTimeout(() => document.body.removeChild(iframe), 400);
        }
      }, 60);
    };
    iframe.srcdoc = html;
  };

  const buildBillHtml = () => {
    // Group by teacher
    const groupsIndex = {};
    rowsForBill.forEach((r) => {
      const key = `${r.teacherId || r.teacherName || "unknown"}`;
      if (!groupsIndex[key])
        groupsIndex[key] = {
          name: r.teacherName,
          tpin: r.teacherTpin,
          items: [],
        };
      groupsIndex[key].items.push(r);
    });
    const groups = Object.values(groupsIndex);
    const teacherCount = groups.length;

    const rowsHtmlForGroup = (items) =>
      items
        .map((it, i) => {
          const amt = Number(it.hours || 0) * Number(it.hourlyRate || 0);
          return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(it.course?.name || "-")}</td>
          <td>${escapeHtml(it.name || "—")}</td>
          <td>${escapeHtml(fmtDate(it.confirmedAt))}</td>
          <td class="num">${it.hours ?? "-"}</td>
          <td class="num">${money(it.hourlyRate ?? 0)}</td>
          <td class="num">${money(amt)}</td>
        </tr>
      `;
        })
        .join("");

    const teacherBlocks = groups
      .map((g, idx) => {
        const rowsHtml = rowsHtmlForGroup(g.items);
        const subTotal = g.items.reduce(
          (sum, it) =>
            sum + Number(it.hours || 0) * Number(it.hourlyRate || 0),
          0
        );

        return `
        <section class="teacher-block">
          <div class="teacher-head">
            <div><b>Teacher:</b> ${escapeHtml(g.name || "-")}</div>
            <div><b>TPIN:</b> ${escapeHtml(g.tpin || "-")}</div>
          </div>
          <table class="bill-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Course</th>
                <th>Class</th>
                <th>Date/Time</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="right"><b>Subtotal</b></td>
                <td class="num"><b>${money(subTotal)}</b></td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sig">
              <div class="line"></div>
              <div class="cap">Teacher Signature</div>
            </div>
            <div class="sig">
              <div class="line"></div>
              <div class="cap">In-Charge Signature</div>
            </div>
          </div>
        </section>
        ${idx < groups.length - 1 ? "<hr/>" : ""}
      `;
      })
      .join("");

    const grand = rowsForBill.reduce(
      (sum, it) =>
        sum + Number(it.hours || 0) * Number(it.hourlyRate || 0),
      0
    );

    const invoiceId = `CLS-${billDay.replace(/-/g, "")}-${rowsForBill.length}`;

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>BIG BANG EXAM CARE• Daily Class Bill • ${billDay}</title>
<style>
  :root{ --text:#111827; --muted:#6b7280; --border:#e5e7eb; --primary:#4f46e5; --bg:#f9fafb; }
  *{box-sizing:border-box}
  body{ font-family: Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial; color:var(--text); margin:0; background:var(--bg); }
  .sheet{ max-width: 960px; margin: 32px auto; padding: 28px 32px; background:#fff; border: 1px solid var(--border); border-radius: 16px; box-shadow:0 24px 40px rgba(15,23,42,0.08); }
  .brand{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; }
  .brand-left{ display:flex; flex-direction:column; gap:4px; }
  .brand .title{ font-size: 24px; font-weight: 900; letter-spacing:.2px; }
  .brand .subtitle{ font-size: 13px; color:var(--muted); text-transform:uppercase; letter-spacing: .18em; }
  .brand .meta{ text-align:right; font-size: 12px; color: var(--muted); display:flex; flex-direction:column; gap:4px; }
  .pill{ display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; border:1px solid rgba(79,70,229,0.16); font-size:11px; color:#4f46e5; background:rgba(79,70,229,0.04); }
  .pill-dot{ width:6px; height:6px; border-radius:999px; background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.25); }
  .totals{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin: 10px 0 18px; }
  .badge{ display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:999px; font-size:12px; color:#374151; background:#f9fafb }
  .badge-label{ font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); }
  .badge-value{ font-weight:600; }
  .teacher-block{ margin: 18px 0; page-break-inside: avoid; }
  .teacher-head{ display:flex; gap:20px; align-items:center; margin: 8px 0 10px; font-size:13px; }
  .bill-table{ width:100%; border-collapse: collapse; }
  .bill-table th, .bill-table td{ padding: 10px 12px; border: 1px solid var(--border); font-size: 13px; }
  .bill-table thead th{ background:#f3f4f6; text-align:left; font-weight:600; }
  .bill-table .right{ text-align:right }
  .bill-table .num{ text-align:right; font-variant-numeric: tabular-nums; }
  .signatures{ display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 22px; }
  .sig .line{ height:1px; background:#111827; margin: 28px 0 6px; }
  .sig .cap{ font-size: 12px; color: var(--muted); }
  hr{ border:0; height:1px; background:var(--border); margin: 22px 0; }
  @media print { 
    body{background:#fff;}
    .sheet{ border:none; border-radius:0; margin:0; padding:0; box-shadow:none; } 
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div class="brand-left">
        <div class="subtitle">BIG BANG EXAM CARE</div>
        <div class="title">Daily Class Bill</div>
        <div class="pill">
          <span class="pill-dot"></span>
          <span>Instructional Sessions</span>
        </div>
      </div>
      <div class="meta">
        <div><b>Bill Date:</b> ${billDay}</div>
        <div><b>Generated:</b> ${new Date().toLocaleString()}</div>
        <div><b>Invoice ID:</b> ${invoiceId}</div>
      </div>
    </div>

    <div class="totals">
      <span class="badge">
        <span class="badge-label">Classes</span>
        <span class="badge-value">${rowsForBill.length}</span>
      </span>
      <span class="badge">
        <span class="badge-label">Teachers</span>
        <span class="badge-value">${teacherCount}</span>
      </span>
      <span class="badge">
        <span class="badge-label">Grand Total</span>
        <span class="badge-value">${money(grand)}</span>
      </span>
    </div>

    ${teacherBlocks}
  </div>
</body>
</html>
    `;
  };

  const onDownloadBill = async () => {
    const list = rowsForBill;
    if (!list || list.length === 0) {
      alert("No completed classes for the selected date.");
      return;
    }
    setDownloadingClasses(true);
    try {
      // 1) Mark all included classes as PAID
      const ids = list.map((r) => r._id).filter(Boolean);
      await markBillAsPaid(ids);

      // 2) Refresh table so Paid badges update, using current filters
      await loadRows(filters);

      // 3) Build HTML and print via hidden iframe (no popups)
      const html = buildBillHtml();
      printViaIframe(html);
    } finally {
      setDownloadingClasses(false);
    }
  };

  /* ----------------------------- UPLOADED VIDEOS LOGIC ----------------------------- */

  const loadUploaded = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/upload/uploaded");
      // you can filter per-editor if you assign editor field properly
      setUploadedRows(data || []);
    } finally {
      setLoading(false);
    }
  };

  // filter uploaded rows by date range using uploadedAt
  const filteredUploadedRows = useMemo(() => {
    const { start, end } = filters;
    return (uploadedRows || []).filter((row) => {
      const d = onlyDate(row.uploadedAt);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [uploadedRows, filters]);

  const formatUploadPeriod = () => {
    const { start, end } = filters;
    if (start && end && start === end) return start;
    if (start && end) return `${start} to ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Up to ${end}`;
    return "All dates";
  };

  const buildUploadsBillHtml = (videos, perVideoAmount, tipAmount) => {
    const count = videos.length;
    const subtotal = perVideoAmount * count;
    const tip = tipAmount || 0;
    const grandTotal = subtotal + tip;
    const periodLabel = formatUploadPeriod();
    const invoiceId = `UPL-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${count}`;

    const rowsHtml = videos
      .map((row, i) => {
        const session = row.classSession || {};
        const teacher = session.teacher || {};
        const teacherName =
          teacher.name || row.teacherName || row.teacher || "-";
        const teacherTpin =
          teacher.tpin || row.teacherTpin || row.tpin || "-";
        const courseName = session.course?.name || row.courseName || "-";
        const className =
          session.name || row.className || row.name || "—";

        return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(courseName)}</td>
          <td>${escapeHtml(className)}</td>
          <td>${escapeHtml(teacherName)}</td>
          <td>${escapeHtml(teacherTpin)}</td>
          <td>${escapeHtml(fmtDate(row.uploadedAt))}</td>
          <td class="num">${money(perVideoAmount)}</td>
        </tr>
      `;
      })
      .join("");

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>BIG BANG EXAM CARE• Uploaded Videos Bill • ${periodLabel}</title>
<style>
  :root{ --text:#0f172a; --muted:#64748b; --border:#e2e8f0; --primary:#4f46e5; --bg:#0b1120; }
  *{box-sizing:border-box}
  body{ font-family: Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial; color:var(--text); margin:0; background:radial-gradient(circle at top, #1e293b 0, #020617 52%, #000 100%); }
  .shell{ padding:32px 16px; }
  .sheet{ max-width: 960px; margin: 0 auto; padding: 28px 32px 32px; background:#f8fafc; border-radius: 20px; border:1px solid rgba(148,163,184,0.55); box-shadow:0 28px 60px rgba(15,23,42,0.5); }
  .brand{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; }
  .brand-left{ display:flex; flex-direction:column; gap:4px; }
  .logo-mark{ width:32px; height:32px; border-radius:12px; background:conic-gradient(from 180deg at 50% 50%, #4f46e5 0deg, #22c55e 120deg, #ec4899 240deg, #4f46e5 360deg); box-shadow:0 0 0 3px rgba(148,163,184,0.4); margin-bottom:6px; }
  .brand .kicker{ font-size:12px; text-transform:uppercase; letter-spacing:.18em; color:var(--muted); }
  .brand .title{ font-size:24px; font-weight:900; letter-spacing:.02em; }
  .brand .meta{ text-align:right; font-size:12px; color:var(--muted); display:flex; flex-direction:column; gap:4px; align-items:flex-end; }
  .meta-tag{ padding:4px 9px; border-radius:999px; border:1px solid rgba(79,70,229,0.2); background:rgba(15,23,42,0.02); font-size:11px; display:inline-flex; gap:6px; align-items:center; }
  .meta-dot{ width:7px; height:7px; border-radius:999px; background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.25); }
  .totals{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin: 10px 0 18px; }
  .badge{ display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border:1px dashed rgba(148,163,184,0.8); border-radius:999px; font-size:12px; color:#0f172a; background:#e2e8f0; }
  .badge-label{ font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:#6b7280; }
  .badge-value{ font-weight:600; }
  table{ width:100%; border-collapse: collapse; margin-top: 10px; }
  th, td{ padding: 10px 12px; border: 1px solid #cbd5f5; font-size: 13px; }
  thead th{ background:linear-gradient(to bottom,#e5e7eb,#d1d5db); text-align:left; font-weight:600; }
  tbody tr:nth-child(even) td{ background:#f9fafb; }
  .right{ text-align:right }
  .num{ text-align:right; font-variant-numeric: tabular-nums; }
  .signatures{ display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 22px; }
  .sig .line{ height:1px; background:#111827; margin: 28px 0 6px; }
  .sig .cap{ font-size: 12px; color: #64748b; }
  @media print { 
    body{background:#fff;}
    .shell{padding:0;}
    .sheet{ border-radius:0; border:none; box-shadow:none; margin:0; } 
  }
</style>
</head>
<body>
  <div class="shell">
    <div class="sheet">
      <div class="brand">
        <div class="brand-left">
          <div class="logo-mark"></div>
          <div class="kicker">BIG BANG EXAM CARE </div>
          <div class="title">Uploaded Videos Bill</div>
        </div>
        <div class="meta">
          <div class="meta-tag">
            <span class="meta-dot"></span>
            <span>Media & Editing</span>
          </div>
          <div><b>Period:</b> ${periodLabel}</div>
          <div><b>Generated:</b> ${new Date().toLocaleString()}</div>
          <div><b>Invoice ID:</b> ${invoiceId}</div>
        </div>
      </div>

      <div class="totals">
        <span class="badge">
          <span class="badge-label">Videos</span>
          <span class="badge-value">${count}</span>
        </span>
        <span class="badge">
          <span class="badge-label">Rate / Video</span>
          <span class="badge-value">${money(perVideoAmount)}</span>
        </span>
        <span class="badge">
          <span class="badge-label">Subtotal</span>
          <span class="badge-value">${money(subtotal)}</span>
        </span>
        <span class="badge">
          <span class="badge-label">Tip</span>
          <span class="badge-value">${money(tip)}</span>
        </span>
        <span class="badge">
          <span class="badge-label">Grand Total</span>
          <span class="badge-value">${money(grandTotal)}</span>
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Course</th>
            <th>Class</th>
            <th>Teacher</th>
            <th>TPIN</th>
            <th>Uploaded At</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig">
          <div class="line"></div>
          <div class="cap">Editor / Media Signature</div>
        </div>
        <div class="sig">
          <div class="line"></div>
          <div class="cap">In-Charge Signature</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const openUploadsBillModal = () => {
    if (!filteredUploadedRows || filteredUploadedRows.length === 0) {
      alert("No uploaded videos for the selected date(s).");
      return;
    }
    setUploadBillRate("");
    setUploadBillTip("");
    setUploadBillError("");
    setShowUploadBillModal(true);
  };

  const handleConfirmUploadsBill = () => {
    const videos = filteredUploadedRows;
    if (!videos || videos.length === 0) {
      setUploadBillError(
        "No uploaded videos available for the current filters."
      );
      return;
    }

    const perVideo = Number(uploadBillRate);
    if (!Number.isFinite(perVideo) || perVideo <= 0) {
      setUploadBillError("Please enter a valid positive amount per video.");
      return;
    }

    const tip = uploadBillTip === "" ? 0 : Number(uploadBillTip);
    if (!Number.isFinite(tip) || tip < 0) {
      setUploadBillError("Tip cannot be negative.");
      return;
    }

    setUploadBillError("");
    setDownloadingUploads(true);
    try {
      const html = buildUploadsBillHtml(videos, perVideo, tip);
      printViaIframe(html);
      setShowUploadBillModal(false);
      setUploadBillRate("");
      setUploadBillTip("");
    } finally {
      setDownloadingUploads(false);
    }
  };

  const handleCancelUploadsBill = () => {
    setShowUploadBillModal(false);
    setUploadBillError("");
  };

  /* ----------------------------- EFFECTS ----------------------------- */

  useEffect(() => {
    if (isAdmin) {
      // Admin: load both classes and uploaded videos
      api
        .get("/courses?status=active")
        .then((r) => setCourses(r.data || []));
      Promise.all([
        api.get("/users", { params: { role: "teacher" } }),
        api.get("/users", { params: { role: "admin" } }),
      ])
        .then(([t, a]) =>
          setPeople([...(t.data || []), ...(a.data || [])])
        )
        .catch(() => setPeople([]));

      // initial load: ONLY today's completed classes
      loadRows({ start: today, end: today });

      // preload uploaded videos so admin can switch tab
      loadUploaded();
    } else if (isEditor) {
      // Editor: load all uploaded, then we filter by date in UI
      loadUploaded();
    }
  }, [isAdmin, isEditor]);

  /* ----------------------------- COLUMNS ----------------------------- */

  // Admin columns (existing)
  const columnsAdmin = [
    { key: "name", label: "Class" },
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "hours", label: "Hours" },
    { key: "hourlyRate", label: "Rate/hr" },

    { key: "completedAt", label: "Completed" },
    { key: "confirmedAt", label: "Confirmed" },
    { key: "paidAt", label: "Paid On" },

    { key: "paid", label: "Paid?" },
  ];

  // Editor/Admin columns: uploaded videos
  const columnsEditor = [
    { key: "className", label: "Class" },
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "videoUrl", label: "Video Link" },
    { key: "uploadedAt", label: "Uploaded At" },
  ];

  const ActionsAdmin = ({ className }) => (
    <div className={`filters-actions ${className || ""}`}>
      <Button
        variant="ghost"
        onClick={resetFilters}
        disabled={loading || downloadingClasses}
        style={{ marginRight: 8 }}
      >
        Reset
      </Button>
      <Button
        variant="ghost"
        onClick={() => loadRows(filters)}
        disabled={loading || downloadingClasses}
        style={{ marginRight: 8 }}
      >
        Apply Filters
      </Button>
      <Button
        onClick={onDownloadBill}
        disabled={
          loading || downloadingClasses || rowsForBill.length === 0
        }
      >
        {downloadingClasses ? "Processing…" : "Mark Paid & Download Bill"}
      </Button>
    </div>
  );

  // Toolbar for date filters (editor + admin uploads view)
  const EditorToolbar = ({ extra }) => (
    <Toolbar>
      <div className="filters-grid">
        <Field label="Start">
          <input
            type="date"
            value={filters.start}
            onChange={(e) =>
              setFilters((s) => ({ ...s, start: e.target.value }))
            }
          />
        </Field>
        <Field label="End">
          <input
            type="date"
            value={filters.end}
            onChange={(e) =>
              setFilters((s) => ({ ...s, end: e.target.value }))
            }
          />
        </Field>
        <div
          style={{
            alignSelf: "flex-end",
            display: "flex",
            gap: 8,
          }}
        >
          <Button
            variant="ghost"
            onClick={resetFilters}
            disabled={loading}
          >
            Today Only
          </Button>
          {extra || null}
        </div>
      </div>
    </Toolbar>
  );

  const title = isEditor
    ? "Uploaded Videos"
    : isAdmin && adminView === "uploads"
    ? "Uploaded Videos"
    : "Completed Classes";

  const totalCount = isEditor
    ? filteredUploadedRows.length
    : isAdmin && adminView === "uploads"
    ? filteredUploadedRows.length
    : classRows.length;

  /* ----------------------------- RENDER ----------------------------- */

  return (
    <div className="page page-completed">
      <PageHeader
        // icon="/bigbang.svg"
        title={title}
        meta={<div className="badge">Total: {totalCount}</div>}
      />

      {/* EDITOR VIEW – uploaded videos only, no billing */}
      {isEditor && !isAdmin && (
        <>
          <EditorToolbar />
          <Section>
            {filteredUploadedRows.length === 0 ? (
              <Empty
                icon="🎬"
                title={
                  loading
                    ? "Loading..."
                    : "No uploaded videos for selected date(s)"
                }
              />
            ) : (
              <Table
                columns={columnsEditor}
                rows={filteredUploadedRows}
                renderCell={(c, row) => {
                  // row = UploadedVideo
                  const session = row.classSession || {};
                  if (c.key === "className")
                    return session.name || (
                      <span className="subtle">—</span>
                    );
                  if (c.key === "course")
                    return session.course?.name || "-";
                  if (c.key === "teacherName")
                    return session.teacher?.name || "-";
                  if (c.key === "teacherTpin")
                    return session.teacher?.tpin || "-";
                  if (c.key === "videoUrl") {
                    if (!row.videoUrl)
                      return <span className="subtle">No link</span>;
                    return (
                      <a
                        href={row.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Class Link
                      </a>
                    );
                  }
                  if (c.key === "uploadedAt")
                    return fmtDate(row.uploadedAt);
                  return null;
                }}
              />
            )}
          </Section>
        </>
      )}

      {/* ADMIN VIEW */}
      {isAdmin && (
        <>
          {/* Admin tab switch: just 2 buttons, no big background bar */}
          <div
            className="admin-toggle"
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
            }}
          >
            <Button
              variant={adminView === "classes" ? "primary" : "ghost"}
              onClick={() => setAdminView("classes")}
              disabled={loading || downloadingClasses || downloadingUploads}
            >
              Completed Classes
            </Button>
            <Button
              variant={adminView === "uploads" ? "primary" : "ghost"}
              onClick={() => setAdminView("uploads")}
              disabled={loading || downloadingClasses || downloadingUploads}
            >
              Uploaded Videos
            </Button>
          </div>

          {/* ADMIN – CLASSES TAB (existing behavior) */}
          {adminView === "classes" && (
            <>
              {/* Toolbar: left = filters grid, right = desktop actions */}
              <Toolbar right={<ActionsAdmin className="desktop" />}>
                <div className="filters-grid">
                  <Field label="Course">
                    <select
                      value={filters.courseId}
                      onChange={(e) =>
                        setFilters((s) => ({
                          ...s,
                          courseId: e.target.value,
                        }))
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
                        setFilters((s) => ({
                          ...s,
                          teacherId: e.target.value,
                        }))
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
                        setFilters((s) => ({
                          ...s,
                          tpin: e.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </Field>

                  <Field label="Start">
                    <input
                      type="date"
                      value={filters.start}
                      onChange={(e) =>
                        setFilters((s) => ({
                          ...s,
                          start: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label="End">
                    <input
                      type="date"
                      value={filters.end}
                      onChange={(e) =>
                        setFilters((s) => ({
                          ...s,
                          end: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                {/* Mobile actions appear BELOW the filters on small screens */}
                <ActionsAdmin className="mobile" />
              </Toolbar>

              <Section>
                {classRows.length === 0 ? (
                  <Empty
                    icon="📗"
                    title={
                      loading
                        ? "Loading..."
                        : "No completed classes for filters"
                    }
                  />
                ) : (
                  <Table
                    columns={columnsAdmin}
                    rows={classRows}
                    renderCell={(c, row) => {
                      if (c.key === "course")
                        return row.course?.name || "-";
                      if (c.key === "name")
                        return (
                          row.name || (
                            <span className="subtle">—</span>
                          )
                        );

                      if (c.key === "completedAt")
                        return fmtDate(row.completedAt);
                      if (c.key === "confirmedAt")
                        return fmtDate(row.confirmedAt);
                      if (c.key === "paidAt")
                        return fmtDate(row.paidAt);

                      if (c.key === "paid")
                        return row.paid ? (
                          <span className="badge ok">Paid</span>
                        ) : (
                          <span className="badge warn">Unpaid</span>
                        );

                      return row[c.key];
                    }}
                  />
                )}
              </Section>
            </>
          )}

          {/* ADMIN – UPLOADED VIDEOS TAB (new billing) */}
          {adminView === "uploads" && (
            <>
              <EditorToolbar
                extra={
                  <Button
                    onClick={openUploadsBillModal}
                    disabled={
                      loading ||
                      downloadingUploads ||
                      filteredUploadedRows.length === 0
                    }
                  >
                    {downloadingUploads ? "Processing…" : "Download Upload Bill"}
                  </Button>
                }
              />
              <Section>
                {filteredUploadedRows.length === 0 ? (
                  <Empty
                    icon="🎬"
                    title={
                      loading
                        ? "Loading..."
                        : "No uploaded videos for selected date(s)"
                    }
                  />
                ) : (
                  <Table
                    columns={columnsEditor}
                    rows={filteredUploadedRows}
                    renderCell={(c, row) => {
                      // row = UploadedVideo
                      const session = row.classSession || {};
                      if (c.key === "className")
                        return session.name || (
                          <span className="subtle">—</span>
                        );
                      if (c.key === "course")
                        return session.course?.name || "-";
                      if (c.key === "teacherName")
                        return session.teacher?.name || "-";
                      if (c.key === "teacherTpin")
                        return session.teacher?.tpin || "-";
                      if (c.key === "videoUrl") {
                        if (!row.videoUrl)
                          return (
                            <span className="subtle">No link</span>
                          );
                        return (
                          <a
                            href={row.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Class Link
                          </a>
                        );
                      }
                      if (c.key === "uploadedAt")
                        return fmtDate(row.uploadedAt);
                      return null;
                    }}
                  />
                )}
              </Section>
            </>
          )}
        </>
      )}

      {/* ------------------ Upload Bill Modal (Fancy Prompt) ------------------ */}
      {showUploadBillModal && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(15,23,42,0.92))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            className="modal-card"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#0f172a",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
              border: "1px solid rgba(148,163,184,0.6)",
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: ".16em",
                    color: "#9ca3af",
                  }}
                >
                  Upload Billing
                </div>
                <h3
                  style={{
                    margin: "4px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Configure Upload Bill
                </h3>
              </div>
              <div
                style={{
                  fontSize: 11,
                  textAlign: "right",
                  color: "#9ca3af",
                }}
              >
                <div>Videos: {filteredUploadedRows.length}</div>
                <div>{formatUploadPeriod()}</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.13), rgba(79,70,229,0.35))",
                border: "1px solid rgba(129,140,248,0.9)",
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".16em", marginBottom: 4 }}>
                Quick Tip
              </div>
              <div>
                Enter per-video rate and optional tip. The system will generate
                a separate bill only for uploaded videos.
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Amount per video
                  <span style={{ color: "#38bdf8", marginLeft: 4 }}>*</span>
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "#020617",
                    border: "1px solid #1f2937",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "#9ca3af",
                    }}
                  >
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={uploadBillRate}
                    onChange={(e) => setUploadBillRate(e.target.value)}
                    placeholder="e.g. 200"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "#e5e7eb",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Tip (optional)
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "#020617",
                    border: "1px solid #1f2937",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "#9ca3af",
                    }}
                  >
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={uploadBillTip}
                    onChange={(e) => setUploadBillTip(e.target.value)}
                    placeholder="e.g. 150"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "#e5e7eb",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Live preview */}
              <div
                style={{
                  marginTop: 2,
                  padding: 8,
                  borderRadius: 10,
                  background: "#020617",
                  border: "1px dashed rgba(148,163,184,0.6)",
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#9ca3af" }}>Estimated total</span>
                <span style={{ fontWeight: 600 }}>
                  {(() => {
                    const count = filteredUploadedRows.length || 0;
                    const rate = Number(uploadBillRate) || 0;
                    const tip = Number(uploadBillTip) || 0;
                    const total = rate * count + (tip >= 0 ? tip : 0);
                    return total > 0 ? `৳ ${money(total)}` : "—";
                  })()}
                </span>
              </div>

              {uploadBillError && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "#f87171",
                  }}
                >
                  {uploadBillError}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Button
                variant="ghost"
                onClick={handleCancelUploadsBill}
                disabled={downloadingUploads}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUploadsBill}
                disabled={downloadingUploads}
              >
                {downloadingUploads ? "Generating…" : "Generate Bill"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
