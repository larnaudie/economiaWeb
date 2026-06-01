import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { EditIconButton } from "../components/EditIconButton";
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

function dateInputValue(value) {
  if (!value) return todayInputValue();
  return new Date(value).toISOString().slice(0, 10);
}

function formatDebtMoney(value, moneda = "UYU") {
  const amount = Number(value || 0);

  if (moneda === "USD") return `US$ ${amount.toFixed(2)}`;
  if (moneda === "UI") return `UI ${amount.toFixed(2)}`;
  return formatCurrency(amount);
}

function getEstimatedTotalsByCurrency({ total, moneda, cotizacionUsd, valorUi }) {
  const amount = Number(total || 0);
  const usdRate = Number(cotizacionUsd);
  const uiRate = Number(valorUi);
  const hasUsdRate = usdRate > 0 && !Number.isNaN(usdRate);
  const hasUiRate = uiRate > 0 && !Number.isNaN(uiRate);

  let totalUyu = null;

  if (moneda === "UYU") totalUyu = amount;
  if (moneda === "USD" && hasUsdRate) totalUyu = amount * usdRate;
  if (moneda === "UI" && hasUiRate) totalUyu = amount * uiRate;

  return [
    {
      moneda: "USD",
      value:
        moneda === "USD"
          ? amount
          : totalUyu !== null && hasUsdRate
            ? totalUyu / usdRate
            : null,
    },
    {
      moneda: "UI",
      value:
        moneda === "UI"
          ? amount
          : totalUyu !== null && hasUiRate
            ? totalUyu / uiRate
            : null,
    },
    {
      moneda: "UYU",
      value: moneda === "UYU" ? amount : totalUyu,
    },
  ];
}

function convertCurrencyAmount({ amount, fromCurrency, toCurrency, cotizacionUsd, valorUi }) {
  const value = Number(amount);
  const usdRate = Number(cotizacionUsd);
  const uiRate = Number(valorUi);
  const hasUsdRate = usdRate > 0 && !Number.isNaN(usdRate);
  const hasUiRate = uiRate > 0 && !Number.isNaN(uiRate);

  if (!value || Number.isNaN(value)) return null;
  if (fromCurrency === toCurrency) return value;

  let amountUyu = null;

  if (fromCurrency === "UYU") amountUyu = value;
  if (fromCurrency === "USD" && hasUsdRate) amountUyu = value * usdRate;
  if (fromCurrency === "UI" && hasUiRate) amountUyu = value * uiRate;

  if (amountUyu === null) return null;

  if (toCurrency === "UYU") return amountUyu;
  if (toCurrency === "USD" && hasUsdRate) return amountUyu / usdRate;
  if (toCurrency === "UI" && hasUiRate) return amountUyu / uiRate;

  return null;
}

function formatYearsFromInstallments(cuotas) {
  return String(Math.ceil(Number(cuotas) / 12));
}

function calculateInstallment({ montoTotal, cuotasTotales, tasaInteres, montoCuota }) {
  if (montoCuota !== "") return Number(montoCuota);

  const total = Number(montoTotal);
  const cuotas = Number(cuotasTotales);
  const tasaAnual = Number(tasaInteres);

  if (!total || !cuotas || Number.isNaN(total) || Number.isNaN(cuotas)) {
    return 0;
  }

  if (!tasaAnual || Number.isNaN(tasaAnual)) {
    return Number((total / cuotas).toFixed(2));
  }

  const tasaMensual = tasaAnual / 100 / 12;
  const cuota = (total * tasaMensual) / (1 - (1 + tasaMensual) ** -cuotas);

  return Number(cuota.toFixed(2));
}

function calculateAnnualRateFromInstallment({ montoTotal, cuotasTotales, montoCuota }) {
  const total = Number(montoTotal);
  const cuotas = Number(cuotasTotales);
  const cuota = Number(montoCuota);

  if (
    !total ||
    !cuotas ||
    !cuota ||
    Number.isNaN(total) ||
    Number.isNaN(cuotas) ||
    Number.isNaN(cuota)
  ) {
    return null;
  }

  const cuotaSinInteres = total / cuotas;
  if (cuota <= cuotaSinInteres) return 0;

  function cuotaConTasaMensual(tasaMensual) {
    return (total * tasaMensual) / (1 - (1 + tasaMensual) ** -cuotas);
  }

  let min = 0;
  let max = 0.01;

  while (cuotaConTasaMensual(max) < cuota && max < 10) {
    max *= 2;
  }

  if (max >= 10) return null;

  for (let index = 0; index < 80; index += 1) {
    const mid = (min + max) / 2;
    if (cuotaConTasaMensual(mid) < cuota) {
      min = mid;
    } else {
      max = mid;
    }
  }

  return Number(((max + min) / 2 * 12 * 100).toFixed(2));
}

