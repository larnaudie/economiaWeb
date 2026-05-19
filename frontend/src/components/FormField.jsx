export function FormField({ id, label, children, hint, error }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {hint ? <small className="field-hint">{hint}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
