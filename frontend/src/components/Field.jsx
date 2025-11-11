export function Field({ label, hint, children, style }){
  return (
    <label style={{display:"block", width:"100%", ...style}}>
      <div style={{color:"#aeb6ff", fontSize:"13px", marginBottom:"6px", fontWeight:700}}>{label}</div>
      {children}
      {hint && <div className="subtle" style={{marginTop:"6px"}}>{hint}</div>}
    </label>
  );
}
