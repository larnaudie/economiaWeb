import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PageLayout } from "../layout/PageLayout";
import {
  apiRequest,
  getApiData,
  getUser,
  logout,
  uploadApiFile,
} from "../services/api";
import { formatCurrency, formatDate } from "../utils/formatters";

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

const MOVEMENT_TYPE_LABELS = {
  compra: "Compra",
  pago: "Pago",
  credito: "Credito",
  saldo_anterior: "Saldo anterior",
  ajuste: "Ajuste",
};

function formatCardMoney(value, moneda = "UYU") {
  const amount = Number(value || 0);

  if (moneda === "USD") {
    return `US$ ${amount.toFixed(2)}`;
  }

  return formatCurrency(amount);
}

function getMovementTypeLabel(type) {
  return MOVEMENT_TYPE_LABELS[type] || type || "N/A";
}

function getMovementAccountingHint(movimiento) {
  if (movimiento.tipoMovimiento === "compra") {
    return "Consumo: genera gasto real";
  }

  if (movimiento.tipoMovimiento === "credito") {
    return "Devolucion o ajuste a favor";
  }

  if (movimiento.tipoMovimiento === "pago") {
    return "Pago: se concilia con cuenta bancaria";
  }

  if (movimiento.tipoMovimiento === "saldo_anterior") {
    return "Saldo informativo del resumen";
  }

  return "Revisar movimiento";
}

function emptyCurrencyTotals() {
  return { uyu: 0, usd: 0 };
}

function addCurrencyAmount(target, movimiento, amount) {
  if (movimiento.moneda === "USD") {
    target.usd += amount;
  } else {
    target.uyu += amount;
  }
}

function formatCurrencyPair(total) {
  return `${formatCurrency(total.uyu)} / US$ ${total.usd.toFixed(2)}`;
}

