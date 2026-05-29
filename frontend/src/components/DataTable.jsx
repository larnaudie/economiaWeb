const moneyColumnKeys = new Set([
  "bancario",
  "real",
  "flujo",
  "excel",
  "total",
  "monto",
  "cuota",
  "saldo",
  "limiteUYU",
  "limiteUSD",
]);

function getTextContent(value) {
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(getTextContent).join(" ");
  if (value?.props?.children) return getTextContent(value.props.children);
  return "";
}

function isCreditCardContext(item) {
  return Boolean(
    item?.tipoMovimiento ||
      item?.cuentaTarjeta ||
      item?.movimientoTarjeta ||
      item?.origen === "tarjeta_credito" ||
      item?.cuenta?.tipo === "tarjeta_credito",
  );
}

function getAmountClass(column, item, rendered) {
  if (!moneyColumnKeys.has(column.key)) return "";

  const text = getTextContent(rendered);
  if (!text || !/[0-9]/.test(text)) return "";

  const isNegative = /-\s*(\$|US\$|UI)?|(\$|US\$|UI)\s*-/.test(text);
  const isPositive = !isNegative && /[1-9]/.test(text);
  if (!isNegative && !isPositive) return "amount-zero";

  const inverse = isCreditCardContext(item);
  if (isNegative) return inverse ? "amount-positive" : "amount-negative";
  return inverse ? "amount-negative" : "amount-positive";
}

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
                {columns.map((column) => {
                  const rendered = column.render(item);
                  const amountClass = getAmountClass(column, item, rendered);

                  return (
                    <td
                      className={`column-${column.key}${amountClass ? ` ${amountClass}` : ""}`}
                      data-label={typeof column.header === "string" ? column.header : ""}
                      key={column.key}
                    >
                      {rendered}
                    </td>
                  );
                })}
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
