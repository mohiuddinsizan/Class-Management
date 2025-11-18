import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import { Field } from "../components/Field";
import Button from "../components/Button";
import "../styles/pages/course-create.css";

export default function CourseCreate() {
  const nav = useNavigate();
  const [people, setPeople] = useState([]); // teachers + admins

  const [form, setForm] = useState({
    name: "",
    numberOfClasses: 0,
    subjects: "",
    assignedTeachers: [], // array of ids
  });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // dropdown UI
  const [openPeople, setOpenPeople] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [dropdownRect, setDropdownRect] = useState(null);

  const triggerRef = useRef(null);

  useEffect(() => {
    // fetch BOTH roles
    Promise.all([
      api.get("/users", { params: { role: "teacher" } }),
      api.get("/users", { params: { role: "admin" } }),
    ]).then(([t, a]) => setPeople([...(t.data || []), ...(a.data || [])]));
  }, []);

  // recalc dropdown position when opened / resize / scroll
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
      const has = s.assignedTeachers.includes(id);
      return {
        ...s,
        assignedTeachers: has
          ? s.assignedTeachers.filter((x) => x !== id)
          : [...s.assignedTeachers, id],
      };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const payload = {
      name: form.name.trim(),
      numberOfClasses: Number(form.numberOfClasses),
      subjects: form.subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      assignedTeachers: form.assignedTeachers,
    };

    if (!payload.name) {
      setErr("Name is required.");
      return;
    }

    try {
      const { data } = await api.post("/courses", payload);
      nav(`/courses/${data._id}`);
    } catch (ex) {
      setErr(ex?.response?.data?.error || "Failed to create course.");
    }
  };

  const selectedCount = form.assignedTeachers.length;

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return people;
    return (people || []).filter((t) => {
      return (
        (t.name || "").toLowerCase().includes(q) ||
        (t.role || "").toLowerCase().includes(q) ||
        String(t.tpin || "").toLowerCase().includes(q)
      );
    });
  }, [people, peopleQuery]);

  return (
    <div className="page page-course-create">
      <PageHeader title="Create Course" />
      <Section description="Add a new course. You can edit everything later.">
        <form onSubmit={submit} className="course-create-form">
          <Field label="Course name">
            <input
              value={form.name}
              onChange={(e) =>
                setForm((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="e.g., IELTS Batch A"
            />
          </Field>

          <Field label="Number of classes">
            <input
              type="number"
              value={form.numberOfClasses}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  numberOfClasses: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Subjects (comma separated)">
            <input
              value={form.subjects}
              onChange={(e) =>
                setForm((s) => ({ ...s, subjects: e.target.value }))
              }
              placeholder="English, Math, ..."
            />
          </Field>

          {/* Assigned people dropdown */}
          <div className="full">
            <div className="h3" style={{ marginBottom: "var(--sp-2)" }}>
              Assign people (teachers or admins)
            </div>

            <div style={{ position: "relative" }}>
              {/* Trigger */}
              <button
                type="button"
                ref={triggerRef}
                onClick={() => setOpenPeople((v) => !v)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background:
                    "linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "var(--elev-1)",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : "Select people"}
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-12)",
                    color: "var(--muted)",
                    background: "#141838",
                    border: "1px solid var(--border)",
                    padding: "2px 10px",
                    borderRadius: 999,
                  }}
                >
                  teachers & admins
                </span>
              </button>
            </div>
          </div>

          <div className="form-actions">
            <Button className="btn btn-primary">Create Course</Button>
          </div>

          {err && (
            <div className="badge err full" style={{ marginTop: 8 }}>
              {err}
            </div>
          )}
          {msg && (
            <div className="badge ok full" style={{ marginTop: 8 }}>
              {msg}
            </div>
          )}
        </form>
      </Section>

      {/* DROPDOWN PORTAL-STYLE (FIXED, ON TOP OF EVERYTHING) */}
      {openPeople && dropdownRect && (
        <div
          style={{
            position: "fixed",
            left: dropdownRect.left,
            top: dropdownRect.top,
            width: dropdownRect.width,
            maxHeight: "60vh",
            background:
              "linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--elev-3)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: "10px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}
          >
            <input
              placeholder="Search name, role, or TPIN..."
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                background: "#0f1330",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: "calc(60vh - 90px)", overflowY: "auto" }}>
            {people.length === 0 && (
              <div
                style={{
                  padding: 14,
                  color: "var(--muted)",
                  fontSize: "var(--fs-13)",
                }}
              >
                No eligible users.
              </div>
            )}
            {people.length > 0 && filteredPeople.length === 0 && (
              <div
                style={{
                  padding: 14,
                  color: "var(--muted)",
                  fontSize: "var(--fs-13)",
                }}
              >
                No matches.
              </div>
            )}

            {filteredPeople.map((t) => {
              const selected = form.assignedTeachers?.includes(t._id);
              return (
                <label
                  key={t._id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border)",
                    background: selected ? "#101538" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {/* native checkbox hidden; custom visual shown */}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePerson(t._id)}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      pointerEvents: "none",
                      width: 0,
                      height: 0,
                    }}
                  />
                  <span
                    aria-hidden
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: selected
                        ? "1px solid transparent"
                        : "1px solid var(--border)",
                      background: selected
                        ? "linear-gradient(135deg, var(--primary), var(--primary-2))"
                        : "#0f1330",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: selected ? "var(--elev-2)" : "none",
                    }}
                  >
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

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text)",
                        fontSize: "var(--fs-14)",
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={t.name}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "baseline",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--fs-12)",
                          color: "var(--muted)",
                        }}
                      >
                        {t.role}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--fs-12)",
                          color: "var(--muted)",
                        }}
                      >
                        TPIN {t.tpin}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--surface-2)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: "var(--fs-12)",
                color: "var(--muted)",
              }}
            >
              {selectedCount} selected
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() =>
                  setForm((s) => ({ ...s, assignedTeachers: [] }))
                }
                style={{
                  border: "1px solid var(--border)",
                  background: "#0f1330",
                  color: "var(--muted)",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpenPeople(false)}
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary), var(--primary-2))",
                  color: "#fff",
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  boxShadow: "var(--elev-2)",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
