export function Card({ title, children, className = "" }) {
  return (
    <article className={`card ${className}`.trim()}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </article>
  );
}
