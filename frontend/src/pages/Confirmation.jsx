// src/pages/Confirmation.jsx
import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Toolbar from "../components/Toolbar";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import Empty from "../components/Empty";
import "../styles/pages/confirmation.css";

export default function Confirmation() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/classes/confirmation");
      const sorted = [...data].sort((a, b) => {
        const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return tb - ta;
      });
      setRows(sorted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmOne = async (id) => {
    setLoading(true);
    try {
      await api.patch(`/classes/${id}/confirm`);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const confirmAll = async () => {
    if (rows.length === 0) return;
    if (!confirm(`Confirm ${rows.length} class(es)?`)) return;
    setLoading(true);
    try {
      await Promise.all(rows.map((r) => api.patch(`/classes/${r._id}/confirm`)));
      await load();
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: "name", label: "Class" },
    { key: "course", label: "Course" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherTpin", label: "TPIN" },
    { key: "hours", label: "Hours" },
    { key: "hourlyRate", label: "Rate/hr" },
    { key: "completedAt", label: "Completed At" },
    { key: "_actions", label: "Actions" },
  ];

  return (
    <div
      className="page page-confirmation"
      style={{
        height: "100vh",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PageHeader
        title="Confirmation Queue"
        meta={<div className="badge">Waiting: {rows.length}</div>}
        // ❌ no actions here – keeps header compact on mobile
      />

      <Toolbar
        left={
          rows.length > 0 ? (
            <div className="subtle">
              {loading
                ? "Loading…"
                : "Teacher-completed classes awaiting admin confirmation"}
            </div>
          ) : (
            <div className="subtle">
              {loading
                ? "Loading…"
                : "No classes currently waiting for confirmation"}
            </div>
          )
        }
        right={
          rows.length > 0 ? (
            <Button onClick={confirmAll} disabled={loading}>
              Confirm All
            </Button>
          ) : null
        }
      />

      {/* Scrollable main content area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        <Section>
          {rows.length === 0 ? (
            <Empty
              icon="✅"
              title={loading ? "Loading..." : "Nothing to confirm"}
            />
          ) : (
            <Table
              columns={columns}
              rows={rows}
              renderCell={(c, row) => {
                if (c.key === "course") return row.course?.name || "-";
                if (c.key === "name")
                  return row.name || <span className="subtle">—</span>;
                if (c.key === "completedAt")
                  return row.completedAt
                    ? new Date(row.completedAt).toLocaleString()
                    : "-";
                if (c.key === "_actions") {
                  return (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="ghost"
                        disabled={loading}
                        onClick={() => confirmOne(row._id)}
                      >
                        Confirm
                      </Button>
                    </div>
                  );
                }
                return row[c.key];
              }}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
