import { useMemo, useState } from "react";
import { Button } from "./Button";
import { FormField } from "./FormField";

function dateInputValue(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
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
    categoria: expense.categoria?._id || expense.categoria || "",
    cuenta: expense.cuenta?._id || expense.cuenta || "",
    incluirEnGastoBancario: expense.incluirEnGastoBancario !== false,
    incluirEnGastoReal: expense.incluirEnGastoReal !== false,
  };
}

export function ExpenseForm({
  categorias,
  cuentas,
  expense,
  onCancel,
  onSubmit,
  submitLabel = "Guardar gasto",
}) {
  const [form, setForm] = useState(() => getInitialState(expense));

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
      flujoBancario: Number(form.flujoBancario),
      economiaReal: Number(economiaReal),
      porcentajeEconomiaReal: Number(form.porcentajeEconomiaReal),
      categoria: form.categoria,
      cuenta: form.cuenta,
      incluirEnGastoBancario:
        Number(form.flujoBancario) !== 0 && form.incluirEnGastoBancario,
      incluirEnGastoReal: Number(economiaReal) !== 0 && form.incluirEnGastoReal,
    });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <FormField id="expenseFecha" label="Fecha">
          <input
            id="expenseFecha"
            onChange={(event) => updateField("fecha", event.target.value)}
            required
            type="date"
            value={form.fecha}
          />
        </FormField>

        <FormField id="expenseFlujo" label="Gasto bancario">
          <input
            id="expenseFlujo"
            onChange={(event) =>
              updateField("flujoBancario", event.target.value)
            }
            required
            step="0.01"
            type="number"
            value={form.flujoBancario}
          />
        </FormField>
      </div>

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

      <div className="form-grid">
        <FormField id="expensePorcentaje" label="Porcentaje gasto real">
          <input
            id="expensePorcentaje"
            max="100"
            min="0"
            onChange={(event) =>
              updateField("porcentajeEconomiaReal", event.target.value)
            }
            required
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
            required
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
            required
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
