import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PageLayout } from "../layout/PageLayout";
import { apiRequest, getApiData, getUser, logout } from "../services/api";
import { formatCurrency } from "../utils/formatters";

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDebtMoney(value, moneda = "UYU") {
  const amount = Number(value || 0);

  if (moneda === "USD") return `US$ ${amount.toFixed(2)}`;
  if (moneda === "UI") return `UI ${amount.toFixed(2)}`;
  return formatCurrency(amount);
}

const debtTypeLabels = {
  deuda: "Deuda",
  prestamo: "Prestamo",
  financiacion: "Financiacion",
  hipotecario: "Hipotecario",
};

export function Debts({ onLogout }) {
  const [deudas, setDeudas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState(null);
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const user = getUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      const [deudasResp, cuentasResp, categoriasResp] = await Promise.all([
        apiRequest("/deudas"),
        apiRequest("/cuentas"),
        apiRequest("/categorias"),
      ]);

      setDeudas(normalizeItems(deudasResp));
      setCuentas(normalizeItems(cuentasResp));
      setCategorias(normalizeItems(categoriasResp));
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron cargar deudas",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const summary = useMemo(() => {
    const active = deudas.filter((deuda) => deuda.activa);
    const saldo = active.reduce((acc, deuda) => {
      if (deuda.saldoPendiente !== undefined && deuda.saldoPendiente !== null) {
        return acc + Math.max(0, Number(deuda.saldoPendiente || 0));
      }

      const pagado = Number(deuda.montoCuota || 0) * Number(deuda.cuotaActual || 0);
      return acc + Math.max(0, Number(deuda.montoTotal || 0) - pagado);
    }, 0);

    return {
      total: deudas.length,
      active: active.length,
      saldo,
    };
  }, [deudas]);

  async function handleCreate(payload) {
    try {
      await apiRequest("/deudas", { method: "POST", body: payload });
      setCreateOpen(false);
      setStatus({
        type: "success",
        title: "Deuda creada",
        message: "La deuda se guardo correctamente.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo crear",
        message: error.message,
      });
    }
  }

  async function handlePay(payload) {
    if (!payingDebt?._id) return;

    try {
      await apiRequest(`/deudas/${payingDebt._id}/pagar-cuota`, {
        method: "POST",
        body: payload,
      });
      setPayingDebt(null);
      setStatus({
        type: "success",
        title: "Cuota pagada",
        message: "Se genero el gasto asociado al pago.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo pagar",
        message: error.message,
      });
    }
  }

  async function handleDelete(deuda) {
    const confirmed = window.confirm(`Eliminar ${deuda.descripcion}?`);
    if (!confirmed) return;

    try {
      await apiRequest(`/deudas/${deuda._id}`, { method: "DELETE" });
      setStatus({
        type: "success",
        title: "Deuda eliminada",
        message: "La deuda se elimino correctamente.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo eliminar",
        message: error.message,
      });
    }
  }

  const columns = [
    {
      key: "tipo",
      header: "Tipo",
      render: (deuda) => debtTypeLabels[deuda.tipo] || "Deuda",
    },
    {
      key: "descripcion",
      header: "Descripcion",
      render: (deuda) => (
        <div className="movement-detail-cell">
          <strong>{deuda.descripcion}</strong>
          <small>{deuda.entidad || "Sin entidad"}</small>
        </div>
      ),
    },
    {
      key: "montoTotal",
      header: "Monto total",
      render: (deuda) => formatDebtMoney(deuda.montoTotal, deuda.moneda),
    },
    {
      key: "saldo",
      header: "Saldo",
      render: (deuda) => formatDebtMoney(deuda.saldoPendiente, deuda.moneda),
    },
    {
      key: "cuota",
      header: "Cuota",
      render: (deuda) => formatDebtMoney(deuda.montoCuota, deuda.moneda),
    },
    {
      key: "progreso",
      header: "Progreso",
      render: (deuda) => `${deuda.cuotaActual} / ${deuda.cuotasTotales}`,
    },
    {
      key: "estado",
      header: "Estado",
      render: (deuda) => (deuda.activa ? "Activa" : "Finalizada"),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (deuda) => (
        <div className="table-actions">
          <Button
            disabled={!deuda.activa}
            onClick={() => setPayingDebt(deuda)}
            variant="secondary"
          >
            Pagar
          </Button>
          <Button onClick={() => handleDelete(deuda)} variant="danger">
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle="Crear, listar y pagar cuotas de deudas."
      title="Mis Deudas"
      user={user}
    >
      {status.message ? (
        <Alert
          message={status.message}
          title={status.title}
          tone={status.type}
        />
      ) : null}

      <section className="metric-grid metric-grid-wide">
        <MetricCard label="Deudas" value={summary.total} />
        <MetricCard label="Activas" value={summary.active} />
        <MetricCard label="Saldo pendiente" value={formatCurrency(summary.saldo)} />
        <MetricCard label="Estado" value={loading ? "Cargando" : "Actualizado"} />
      </section>

      <Card title="Gestion de deudas">
        <div className="section-toolbar">
          <div>
            <h2>Mis deudas</h2>
            <p>{deudas.length} deuda(s) cargada(s).</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Crear deuda</Button>
        </div>

        <DataTable
          columns={columns}
          emptyMessage="No hay deudas cargadas."
          items={deudas}
          rowKey={(deuda) => deuda._id}
        />
      </Card>

      <Modal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Crear Deuda"
      >
        <DebtForm onCancel={() => setCreateOpen(false)} onSubmit={handleCreate} />
      </Modal>

      <Modal
        onClose={() => setPayingDebt(null)}
        open={Boolean(payingDebt)}
        title="Pagar Cuota"
      >
        <PayDebtForm
          categorias={categorias}
          cuentas={cuentas}
          deuda={payingDebt}
          onCancel={() => setPayingDebt(null)}
          onSubmit={handlePay}
        />
      </Modal>
    </PageLayout>
  );
}

function DebtForm({ onCancel, onSubmit }) {
  const [tipo, setTipo] = useState("financiacion");
  const [moneda, setMoneda] = useState("UYU");
  const [descripcion, setDescripcion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [cuotasTotales, setCuotasTotales] = useState("");
  const [montoCuota, setMontoCuota] = useState("");
  const [tasaInteres, setTasaInteres] = useState("");
  const [plazoAnios, setPlazoAnios] = useState("");
  const [diaVencimiento, setDiaVencimiento] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayInputValue());

  const cuotaCalculada = useMemo(() => {
    const total = Number(montoTotal);
    const cuotas = Number(cuotasTotales);

    if (!total || !cuotas || Number.isNaN(total) || Number.isNaN(cuotas)) {
      return 0;
    }

    if (montoCuota) return Number(montoCuota);

    return Number((total / cuotas).toFixed(2));
  }, [cuotasTotales, montoCuota, montoTotal]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      descripcion: descripcion.trim(),
      tipo,
      moneda,
      entidad: entidad.trim(),
      montoTotal: Number(montoTotal),
      cuotasTotales: Number(cuotasTotales),
      montoCuota: montoCuota === "" ? null : Number(montoCuota),
      tasaInteres: tasaInteres === "" ? null : Number(tasaInteres),
      plazoAnios: plazoAnios === "" ? null : Number(plazoAnios),
      diaVencimiento: diaVencimiento === "" ? null : Number(diaVencimiento),
      fechaInicio,
    });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <FormField id="debtDescription" label="Descripcion">
        <input
          id="debtDescription"
          minLength="3"
          onChange={(event) => setDescripcion(event.target.value)}
          required
          value={descripcion}
        />
      </FormField>

      <div className="form-grid">
        <FormField id="debtType" label="Tipo">
          <select
            id="debtType"
            onChange={(event) => setTipo(event.target.value)}
            value={tipo}
          >
            <option value="deuda">Deuda</option>
            <option value="prestamo">Prestamo</option>
            <option value="financiacion">Financiacion</option>
            <option value="hipotecario">Hipotecario</option>
          </select>
        </FormField>

        <FormField id="debtCurrency" label="Moneda">
          <select
            id="debtCurrency"
            onChange={(event) => setMoneda(event.target.value)}
            value={moneda}
          >
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
            <option value="UI">UI</option>
          </select>
        </FormField>
      </div>

      <FormField id="debtEntity" label="Entidad">
        <input
          id="debtEntity"
          onChange={(event) => setEntidad(event.target.value)}
          placeholder="Ej: BHU, automotora, banco"
          value={entidad}
        />
      </FormField>

      <div className="form-grid">
        <FormField id="debtTotal" label="Monto total">
          <input
            id="debtTotal"
            onChange={(event) => setMontoTotal(event.target.value)}
            required
            step="0.01"
            type="number"
            value={montoTotal}
          />
        </FormField>
        <FormField id="debtInstallments" label="Cuotas totales">
          <input
            id="debtInstallments"
            onChange={(event) => setCuotasTotales(event.target.value)}
            required
            type="number"
            value={cuotasTotales}
          />
        </FormField>
      </div>

      <div className="form-grid">
        <FormField id="debtInstallmentAmount" label={`Cuota en ${moneda}`}>
          <input
            id="debtInstallmentAmount"
            onChange={(event) => setMontoCuota(event.target.value)}
            placeholder="Opcional, si la conoces"
            step="0.01"
            type="number"
            value={montoCuota}
          />
        </FormField>
        <FormField id="debtRate" label="Tasa interes">
          <input
            id="debtRate"
            onChange={(event) => setTasaInteres(event.target.value)}
            placeholder="Opcional"
            step="0.01"
            type="number"
            value={tasaInteres}
          />
        </FormField>
      </div>

      <div className="calculated-preview">
        <span>Cuota estimada</span>
        <strong>{formatDebtMoney(cuotaCalculada, moneda)}</strong>
      </div>

      <div className="form-grid">
        <FormField id="debtStartDate" label="Fecha inicio">
          <input
            id="debtStartDate"
            onChange={(event) => setFechaInicio(event.target.value)}
            required
            type="date"
            value={fechaInicio}
          />
        </FormField>
        <FormField id="debtTermYears" label="Plazo en anios">
          <input
            id="debtTermYears"
            onChange={(event) => setPlazoAnios(event.target.value)}
            placeholder="Opcional"
            type="number"
            value={plazoAnios}
          />
        </FormField>
        <FormField id="debtDueDay" label="Dia vencimiento">
          <input
            id="debtDueDay"
            max="31"
            min="1"
            onChange={(event) => setDiaVencimiento(event.target.value)}
            placeholder="Opcional"
            type="number"
            value={diaVencimiento}
          />
        </FormField>
      </div>

      <div className="button-row button-row-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button type="submit">Guardar deuda</Button>
      </div>
    </form>
  );
}