const debtTypeLabels = {
  deuda: "Deuda",
  prestamo: "Prestamo",
  financiacion: "Financiacion",
  hipotecario: "Hipotecario",
};

function formatDebtDisplay(value, sourceCurrency, viewCurrency, rates) {
  if (viewCurrency === "original" || sourceCurrency === viewCurrency) {
    return {
      main: formatDebtMoney(value, sourceCurrency),
      original: "",
    };
  }

  const converted = convertCurrencyAmount({
    amount: value,
    fromCurrency: sourceCurrency,
    toCurrency: viewCurrency,
    cotizacionUsd: rates.cotizacionUsd,
    valorUi: rates.valorUi,
  });

  return {
    main:
      converted === null
        ? "Falta cotizacion"
        : formatDebtMoney(converted, viewCurrency),
    original: formatDebtMoney(value, sourceCurrency),
  };
}

function DebtMoneyCell({ value, sourceCurrency, viewCurrency, rates }) {
  const display = formatDebtDisplay(value, sourceCurrency, viewCurrency, rates);

  return (
    <div className="movement-detail-cell debt-money-cell">
      <strong>{display.main}</strong>
      {display.original ? <small>Original: {display.original}</small> : null}
    </div>
  );
}

export function Debts({ onLogout }) {
  const [deudas, setDeudas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInProgressOpen, setCreateInProgressOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [payingDebt, setPayingDebt] = useState(null);
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [viewCurrency, setViewCurrency] = useState("original");
  const [viewUsdRate, setViewUsdRate] = useState("40");
  const [viewUiRate, setViewUiRate] = useState("6.5");
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

      const pagado =
        Number(deuda.montoCuota || 0) * Number(deuda.cuotaActual || 0) +
        Number(deuda.montoPagadoInicial || 0);
      return acc + Math.max(0, Number(deuda.montoTotal || 0) - pagado);
    }, 0);

    return {
      total: deudas.length,
      active: active.length,
      saldo,
    };
  }, [deudas]);

  const displayRates = useMemo(
    () => ({ cotizacionUsd: viewUsdRate, valorUi: viewUiRate }),
    [viewUiRate, viewUsdRate],
  );

  const displaySummarySaldo = useMemo(() => {
    if (viewCurrency === "original") return formatCurrency(summary.saldo);

    const converted = deudas
      .filter((deuda) => deuda.activa)
      .reduce((acc, deuda) => {
        const saldo =
          deuda.saldoPendiente !== undefined && deuda.saldoPendiente !== null
            ? Math.max(0, Number(deuda.saldoPendiente || 0))
            : Math.max(
                0,
                Number(deuda.montoTotal || 0) -
                  (Number(deuda.montoCuota || 0) * Number(deuda.cuotaActual || 0) +
                    Number(deuda.montoPagadoInicial || 0)),
              );

        const value = convertCurrencyAmount({
          amount: saldo,
          fromCurrency: deuda.moneda,
          toCurrency: viewCurrency,
          cotizacionUsd: viewUsdRate,
          valorUi: viewUiRate,
        });

        return value === null ? acc : acc + value;
      }, 0);

    return formatDebtMoney(converted, viewCurrency);
  }, [deudas, summary.saldo, viewCurrency, viewUiRate, viewUsdRate]);

  async function handleCreate(payload, closeModal = () => setCreateOpen(false)) {
    try {
      await apiRequest("/deudas", { method: "POST", body: payload });
      closeModal();
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

  async function handleEdit(payload) {
    if (!editingDebt?._id) return;

    try {
      await apiRequest(`/deudas/${editingDebt._id}`, {
        method: "PATCH",
        body: {
          ...payload,
          saldoPendiente: editingDebt.saldoPendiente,
        },
      });
      setEditingDebt(null);
      setStatus({
        type: "success",
        title: "Deuda actualizada",
        message: "Los cambios se guardaron correctamente.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo editar",
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
        <div className="movement-detail-cell debt-description-cell">
          <strong>{deuda.descripcion}</strong>
          <small>{deuda.entidad || "Sin entidad"}</small>
        </div>
      ),
    },
    {
      key: "montoTotal",
      header: "Monto total",
      render: (deuda) => (
        <DebtMoneyCell
          rates={displayRates}
          sourceCurrency={deuda.moneda}
          value={deuda.montoTotal}
          viewCurrency={viewCurrency}
        />
      ),
    },
    {
      key: "saldo",
      header: "Saldo",
      render: (deuda) => (
        <DebtMoneyCell
          rates={displayRates}
          sourceCurrency={deuda.moneda}
          value={deuda.saldoPendiente}
          viewCurrency={viewCurrency}
        />
      ),
    },
    {
      key: "pagado",
      header: "Pagado",
      render: (deuda) => (
        <DebtMoneyCell
          rates={displayRates}
          sourceCurrency={deuda.moneda}
          value={
            Number(deuda.montoCuota || 0) * Number(deuda.cuotaActual || 0) +
            Number(deuda.montoPagadoInicial || 0)
          }
          viewCurrency={viewCurrency}
        />
      ),
    },
    {
      key: "cuota",
      header: "Cuota",
      render: (deuda) => (
        <DebtMoneyCell
          rates={displayRates}
          sourceCurrency={deuda.moneda}
          value={deuda.montoCuota}
          viewCurrency={viewCurrency}
        />
      ),
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
          <EditIconButton
            label="Editar deuda"
            onClick={() => setEditingDebt(deuda)}
          />
          <DeleteIconButton
            label="Eliminar deuda"
            onClick={() => handleDelete(deuda)}
          />
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
        <MetricCard label="Saldo pendiente" value={displaySummarySaldo} />
        <MetricCard label="Estado" value={loading ? "Cargando" : "Actualizado"} />
      </section>

      <Card className="debts-card" title="Gestion de deudas">
        <div className="section-toolbar">
          <div>
            <h2>Mis deudas</h2>
            <p>{deudas.length} deuda(s) cargada(s).</p>
          </div>
          <div className="button-row">
            <Button onClick={() => setCreateOpen(true)}>Crear deuda</Button>
            <Button
              onClick={() => setCreateInProgressOpen(true)}
              variant="secondary"
            >
              Crear deuda en curso
            </Button>
          </div>
        </div>

        <div className="debt-view-controls">
          <FormField id="debtViewCurrency" label="Ver montos en">
            <select
              id="debtViewCurrency"
              onChange={(event) => setViewCurrency(event.target.value)}
              value={viewCurrency}
            >
              <option value="original">Moneda original</option>
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
              <option value="UI">UI</option>
            </select>
          </FormField>
          <FormField id="debtViewUsdRate" label="USD a UYU">
            <input
              id="debtViewUsdRate"
              onChange={(event) => setViewUsdRate(event.target.value)}
              step="0.01"
              type="number"
              value={viewUsdRate}
            />
          </FormField>
          <FormField id="debtViewUiRate" label="UI en UYU">
            <input
              id="debtViewUiRate"
              onChange={(event) => setViewUiRate(event.target.value)}
              step="0.0001"
              type="number"
              value={viewUiRate}
            />
          </FormField>
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
        onClose={() => setCreateInProgressOpen(false)}
        open={createInProgressOpen}
        title="Crear Deuda en Curso"
      >
        <DebtForm
          allowInitialProgress
          onCancel={() => setCreateInProgressOpen(false)}
          onSubmit={(payload) =>
            handleCreate(payload, () => setCreateInProgressOpen(false))
          }
          submitLabel="Guardar deuda en curso"
        />
      </Modal>

      <Modal
        onClose={() => setEditingDebt(null)}
        open={Boolean(editingDebt)}
        title="Editar Deuda"
      >
        <DebtForm
          debt={editingDebt}
          onCancel={() => setEditingDebt(null)}
          onSubmit={handleEdit}
          submitLabel="Guardar cambios"
        />
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

function DebtForm({
  allowInitialProgress = false,
  debt,
  onCancel,
  onSubmit,
  submitLabel = "Guardar deuda",
}) {
  const [tipo, setTipo] = useState(() => debt?.tipo || "financiacion");
  const [moneda, setMoneda] = useState(() => debt?.moneda || "UYU");
  const [descripcion, setDescripcion] = useState(() => debt?.descripcion || "");
  const [entidad, setEntidad] = useState(() => debt?.entidad || "");
  const [montoTotal, setMontoTotal] = useState(() =>
    debt?.montoOriginalAntesEntrega
      ? String(debt.montoOriginalAntesEntrega)
      : debt?.montoTotal
        ? String(debt.montoTotal)
        : "",
  );
  const [cuotasTotales, setCuotasTotales] = useState(() =>
    debt?.cuotasTotales ? String(debt.cuotasTotales) : "",
  );
  const [montoCuota, setMontoCuota] = useState(() =>
    debt?.montoCuota ? String(debt.montoCuota) : "",
  );
  const [tasaInteres, setTasaInteres] = useState(() =>
    debt?.tasaInteres !== null && debt?.tasaInteres !== undefined
      ? String(debt.tasaInteres)
      : "",
  );
  const [plazoAnios, setPlazoAnios] = useState(() =>
    debt?.plazoAnios ? String(debt.plazoAnios) : "",
  );
  const [diaVencimiento, setDiaVencimiento] = useState(() =>
    debt?.diaVencimiento ? String(debt.diaVencimiento) : "",
  );
  const [cotizacionUsd, setCotizacionUsd] = useState("40");
  const [valorUi, setValorUi] = useState("6.5");
  const [montoConocido, setMontoConocido] = useState("");
  const [monedaMontoConocido, setMonedaMontoConocido] = useState("USD");
  const [entregaInicial, setEntregaInicial] = useState(() =>
    debt?.entregaInicialMonto ? String(debt.entregaInicialMonto) : "",
  );
  const [monedaEntregaInicial, setMonedaEntregaInicial] = useState(
    () => debt?.entregaInicialMoneda || "USD",
  );
  const [porcentajeFinanciacion, setPorcentajeFinanciacion] = useState(() =>
    debt?.porcentajeFinanciacion !== null &&
    debt?.porcentajeFinanciacion !== undefined
      ? String(debt.porcentajeFinanciacion)
      : "",
  );
  const [cuotasPagasIniciales, setCuotasPagasIniciales] = useState(() =>
    debt?.cuotaActual ? String(debt.cuotaActual) : "",
  );
  const [montoPagadoInicial, setMontoPagadoInicial] = useState(() =>
    debt?.montoPagadoInicial ? String(debt.montoPagadoInicial) : "",
  );
  const [fechaInicio, setFechaInicio] = useState(() =>
    dateInputValue(debt?.fechaInicio),
  );

  function handleInstallmentsChange(value) {
    setCuotasTotales(value);

    const cuotas = Number(value);
    if (!cuotas || Number.isNaN(cuotas)) {
      setPlazoAnios("");
      return;
    }

    setPlazoAnios(formatYearsFromInstallments(cuotas));
  }

  function handleTermYearsChange(value) {
    setPlazoAnios(value);

    const years = Number(value);
    if (!years || Number.isNaN(years)) {
      setCuotasTotales("");
      return;
    }

    setCuotasTotales(String(years * 12));
  }

  const cuotasDerivadas = useMemo(() => {
    if (cuotasTotales) return Number(cuotasTotales);

    const years = Number(plazoAnios);
    if (!years || Number.isNaN(years)) return 0;

    return years * 12;
  }, [cuotasTotales, plazoAnios]);

  const entregaInicialConvertida = useMemo(
    () =>
      convertCurrencyAmount({
        amount: entregaInicial,
        fromCurrency: monedaEntregaInicial,
        toCurrency: moneda,
        cotizacionUsd,
        valorUi,
      }),
    [cotizacionUsd, entregaInicial, moneda, monedaEntregaInicial, valorUi],
  );

  const montoFinanciado = useMemo(() => {
    const total = Number(montoTotal || 0);
    const porcentaje = Number(porcentajeFinanciacion);
    const entrega =
      entregaInicialConvertida === null ? 0 : Number(entregaInicialConvertida || 0);

    if (!total || Number.isNaN(total)) return 0;
    if (
      porcentajeFinanciacion !== "" &&
      !Number.isNaN(porcentaje) &&
      porcentaje >= 0 &&
      porcentaje <= 100
    ) {
      return Number((total * (porcentaje / 100)).toFixed(2));
    }

    return Number(Math.max(0, total - entrega).toFixed(2));
  }, [entregaInicialConvertida, montoTotal, porcentajeFinanciacion]);

  const entregaPorPorcentaje = useMemo(() => {
    const total = Number(montoTotal || 0);
    if (!total || Number.isNaN(total) || porcentajeFinanciacion === "") return null;
    return Number(Math.max(0, total - montoFinanciado).toFixed(2));
  }, [montoFinanciado, montoTotal, porcentajeFinanciacion]);

  const cuotaCalculada = useMemo(() => {
    return calculateInstallment({
      montoTotal: montoFinanciado,
      cuotasTotales: cuotasDerivadas,
      tasaInteres,
      montoCuota,
    });
  }, [cuotasDerivadas, montoCuota, montoFinanciado, tasaInteres]);

  const totalEstimado = useMemo(() => {
    if (!cuotaCalculada || !cuotasDerivadas) return 0;
    return Number((cuotaCalculada * cuotasDerivadas).toFixed(2));
  }, [cuotaCalculada, cuotasDerivadas]);

  const pagadoInicial = useMemo(() => {
    const cuotasPagas = Number(cuotasPagasIniciales || 0);
    const montoPagado = Number(montoPagadoInicial || 0);

    return Number(
      (
        (Number.isNaN(cuotasPagas) ? 0 : cuotasPagas * cuotaCalculada) +
        (Number.isNaN(montoPagado) ? 0 : montoPagado)
      ).toFixed(2),
    );
  }, [cuotaCalculada, cuotasPagasIniciales, montoPagadoInicial]);

  const saldoInicialEstimado = useMemo(() => {
    return Number(Math.max(0, totalEstimado - pagadoInicial).toFixed(2));
  }, [pagadoInicial, totalEstimado]);

  const totalEstimadoPorMoneda = useMemo(
    () =>
      getEstimatedTotalsByCurrency({
        total: totalEstimado,
        moneda,
        cotizacionUsd,
        valorUi,
      }),
    [cotizacionUsd, moneda, totalEstimado, valorUi],
  );

  const cuotaCalculadaPorMoneda = useMemo(
    () =>
      getEstimatedTotalsByCurrency({
        total: cuotaCalculada || 0,
        moneda,
        cotizacionUsd,
        valorUi,
      }),
    [cotizacionUsd, cuotaCalculada, moneda, valorUi],
  );

  const tasaAnualImplicita = useMemo(
    () =>
      calculateAnnualRateFromInstallment({
        montoTotal: montoFinanciado,
        cuotasTotales: cuotasDerivadas,
        montoCuota,
      }),
    [cuotasDerivadas, montoCuota, montoFinanciado],
  );

  const montoConvertido = useMemo(
    () =>
      convertCurrencyAmount({
        amount: montoConocido,
        fromCurrency: monedaMontoConocido,
        toCurrency: moneda,
        cotizacionUsd,
        valorUi,
      }),
    [cotizacionUsd, moneda, monedaMontoConocido, montoConocido, valorUi],
  );

  const montoConocidoPorMoneda = useMemo(
    () =>
      getEstimatedTotalsByCurrency({
        total: montoConvertido || 0,
        moneda,
        cotizacionUsd,
        valorUi,
      }),
    [cotizacionUsd, moneda, montoConvertido, valorUi],
  );

  function useConvertedAmount() {
    if (montoConvertido === null) return;
    setMontoTotal(String(Number(montoConvertido.toFixed(2))));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (entregaInicial && entregaInicialConvertida === null) {
      window.alert("Carga la cotizacion necesaria para convertir la entrega inicial.");
      return;
    }

    const porcentaje = Number(porcentajeFinanciacion);
    if (
      porcentajeFinanciacion !== "" &&
      (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100)
    ) {
      window.alert("El porcentaje a financiar debe estar entre 0 y 100.");
      return;
    }

    if (montoFinanciado <= 0) {
      window.alert("El monto a financiar debe ser mayor a 0.");
      return;
    }

    onSubmit({
      descripcion: descripcion.trim(),
      tipo,
      moneda,
      entidad: entidad.trim(),
      montoTotal: Number(montoFinanciado),
      montoOriginalAntesEntrega: montoTotal === "" ? null : Number(montoTotal),
      porcentajeFinanciacion:
        porcentajeFinanciacion === "" ? null : Number(porcentajeFinanciacion),
      entregaInicialMonto:
        entregaInicial === "" ? 0 : Number(entregaInicial),
      entregaInicialMoneda: monedaEntregaInicial,
      entregaInicialConvertida:
        entregaInicialConvertida === null ? 0 : Number(entregaInicialConvertida || 0),
      cuotasTotales: Number(cuotasDerivadas),
      montoCuota: montoCuota === "" ? Number(cuotaCalculada || 0) : Number(montoCuota),
      cuotaActual: cuotasPagasIniciales === "" ? 0 : Number(cuotasPagasIniciales),
      montoPagadoInicial:
        montoPagadoInicial === "" ? 0 : Number(montoPagadoInicial),
      saldoPendiente: allowInitialProgress ? saldoInicialEstimado : null,
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
        <FormField id="debtUsdRate" label="Cotizacion USD a UYU">
          <input
            id="debtUsdRate"
            onChange={(event) => setCotizacionUsd(event.target.value)}
            placeholder="Opcional para estimar"
            step="0.01"
            type="number"
            value={cotizacionUsd}
          />
        </FormField>
        <FormField id="debtUiRate" label="Valor UI en UYU">
          <input
            id="debtUiRate"
            onChange={(event) => setValorUi(event.target.value)}
            placeholder="Opcional para estimar"
            step="0.0001"
            type="number"
            value={valorUi}
          />
        </FormField>
      </div>

      <div className="conversion-panel">
        <strong>Convertir monto conocido</strong>
        <div className="form-grid">
          <FormField id="debtKnownAmount" label="Monto conocido">
            <input
              id="debtKnownAmount"
              onChange={(event) => setMontoConocido(event.target.value)}
              placeholder="Ej: 25000"
              step="0.01"
              type="number"
              value={montoConocido}
            />
          </FormField>
          <FormField id="debtKnownCurrency" label="Moneda conocida">
            <select
              id="debtKnownCurrency"
              onChange={(event) => setMonedaMontoConocido(event.target.value)}
              value={monedaMontoConocido}
            >
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
              <option value="UI">UI</option>
            </select>
          </FormField>
        </div>
        <div className="conversion-summary">
          {montoConvertido === null ? (
            <small>Ingresa monto y cotizaciones necesarias para convertir.</small>
          ) : (
            <>
              <small>
                Equivale a {formatDebtMoney(montoConvertido, moneda)} para la deuda.
              </small>
              {montoConocidoPorMoneda.map((item) => (
                <small key={item.moneda}>
                  {item.moneda}:{" "}
                  {item.value === null
                    ? "carga cotizacion"
                    : formatDebtMoney(item.value, item.moneda)}
                </small>
              ))}
            </>
          )}
        </div>
        <Button
          disabled={montoConvertido === null}
          onClick={useConvertedAmount}
          variant="secondary"
        >
          Usar como monto total
        </Button>
      </div>

      <div className="form-grid">
        <FormField id="debtTotal" label="Monto Total Convertido">
          <input
            id="debtTotal"
            onChange={(event) => setMontoTotal(event.target.value)}
            required
            step="0.01"
            type="number"
            value={montoTotal}
          />
        </FormField>
        <FormField id="debtFinancingPercent" label="Porcentaje financiacion">
          <input
            id="debtFinancingPercent"
            max="100"
            min="0"
            onChange={(event) => setPorcentajeFinanciacion(event.target.value)}
            placeholder="Opcional, ej: 80"
            step="0.01"
            type="number"
            value={porcentajeFinanciacion}
          />
          <small className="field-hint">
            Si lo cargas, la cuota se calcula sobre este porcentaje del total.
          </small>
        </FormField>
      </div>

      <div className="conversion-panel">
        <strong>Entrega inicial</strong>
        <div className="form-grid">
          <FormField id="debtInitialDownPayment" label="Monto de entrega">
            <input
              id="debtInitialDownPayment"
              min="0"
              onChange={(event) => setEntregaInicial(event.target.value)}
              placeholder="Opcional"
              step="0.01"
              type="number"
              value={entregaInicial}
            />
          </FormField>
          <FormField id="debtInitialDownPaymentCurrency" label="Moneda de entrega">
            <select
              id="debtInitialDownPaymentCurrency"
              onChange={(event) => setMonedaEntregaInicial(event.target.value)}
              value={monedaEntregaInicial}
            >
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
              <option value="UI">UI</option>
            </select>
          </FormField>
        </div>
        <div className="conversion-summary">
          <small>
            Entrega convertida:{" "}
            {entregaInicial && entregaInicialConvertida === null
              ? "carga cotizacion"
              : formatDebtMoney(entregaInicialConvertida || 0, moneda)}
          </small>
          {entregaPorPorcentaje !== null ? (
            <small>
              Entrega estimada por porcentaje:{" "}
              {formatDebtMoney(entregaPorPorcentaje, moneda)}
            </small>
          ) : null}
          <small>
            Monto a financiar: {formatDebtMoney(montoFinanciado, moneda)}
          </small>
        </div>
      </div>

      <div className="form-grid">
        <FormField id="debtInstallments" label="Cuotas totales">
          <input
            id="debtInstallments"
            onChange={(event) => handleInstallmentsChange(event.target.value)}
            placeholder={plazoAnios ? `${cuotasDerivadas} cuotas por plazo` : "Opcional si cargas plazo"}
            required={!plazoAnios}
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
            placeholder="Opcional, solo si el banco ya te dio la cuota"
            step="0.01"
            type="number"
            value={montoCuota}
          />
        </FormField>
        <FormField id="debtRate" label="Tasa interes">
          <input
            id="debtRate"
            onChange={(event) => setTasaInteres(event.target.value)}
            placeholder="Anual, opcional"
            step="0.01"
            type="number"
            value={tasaInteres}
          />
        </FormField>
      </div>

      <div className="calculated-preview">
        <span>
          {montoCuota
            ? "Cuota informada"
            : tasaInteres
              ? "Cuota calculada con tasa anual"
              : "Cuota estimada sin intereses"}
        </span>
        <strong>{formatDebtMoney(cuotaCalculada, moneda)}</strong>
        {cuotasDerivadas ? (
          <div className="estimated-totals">
            <small>Cuota estimada por moneda:</small>
            {cuotaCalculadaPorMoneda.map((item) => (
              <small key={`cuota-${item.moneda}`}>
                {item.moneda}:{" "}
                {item.value === null
                  ? "carga cotizacion"
                  : formatDebtMoney(item.value, item.moneda)}
              </small>
            ))}
            <small>{cuotasDerivadas} cuota(s). Total estimado a pagar:</small>
            {totalEstimadoPorMoneda.map((item) => (
              <small key={item.moneda}>
                {item.moneda}:{" "}
                {item.value === null
                  ? "carga cotizacion"
                  : formatDebtMoney(item.value, item.moneda)}
              </small>
            ))}
            {montoCuota && !tasaInteres ? (
              tasaAnualImplicita === null ? (
                <small>No se pudo estimar una tasa anual con estos datos.</small>
              ) : (
                <>
                  <small>
                    Tasa anual estimada por la cuota:{" "}
                    <strong>{tasaAnualImplicita.toFixed(2)}%</strong>
                  </small>
                  <Button
                    onClick={() => setTasaInteres(String(tasaAnualImplicita))}
                    type="button"
                    variant="secondary"
                  >
                    Usar tasa estimada
                  </Button>
                </>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {allowInitialProgress ? (
        <div className="conversion-panel">
          <strong>Progreso inicial</strong>
          <div className="form-grid">
            <FormField id="debtInitialPaidInstallments" label="Cuotas ya pagadas">
              <input
                id="debtInitialPaidInstallments"
                max={cuotasDerivadas || undefined}
                min="0"
                onChange={(event) => setCuotasPagasIniciales(event.target.value)}
                placeholder="Opcional"
                type="number"
                value={cuotasPagasIniciales}
              />
            </FormField>
            <FormField id="debtInitialPaidAmount" label={`Monto ya pagado en ${moneda}`}>
              <input
                id="debtInitialPaidAmount"
                min="0"
                onChange={(event) => setMontoPagadoInicial(event.target.value)}
                placeholder="Opcional"
                step="0.01"
                type="number"
                value={montoPagadoInicial}
              />
            </FormField>
          </div>
          <div className="conversion-summary">
            <small>Pagado inicial: {formatDebtMoney(pagadoInicial, moneda)}</small>
            <small>Saldo inicial estimado: {formatDebtMoney(saldoInicialEstimado, moneda)}</small>
          </div>
        </div>
      ) : null}

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
        <FormField id="debtTermYears" label="Plazo en años">
          <input
            id="debtTermYears"
            onChange={(event) => handleTermYearsChange(event.target.value)}
            placeholder="Opcional"
            required={!cuotasTotales}
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
        <Button type="submit">{submitLabel}</Button>
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
