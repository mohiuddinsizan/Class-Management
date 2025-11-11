import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { Stat } from "../components/Stat";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import "../styles/pages/reports.css";

export default function Reports(){
  const [summary, setSummary] = useState(null);
  const [byTeacher, setByTeacher] = useState([]);
  const [range, setRange] = useState({ start:"", end:"" });

  const load = async (q={})=>{
    const params = new URLSearchParams(Object.entries(q).filter(([_,v])=>v));
    const { data } = await api.get(`/reports/summary?${params.toString()}`);
    setSummary(data.summary);
    setByTeacher(data.byTeacher);
  };
  useEffect(()=>{ load({}); },[]);

  return (
    <div className="page page-reports">
      <PageHeader icon={null} title="Reports" meta={null} />
      <Section>
        <div className="reports-toolbar">
          <div className="reports-filters">
            <label className="subtle">Start<input type="date" value={range.start} onChange={e=>setRange(s=>({...s,start:e.target.value}))}/></label>
            <label className="subtle">End<input type="date" value={range.end} onChange={e=>setRange(s=>({...s,end:e.target.value}))}/></label>
          </div>
          <Button className="btn btn-primary" onClick={()=>load(range)}>Run</Button>
        </div>
      </Section>

      <div className="reports-stats">
        <div className="card"><div className="subtle">Total Classes</div><div className="h3" style={{fontSize:"22px"}}>{summary?.totalClasses ?? 0}</div></div>
        <div className="card"><div className="subtle">Total Hours</div><div className="h3" style={{fontSize:"22px"}}>{summary?.totalHours ?? 0}</div></div>
        <div className="card"><div className="subtle">Total Amount</div><div className="h3" style={{fontSize:"22px"}}>{summary?.totalAmount ?? 0}</div></div>
      </div>

      <Section title="By Teacher">
        <Table
          columns={[
            {key:"_id",label:"TeacherId"},
            {key:"classes",label:"Classes"},
            {key:"hours",label:"Hours"},
            {key:"amount",label:"Amount"},
          ]}
          rows={byTeacher}
        />
      </Section>
    </div>
  );
}