export function CreditCards({ onLogout, selectedTarjetaId = "" }) {
  const [tarjetas, setTarjetas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [movementFilters, setMovementFilters] = useState({
    tipoMovimiento: "",
    moneda: "",
    search: "",
    generated: "",
  });
  const [selectedMovementIds, setSelectedMovementIds] = useState(() => new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [importingCard, setImportingCard] = useState(null);
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const user = getUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      const [tarjetasResp, bancosResp, cuentasResp] = await Promise.all([
        apiRequest("/tarjetas-credito"),
        apiRequest("/bancos"),
        apiRequest("/cuentas"),
      ]);

      setTarjetas(normalizeItems(tarjetasResp));
      setBancos(normalizeItems(bancosResp));
      setCuentas(normalizeItems(cuentasResp));
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron cargar tarjetas",
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

  const selectedTarjeta = useMemo(() => {
    return tarjetas.find((tarjeta) => tarjeta._id === selectedTarjetaId) || null;
  }, [selectedTarjetaId, tarjetas]);

  const loadMovements = useCallback(async () => {
    if (!selectedTarjetaId) {
      setMovimientos([]);
      return;
    }

    setLoadingMovements(true);

    try {
      const response = await apiRequest(
        `/tarjetas-credito/${selectedTarjetaId}/movimientos`,
      );
      setMovimientos(normalizeItems(response));
      setSelectedMovementIds(new Set());
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron cargar movimientos",
        message: error.message,
      });
    } finally {
      setLoadingMovements(false);
    }
  }, [selectedTarjetaId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadMovements, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadMovements]);

  const summary = useMemo(() => {
    return tarjetas.reduce(
      (acc, tarjeta) => {
        if (tarjeta.activa) acc.activas += 1;
        acc.limiteUYU += Number(tarjeta.limiteUYU || 0);
        acc.limiteUSD += Number(tarjeta.limiteUSD || 0);
        return acc;
      },
      { activas: 0, limiteUYU: 0, limiteUSD: 0 },
    );
  }, [tarjetas]);

  const filteredMovements = useMemo(() => {
    return movimientos.filter((movimiento) => {
      const search = movementFilters.search.trim().toLowerCase();
      const matchesType =
        !movementFilters.tipoMovimiento ||
        movimiento.tipoMovimiento === movementFilters.tipoMovimiento;
      const matchesCurrency =
        !movementFilters.moneda || movimiento.moneda === movementFilters.moneda;
      const matchesSearch =
        !search || String(movimiento.detalle || "").toLowerCase().includes(search);
      const matchesGenerated =
        !movementFilters.generated ||
        (movementFilters.generated === "generado" && movimiento.gastoGenerado) ||
        (movementFilters.generated === "pendiente" && !movimiento.gastoGenerado);

      return matchesType && matchesCurrency && matchesSearch && matchesGenerated;
    });
  }, [movementFilters, movimientos]);

  const movementSummary = useMemo(() => {
    return filteredMovements.reduce(
      (acc, movimiento) => {
        acc.total += 1;

        const amount = Number(movimiento.montoOriginalExcel || 0);

        if (movimiento.tipoMovimiento === "compra") {
          addCurrencyAmount(acc.compras, movimiento, Math.abs(amount));
        } else if (movimiento.tipoMovimiento === "pago") {
          addCurrencyAmount(acc.pagos, movimiento, Math.abs(amount));
        } else if (movimiento.tipoMovimiento === "credito") {
          addCurrencyAmount(acc.creditos, movimiento, Math.abs(amount));
        } else if (movimiento.tipoMovimiento === "saldo_anterior") {
          addCurrencyAmount(acc.saldoAnterior, movimiento, amount);
        } else {
          addCurrencyAmount(acc.ajustes, movimiento, amount);
        }

        return acc;
      },
      {
        total: 0,
        compras: emptyCurrencyTotals(),
        pagos: emptyCurrencyTotals(),
        creditos: emptyCurrencyTotals(),
        ajustes: emptyCurrencyTotals(),
        saldoAnterior: emptyCurrencyTotals(),
      },
    );
  }, [filteredMovements]);

  const cardBalance = useMemo(() => {
    return {
      uyu:
        movementSummary.saldoAnterior.uyu +
        movementSummary.compras.uyu -
        movementSummary.pagos.uyu -
        movementSummary.creditos.uyu +
        movementSummary.ajustes.uyu,
      usd:
        movementSummary.saldoAnterior.usd +
        movementSummary.compras.usd -
        movementSummary.pagos.usd -
        movementSummary.creditos.usd +
        movementSummary.ajustes.usd,
    };
  }, [movementSummary]);

  const selectableMovements = useMemo(() => {
    return filteredMovements.filter(
      (movimiento) =>
        movimiento.tipoMovimiento === "compra" && !movimiento.gastoGenerado,
    );
  }, [filteredMovements]);

  const allSelectableMovementsSelected =
    selectableMovements.length > 0 &&
    selectableMovements.every((movimiento) =>
      selectedMovementIds.has(movimiento._id),
    );

  function toggleMovementSelected(id) {
    setSelectedMovementIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllSelectableMovements(checked) {
    setSelectedMovementIds((current) => {
      const next = new Set(current);
      selectableMovements.forEach((movimiento) => {
        if (checked) {
          next.add(movimiento._id);
        } else {
          next.delete(movimiento._id);
        }
      });
      return next;
    });
  }

  async function handleCreate(payload) {
    try {
      await apiRequest("/tarjetas-credito", {
        method: "POST",
        body: payload,
      });
      setCreateOpen(false);
      setStatus({
        type: "success",
        title: "Tarjeta creada",
        message: "La tarjeta quedo lista para importar movimientos.",
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

  async function handleUpdate(payload) {
    if (!editingCard?._id) return;

    try {
      await apiRequest(`/tarjetas-credito/${editingCard._id}`, {
        method: "PATCH",
        body: payload,
      });
      setEditingCard(null);
      setStatus({
        type: "success",
        title: "Tarjeta actualizada",
        message: "Los datos de la tarjeta se guardaron correctamente.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo actualizar",
        message: error.message,
      });
    }
  }

  async function handleImport(file) {
    if (!importingCard?._id || !file) return;

    try {
      const response = await uploadApiFile(
        `/tarjetas-credito/${importingCard._id}/importar-excel`,
        "excel",
        file,
      );
      const result = getApiData(response);

      setImportingCard(null);
      setStatus({
        type: "success",
        title: "Resumen importado",
        message: `Movimientos nuevos: ${result.movimientosCreados}. Duplicados: ${result.movimientosDuplicados}.`,
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo importar",
        message: error.message,
      });
    }
  }

  async function handleDelete(tarjeta) {
    const confirmed = window.confirm(`Eliminar ${tarjeta.nombre}?`);
    if (!confirmed) return;

    try {
      await apiRequest(`/tarjetas-credito/${tarjeta._id}`, { method: "DELETE" });
      setStatus({
        type: "success",
        title: "Tarjeta eliminada",
        message: "La tarjeta se elimino correctamente.",
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

  async function handleCreateExpenseFromMovement(movimiento) {
    if (!selectedTarjetaId || !movimiento?._id) return;

    try {
      await apiRequest(
        `/tarjetas-credito/${selectedTarjetaId}/movimientos/${movimiento._id}/crear-gasto`,
        { method: "POST" },
      );

      setStatus({
        type: "success",
        title: "Gasto pendiente creado",
        message:
          "El movimiento ahora aparece en Gastos Pendientes para completar categoria y cuenta.",
      });
      await loadMovements();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo crear el gasto",
        message: error.message,
      });
    }
  }

  async function handleCreateSelectedExpenses() {
    const movimientoIds = [...selectedMovementIds];

    if (!selectedTarjetaId || !movimientoIds.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message: "Selecciona al menos una compra pendiente de generar.",
      });
      return;
    }

    try {
      const response = await apiRequest(
        `/tarjetas-credito/${selectedTarjetaId}/movimientos/crear-gastos`,
        {
          method: "POST",
          body: { movimientoIds },
        },
      );
      const result = getApiData(response);

      setStatus({
        type: result.errores ? "warning" : "success",
        title: "Creacion masiva finalizada",
        message: `Creados: ${result.creados}. Omitidos: ${result.omitidos}. Errores: ${result.errores}.`,
      });
      setSelectedMovementIds(new Set());
      await loadMovements();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron crear gastos",
        message: error.message,
      });
    }
  }

  async function handleDeleteMovement(movimiento) {
    if (!selectedTarjetaId || !movimiento?._id) return;

    const hasGeneratedExpense = Boolean(movimiento.gastoGenerado);
    const confirmed = window.confirm(
      hasGeneratedExpense
        ? "Este movimiento tiene un gasto generado. Queres borrar el movimiento y tambien ese gasto?"
        : `Eliminar el movimiento ${movimiento.detalle || ""}?`,
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/tarjetas-credito/${selectedTarjetaId}/movimientos/${movimiento._id}`,
        {
          method: "DELETE",
          body: { eliminarGastoGenerado: hasGeneratedExpense },
        },
      );

      setStatus({
        type: "success",
        title: "Movimiento eliminado",
        message: hasGeneratedExpense
          ? "Se elimino el movimiento y su gasto generado."
          : "Se elimino el movimiento importado.",
      });
      await loadMovements();
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo eliminar movimiento",
        message: error.message,
      });
    }
  }

  async function handleDeleteImportedSummary() {
    if (!selectedTarjeta?._id || !selectedTarjeta.ultimoResumen?._id) return;

    const confirmed = window.confirm(
      "Eliminar este resumen importado, sus movimientos y los gastos generados desde esos movimientos?",
    );

    if (!confirmed) return;

    try {
      const response = await apiRequest(
        `/tarjetas-credito/${selectedTarjeta._id}/resumenes/${selectedTarjeta.ultimoResumen._id}`,
        {
          method: "DELETE",
          body: { eliminarGastosGenerados: true },
        },
      );
      const result = getApiData(response);

      setStatus({
        type: "success",
        title: "Resumen eliminado",
        message: `Movimientos eliminados: ${result.movimientosEliminados}. Gastos eliminados: ${result.gastosEliminados}.`,
      });
      setSelectedMovementIds(new Set());
      await loadMovements();
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo eliminar resumen",
        message: error.message,
      });
    }
  }

  const columns = [
    {
      key: "nombre",
      header: "Tarjeta",
      render: (tarjeta) => (
        <span>
          {tarjeta.nombre}
          {tarjeta.ultimosDigitos ? ` ****${tarjeta.ultimosDigitos}` : ""}
        </span>
      ),
    },
    {
      key: "banco",
      header: "Banco",
      render: (tarjeta) => tarjeta.banco?.nombre || "N/A",
    },
    {
      key: "limiteUYU",
      header: "Limite UYU",
      render: (tarjeta) => formatCurrency(tarjeta.limiteUYU),
    },
    {
      key: "limiteUSD",
      header: "Limite USD",
      render: (tarjeta) => `US$ ${Number(tarjeta.limiteUSD || 0).toFixed(2)}`,
    },
    {
      key: "cierre",
      header: "Cierre",
      render: (tarjeta) => tarjeta.diaCierre || "N/A",
    },
    {
      key: "vencimiento",
      header: "Vencimiento",
      render: (tarjeta) => tarjeta.diaVencimiento || "N/A",
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (tarjeta) => (
        <div className="table-actions">
          <Button
            onClick={() => {
              window.location.assign(`#/tarjetas-credito?tarjeta=${tarjeta._id}`);
            }}
            variant="secondary"
          >
            Movimientos
          </Button>
          <Button onClick={() => setImportingCard(tarjeta)} variant="secondary">
            Importar resumen
          </Button>
          <Button onClick={() => setEditingCard(tarjeta)} variant="secondary">
            Editar
          </Button>
          <Button onClick={() => handleDelete(tarjeta)} variant="danger">
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  const movementColumns = [
    {
      key: "select",
      header: (
        <input
          aria-label="Seleccionar compras visibles sin gasto generado"
          checked={allSelectableMovementsSelected}
          disabled={!selectableMovements.length}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleAllSelectableMovements(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (movimiento) => {
        const selectable =
          movimiento.tipoMovimiento === "compra" && !movimiento.gastoGenerado;

        return (
          <input
            aria-label={`Seleccionar ${movimiento.detalle || "movimiento"}`}
            checked={selectedMovementIds.has(movimiento._id)}
            disabled={!selectable}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleMovementSelected(movimiento._id)}
            type="checkbox"
          />
        );
      },
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (movimiento) => formatDate(movimiento.fecha),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (movimiento) => (
        <span className={`status-pill movement-${movimiento.tipoMovimiento}`}>
          {getMovementTypeLabel(movimiento.tipoMovimiento)}
        </span>
      ),
    },
    {
      key: "detalle",
      header: "Detalle",
      render: (movimiento) => (
        <div className="movement-detail-cell">
          <strong>{movimiento.detalle || "N/A"}</strong>
          <small>{movimiento.periodoResumen || "Sin resumen"}</small>
        </div>
      ),
    },
    {
      key: "moneda",
      header: "Moneda",
      render: (movimiento) => movimiento.moneda,
    },
    {
      key: "excel",
      header: "Monto tarjeta",
      render: (movimiento) =>
        formatCardMoney(movimiento.montoOriginalExcel, movimiento.moneda),
    },
    {
      key: "lectura",
      header: "Lectura",
      render: (movimiento) => getMovementAccountingHint(movimiento),
    },
    {
      key: "gasto",
      header: "Gasto generado",
      render: (movimiento) => (
        <span
          className={`status-pill ${
            movimiento.gastoGenerado ? "status-creado" : "status-pendiente"
          }`}
        >
          {movimiento.gastoGenerado ? "Generado" : "Pendiente de generar"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (movimiento) => (
        <div className="table-actions">
          {movimiento.tipoMovimiento === "compra" && !movimiento.gastoGenerado ? (
            <Button
              onClick={() => handleCreateExpenseFromMovement(movimiento)}
              variant="secondary"
            >
              Crear gasto
            </Button>
          ) : null}
          {movimiento.gastoGenerado ? (
            <Button
              onClick={() => window.location.assign("#/gastos-pendientes")}
              variant="secondary"
            >
              Ver pendiente
            </Button>
          ) : null}
          <Button onClick={() => handleDeleteMovement(movimiento)} variant="danger">
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
      subtitle="Base para importar y entender consumos, pagos y saldos de tarjeta."
      title="Tarjetas de Credito"
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      {selectedTarjetaId ? (
        <>
          <Card>
            <div className="section-toolbar">
              <div>
                <h2>
                  {selectedTarjeta
                    ? `${selectedTarjeta.nombre} - Movimientos`
                    : "Movimientos de tarjeta"}
                </h2>
                <p>
                  {loadingMovements
                    ? "Actualizando..."
                    : `${filteredMovements.length} movimiento(s) visibles.`}
                </p>
              </div>
              <div className="table-actions">
                <Button
                  onClick={() => setImportingCard(selectedTarjeta)}
                  variant="secondary"
                  disabled={!selectedTarjeta}
                >
                  Importar resumen
                </Button>
                <Button
                  disabled={!selectedTarjeta?.ultimoResumen}
                  onClick={handleDeleteImportedSummary}
                  variant="danger"
                >
                  Borrar resumen
                </Button>
                <Button
                  onClick={() => window.location.assign("#/tarjetas-credito")}
                  variant="secondary"
                >
                  Volver a tarjetas
                </Button>
              </div>
            </div>

            {selectedTarjeta ? (
              <CreditCardSummary
                balance={cardBalance}
                movementSummary={movementSummary}
                tarjeta={selectedTarjeta}
              />
            ) : null}
          </Card>

          <section className="metric-grid metric-grid-wide">
            <MetricCard label="Movimientos" value={movementSummary.total} />
            <MetricCard
              label="Saldo anterior"
              value={formatCurrencyPair(movementSummary.saldoAnterior)}
            />
            <MetricCard
              label="Compras"
              value={formatCurrencyPair(movementSummary.compras)}
            />
            <MetricCard
              label="Pagos detectados"
              value={formatCurrencyPair(movementSummary.pagos)}
            />
            <MetricCard
              label="Creditos y devoluciones"
              value={formatCurrencyPair(movementSummary.creditos)}
            />
            <MetricCard
              label="Saldo estimado"
              value={formatCurrencyPair(cardBalance)}
            />
          </section>

          <Card title="Filtros">
            <div className="expense-filters">
              <FormField id="movementTypeFilter" label="Tipo">
                <select
                  id="movementTypeFilter"
                  onChange={(event) =>
                    setMovementFilters((current) => ({
                      ...current,
                      tipoMovimiento: event.target.value,
                    }))
                  }
                  value={movementFilters.tipoMovimiento}
                >
                  <option value="">Todos</option>
                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="movementCurrencyFilter" label="Moneda">
                <select
                  id="movementCurrencyFilter"
                  onChange={(event) =>
                    setMovementFilters((current) => ({
                      ...current,
                      moneda: event.target.value,
                    }))
                  }
                  value={movementFilters.moneda}
                >
                  <option value="">Todas</option>
                  <option value="UYU">UYU</option>
                  <option value="USD">USD</option>
                </select>
              </FormField>

              <FormField id="movementGeneratedFilter" label="Gasto">
                <select
                  id="movementGeneratedFilter"
                  onChange={(event) =>
                    setMovementFilters((current) => ({
                      ...current,
                      generated: event.target.value,
                    }))
                  }
                  value={movementFilters.generated}
                >
                  <option value="">Todos</option>
                  <option value="pendiente">Pendientes de generar</option>
                  <option value="generado">Generados</option>
                </select>
              </FormField>

              <FormField id="movementSearchFilter" label="Detalle">
                <input
                  id="movementSearchFilter"
                  onChange={(event) =>
                    setMovementFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Buscar comercio o detalle"
                  value={movementFilters.search}
                />
              </FormField>

              <div className="button-row expense-filter-actions">
                <Button
                  onClick={() =>
                    setMovementFilters({
                      tipoMovimiento: "",
                      moneda: "",
                      search: "",
                      generated: "",
                    })
                  }
                  variant="secondary"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </Card>

          <Card className="expenses-table-card" title="Listado de movimientos">
            <div className="section-toolbar">
              <div>
                <h2>Movimientos importados</h2>
                <p>
                  Seleccionados: {selectedMovementIds.size}. Solo las compras sin
                  gasto generado se pueden crear masivamente.
                </p>
              </div>
              <div className="table-actions">
                <Button
                  disabled={!selectedMovementIds.size}
                  onClick={handleCreateSelectedExpenses}
                  variant="secondary"
                >
                  Crear gastos seleccionados
                </Button>
                <Button
                  disabled={!selectedMovementIds.size}
                  onClick={() => setSelectedMovementIds(new Set())}
                  variant="secondary"
                >
                  Limpiar seleccion
                </Button>
              </div>
            </div>

            <DataTable
              columns={movementColumns}
              emptyMessage="No hay movimientos para los filtros seleccionados."
              getRowProps={(movimiento) => ({
                className: movimiento.gastoGenerado ? "" : "pending-row",
              })}
              items={filteredMovements}
              rowKey={(movimiento) => movimiento._id}
            />
          </Card>
        </>
      ) : (
        <>
          <section className="metric-grid metric-grid-wide">
            <MetricCard label="Tarjetas" value={tarjetas.length} />
            <MetricCard label="Activas" value={summary.activas} />
            <MetricCard
              label="Limite UYU"
              value={formatCurrency(summary.limiteUYU)}
            />
            <MetricCard
              label="Limite USD"
              value={`US$ ${summary.limiteUSD.toFixed(2)}`}
            />
          </section>

          <Card title="Mis tarjetas">
            <div className="section-toolbar">
              <div>
                <h2>Tarjetas cargadas</h2>
                <p>
                  {loading ? "Actualizando..." : `${tarjetas.length} tarjeta(s).`}
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>Crear tarjeta</Button>
            </div>

            <DataTable
              columns={columns}
              emptyMessage="No hay tarjetas cargadas."
              items={tarjetas}
              rowKey={(tarjeta) => tarjeta._id}
            />
          </Card>

          <section className="dashboard-grid dashboard-grid-spaced">
            {tarjetas.map((tarjeta) => (
              <Card
                className="credit-card-summary-card"
                key={tarjeta._id}
                title={`${tarjeta.nombre} - Ultimo resumen`}
              >
                <CreditCardSummary tarjeta={tarjeta} />
              </Card>
            ))}
          </section>
        </>
      )}

      <Modal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Crear Tarjeta"
      >
        <CreditCardForm
          bancos={bancos}
          cuentas={cuentas}
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        onClose={() => setEditingCard(null)}
        open={Boolean(editingCard)}
        title="Editar Tarjeta"
      >
        <CreditCardForm
          bancos={bancos}
          cuentas={cuentas}
          onCancel={() => setEditingCard(null)}
          onSubmit={handleUpdate}
          tarjeta={editingCard}
        />
      </Modal>

      <Modal
        onClose={() => setImportingCard(null)}
        open={Boolean(importingCard)}
        title="Importar resumen"
      >
        <ImportCardStatementForm
          onCancel={() => setImportingCard(null)}
          onSubmit={handleImport}
          tarjeta={importingCard}
        />
      </Modal>
    </PageLayout>
  );
}

function CreditCardSummary({ balance, movementSummary, tarjeta }) {
  const resumen = tarjeta.ultimoResumen;

  if (!resumen) {
    return (
      <p className="empty-state">
        Todavia no hay resumen importado para esta tarjeta.
      </p>
    );
  }

  const pagoUYU = Number(resumen.pagoContadoUYU || 0);
  const pagoUSD = Number(resumen.pagoContadoUSD || 0);
  const hasMovementBalance = Boolean(balance && movementSummary);

  return (
    <div className="credit-summary-stack">
      <div className="credit-payment-callout">
        <span>Total a pagar segun resumen</span>
        <strong>
          {formatCurrency(pagoUYU)} y US$ {pagoUSD.toFixed(2)}
        </strong>
        {hasMovementBalance ? (
          <div className="credit-payment-breakdown">
            <small>Pagos detectados: {formatCurrencyPair(movementSummary.pagos)}</small>
            <small>Saldo estimado: {formatCurrencyPair(balance)}</small>
            <small>
              Vence el {formatDate(resumen.fechaVencimiento)}. Pago minimo:{" "}
              {formatCurrency(resumen.pagoMinimoUYU)} y US${" "}
              {Number(resumen.pagoMinimoUSD || 0).toFixed(2)}.
            </small>
          </div>
        ) : (
          <small>
            Vence el {formatDate(resumen.fechaVencimiento)}. Pago minimo:{" "}
            {formatCurrency(resumen.pagoMinimoUYU)} y US${" "}
            {Number(resumen.pagoMinimoUSD || 0).toFixed(2)}.
          </small>
        )}
      </div>

      <div className="credit-summary-grid">
        <SummaryItem label="Periodo" value={resumen.periodo} />
        <SummaryItem label="Cierre" value={formatDate(resumen.fechaCierre)} />
        <SummaryItem
          label="Vencimiento"
          value={formatDate(resumen.fechaVencimiento)}
        />
        <SummaryItem label="Limite UYU" value={formatCurrency(resumen.limiteUYU)} />
        <SummaryItem
          label="Disponible UYU"
          value={formatCurrency(resumen.creditoDisponibleUYU)}
        />
        <SummaryItem
          label="Saldo anterior UYU"
          value={formatCurrency(resumen.saldoAnteriorUYU)}
        />
        <SummaryItem
          label="Cargos mes UYU"
          value={formatCurrency(resumen.cargosMesUYU)}
        />
        <SummaryItem
          label="Pago contado UYU"
          value={formatCurrency(resumen.pagoContadoUYU)}
        />
        <SummaryItem
          label="Pago minimo UYU"
          value={formatCurrency(resumen.pagoMinimoUYU)}
        />
        <SummaryItem
          label="Limite USD"
          value={`US$ ${Number(resumen.limiteUSD || 0).toFixed(2)}`}
        />
        <SummaryItem
          label="Disponible USD"
          value={`US$ ${Number(resumen.creditoDisponibleUSD || 0).toFixed(2)}`}
        />
        <SummaryItem
          label="Saldo anterior USD"
          value={`US$ ${Number(resumen.saldoAnteriorUSD || 0).toFixed(2)}`}
        />
        <SummaryItem
          label="Cargos mes USD"
          value={`US$ ${Number(resumen.cargosMesUSD || 0).toFixed(2)}`}
        />
        <SummaryItem
          label="Pago contado USD"
          value={`US$ ${Number(resumen.pagoContadoUSD || 0).toFixed(2)}`}
        />
        <SummaryItem
          label="Pago minimo USD"
          value={`US$ ${Number(resumen.pagoMinimoUSD || 0).toFixed(2)}`}
        />
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value ?? "N/A"}</strong>
    </div>
  );
}

function CreditCardForm({ bancos, cuentas, onCancel, onSubmit, tarjeta }) {
  const [form, setForm] = useState({
    nombre: tarjeta?.nombre || "",
    banco: tarjeta?.banco?._id || tarjeta?.banco || "",
    cuentaPagoDefault:
      tarjeta?.cuentaPagoDefault?._id || tarjeta?.cuentaPagoDefault || "",
    ultimosDigitos: tarjeta?.ultimosDigitos || "",
    monedaPrincipal: tarjeta?.monedaPrincipal || "UYU",
    limiteUYU: tarjeta?.limiteUYU ?? "",
    limiteUSD: tarjeta?.limiteUSD ?? "",
    diaCierre: tarjeta?.diaCierre ?? "",
    diaVencimiento: tarjeta?.diaVencimiento ?? "",
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      nombre: form.nombre.trim(),
      banco: form.banco || null,
      cuentaPagoDefault: form.cuentaPagoDefault || null,
      ultimosDigitos: form.ultimosDigitos.trim(),
      monedaPrincipal: form.monedaPrincipal,
      limiteUYU: form.limiteUYU === "" ? null : Number(form.limiteUYU),
      limiteUSD: form.limiteUSD === "" ? null : Number(form.limiteUSD),
      diaCierre: form.diaCierre === "" ? null : Number(form.diaCierre),
      diaVencimiento:
        form.diaVencimiento === "" ? null : Number(form.diaVencimiento),
    });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <FormField id="creditCardName" label="Nombre">
        <input
          id="creditCardName"
          minLength="2"
          onChange={(event) => updateField("nombre", event.target.value)}
          required
          value={form.nombre}
        />
      </FormField>

      <div className="form-grid">
        <FormField id="creditCardBank" label="Banco">
          <select
            id="creditCardBank"
            onChange={(event) => updateField("banco", event.target.value)}
            value={form.banco}
          >
            <option value="">Sin banco</option>
            {bancos.map((banco) => (
              <option key={banco._id} value={banco._id}>
                {banco.nombre}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="creditCardPaymentAccount" label="Cuenta pago default">
          <select
            id="creditCardPaymentAccount"
            onChange={(event) =>
              updateField("cuentaPagoDefault", event.target.value)
            }
            value={form.cuentaPagoDefault}
          >
            <option value="">Sin cuenta default</option>
            {cuentas.map((cuenta) => (
              <option key={cuenta._id} value={cuenta._id}>
                {cuenta.nombre}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="form-grid">
        <FormField id="creditCardLastDigits" label="Ultimos digitos">
          <input
            id="creditCardLastDigits"
            maxLength="4"
            onChange={(event) => updateField("ultimosDigitos", event.target.value)}
            value={form.ultimosDigitos}
          />
        </FormField>

        <FormField id="creditCardCurrency" label="Moneda principal">
          <select
            id="creditCardCurrency"
            onChange={(event) => updateField("monedaPrincipal", event.target.value)}
            value={form.monedaPrincipal}
          >
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </select>
        </FormField>
      </div>

      <div className="form-grid">
        <FormField id="creditCardLimitUYU" label="Limite UYU">
          <input
            id="creditCardLimitUYU"
            min="0"
            onChange={(event) => updateField("limiteUYU", event.target.value)}
            step="0.01"
            type="number"
            value={form.limiteUYU}
          />
        </FormField>

        <FormField id="creditCardLimitUSD" label="Limite USD">
          <input
            id="creditCardLimitUSD"
            min="0"
            onChange={(event) => updateField("limiteUSD", event.target.value)}
            step="0.01"
            type="number"
            value={form.limiteUSD}
          />
        </FormField>
      </div>

      <div className="form-grid">
        <FormField id="creditCardClosingDay" label="Dia cierre">
          <input
            id="creditCardClosingDay"
            max="31"
            min="1"
            onChange={(event) => updateField("diaCierre", event.target.value)}
            type="number"
            value={form.diaCierre}
          />
        </FormField>

        <FormField id="creditCardDueDay" label="Dia vencimiento">
          <input
            id="creditCardDueDay"
            max="31"
            min="1"
            onChange={(event) => updateField("diaVencimiento", event.target.value)}
            type="number"
            value={form.diaVencimiento}
          />
        </FormField>
      </div>

      <div className="button-row button-row-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button type="submit">{tarjeta ? "Guardar cambios" : "Guardar tarjeta"}</Button>
      </div>
    </form>
  );
}

function ImportCardStatementForm({ onCancel, onSubmit, tarjeta }) {
  const [file, setFile] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(file);
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <Alert
        message="Por ahora se importa el resumen y los movimientos, sin generar gastos automaticamente."
        title={tarjeta?.nombre || "Tarjeta"}
        tone="info"
      />

      <FormField id="creditCardStatementExcel" label="Excel del banco">
        <input
          accept=".xlsx,.xls"
          id="creditCardStatementExcel"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          required
          type="file"
        />
      </FormField>

      <div className="button-row button-row-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={!file} type="submit">
          Importar resumen
        </Button>
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
