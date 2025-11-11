import { useState } from "react";

export function Tabs({ tabs, initial=0 }) {
  const [i, setI] = useState(initial);
  const cur = tabs[i] || {};
  return (
    <div className="card" style={{padding:0}}>
      <div style={{display:"flex", gap:8, padding:12, borderBottom:"1px solid var(--border)"}}>
        {tabs.map((t, idx) => (
          <button
            key={t.label}
            onClick={()=>setI(idx)}
            className="btn"
            style={{
              padding:"8px 12px",
              borderRadius:10,
              background: idx===i ? "linear-gradient(135deg, var(--primary), var(--primary-2))" : "#0f1330",
              color: idx===i ? "#fff" : "var(--muted)",
              border:"1px solid var(--border)"
            }}
          >{t.label}</button>
        ))}
      </div>
      <div style={{padding:18}}>
        {cur.content}
      </div>
    </div>
  );
}
