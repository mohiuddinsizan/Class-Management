// src/components/PageHeader.jsx
export default function PageHeader({ icon, title, meta, actions }) {
  return (
    <header className="page-header">
      <div className="ph-main">
        {icon && <img src={icon} alt="" className="ph-icon" />}
        <div className="ph-titles">
          <div className="h1">{title}</div>
          {meta && <div className="ph-meta">{meta}</div>}
        </div>
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </header>
  );
}
