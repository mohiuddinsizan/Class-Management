// imports same as before...
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import { Field } from "../components/Field";
import Button from "../components/Button";
import "../styles/pages/course-create.css";

export default function CourseCreate(){
  const nav = useNavigate();
  const [people, setPeople] = useState([]); // teachers + admins
  const [form, setForm] = useState({
    name: "",
    numberOfClasses: 0,
    subjects: "",
    assignedTeachers: []  // array of ids
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(()=>{
    // fetch BOTH roles
    Promise.all([
      api.get("/users", { params: { role: "teacher" }}),
      api.get("/users", { params: { role: "admin" }})
    ]).then(([t, a]) => setPeople([...t.data, ...a.data]));
  },[]);

  const togglePerson = (id) => {
    setForm(s => {
      const has = s.assignedTeachers.includes(id);
      return { ...s, assignedTeachers: has ? s.assignedTeachers.filter(x=>x!==id) : [...s.assignedTeachers, id] };
    });
  };

  const submit = async (e)=>{
    e.preventDefault();
    setErr(""); setMsg("");
    const payload = {
      name: form.name.trim(),
      numberOfClasses: Number(form.numberOfClasses),
      subjects: form.subjects.split(",").map(s=>s.trim()).filter(Boolean),
      assignedTeachers: form.assignedTeachers
    };
    if(!payload.name){ setErr("Name is required."); return; }
    try{
      const { data } = await api.post("/courses", payload);
      nav(`/courses/${data._id}`);
    }catch(ex){
      setErr(ex?.response?.data?.error || "Failed to create course.");
    }
  };

  return (
    <div className="page page-course-create">
      <PageHeader title="Create Course" />
      <Section description="Add a new course. You can edit everything later.">
        <form onSubmit={submit} className="course-create-form">
          <Field label="Course name">
            <input value={form.name} onChange={e=>setForm(s=>({...s, name:e.target.value}))} placeholder="e.g., IELTS Batch A"/>
          </Field>
          <Field label="Number of classes">
            <input type="number" value={form.numberOfClasses} onChange={e=>setForm(s=>({...s, numberOfClasses:e.target.value}))}/>
          </Field>
          <Field label="Subjects (comma separated)">
            <input value={form.subjects} onChange={e=>setForm(s=>({...s, subjects:e.target.value}))} placeholder="English, Math, ..."/>
          </Field>

          {/* Multi-select as checkbox chips */}
          <div className="full">
            <div className="h3" style={{marginBottom:8}}>Assign people (teachers or admins)</div>
            <div className="people-grid">
              {people.map(p => (
                <label key={p._id} className={`person-chip ${form.assignedTeachers.includes(p._id) ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.assignedTeachers.includes(p._id)}
                    onChange={()=>togglePerson(p._id)}
                  />
                  <span>{p.name}</span>
                  <span className="role">{p.role} · TPIN {p.tpin}</span>
                </label>
              ))}
              {people.length===0 && <div className="subtle">No users yet.</div>}
            </div>
          </div>

          <div className="full">
            <Button className="btn btn-primary">Create Course</Button>
          </div>

          {err && <div className="badge err full">{err}</div>}
          {msg && <div className="badge ok full">{msg}</div>}
        </form>
      </Section>
    </div>
  );
}
