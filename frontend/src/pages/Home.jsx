// src/pages/Home.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import { Stat } from "../components/Stat";
import Empty from "../components/Empty";
import Button from "../components/Button";
import "../styles/pages/home.css";

export default function Home(){
  const [courses, setCourses] = useState([]);
  const [view, setView] = useState("active"); // "active" | "archived"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null); // disable per-card actions while operating

  // progress map: { [courseId]: numberOfCompletedClasses }
  const [completedMap, setCompletedMap] = useState({});

  const abortRef = useRef(null);

  const fetchCourses = async (which = view)=>{
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr("");
    try{
      const { data } = await api.get(`/courses?status=${which}`, { signal: controller.signal });
      setCourses(data || []);

      // fetch completed counts per course (parallel)
      // uses the same endpoint as CourseDetail
      const entries = await Promise.all(
        (data || []).map(async (c) => {
          try{
            const res = await api.get(`/classes/completed?courseId=${c._id}`);
            return [String(c._id), Array.isArray(res.data) ? res.data.length : 0];
          }catch{
            return [String(c._id), 0];
          }
        })
      );
      const map = Object.fromEntries(entries);
      setCompletedMap(map);
    }catch(e){
      if (e.name !== "CanceledError" && e.name !== "AbortError") {
        setErr(e?.response?.data?.error || "Failed to load courses.");
      }
    }finally{
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses("active"); return () => abortRef.current?.abort(); /* eslint-disable-next-line */ }, []);

  const hasAssignees = (c) => (c.assignedTeachers?.length || 0) > 0;
  const assigneeNames = (c) => (c.assignedTeachers || []).map(p => p.name).join(", ");

  const archive = async (id)=>{
    setBusyId(id);
    try{ await api.patch(`/courses/${id}/archive`); await fetchCourses(view); }
    finally{ setBusyId(null); }
  };
  const unarchive = async (id)=>{
    setBusyId(id);
    try{ await api.patch(`/courses/${id}/unarchive`); await fetchCourses(view); }
    finally{ setBusyId(null); }
  };
  const removeCourse = async (id)=>{
    if(!confirm("Delete this course permanently?")) return;
    setBusyId(id);
    try{ await api.delete(`/courses/${id}`); await fetchCourses(view); }
    finally{ setBusyId(null); }
  };

  // tiny inline progress bar component (no new CSS files needed)
  const ProgressBar = ({ total, done }) => {
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return (
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-12)", color: "var(--muted)" }}>
          <span>Progress</span>
          <span>{done}/{total} ({pct}%)</span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "#0f1330",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
          aria-label={`Course progress ${pct}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
              boxShadow: "0 8px 24px rgba(108,123,255,.25) inset",
              transition: "width .25s ease",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="page page-home">
      <PageHeader
        icon="/bigbang.svg"
        title="Courses"
        meta={<div className="badge">{view === "archived" ? "Archived" : "Active"}: {courses.length}</div>}
        actions={
          <div className="row" style={{gap:8, flexWrap:"wrap"}}>
            <Button
              variant="ghost"
              onClick={()=>{ setView("active"); fetchCourses("active"); }}
              disabled={loading && view==="active"}
            >
              Active
            </Button>
            <Button
              variant="ghost"
              onClick={()=>{ setView("archived"); fetchCourses("archived"); }}
              disabled={loading && view==="archived"}
            >
              Archived
            </Button>
            {view==="active" && <Link to="/courses/new" className="btn btn-primary">Create Course</Link>}
          </div>
        }
      />

      {view==="active" && (
        <div className="home-stats">
          <Stat label="Active Courses" value={courses.length} />
          <Stat label="With Assignees" value={courses.reduce((n,c)=> n + (hasAssignees(c) ? 1 : 0), 0)} />
          <Stat label="Unassigned" value={courses.reduce((n,c)=> n + (!hasAssignees(c) ? 1 : 0), 0)} />
        </div>
      )}

      <Section
        title={view==="archived" ? "Archived Courses" : "All Active Courses"}
        description={view==="archived"
          ? "Courses removed from the homepage. You can unarchive or delete them."
          : "Open a course to assign classes, and review pending or completed sessions."
        }
        actions={view==="active" ? <Link to="/courses/new" className="btn btn-ghost">New Course</Link> : null}
      >
        {err && (
          <div className="badge err" style={{marginBottom:12}}>
            {err} <Button variant="ghost" onClick={()=>fetchCourses(view)} style={{marginLeft:8}}>Retry</Button>
          </div>
        )}

        {loading && courses.length===0 ? (
          <Empty icon="⌛" title="Loading courses..." />
        ) : courses.length === 0 ? (
          <Empty
            icon={view==="archived" ? "🗄️" : "📚"}
            title={view==="archived" ? "No archived courses" : "No active courses"}
            note={view==="active" ? "Use “Create Course” to add your first course." : undefined}
          />
        ) : (
          <div className="home-grid">
            {courses.map(c => {
              const isBusy = busyId === c._id;
              const total = Number(c.numberOfClasses || 0);
              const done = Number(completedMap[String(c._id)] || 0);

              return (
                <div key={c._id} className="card" style={{ display: "grid", gap: 14 }}>
                  <div className="h3">{c.name}</div>
                  <div className="subtle">{c.subjects?.length ? c.subjects.join(", ") : "—"}</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div className="badge">Classes: {c.numberOfClasses}</div>
                    <div className="badge">{hasAssignees(c) ? `People: ${assigneeNames(c)}` : "Unassigned"}</div>
                  </div>

                  {/* Progress */}
                  <ProgressBar total={total} done={done} />

                  <div className="row" style={{gap:8, flexWrap:"wrap"}}>
                    <Link to={`/courses/${c._id}`} className={`btn btn-primary ${isBusy ? "disabled" : ""}`} style={{ justifySelf: "start" }}>
                      Open
                    </Link>

                    {view==="active" ? (
                      <>
                        <Button variant="ghost" onClick={()=>archive(c._id)} disabled={isBusy}>
                          {isBusy ? "Archiving…" : "Archive"}
                        </Button>
                        <Button variant="ghost" onClick={()=>removeCourse(c._id)} disabled={isBusy}>
                          {isBusy ? "Deleting…" : "Delete"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={()=>unarchive(c._id)} disabled={isBusy}>
                          {isBusy ? "Unarchiving…" : "Unarchive"}
                        </Button>
                        <Button variant="ghost" onClick={()=>removeCourse(c._id)} disabled={isBusy}>
                          {isBusy ? "Deleting…" : "Delete"}
                        </Button>
                      </>
                    )}
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
