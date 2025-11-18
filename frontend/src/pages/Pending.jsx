// src/pages/Pending.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Toolbar from "../components/Toolbar";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import Empty from "../components/Empty";
import "../styles/pages/pending.css";

export default function Pending(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const user = useMemo(()=>JSON.parse(localStorage.getItem("user")||"null"),[]);
  const isAdmin = user?.role==="admin";

  const load = async ()=>{
    setLoading(true);
    try{
      const { data } = await api.get("/classes/pending");
      // Client-side guard: teachers only see their own items
      const filtered = isAdmin
        ? data
        : data.filter(x =>
            String(x.teacherId || x.teacher?._id || "") === String(user?._id || "") ||
            String(x.teacherTpin || "") === String(user?.tpin || "")
          );
      setRows(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);

  const complete = async (id)=>{
    setLoading(true);
    try{
      await api.patch(`/classes/${id}/complete`);
      await load();
    } finally { setLoading(false); }
  };

  const remove = async (id)=>{
    if(!confirm("Delete this pending class?")) return;
    setLoading(true);
    try{
      await api.delete(`/classes/${id}`);
      await load();
    } finally { setLoading(false); }
  };

  // Table columns (admins see rate)
  const columns = [
    {key:"name",label:"Class"},        // NEW
    {key:"course",label:"Course"},
    {key:"teacherName",label:"Teacher"},
    {key:"teacherTpin",label:"TPIN"},
    {key:"hours",label:"Hours"},
    ...(isAdmin ? [{key:"hourlyRate",label:"Rate/hr"}] : []),
    {key:"_actions",label:"Actions"},
  ];

  return (
    <div className="page page-pending">
      <PageHeader
        // icon="/bigbang.svg"
        title="Pending Classes"
        meta={<div className="badge">Total: {rows.length}</div>}
      />

      <Toolbar right={<div className="badge">{isAdmin ? "Visible to admins" : "Only you + admins can see your items"}</div>}>
        {/* reserved for future quick filters */}
      </Toolbar>

      <Section>
        {rows.length===0 ? (
          <Empty icon="⏳" title={loading ? "Loading..." : "No pending classes"} />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            renderCell={(c,row)=>{
              if(c.key==="course") return row.course?.name || "-";
              if(c.key==="name") return row.name || <span className="subtle">—</span>;   {/* NEW */}
              if(c.key==="_actions"){
                return (
                  <div style={{display:"flex",gap:8}}>
                    <Button variant="ghost" disabled={loading} onClick={()=>complete(row._id)}>Complete</Button>
                    {isAdmin && <Button variant="ghost" disabled={loading} onClick={()=>remove(row._id)}>Delete</Button>}
                  </div>
                );
              }
              return row[c.key];
            }}
          />
        )}
      </Section>
    </div>
  );
}
