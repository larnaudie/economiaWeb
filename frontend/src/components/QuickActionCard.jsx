export function QuickActionCard({
  title,
  description,
  icon,
  accent = "neutral",
  actionLabel = "Abrir",
  onClick,
}) {
  return (
    <button
      className={`quick-action-card quick-action-${accent}`}
      onClick={onClick}
      type="button"
    >
      <span className="quick-action-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="quick-action-footer">
        {actionLabel}
        <span aria-hidden="true">-&gt;</span>
      </span>
    </button>
  );
}
