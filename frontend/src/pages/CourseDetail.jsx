// src/pages/CourseDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import { Tabs } from "../components/Tabs";
import Table from "../components/Table";
import Button from "../components/Button";
import { Field } from "../components/Field";
import Empty from "../components/Empty";
import "../styles/pages/course.css";           // layout + form actions
import "../styles/pages/course-create.css";    // people chips (kept for other pages)

export default function CourseDetail(){
  const { id } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [teachers, setTeachers] = useState([]); // teachers + admins
  const [assignErr, setAssignErr] = useState("");

  const user = useMemo(()=>JSON.parse(localStorage.getItem("user")||"null"),[]);
  const isAdmin = user?.role === "admin";

  // assign form
  const [className, setClassName] = useState("");       // session name
  const [teacherId, setTeacherId] = useState("");
  const [tpin, setTpin] = useState("");
  const [hours, setHours] = useState(1.5);
  const [rate, setRate] = useState(600);

  // edit form (course)
  const [edit, setEdit] = useState({
    name:"",
    numberOfClasses:0,
    subjects:"",
    assignedTeachers:[]
  });

  // UI-only for multi-select dropdown (inline styles only)
  const [openPeople, setOpenPeople] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");

  // ✅ Shared style for any "row of buttons/badges" to prevent collapsing
  const rowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,                 // horizontal + vertical spacing
    alignItems: "center",
  };

  // ✅ Scroll box style so pending/completed lists don't grow the box
  const scrollBoxStyle = {
    maxHeight: 320,         // tweak if you want taller/shorter
    overflowY: "auto",
  };

  const load = async ()=>{
    // fetch course (active+archived so deep links always work)
    const active = await api.get("/courses?status=active");
    const archived = await api.get("/courses?status=archived").catch(()=>({data:[]}));
    const all = [...active.data, ...archived.data];
    const cur = all.find(c=> String(c._id) === String(id));
    setCourse(cur || null);

    if (cur) {
      setEdit({
        name: cur.name || "",
        numberOfClasses: cur.numberOfClasses || 0,
        subjects: (cur.subjects || []).join(", "),
        assignedTeachers: (cur.assignedTeachers || []).map(u => u._id)
      });
    }

    // lists
    const p = await api.get("/classes/pending");
    setPending(p.data.filter(x=> String(x.course?._id||x.course) === String(id)));
    const c = await api.get(`/classes/completed?courseId=${id}`);
    setCompleted(c.data);

    // eligible assignees = teachers + admins
    if (isAdmin) {
      const [t, a] = await Promise.all([
        api.get("/users",{ params:{ role:"teacher" }}),
        api.get("/users",{ params:{ role:"admin" }})
      ]);
      setTeachers([...(t.data||[]), ...(a.data||[])]);
    }
  };
  useEffect(()=>{ load(); },[id]);

  useEffect(()=>{
    const sel = teachers.find(t=> String(t._id) === String(teacherId));
    setTpin(sel?.tpin || "");
  },[teacherId, teachers]);

  /* ------------------------------- actions ------------------------------- */
  const assign = async (e)=>{
    e.preventDefault();
    setAssignErr("");
    const payload = {
      courseId:id,
      teacherId,
      name: className.trim(),
      hours:Number(hours),
      hourlyRate:Number(rate)
    };
    if (!payload.name) {
      setAssignErr("Please enter a class name.");
      return;
    }
    try {
      await api.post("/classes/assign", payload);
      setClassName(""); setTeacherId(""); setTpin(""); setHours(1.5); setRate(600);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to assign class";
      setAssignErr(msg);
    }
  };

  const saveCourse = async (e)=>{
    e.preventDefault();
    const payload = {
      name: edit.name.trim(),
      numberOfClasses: Number(edit.numberOfClasses),
      subjects: edit.subjects.split(",").map(s=>s.trim()).filter(Boolean),
      assignedTeachers: edit.assignedTeachers || []
    };
    await api.patch(`/courses/${id}`, payload);
    await load();
  };

  const archive = async ()=>{ await api.patch(`/courses/${id}/archive`); await load(); };
  const unarchive = async ()=>{ await api.patch(`/courses/${id}/unarchive`); await load(); };
  const removeCourse = async ()=>{
    if (!confirm("Delete this course permanently?")) return;
    await api.delete(`/courses/${id}`);
    nav("/");
  };

  const markComplete = async (clsId)=>{ await api.patch(`/classes/${clsId}/complete`); await load(); };
  const removePending = async (clsId)=>{ await api.delete(`/classes/${clsId}`); await load(); };

  const isEmpty = (arr)=> !arr || arr.length===0;

  /* ----------------------------- tables/tabs ----------------------------- */
  const PendingTable = (
    isEmpty(pending) ? (
      <Empty icon="⏳" title="No pending classes"/>
    ) : (
      <div style={scrollBoxStyle}>
        <Table
          columns={[
            {key:"name",label:"Class"},
            {key:"teacherName",label:"Teacher"},
            {key:"teacherTpin",label:"TPIN"},
            {key:"hours",label:"Hours"},
            ...(isAdmin ? [{key:"hourlyRate",label:"Rate/hr"}] : []),
            {key:"_actions",label:"Actions"}
          ]}
          rows={pending}
          renderCell={(c,row)=>{
            if(c.key==="_actions"){
              return (
                <div className="row" style={rowStyle}>
                  <Button variant="ghost" onClick={()=>markComplete(row._id)}>Complete</Button>
                  {isAdmin && <Button variant="ghost" onClick={()=>removePending(row._id)}>Delete</Button>}
                </div>
              );
            }
            if (c.key === "name") return row.name || <span className="subtle">—</span>;
            return row[c.key];
          }}
        />
      </div>
    )
  );

  const CompletedTable = (
    isEmpty(completed) ? (
      <Empty icon="✅" title="No completed classes"/>
    ) : (
      <div style={scrollBoxStyle}>
        <Table
          columns={[
            {key:"name",label:"Class"},
            {key:"teacherName",label:"Teacher"},
            {key:"teacherTpin",label:"TPIN"},
            {key:"hours",label:"Hours"},
            ...(isAdmin ? [{key:"hourlyRate",label:"Rate/hr"}] : []),
            {key:"confirmedAt",label:"Confirmed At"},
            {key:"paid",label:"Paid"}
          ]}
          rows={completed}
          renderCell={(c,row)=>{
            if(c.key==="confirmedAt") return row.confirmedAt ? new Date(row.confirmedAt).toLocaleString() : "-";
            if(c.key==="paid") return row.paid ? <span className="badge ok">Paid</span> : <span className="badge warn">Unpaid</span>;
            if (c.key === "name") return row.name || <span className="subtle">—</span>;
            return row[c.key];
          }}
        />
      </div>
    )
  );

  /* -------------------------------- view -------------------------------- */
  const assignedNames = (course?.assignedTeachers || []).map(p=>p.name).join(", ");
  const assignedBadge = (course?.assignedTeachers?.length || 0) > 0
    ? `People: ${assignedNames}`
    : "Unassigned";

  const selectedCount = edit.assignedTeachers?.length || 0;
  const filteredTeachers = (teachers || []).filter(t => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.role || "").toLowerCase().includes(q) ||
      String(t.tpin || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="page page-course">
      <PageHeader
        // icon="/bigbang.svg"
        title={course?.name || "Course"}
        meta={
          <div className="row" style={rowStyle}>
            <div className="badge">
              {course?.status==="archived" ? "Archived" : "Active"} · Classes: {course?.numberOfClasses ?? 0}
            </div>
            <div className="badge">{assignedBadge}</div>
          </div>
        }
        actions={isAdmin && (
          <div className="row" style={rowStyle}>
            {course?.status==="archived"
              ? <Button variant="ghost" onClick={unarchive}>Unarchive</Button>
              : <Button variant="ghost" onClick={archive}>Archive</Button>}
            <Button variant="ghost" onClick={removeCourse}>Delete</Button>
          </div>
        )}
      />

      <div className="course-grid">
        {/* LEFT: TABBED CLASS MANAGEMENT */}
        <div className="stack-y">
          <Tabs
            tabs={[
              {
                label: "Assign",
                content: (
                  <form onSubmit={assign} className="grid grid-2 form-grid">
                    <Field label="Class name">
                      <input
                        value={className}
                        onChange={e=>setClassName(e.target.value)}
                        placeholder="e.g., Batch A – Week 3"
                        required
                      />
                    </Field>
                    <Field label="Person (teacher or admin)">
                      <select value={teacherId} onChange={e=>setTeacherId(e.target.value)} required>
                        <option value="">Select person</option>
                        {teachers.map(t=> (
                          <option key={t._id} value={t._id}>
                            {t.name} — {t.role} · {t.tpin}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="TPIN (auto)">
                      <input value={tpin} readOnly/>
                    </Field>
                    <Field label="Hours (default 1.5)">
                      <input type="number" step="0.25" value={hours} onChange={e=>setHours(e.target.value)}/>
                    </Field>
                    <Field label="Rate/hr (admin only)">
                      <input type="number" value={rate} onChange={e=>setRate(e.target.value)}/>
                    </Field>

                    {/* error */}
                    {assignErr && <div className="full"><div className="badge warn">{assignErr}</div></div>}

                    {/* full-width actions aligned to the right */}
                    <div className="form-actions">
                      <Button>Assign Class</Button>
                    </div>
                  </form>
                )
              },
              { label: "Pending", content: PendingTable },
              { label: "Completed", content: CompletedTable }
            ]}
          />
        </div>

        {/* RIGHT: EDIT COURSE PANEL (same layout/theme; just better dropdown) */}
        <div className="stack-y">
          {isAdmin && (
            <Section
              title="Edit Course"
              description="Update details anytime. Changes apply instantly."
              actions={<div className="badge">{(edit.assignedTeachers?.length||0) > 0 ? "People assigned" : "No assignees"}</div>}
            >
              <form onSubmit={saveCourse} className="grid grid-2 form-grid">
                <Field label="Name">
                  <input value={edit.name} onChange={e=>setEdit(s=>({...s,name:e.target.value}))}/>
                </Field>
                <Field label="Number of classes">
                  <input type="number" value={edit.numberOfClasses} onChange={e=>setEdit(s=>({...s,numberOfClasses:e.target.value}))}/>
                </Field>
                <Field label="Subjects (comma separated)">
                  <input value={edit.subjects} onChange={e=>setEdit(s=>({...s,subjects:e.target.value}))}/>
                </Field>

                {/* Assigned people — compact, attractive, theme-aligned dropdown */}
                <div className="full">
                  <div className="h3" style={{ marginBottom: "var(--sp-2)" }}>Assigned people</div>

                  <div style={{ position: "relative" }}>
                    {/* Trigger */}
                    <button
                      type="button"
                      onClick={()=>setOpenPeople(v=>!v)}
                      style={{
                        width:"100%",
                        textAlign:"left",
                        padding:"12px 14px",
                        border:"1px solid var(--border)",
                        borderRadius:"var(--radius)",
                        background:"linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)",
                        color:"var(--text)",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:8,
                        cursor:"pointer",
                        boxShadow:"var(--elev-1)"
                      }}
                    >
                      <span style={{ fontWeight:700 }}>
                        {selectedCount>0 ? `${selectedCount} selected` : "Select people"}
                      </span>
                      <span
                        style={{
                          fontSize:"var(--fs-12)",
                          color:"var(--muted)",
                          background:"#141838",
                          border:"1px solid var(--border)",
                          padding:"2px 10px",
                          borderRadius:999
                        }}
                      >
                        teachers & admins
                      </span>
                    </button>

                    {/* Panel */}
                    {openPeople && (
                      <div
                        style={{
                          position:"absolute",
                          zIndex:30,
                          top:"calc(100% + 10px)",
                          left:0,
                          right:0,
                          background:"linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)",
                          border:"1px solid var(--border)",
                          borderRadius:"var(--radius-lg)",
                          boxShadow:"var(--elev-2)",
                          overflow:"hidden"
                        }}
                      >
                        {/* Search */}
                        <div style={{ padding:"10px", borderBottom:"1px solid var(--border)", background:"var(--surface-2)" }}>
                          <input
                            placeholder="Search name, role, or TPIN..."
                            value={peopleQuery}
                            onChange={(e)=>setPeopleQuery(e.target.value)}
                            style={{
                              width:"100%",
                              padding:"10px 12px",
                              border:"1px solid var(--border)",
                              borderRadius:"12px",
                              background:"#0f1330",
                              color:"var(--text)",
                              outline:"none"
                            }}
                          />
                        </div>

                        {/* List */}
                        <div style={{ maxHeight: 320, overflowY:"auto" }}>
                          {teachers.length===0 && (
                            <div style={{ padding:14, color:"var(--muted)", fontSize:"var(--fs-13)" }}>
                              No eligible users.
                            </div>
                          )}
                          {teachers.length>0 && filteredTeachers.length===0 && (
                            <div style={{ padding:14, color:"var(--muted)", fontSize:"var(--fs-13)" }}>
                              No matches.
                            </div>
                          )}

                          {filteredTeachers.map(t=>{
                            const selected = edit.assignedTeachers?.includes(t._id);
                            return (
                              <label
                                key={t._id}
                                style={{
                                  display:"grid",
                                  gridTemplateColumns:"28px 1fr",
                                  gap:12,
                                  alignItems:"center",
                                  padding:"12px 14px",
                                  borderBottom:"1px solid var(--border)",
                                  background:selected ? "#101538" : "transparent",
                                  cursor:"pointer"
                                }}
                              >
                                {/* native checkbox hidden; custom visual shown */}
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={()=>{
                                    const has = edit.assignedTeachers.includes(t._id);
                                    const next = has
                                      ? edit.assignedTeachers.filter(x=>x!==t._id)
                                      : [...edit.assignedTeachers, t._id];
                                    setEdit(s=>({ ...s, assignedTeachers: next }));
                                  }}
                                  style={{ position:"absolute", opacity:0, pointerEvents:"none", width:0, height:0 }}
                                />
                                <span
                                  aria-hidden
                                  style={{
                                    width:20,
                                    height:20,
                                    borderRadius:6,
                                    border: selected ? "1px solid transparent" : "1px solid var(--border)",
                                    background: selected
                                      ? "linear-gradient(135deg, var(--primary), var(--primary-2))"
                                      : "#0f1330",
                                    display:"inline-flex",
                                    alignItems:"center",
                                    justifyContent:"center",
                                    boxShadow: selected ? "var(--elev-2)" : "none"
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

                                <div style={{ display:"flex", flexDirection:"column", gap:2, minWidth:0 }}>
                                  <div
                                    style={{
                                      fontWeight:700,
                                      color:"var(--text)",
                                      fontSize:"var(--fs-14)",
                                      lineHeight:1.25,
                                      whiteSpace:"nowrap",
                                      overflow:"hidden",
                                      textOverflow:"ellipsis"
                                    }}
                                    title={t.name}
                                  >
                                    {t.name}
                                  </div>
                                  <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"baseline" }}>
                                    <span style={{ fontSize:"var(--fs-12)", color:"var(--muted)" }}>{t.role}</span>
                                    <span style={{ fontSize:"var(--fs-12)", color:"var(--muted)" }}>TPIN {t.tpin}</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {/* Footer */}
                        <div
                          style={{
                            padding:10,
                            display:"flex",
                            justifyContent:"space-between",
                            alignItems:"center",
                            background:"var(--surface-2)",
                            borderTop:"1px solid var(--border)"
                          }}
                        >
                          <span style={{ fontSize:"var(--fs-12)", color:"var(--muted)" }}>
                            {selectedCount} selected
                          </span>
                          <div style={{ display:"flex", gap:8 }}>
                            <button
                              type="button"
                              onClick={()=>setEdit(s=>({ ...s, assignedTeachers: [] }))}
                              style={{
                                border:"1px solid var(--border)",
                                background:"#0f1330",
                                color:"var(--muted)",
                                padding:"8px 12px",
                                borderRadius:"10px",
                                cursor:"pointer"
                              }}
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={()=>setOpenPeople(false)}
                              style={{
                                background:"linear-gradient(135deg, var(--primary), var(--primary-2))",
                                color:"#fff",
                                padding:"8px 12px",
                                border:"none",
                                borderRadius:"10px",
                                cursor:"pointer",
                                boxShadow:"var(--elev-2)"
                              }}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <Button>Save Changes</Button>
                </div>
              </form>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
