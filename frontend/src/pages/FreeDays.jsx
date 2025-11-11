// frontend/src/pages/FreeDays.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import Empty from "../components/Empty";
import Button from "../components/Button";
import { Field } from "../components/Field";
import "../styles/pages/free-days.css";

/* ---------------------- helpers (Asia/Dhaka) ---------------------- */

// YYYY-MM-DD for Asia/Dhaka
function todayDhakaISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-");
  const [y, m, d] = parts;
  return `${y}-${m}-${d}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
function hourLabel(h) {
  const ampm = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  return `${String(h).padStart(2, "0")}:00 (${ampm})`;
}

/* ------------------------------ page ------------------------------ */

export default function FreeDays() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState([]);

  // form (single day)
  const [date, setDate] = useState(todayDhakaISO());
  const [fromHour, setFromHour] = useState(9);
  const [toHour, setToHour] = useState(12);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const { data } = await api.get("/free-days");
      setRows(data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load free days.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (Number(toHour) <= Number(fromHour)) {
      setErr("End time must be after start time.");
      return;
    }
    if (!date) {
      setErr("Pick a date.");
      return;
    }

    try {
      const { data } = await api.post("/free-days", {
        date,
        fromHour: Number(fromHour),
        toHour: Number(toHour),
      });
      if (data?.ok) setMsg("Saved.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to add free day.");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this free slot?")) return;
    await api.delete(`/free-days/${id}`);
    await load();
  };

  // Group (admins see all grouped by day; teacher already filtered by API)
  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const d = new Date(r.dateLocalUTC);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }, [rows]);

  return (
    <div className="page page-free-days">
      <PageHeader
        icon="/bigbang.svg"
        title="Free Days"
        description={
          isAdmin
            ? "All teachers’ upcoming free slots (Bangladesh time)"
            : "Add and manage your free slots (Bangladesh time)"
        }
        meta={<div className="badge">Items: {rows.length}</div>}
      />

      {/* Add form (single day) */}
      <Section
        title="Add Free Slot"
        description="Time is saved in Asia/Dhaka. You can add multiple windows for the same day."
      >
        <form onSubmit={add} className="free-form">
          <Field label="Date (BD)">
            <input
              type="date"
              min={todayDhakaISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="From">
            <select value={fromHour} onChange={(e) => setFromHour(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="To">
            <select value={toHour} onChange={(e) => setToHour(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </Field>
          <div className="full">
            {err ? (
              <span className="badge err" style={{ marginRight: 8 }}>
                {err}
              </span>
            ) : null}
            {msg ? (
              <span className="badge ok" style={{ marginRight: 8 }}>
                {msg}
              </span>
            ) : null}
            <Button disabled={loading}>Add</Button>
          </div>
        </form>
      </Section>

      {/* Day cards */}
      <Section title="Upcoming Free Slots">
        {rows.length === 0 ? (
          <Empty icon="📅" title={loading ? "Loading..." : "No upcoming free slots"} />
        ) : (
          <div className="day-grid">
            {(isAdmin
              ? grouped
              : (() => {
                  // teacher: group own rows same as admin view for consistency
                  const map = new Map();
                  rows.forEach((it) => {
                    const dayISO = new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Dhaka",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(it.dateLocalUTC));
                    if (!map.has(dayISO)) map.set(dayISO, []);
                    map.get(dayISO).push(it);
                  });
                  return Array.from(map.entries()).sort(([a], [b]) =>
                    a < b ? -1 : a > b ? 1 : 0
                  );
                })()
            ).map(([day, items]) => {
              const label = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                timeZone: "Asia/Dhaka",
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const dowFull = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                timeZone: "Asia/Dhaka",
                weekday: "long",
              });
              const sorted = [...items].sort((a, b) => a.fromHour - b.fromHour);

              return (
                <div key={day} className="day-card card">
                  <div className="day-card__head">
                    <div>
                      <div className="day-card__dow">{dowFull}</div>
                      <div className="day-card__date">{label}</div>
                    </div>
                    <div className="badge day-card__count">
                      {sorted.length} slot{sorted.length > 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="day-card__slots">
                    {sorted.map((it) => (
                      <div key={it._id} className="slot-pill">
                        <div className="slot-pill__main">
                          {isAdmin && (
                            <span className="slot-pill__who">{it.user?.name || "Unknown"}</span>
                          )}
                          <span className="slot-pill__time">
                            {hourLabel(it.fromHour)} → {hourLabel(it.toHour)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          className="slot-pill__btn"
                          onClick={() => remove(it._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
