import { formatCurrency } from "../utils/formatters";

const colors = ["#1463ff", "#138a5b", "#f59e0b", "#d43f3f", "#7c3aed", "#0891b2"];

export function MiniBarChart({ items, labelKey = "label", valueKey = "value" }) {
  const max = Math.max(...items.map((item) => Math.abs(Number(item[valueKey] || 0))), 0);

  if (!items.length || max === 0) {
    return <p className="empty-state">No hay datos para graficar.</p>;
  }

  return (
    <div className="mini-bar-chart">
      {items.map((item, index) => {
        const value = Math.abs(Number(item[valueKey] || 0));
        const width = `${Math.max(4, (value / max) * 100)}%`;

        return (
          <div className="mini-bar-row" key={item[labelKey]}>
            <div className="mini-bar-label">
              <span>{item[labelKey]}</span>
              <strong>{formatCurrency(value)}</strong>
            </div>
            <div className="mini-bar-track">
              <div
                className="mini-bar-fill"
                style={{
                  background: colors[index % colors.length],
                  width,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ComparisonBars({ items }) {
  const max = Math.max(...items.map((item) => Math.abs(Number(item.value || 0))), 0);

  if (!items.length || max === 0) {
    return <p className="empty-state">No hay datos para comparar.</p>;
  }

  return (
    <div className="comparison-bars">
      {items.map((item, index) => (
        <article className="comparison-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{formatCurrency(Math.abs(item.value))}</strong>
          <div className="mini-bar-track">
            <div
              className="mini-bar-fill"
              style={{
                background: colors[index % colors.length],
                width: `${Math.max(4, (Math.abs(item.value) / max) * 100)}%`,
              }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export function MonthlyBars({ labels, bancario, real }) {
  const allValues = [...bancario, ...real].map((value) => Math.abs(Number(value || 0)));
  const max = Math.max(...allValues, 0);

  if (!labels.length || max === 0) {
    return <p className="empty-state">No hay evolucion mensual para mostrar.</p>;
  }

  return (
    <div className="monthly-bars">
      {labels.map((label, index) => (
        <article className="monthly-bar-group" key={label}>
          <div className="monthly-bars-pair">
            <span className="monthly-bar-stack">
              <small className="monthly-bar-value">
                {formatCurrency(Math.abs(bancario[index]))}
              </small>
              <span
                className="monthly-bar monthly-bar-bancario"
                title={`Bancario ${formatCurrency(Math.abs(bancario[index]))}`}
                style={{ height: `${Math.max(6, (Math.abs(bancario[index]) / max) * 100)}%` }}
              />
            </span>
            <span className="monthly-bar-stack">
              <small className="monthly-bar-value">
                {formatCurrency(Math.abs(real[index]))}
              </small>
              <span
                className="monthly-bar monthly-bar-real"
                title={`Real ${formatCurrency(Math.abs(real[index]))}`}
                style={{ height: `${Math.max(6, (Math.abs(real[index]) / max) * 100)}%` }}
              />
            </span>
          </div>
          <small>{label}</small>
        </article>
      ))}
    </div>
  );
}