function PayDebtForm({ categorias, cuentas, deuda, onCancel, onSubmit }) {
  const [cuenta, setCuenta] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fecha, setFecha] = useState(todayInputValue());
  const [montoMonedaOrigen, setMontoMonedaOrigen] = useState(
    deuda?.montoCuota ? String(deuda.montoCuota) : "",
  );
  const [cotizacion, setCotizacion] = useState("");
  const [montoDebitadoUYU, setMontoDebitadoUYU] = useState("");

  const montoCalculadoUYU = useMemo(() => {
    const origen = Number(montoMonedaOrigen);
    const rate = Number(cotizacion);

    if (deuda?.moneda === "UYU") return origen || 0;
    if (!origen || !rate || Number.isNaN(origen) || Number.isNaN(rate)) return 0;
    return Number((origen * rate).toFixed(2));
  }, [cotizacion, deuda?.moneda, montoMonedaOrigen]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      cuenta,
      categoria,
      fecha,
      montoMonedaOrigen: Number(montoMonedaOrigen),
      cotizacion: cotizacion === "" ? null : Number(cotizacion),
      montoDebitadoUYU:
        montoDebitadoUYU === "" ? montoCalculadoUYU : Number(montoDebitadoUYU),
    });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      {deuda ? (
        <Alert
          message={`Cuota ${deuda.cuotaActual + 1}/${deuda.cuotasTotales}: ${formatDebtMoney(deuda.montoCuota, deuda.moneda)}. El gasto se genera por el monto debitado en pesos.`}
          title={deuda.descripcion}
          tone="info"
        />
      ) : null}

      <FormField id="payDebtCuenta" label="Cuenta de pago">
        <select
          id="payDebtCuenta"
          onChange={(event) => setCuenta(event.target.value)}
          required
          value={cuenta}
        >
          <option value="">Seleccionar cuenta</option>
          {cuentas.map((item) => (
            <option key={item._id} value={item._id}>
              {item.nombre}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="payDebtCategoria" label="Categoria del gasto">
        <select
          id="payDebtCategoria"
          onChange={(event) => setCategoria(event.target.value)}
          required
          value={categoria}
        >
          <option value="">Seleccionar categoria</option>
          {categorias.map((item) => (
            <option key={item._id} value={item._id}>
              {item.nombre}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="payDebtFecha" label="Fecha de pago">
        <input
          id="payDebtFecha"
          onChange={(event) => setFecha(event.target.value)}
          required
          type="date"
          value={fecha}
        />
      </FormField>

      <div className="form-grid">
        <FormField id="payDebtOriginAmount" label={`Monto cuota en ${deuda?.moneda || "origen"}`}>
          <input
            id="payDebtOriginAmount"
            onChange={(event) => setMontoMonedaOrigen(event.target.value)}
            required
            step="0.01"
            type="number"
            value={montoMonedaOrigen}
          />
        </FormField>

        <FormField id="payDebtRate" label="Cotizacion a UYU">
          <input
            disabled={deuda?.moneda === "UYU"}
            id="payDebtRate"
            onChange={(event) => setCotizacion(event.target.value)}
            placeholder={deuda?.moneda === "UYU" ? "No aplica" : "Valor del dia"}
            step="0.0001"
            type="number"
            value={cotizacion}
          />
        </FormField>
      </div>

      <FormField id="payDebtDebitedAmount" label="Monto debitado en UYU">
        <input
          id="payDebtDebitedAmount"
          onChange={(event) => setMontoDebitadoUYU(event.target.value)}
          placeholder={montoCalculadoUYU ? String(montoCalculadoUYU) : "Monto real del banco"}
          step="0.01"
          type="number"
          value={montoDebitadoUYU}
        />
        <small className="field-hint">
          Si lo dejas vacio, se usa el monto calculado por cuota y cotizacion.
        </small>
      </FormField>

      <div className="button-row button-row-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button type="submit">Pagar cuota</Button>
      </div>
    </form>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
