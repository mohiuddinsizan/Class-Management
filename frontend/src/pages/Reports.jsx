// src/pages/Reports.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { Stat } from "../components/Stat";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import "../styles/pages/reports.css";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [byTeacher, setByTeacher] = useState([]);
  const [range, setRange] = useState({ start: "", end: "" });

  // all users (so we can map teacher ObjectId -> name + tpin)
  const [users, setUsers] = useState([]);
  const [downloading, setDownloading] = useState(false); // NEW

  const load = async (q = {}) => {
    const params = new URLSearchParams(
      Object.entries(q).filter(([_, v]) => v)
    );
    const { data } = await api.get(`/reports/summary?${params.toString()}`);
    setSummary(data.summary);
    setByTeacher(data.byTeacher);
  };

  useEffect(() => {
    // load report + users on mount
    load({});
    api
      .get("/users")
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]));
  }, []);

  // Build a lookup: teacherId (ObjectId) -> user object
  const teacherMap = useMemo(() => {
    const map = {};
    for (const u of users) {
      map[u._id] = u;
    }
    return map;
  }, [users]);

  // Enrich byTeacher rows with teacher TPIN + Name
  const enrichedByTeacher = useMemo(() => {
    return byTeacher.map((row) => {
      const teacher = teacherMap[row._id];
      return {
        ...row,
        teacherTpin: teacher?.tpin || "—",
        teacherName: teacher?.name || "Unknown",
      };
    });
  }, [byTeacher, teacherMap]);

  /* ----------------------------- helpers ----------------------------- */

  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

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

  const rangeLabel = useMemo(() => {
    const { start, end } = range;
    if (start && end && start === end) return start;
    if (start && end) return `${start} → ${end}`;
    if (start && !end) return `${start} → (open)`;
    if (!start && end) return `(open) → ${end}`;
    return "All Time";
  }, [range.start, range.end]);

  // Print via hidden iframe using srcdoc (same pattern as Completed page)
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
    iframe.srcdoc = html;
  };

  const buildReportHtml = () => {
    const totalClasses = summary?.totalClasses ?? 0;
    const totalHours = summary?.totalHours ?? 0;
    const totalAmount = summary?.totalAmount ?? 0;

    const rowsHtml = enrichedByTeacher
      .map((row, i) => {
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(row.teacherTpin || "—")}</td>
            <td>${escapeHtml(row.teacherName || "Unknown")}</td>
            <td class="num">${row.classes ?? 0}</td>
            <td class="num">${row.hours ?? 0}</td>
            <td class="num">${money(row.amount ?? 0)}</td>
          </tr>
        `;
      })
      .join("");

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>BIGBANG • Summary Report • ${escapeHtml(rangeLabel)}</title>
<style>
  :root{
    --text:#111827;
    --muted:#6b7280;
    --border:#e5e7eb;
    --primary:#6c7bff;
  }
  *{box-sizing:border-box;}
  body{
    font-family: Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial;
    color:var(--text);
    margin:0;
  }
  .sheet{
    max-width: 960px;
    margin: 28px auto;
    padding: 24px 28px;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .brand{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom: 18px;
  }
  .brand .title{
    font-size: 22px;
    font-weight: 900;
    letter-spacing:.2px;
  }
  .brand .meta{
    text-align:right;
    font-size: 12px;
    color: var(--muted);
  }
  .badge{
    display:inline-block;
    padding:4px 10px;
    border:1px solid var(--border);
    border-radius:999px;
    font-size:12px;
    color:#374151;
    background:#f9fafb;
  }
  .stats{
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 10px 0 24px;
  }
  .stat-card{
    border-radius: 10px;
    border: 1px solid var(--border);
    padding: 12px 14px;
    background: #f9fafb;
  }
  .stat-label{
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .stat-value{
    font-size: 20px;
    font-weight: 700;
  }

  .table-wrap{ margin-top: 8px; }
  table{
    width:100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th, td{
    padding: 8px 10px;
    border:1px solid var(--border);
  }
  thead th{
    background:#f3f4f6;
    text-align:left;
  }
  .num{
    text-align:right;
    font-variant-numeric: tabular-nums;
  }
  .tfoot-total td{
    font-weight: 700;
    background:#f9fafb;
  }
  @media print{
    .sheet{
      border:none;
      border-radius:0;
      margin:0;
      padding:0;
    }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div class="title">BIGBANG • Summary Report</div>
      <div class="meta">
        <div><b>Range:</b> ${escapeHtml(rangeLabel)}</div>
        <div><b>Generated:</b> ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <div class="badge">Overview</div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Classes</div>
        <div class="stat-value">${totalClasses}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Hours</div>
        <div class="stat-value">${totalHours}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Amount</div>
        <div class="stat-value">${money(totalAmount)}</div>
      </div>
    </div>

    <div class="badge">By Teacher</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>TPIN</th>
            <th>Teacher</th>
            <th>Classes</th>
            <th>Hours</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6" style="text-align:center; padding:16px;">No data for this range.</td></tr>`}
        </tbody>
        <tfoot>
          <tr class="tfoot-total">
            <td colspan="3">Totals</td>
            <td class="num">${totalClasses}</td>
            <td class="num">${totalHours}</td>
            <td class="num">${money(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</body>
</html>
    `;
  };

  const onDownloadPdf = () => {
    if (!summary && (!enrichedByTeacher || enrichedByTeacher.length === 0)) {
      alert("No data to export for this range.");
      return;
    }
    setDownloading(true);
    try {
      const html = buildReportHtml();
      printViaIframe(html);
    } finally {
      setDownloading(false);
    }
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="page page-reports">
      <PageHeader icon={null} title="Reports" meta={null} />

      <Section>
        <div className="reports-toolbar">
          <div className="reports-filters">
            <label className="subtle">
              Start
              <input
                type="date"
                value={range.start}
                onChange={(e) =>
                  setRange((s) => ({ ...s, start: e.target.value }))
                }
              />
            </label>
            <label className="subtle">
              End
              <input
                type="date"
                value={range.end}
                onChange={(e) =>
                  setRange((s) => ({ ...s, end: e.target.value }))
                }
              />
            </label>
          </div>

          <div className="reports-actions">
            <Button onClick={() => load(range)} disabled={downloading}>
              Run
            </Button>
            <Button
              onClick={onDownloadPdf}
              disabled={downloading || (!summary && enrichedByTeacher.length === 0)}
              style={{ marginLeft: 8 }}
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </Section>

      <div className="reports-stats">
        <div className="card">
          <div className="subtle">Total Classes</div>
          <div className="h3" style={{ fontSize: "22px" }}>
            {summary?.totalClasses ?? 0}
          </div>
        </div>
        <div className="card">
          <div className="subtle">Total Hours</div>
          <div className="h3" style={{ fontSize: "22px" }}>
            {summary?.totalHours ?? 0}
          </div>
        </div>
        <div className="card">
          <div className="subtle">Total Amount</div>
          <div className="h3" style={{ fontSize: "22px" }}>
            {summary?.totalAmount ?? 0}
          </div>
        </div>
      </div>

      <Section title="By Teacher">
        <Table
          columns={[
            { key: "teacherTpin", label: "TPIN" },
            { key: "teacherName", label: "Teacher" },
            { key: "classes", label: "Classes" },
            { key: "hours", label: "Hours" },
            { key: "amount", label: "Amount" },
          ]}
          rows={enrichedByTeacher}
        />
      </Section>
    </div>
  );
}
