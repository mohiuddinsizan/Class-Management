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
import "../styles/pages/course-create.css";    // people chips

export default function CourseDetail(){
  const { id } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [teachers, setTeachers] = useState([]); // teachers + admins

  const user = useMemo(()=>JSON.parse(localStorage.getItem("user")||"null"),[]);
  const isAdmin = user?.role === "admin";

  // assign form
  const [teacherId, setTeacherId] = useState("");
  const [tpin, setTpin] = useState("");
  const [hours, setHours] = useState(1.5);
  const [rate, setRate] = useState(600);

  // edit form (course) — supports multi
  const [edit, setEdit] = useState({
    name:"",
    numberOfClasses:0,
    subjects:"",
    assignedTeachers:[]
  });

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
    await api.post("/classes/assign", {
      courseId:id,
      teacherId,
      hours:Number(hours),
      hourlyRate:Number(rate)
    });
    setTeacherId(""); setTpin(""); setHours(1.5); setRate(600);
    await load();
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
    isEmpty(pending) ? <Empty icon="⏳" title="No pending classes"/> :
    <Table
      columns={[
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
            <div className="row">
              <Button variant="ghost" onClick={()=>markComplete(row._id)}>Complete</Button>
              {isAdmin && <Button variant="ghost" onClick={()=>removePending(row._id)}>Delete</Button>}
            </div>
          );
        }
        return row[c.key];
      }}
    />
  );

  const CompletedTable = (
    isEmpty(completed) ? <Empty icon="✅" title="No completed classes"/> :
    <Table
      columns={[
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
        return row[c.key];
      }}
    />
  );

  /* -------------------------------- view -------------------------------- */
  const assignedNames = (course?.assignedTeachers || []).map(p=>p.name).join(", ");
  const assignedBadge = (course?.assignedTeachers?.length || 0) > 0
    ? `People: ${assignedNames}`
    : "Unassigned";

  return (
    <>
      <PageHeader
        icon="/bigbang.svg"
        title={course?.name || "Course"}
        meta={
          <div className="row">
            <div className="badge">{course?.status==="archived" ? "Archived" : "Active"} · Classes: {course?.numberOfClasses ?? 0}</div>
            <div className="badge">{assignedBadge}</div>
          </div>
        }
        actions={isAdmin && (
          <div className="row">
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
                    <Field label="Person (teacher or admin)">
                      <select value={teacherId} onChange={e=>setTeacherId(e.target.value)}>
                        <option value="">Select person</option>
                        {teachers.map(t=> (
                          <option key={t._id} value={t._id}>
                            {t.name} ({t.role}) · {t.tpin}
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

        {/* RIGHT: EDIT COURSE PANEL */}
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

                {/* Multi-select: teachers + admins */}
                <div className="full">
                  <div className="h3" style={{marginBottom:"var(--sp-2)"}}>Assigned people</div>
                  <div className="people-grid">
                    {teachers.map(t => {
                      const selected = edit.assignedTeachers?.includes(t._id);
                      return (
                        <label key={t._id} className={`person-chip ${selected ? "selected" : ""}`}>
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
                          />
                          <span>{t.name}</span>
                          <span className="role">{t.role} · TPIN {t.tpin}</span>
                        </label>
                      );
                    })}
                    {teachers.length===0 && <div className="subtle">No eligible users.</div>}
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
    </>
  );
}
