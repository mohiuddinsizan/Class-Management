export default function Card({ title, subtitle, action, children }){
  return (
    <section className="card">
      {(title || action) && (
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:"12px"}}>
          <div>
            <div className="h2">{title}</div>
            {subtitle && <div className="subtle">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
