export function DataTable({ columns, emptyMessage, getRowProps, items, rowKey }) {
  return (
    <div className="table-scroll-shell">
      <span className="scroll-cue scroll-cue-left" aria-hidden="true" />
      <span className="scroll-cue scroll-cue-right" aria-hidden="true" />
      <span className="scroll-cue-pill" aria-hidden="true">Deslizar</span>
      <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={`column-${column.key}`} key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item, index) => (
              <tr key={rowKey(item)} {...(getRowProps?.(item, index) || {})}>
                {columns.map((column) => (
                  <td
                    className={`column-${column.key}`}
                    data-label={typeof column.header === "string" ? column.header : ""}
                    key={column.key}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
