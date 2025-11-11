// src/pages/Users.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import { Field } from "../components/Field";
import Empty from "../components/Empty";
import "../styles/pages/users.css";

export default function Users(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name:"", tpin:"", role:"teacher", password:"", confirmPassword:""
  });

  const [q, setQ] = useState("");           // search query
  const [role, setRole] = useState("all");  // list filter

  const load = async ()=>{
    setLoading(true);
    setErr(""); setMsg("");
    try{
      const { data } = await api.get("/users");
      // Stable sort: admins first, then teachers; then name
      const sorted = [...(data||[])].sort((a,b)=>{
        const rank = (r)=> r==="admin" ? 0 : 1;
        if (rank(a.role) !== rank(b.role)) return rank(a.role) - rank(b.role);
        return (a.name||"").localeCompare(b.name||"");
      });
      setUsers(sorted);
    }catch(ex){
      setErr(ex?.response?.data?.error || "Failed to load users.");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); },[]);

  const canSubmit = useMemo(()=>{
    const okName = form.name.trim().length >= 2;
    const okTpin = !!form.tpin.trim();
    const okPw = form.password.length >= 8 && form.password === form.confirmPassword;
    return okName && okTpin && okPw && !loading;
  },[form, loading]);

  const submit = async (e)=>{
    e.preventDefault();
    setMsg(""); setErr("");
    if(!canSubmit) return;
    setLoading(true);
    try{
      await api.post("/users", form);
      setMsg("User created.");
      setForm({ name:"", tpin:"", role:"teacher", password:"", confirmPassword:"" });
      await load();
    }catch(ex){
      setErr(ex?.response?.data?.error || "Failed to create user.");
    }finally{
      setLoading(false);
    }
  };

  // list filtering
  const filtered = users.filter(u => {
    const roleOk = role==="all" ? true : u.role === role;
    const text = [u.name, u.tpin, u.role].join(" ").toLowerCase();
    const qok = q.trim() ? text.includes(q.trim().toLowerCase()) : true;
    return roleOk && qok;
  });

  return (
    <div className="page page-users">
      <PageHeader
        icon="/bigbang.svg"
        title="Users"
        meta={<div className="badge">Total: {users.length}</div>}
      />

      <div className="users-grid">
        {/* Create user */}
        <Section title="Create User" description="Add an admin or a teacher">
          <form onSubmit={submit} className="grid grid-2" style={{gap:16}}>
            <Field label="Name">
              <input
                value={form.name}
                onChange={e=>setForm(s=>({...s,name:e.target.value}))}
                placeholder="Full name"
              />
            </Field>
            <Field label="TPIN">
              <input
                value={form.tpin}
                onChange={e=>setForm(s=>({...s,tpin:e.target.value}))}
                placeholder="Unique ID"
              />
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                onChange={e=>setForm(s=>({...s,role:e.target.value}))}
              >
                <option value="admin">admin</option>
                <option value="teacher">teacher</option>
              </select>
            </Field>
            <div />

            <Field label="Password">
              <input
                type="password"
                value={form.password}
                onChange={e=>setForm(s=>({...s,password:e.target.value}))}
                placeholder="At least 8 characters"
              />
            </Field>
            <Field label="Confirm Password">
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e=>setForm(s=>({...s,confirmPassword:e.target.value}))}
                placeholder="Repeat password"
              />
            </Field>

            <div />
            <Button className="btn btn-primary" disabled={!canSubmit}>
              {loading ? "Creating…" : "Create"}
            </Button>

            {err && <div className="badge err" style={{gridColumn:"1 / -1"}}>{err}</div>}
            {msg && <div className="badge ok" style={{gridColumn:"1 / -1"}}>{msg}</div>}
          </form>
        </Section>

        {/* List users */}
        <Section title="All Users" actions={
          <div className="row" style={{gap:8}}>
            <input
              placeholder="Search name/TPIN/role"
              value={q}
              onChange={e=>setQ(e.target.value)}
              style={{minWidth:220}}
            />
            <select value={role} onChange={e=>setRole(e.target.value)}>
              <option value="all">All</option>
              <option value="admin">Admins</option>
              <option value="teacher">Teachers</option>
            </select>
          </div>
        }>
          {filtered.length===0 ? (
            <Empty icon="👥" title={loading ? "Loading..." : "No users found"} />
          ) : (
            <Table
              columns={[
                {key:"name", label:"Name"},
                {key:"tpin", label:"TPIN"},
                {key:"role", label:"Role"},
              ]}
              rows={filtered}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
