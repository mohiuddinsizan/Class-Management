export default function Empty({ icon="🗂️", title="Nothing here", note }) {
  return (
    <div style={{textAlign:"center", padding:"40px 12px"}}>
      <div style={{fontSize:32, opacity:.9}}>{icon}</div>
      <div className="h3" style={{marginTop:8}}>{title}</div>
      {note && <div className="subtle" style={{marginTop:6}}>{note}</div>}
    </div>
  );
}
