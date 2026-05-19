export function QuickActionCard({
  title,
  description,
  icon,
  accent = "neutral",
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
    </button>
  );
}
