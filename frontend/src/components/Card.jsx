export function Card({ title, children, className = "", onClick }) {
  function handleKeyDown(event) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(event);
    }
  }

  return (
    <article
      className={`card ${className}`.trim()}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {title ? <h2>{title}</h2> : null}
      {children}
    </article>
  );
}
