// src/components/Table.jsx
export default function Table({ columns=[], rows=[], renderCell }) {
  return (
    <div className="table-wrap">
      <table className="table rtable">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIndex) => (
            <tr key={row._id || rIndex}>
              {columns.map((c) => {
                const content = renderCell ? renderCell(c, row) : row[c.key];
                return (
                  <td key={c.key} data-th={c.label}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
