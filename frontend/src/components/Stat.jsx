export function Stat({ label, value }) {
  return (
    <div className="card" style={{padding:18}}>
      <div className="subtle" style={{marginBottom:6}}>{label}</div>
      <div className="h3" style={{fontSize:22}}>{value}</div>
    </div>
  );
}
