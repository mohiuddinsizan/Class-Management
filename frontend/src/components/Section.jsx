export default function Section({ title, description, actions, children }) {
  return (
    <section className="card" style={{padding:24}}>
      {(title || description || actions) && (
        <header style={{display:"flex",alignItems:"baseline",gap:16,marginBottom:16}}>
          <div style={{flex:1}}>
            {title && <div className="h2">{title}</div>}
            {description && <div className="subtle" style={{marginTop:6}}>{description}</div>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
