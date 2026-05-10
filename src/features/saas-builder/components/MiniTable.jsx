export default function MiniTable({ columns, rows }) {
  return (
    <div className="saas-builder-table-wrap" style={{ overflowX: 'auto' }}>
      <table className="saas-builder-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: 'left', padding: '10px 8px', color: '#94a3b8', fontSize: 12 }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
              {columns.map((column) => (
                <td key={column.key} style={{ padding: '12px 8px', fontSize: 14 }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
