// src/pages/Unpaid.jsx
import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Toolbar from "../components/Toolbar";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import Empty from "../components/Empty";
import "../styles/pages/unpaid.css";

export default function Unpaid(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  const load = async ()=>{
    setLoading(true);
    try{
      const { data } = await api.get("/classes/unpaid");
      setRows((data || []).map(x => ({
        ...x,
        amount: Number(x.hours || 0) * Number(x.hourlyRate || 0)
      })));
    } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const markPaid = async (id)=>{
    setLoading(true);
    try{
      await api.patch(`/classes/${id}/paid`);
      await load();
    } finally { setLoading(false); }
  };

  // Bulk confirm: use API if available; fallback to client-side batching
  const confirmAll = async ()=>{
    if(rows.length === 0) return;
    if(!confirm(`Mark ${rows.length} class(es) as PAID?`)) return;
    setLoading(true);
    try{
      try{
        await api.post(`/classes/unpaid/confirm-all`);
      }catch{
        await Promise.all(rows.map(r => api.patch(`/classes/${r._id}/paid`)));
      }
      await load();
    } finally { setLoading(false); }
  };

  const total = rows.reduce((s,x)=> s + (x.amount || 0), 0);

  const columns = [
    {key:"name", label:"Class"},
    {key:"course", label:"Course"},
    {key:"teacherName", label:"Teacher"},
    {key:"teacherTpin", label:"TPIN"},
    {key:"hours", label:"Hours"},
    {key:"hourlyRate", label:"Rate/hr"},
    {key:"amount", label:"Amount"},
    {key:"completedAt", label:"Completed"},
    {key:"confirmedAt", label:"Confirmed"},
    {key:"paidAt", label:"Paid On"},     // will be empty on unpaid list, but useful if you reuse pattern
    {key:"_actions", label:"Actions"}
  ];

  return (
    <div className="page page-unpaid">
      <PageHeader
        title="Unpaid"
        meta={<div className="badge">Items: {rows.length}</div>}
        actions={rows.length > 0 ? (
          <Button onClick={confirmAll} disabled={loading}>
            Confirm All Paid
          </Button>
        ) : null}
      />

      <Toolbar right={<div className="badge">Total Due: {fmt.format(total)}</div>} />

      <Section>
        {rows.length===0 ? (
          <Empty icon="💸" title={loading ? "Loading..." : "No unpaid classes"} />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            renderCell={(c,row)=>{
              if(c.key==="course") return row.course?.name || "-";
              if(c.key==="name") return row.name || <span className="subtle">—</span>;
              if(c.key==="amount") return fmt.format(row.amount || 0);

              if(c.key==="completedAt"){
                return row.completedAt
                  ? fmtDate.format(new Date(row.completedAt))
                  : <span className="subtle">—</span>;
              }

              if(c.key==="confirmedAt"){
                return row.confirmedAt
                  ? fmtDate.format(new Date(row.confirmedAt))
                  : <span className="subtle">—</span>;
              }

              if(c.key==="paidAt"){
                return row.paidAt
                  ? fmtDate.format(new Date(row.paidAt))
                  : <span className="subtle">—</span>;
              }

              if(c.key==="_actions"){
                return (
                  <div style={{display:"flex",gap:8}}>
                    <Button variant="ghost" disabled={loading} onClick={()=>markPaid(row._id)}>
                      Mark Paid
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
  );
}