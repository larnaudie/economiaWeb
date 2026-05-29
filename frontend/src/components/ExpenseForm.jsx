import { useMemo, useRef, useState } from "react";
import { Button } from "./Button";
import { FormField } from "./FormField";

function dateInputValue(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function idValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._id === "string") return value._id;
  return "";
}

const initialState = {
  fecha: new Date().toISOString().slice(0, 10),
  descripcion: "",
  flujoBancario: "",
  porcentajeEconomiaReal: "100",
  categoria: "",
  cuenta: "",
  incluirEnGastoBancario: true,
  incluirEnGastoReal: true,
};

function getInitialState(expense) {
  if (!expense) return initialState;

  return {
    fecha: dateInputValue(expense.fecha),
    descripcion: expense.descripcion || "",
    flujoBancario: expense.flujoBancario ?? "",
    porcentajeEconomiaReal: expense.porcentajeEconomiaReal ?? "100",
    categoria: idValue(expense.categoria),
    cuenta: idValue(expense.cuenta),
    incluirEnGastoBancario: expense.incluirEnGastoBancario !== false,
    incluirEnGastoReal: expense.incluirEnGastoReal !== false,
  };
}

export function ExpenseForm({
  categorias,
  cuentas,
  expense,
  mode = "full",
  onCancel,
  onSubmit,
  submitLabel = "Guardar gasto",
}) {
  const [form, setForm] = useState(() => getInitialState(expense));
  const [facturaFile, setFacturaFile] = useState(null);
  const [showAccountingFields, setShowAccountingFields] = useState(mode !== "quick");
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isQuickMode = mode === "quick";

  const economiaReal = useMemo(() => {
    if (form.flujoBancario === "" || form.porcentajeEconomiaReal === "") {
      return "";
    }

    const flujo = Number(form.flujoBancario);
    const porcentaje = Number(form.porcentajeEconomiaReal);

    if (Number.isNaN(flujo) || Number.isNaN(porcentaje)) return "";

    return (flujo * (porcentaje / 100)).toFixed(2);
  }, [form.flujoBancario, form.porcentajeEconomiaReal]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit({
      fecha: form.fecha,
      descripcion: form.descripcion.trim(),
      flujoBancario: form.flujoBancario === "" ? null : Number(form.flujoBancario),
      economiaReal: economiaReal === "" ? null : Number(economiaReal),
      porcentajeEconomiaReal:
        form.porcentajeEconomiaReal === ""
          ? null
          : Number(form.porcentajeEconomiaReal),
      categoria: form.categoria || null,
      cuenta: form.cuenta || null,
      incluirEnGastoBancario:
        Number(form.flujoBancario) !== 0 && form.incluirEnGastoBancario,
      incluirEnGastoReal: Number(economiaReal) !== 0 && form.incluirEnGastoReal,
      facturaFile,
    });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <FormField id="expenseDescripcion" label="Descripcion">
        <textarea
          id="expenseDescripcion"
          maxLength="500"
          minLength="2"
          onChange={(event) => updateField("descripcion", event.target.value)}
          required
          value={form.descripcion}
        />
      </FormField>

      <FormField id="expenseFecha" label="Fecha">
        <input
          id="expenseFecha"
          onChange={(event) => updateField("fecha", event.target.value)}
          type="date"
          value={form.fecha}
        />
      </FormField>

      <FormField id="expenseFactura" label="Factura">
        <input
          accept="image/*"
          capture="environment"
          hidden
          id="expenseFacturaCamera"
          onChange={(event) => setFacturaFile(event.target.files?.[0] || null)}
          ref={cameraInputRef}
          type="file"
        />
        <input
          accept="image/*,application/pdf"
          hidden
          id="expenseFacturaFile"
          onChange={(event) => setFacturaFile(event.target.files?.[0] || null)}
          ref={fileInputRef}
          type="file"
        />
        <div className="button-row">
          <Button onClick={() => cameraInputRef.current?.click()} variant="secondary">
            Sacar foto
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
            Elegir archivo
          </Button>
        </div>
        {facturaFile ? (
          <small className="field-hint">Archivo seleccionado: {facturaFile.name}</small>
        ) : null}
        {expense?.facturaUrl ? (
          <a
            className="text-link"
            href={expense.facturaUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver factura actual
          </a>
        ) : null}
        <small className="field-hint">
          Opcional. Podes sacar una foto o adjuntar una imagen/PDF.
        </small>
      </FormField>

      {isQuickMode ? (
        <div className="quick-expense-note">
          <strong>Lo podes completar despues</strong>
          <span>Si faltan monto, cuenta o categoria, el sistema lo guarda como pendiente.</span>
          <Button
            onClick={() => setShowAccountingFields((current) => !current)}
            variant="secondary"
          >
            {showAccountingFields ? "Ocultar detalles" : "Agregar detalles ahora"}
          </Button>
        </div>
      ) : null}

      {showAccountingFields ? (
        <>
          <div className="form-grid">
            <FormField id="expenseFlujo" label="Gasto bancario">
              <input
                id="expenseFlujo"
                onChange={(event) =>
                  updateField("flujoBancario", event.target.value)
                }
                step="0.01"
                type="number"
                value={form.flujoBancario}
              />
            </FormField>
            <FormField id="expensePorcentaje" label="Porcentaje gasto real">
              <input
                id="expensePorcentaje"
                max="100"
                min="0"
                onChange={(event) =>
                  updateField("porcentajeEconomiaReal", event.target.value)
                }
                step="0.01"
                type="number"
                value={form.porcentajeEconomiaReal}
              />
            </FormField>

            <FormField id="expenseEconomia" label="Gasto real">
              <input id="expenseEconomia" readOnly type="number" value={economiaReal} />
            </FormField>
          </div>

          <div className="form-grid">
            <FormField id="expenseCategoria" label="Subcategoria">
              <select
                id="expenseCategoria"
                onChange={(event) => updateField("categoria", event.target.value)}
                value={form.categoria}
              >
                <option value="">Seleccionar subcategoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria._id} value={categoria._id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="expenseCuenta" label="Cuenta">
              <select
                id="expenseCuenta"
                onChange={(event) => updateField("cuenta", event.target.value)}
                value={form.cuenta}
              >
                <option value="">Seleccionar cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta._id} value={cuenta._id}>
                    {cuenta.nombre}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="check-row">
            <label>
              <input
                checked={form.incluirEnGastoBancario}
                onChange={(event) =>
                  updateField("incluirEnGastoBancario", event.target.checked)
                }
                type="checkbox"
              />
              Incluir en gasto bancario
            </label>
            <label>
              <input
                checked={form.incluirEnGastoReal}
                onChange={(event) =>
                  updateField("incluirEnGastoReal", event.target.checked)
                }
                type="checkbox"
              />
              Incluir en gasto real
            </label>
          </div>
        </>
      ) : null}

      <div className="button-row button-row-end">
        {onCancel ? (
          <Button onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
