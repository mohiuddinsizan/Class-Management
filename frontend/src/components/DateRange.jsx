import Button from "./Button";
import { useState } from "react";

export default function DateRange({ onApply }){
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return (
    <div style={{display:"flex",gap:"12px",alignItems:"end",flexWrap:"wrap"}}>
      <div style={{width:"220px"}}><input type="date" value={start} onChange={e=>setStart(e.target.value)} /></div>
      <div style={{width:"220px"}}><input type="date" value={end} onChange={e=>setEnd(e.target.value)} /></div>
      <Button variant="ghost" onClick={()=>onApply({start, end})}>Apply</Button>
    </div>
  );
}
