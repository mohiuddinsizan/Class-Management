// src/pages/Tours.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import { Field } from "../components/Field";
import Empty from "../components/Empty";
import "../styles/pages/tours.css";

const today = new Date().toISOString().slice(0, 10);

export default function Tours() {
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    userId: "",
    start: "",
    end: "",
    minBudget: "",
    maxBudget: "",
  });

  // Create form
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: today,
    endDate: today,
    users: [],
    budgetGiven: "",
    budgetCompleted: "",
    notes: "",
  });

  // Fancy dropdown (multi-select)
  const [openPeople, setOpenPeople] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const triggerRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/users", { params: { role: "admin" } }),
      api.get("/users", { params: { role: "teacher" } }),
      api.get("/users", { params: { role: "editor" } }),
    ])
      .then(([a, t, e]) =>
        setPeople([...(a.data || []), ...(t.data || []), ...(e.data || [])])
      )
      .catch(() => setPeople([]));

    loadTours({});
  }, []);

  const loadTours = async (q) => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams(
        Object.entries(q || {}).filter(([_, v]) => v !== "" && v != null)
      );
      const { data } = await api.get(`/tours?${params.toString()}`);
      setRows(data || []);
    } catch (ex) {
      setErr(ex?.response?.data?.error || "Failed to load tours.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const base = {
      userId: "",
      start: "",
      end: "",
      minBudget: "",
      maxBudget: "",
    };
    setFilters(base);
    loadTours(base);
  };

  // dropdown pos
  useEffect(() => {
    function updatePosition() {
      if (!openPeople || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownRect({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    }
    if (openPeople) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openPeople]);

  const togglePerson = (id) => {
    setForm((s) => {
      const has = s.users.includes(id);
      return {
        ...s,
        users: has ? s.users.filter((x) => x !== id) : [...s.users, id],
      };
    });
  };

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return people;
    return (people || []).filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q) ||
        String(p.tpin || "").toLowerCase().includes(q)
      );
    });
  }, [people, peopleQuery]);

  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
    });

  const submitCreate = async (e) => {
    e?.preventDefault?.();
    setErr("");
    setCreating(true);
    try {
      const payload = {
        name: String(form.name || "").trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        users: form.users,
        budgetGiven: Number(form.budgetGiven || 0),
        budgetCompleted: Number(form.budgetCompleted || 0),
        notes: String(form.notes || ""),
      };
      if (!payload.name) throw new Error("Name is required.");
      if (!payload.startDate || !payload.endDate)
        throw new Error("Start and End date are required.");

      await api.post("/tours", payload);
      setOpenCreate(false);
      setForm({
        name: "",
        startDate: today,
        endDate: today,
        users: [],
        budgetGiven: "",
        budgetCompleted: "",
        notes: "",
      });
      await loadTours(filters);
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex.message || "Failed to create tour.");
    } finally {
      setCreating(false);
    }
  };

  const updateBudgetCompleted = async (row, value) => {
    setBusyId(row._id);
    try {
      await api.patch(`/tours/${row._id}`, {
        budgetCompleted: Number(value || 0),
      });
      await loadTours(filters);
    } finally {
      setBusyId(null);
    }
  };

  const removeTour = async (id) => {
    if (!confirm("Delete this tour permanently?")) return;
    setBusyId(id);
    try {
      await api.delete(`/tours/${id}`);
      await loadTours(filters);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { key: "name", label: "Tour" },
    { key: "dates", label: "Dates" },
    { key: "users", label: "Users" },
    { key: "budgetGiven", label: "Budget Given" },
    { key: "budgetCompleted", label: "Budget Completed (editable)" },
    { key: "actions", label: "Actions" },
  ];

  return (
    <div className="page page-tours">
      {/* Lock the content area at viewport height (no outer scroll on desktop) */}
      <style>{`
        :root { --appbar-h: 64px; }
        .content { overflow: hidden; } /* ensure only inner list scrolls */
      `}</style>

      <PageHeader
        title="Tour Management"
        meta={<div className="badge">Total: {rows.length}</div>}
        actions={
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => setOpenCreate((v) => !v)}>
              {openCreate ? "Close" : "Add New Tour"}
            </Button>
          </div>
        }
      />

      {/* Top controls (non-scroll) */}
      <div className="tours-top">
        <Section title="Filters">
          <div className="filters-grid">
            <Field label="User">
              <select
                value={filters.userId}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, userId: e.target.value }))
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

            <Field label="Start (from)">
              <input
                type="date"
                value={filters.start}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, start: e.target.value }))
                }
              />
            </Field>

            <Field label="End (to)">
              <input
                type="date"
                value={filters.end}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, end: e.target.value }))
                }
              />
            </Field>

            <Field label="Min Budget">
              <input
                type="number"
                value={filters.minBudget}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, minBudget: e.target.value }))
                }
                placeholder="e.g., 1000"
              />
            </Field>
            <Field label="Max Budget">
              <input
                type="number"
                value={filters.maxBudget}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, maxBudget: e.target.value }))
                }
                placeholder="e.g., 5000"
              />
            </Field>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={resetFilters} disabled={loading}>
              Reset
            </Button>
            <Button onClick={() => loadTours(filters)} disabled={loading}>
              Apply Filters
            </Button>
          </div>
        </Section>

        {openCreate && (
          <Section
            title="Add New Tour"
            description="Create a new tour. Budgets can be adjusted later."
          >
            <form onSubmit={submitCreate} className="tours-create-form">
              <Field label="Tour name">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="e.g., Dhaka Roadshow"
                />
              </Field>

              <Field label="From date">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, startDate: e.target.value }))
                  }
                />
              </Field>

              <Field label="To date">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, endDate: e.target.value }))
                  }
                />
              </Field>

              {/* People multi-select */}
              <div className="full">
                <div className="h3" style={{ marginBottom: "var(--sp-2)" }}>
                  Select participants
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={() => setOpenPeople((v) => !v)}
                    className="people-trigger"
                  >
                    <span style={{ fontWeight: 700 }}>
                      {form.users.length > 0
                        ? `${form.users.length} selected`
                        : "Select users"}
                    </span>
                    <span className="people-hint">
                      admins, teachers, editors
                    </span>
                  </button>
                </div>
              </div>

              <Field label="Given budget">
                <input
                  type="number"
                  value={form.budgetGiven}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, budgetGiven: e.target.value }))
                  }
                  placeholder="e.g., 5000"
                />
              </Field>

              <Field label="Completed budget (editable later)">
                <input
                  type="number"
                  value={form.budgetCompleted}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      budgetCompleted: e.target.value,
                    }))
                  }
                  placeholder="e.g., 4500"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, notes: e.target.value }))
                  }
                  placeholder="Optional notes..."
                />
              </Field>

              <div className="form-actions">
                <Button className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Tour"}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>

              {err && (
                <div className="badge err full" style={{ marginTop: 8 }}>
                  {err}
                </div>
              )}
            </form>

            {/* DROPDOWN PORTAL-STYLE */}
            {openPeople && dropdownRect && (
              <div
                className="people-dropdown"
                style={{
                  position: "fixed",
                  left: dropdownRect.left,
                  top: dropdownRect.top,
                  width: dropdownRect.width,
                }}
              >
                <div className="people-search">
                  <input
                    placeholder="Search name, role, or TPIN..."
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                  />
                </div>

                <div className="people-list">
                  {people.length === 0 && (
                    <div className="people-empty">No eligible users.</div>
                  )}
                  {people.length > 0 && filteredPeople.length === 0 && (
                    <div className="people-empty">No matches.</div>
                  )}

                  {filteredPeople.map((t) => {
                    const selected = form.users?.includes(t._id);
                    return (
                      <label
                        key={t._id}
                        className={`people-row ${selected ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePerson(t._id)}
                          className="people-native"
                        />
                        <span className="people-box" aria-hidden>
                          {selected && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                        <div className="people-meta">
                          <div className="people-name" title={t.name}>
                            {t.name}
                          </div>
                          <div className="people-sub">
                            <span>{t.role}</span>
                            <span>TPIN {t.tpin}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="people-footer">
                  <span className="people-count">
                    {form.users.length} selected
                  </span>
                  <div className="people-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((s) => ({ ...s, users: [] }))
                      }
                      className="btn-small ghost"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenPeople(false)}
                      className="btn-small primary"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}
      </div>

      {/* LIST PANE — ONLY this area scrolls (desktop) */}
      <Section
        title="Existing Tours"
        className="list-section"
        description="Scroll inside this list; the page stays locked."
      >
        <div className="list-scroll">
          {loading && rows.length === 0 ? (
            <Empty icon="🧭" title="Loading tours..." />
          ) : rows.length === 0 ? (
            <Empty icon="🧭" title="No tours found" />
          ) : (
            <Table
              columns={columns}
              rows={rows}
              renderCell={(c, row) => {
                if (c.key === "name") return row.name || "-";
                if (c.key === "dates")
                  return `${fmtDate(row.startDate)} → ${fmtDate(row.endDate)}`;
                if (c.key === "users") {
                  const list = row.users || [];
                  if (list.length === 0)
                    return <span className="subtle">—</span>;
                  const names = list.map((u) => u.name).join(", ");
                  return <span title={names}>{list.length} user(s)</span>;
                }
                if (c.key === "budgetGiven") return money(row.budgetGiven);
                if (c.key === "budgetCompleted") {
                  const isBusy = busyId === row._id;
                  return (
                    <div className="inline-edit">
                      <input
                        type="number"
                        defaultValue={row.budgetCompleted || 0}
                        disabled={isBusy}
                        onBlur={(e) => {
                          const val = Number(e.target.value || 0);
                          if (val !== Number(row.budgetCompleted || 0)) {
                            updateBudgetCompleted(row, val);
                          }
                        }}
                      />
                      {isBusy && <span className="saving">Saving…</span>}
                    </div>
                  );
                }
                if (c.key === "actions")
                  return (
                    <div className="row" style={{ gap: 8 }}>
                      <Button
                        variant="ghost"
                        onClick={() => removeTour(row._id)}
                        disabled={busyId === row._id}
                      >
                        {busyId === row._id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  );
                return row[c.key];
              }}
            />
          )}
        </div>
      </Section>
    </div>
  );
}
