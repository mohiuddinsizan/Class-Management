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
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [people, setPeople] = useState([]); // teachers + admins
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false); // marking paid + printing

  const [filters, setFilters] = useState({
    courseId: "",
    teacherId: "",
    tpin: "",
    start: today,   // default: today
    end: today      // default: today
  });

  const loadRows = async (q = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(
        Object.entries(q).filter(([_, v]) => v)
      );
      const r = await api.get(`/classes/completed?${params.toString()}`);
      setRows(r.data || []);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const base = {
      courseId: "",
      teacherId: "",
      tpin: "",
      start: today,  // reset back to today
      end: today
    };
    setFilters(base);
    loadRows(base);  // only today's completed classes
  };

  useEffect(() => {
    api.get("/courses?status=active").then((r) => setCourses(r.data || []));
    Promise.all([
      api.get("/users", { params: { role: "teacher" } }),
      api.get("/users", { params: { role: "admin" } }),
    ])
      .then(([t, a]) => setPeople([...(t.data || []), ...(a.data || [])]))
      .catch(() => setPeople([]));

    // initial load: ONLY today's completed classes
    loadRows({ start: today, end: today });
  }, []);

  const columns = [
    { key: "name", label: "Class" }, // NEW: class name
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "hours", label: "Hours" },
    { key: "hourlyRate", label: "Rate/hr" },
    { key: "confirmedAt", label: "Confirmed At" },
    { key: "paid", label: "Paid" },
  ];

  /* ----------------------------- helpers ----------------------------- */
  const fmtDate = (d) => {
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
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

  // If Start == End → that day; else if only Start → that day; else default today
  const billDay = useMemo(() => {
    if (filters.start && filters.end && filters.start === filters.end)
      return filters.start;
    if (filters.start && !filters.end) return filters.start;
    return today;
  }, [filters.start, filters.end]);

  const rowsForBill = useMemo(() => {
    const day = billDay;
    return rows.filter((r) => onlyDate(r.confirmedAt) === day);
  }, [rows, billDay]);

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

  /* ------------------------ mark paid + download ----------------------- */

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
    iframe.srcdoc = html; // avoids blob/object URLs → fewer blockers
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
          <td>${escapeHtml(it.name || "—")}</td>        <!-- NEW: class name -->
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
                <th>Class</th>           <!-- NEW header -->
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

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>BIGBANG • Daily Class Bill • ${billDay}</title>
<style>
  :root{ --text:#111827; --muted:#6b7280; --border:#e5e7eb; --primary:#6c7bff; }
  *{box-sizing:border-box}
  body{ font-family: Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial; color:var(--text); margin:0; }
  .sheet{ max-width: 900px; margin: 28px auto; padding: 24px 28px; border: 1px solid var(--border); border-radius: 12px; }
  .brand{ display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; }
  .brand .title{ font-size: 22px; font-weight: 900; letter-spacing:.2px; }
  .brand .meta{ text-align:right; font-size: 12px; color: var(--muted); }
  .badge{ display:inline-block; padding:4px 10px; border:1px solid var(--border); border-radius:999px; font-size:12px; color:#374151; background:#f9fafb }
  .totals{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin: 8px 0 18px; }
  .teacher-block{ margin: 18px 0; page-break-inside: avoid; }
  .teacher-head{ display:flex; gap:20px; align-items:center; margin: 8px 0 10px; }
  .bill-table{ width:100%; border-collapse: collapse; }
  .bill-table th, .bill-table td{ padding: 10px 12px; border: 1px solid var(--border); font-size: 13px; }
  .bill-table thead th{ background:#f3f4f6; text-align:left; }
  .bill-table .right{ text-align:right }
  .bill-table .num{ text-align:right; font-variant-numeric: tabular-nums; }
  .signatures{ display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 22px; }
  .sig .line{ height:1px; background:#111827; margin: 28px 0 6px; }
  .sig .cap{ font-size: 12px; color: var(--muted); }
  hr{ border:0; height:1px; background:var(--border); margin: 22px 0; }
  @media print { .sheet{ border:none; border-radius:0; margin:0; padding:0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div class="title">BIGBANG • Daily Class Bill</div>
      <div class="meta">
        <div><b>Date:</b> ${billDay}</div>
        <div><b>Generated:</b> ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <div class="totals">
      <span class="badge">Classes: ${rowsForBill.length}</span>
      <span class="badge">Teachers: ${teacherCount}</span>
      <span class="badge">Grand Total: <b>${money(grand)}</b></span>
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
    setDownloading(true);
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
      setDownloading(false);
    }
  };

  /* ----------------------------- UI ----------------------------- */

  const Actions = ({ className }) => (
    <div className={`filters-actions ${className || ""}`}>
      <Button
        variant="ghost"
        onClick={resetFilters}
        disabled={loading || downloading}
      >
        Reset
      </Button>
      <Button
        variant="ghost"
        onClick={() => loadRows(filters)}
        disabled={loading || downloading}
      >
        Apply Filters
      </Button>
      <Button
        onClick={onDownloadBill}
        disabled={loading || downloading || rowsForBill.length === 0}
      >
        {downloading ? "Processing…" : "Mark Paid & Download Bill (PDF)"}
      </Button>
    </div>
  );

  return (
    <div className="page page-completed">
      <PageHeader
        icon="/bigbang.svg"
        title="Completed Classes"
        meta={<div className="badge">Total: {rows.length}</div>}
      />

      {/* Toolbar: left = filters grid, right = desktop actions */}
      <Toolbar right={<Actions className="desktop" />}>
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
        </div>

        {/* Mobile actions appear BELOW the filters on small screens */}
        <Actions className="mobile" />
      </Toolbar>

      <Section>
        {rows.length === 0 ? (
          <Empty
            icon="📗"
            title={loading ? "Loading..." : "No completed classes for filters"}
          />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            renderCell={(c, row) => {
              if (c.key === "course") return row.course?.name || "-";
              if (c.key === "name")
                return row.name || <span className="subtle">—</span>; // NEW
              if (c.key === "confirmedAt")
                return row.confirmedAt
                  ? new Date(row.confirmedAt).toLocaleString()
                  : "-";
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
    </div>
  );
}
