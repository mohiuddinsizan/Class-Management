// src/components/Toolbar.jsx
export default function Toolbar({ children, right }) {
  return (
    <div className="card toolbar">
      <div className="toolbar-left">{children}</div>
      <div className="toolbar-right">{right}</div>
    </div>
  );
}
