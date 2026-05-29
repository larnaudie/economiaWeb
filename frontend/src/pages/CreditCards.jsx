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
import {
  apiRequest,
  getApiData,
  getUser,
  logout,
  uploadApiFile,
} from "../services/api";
import { formatCurrency, formatDate } from "../utils/formatters";
import { showToast } from "../utils/toast";

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

function getPaymentState(balance) {
  if (!balance) return null;

  const paid =
    Math.abs(Number(balance.uyu || 0)) < 0.01 &&
    Math.abs(Number(balance.usd || 0)) < 0.01;

  if (paid) return "pagado";
  return "pendiente";
}

function getPaymentStateMeta(state) {
  if (state === "pagado") {
    return { className: "status-creado", label: "Resumen pago" };
  }

  if (state === "saldo_a_favor") {
    return { className: "status-creado", label: "Saldo a favor" };
  }

  if (state === "parcial") {
    return { className: "status-pendiente", label: "Pago parcial" };
  }

  return { className: "status-pendiente", label: "Pendiente de pago" };
}

function getMovementGenerationState(movimiento) {
  if (movimiento.gastoGenerado) {
    return movimiento.tipoMovimiento === "compra"
      ? { className: "status-creado", label: "Gasto generado" }
      : { className: "status-creado", label: "Movimiento generado" };
  }

  return movimiento.tipoMovimiento === "compra"
    ? { className: "status-pendiente", label: "Pendiente de generar" }
    : { className: "status-pendiente", label: "Pendiente en cuenta" };
}

const accountTypeLabels = {
  caja_ahorro: "Caja de ahorro",
  cuenta_corriente: "Cuenta corriente",
  tarjeta_credito: "Tarjeta de credito",
};

export function CreditCards({ onLogout, selectedResumenId = "", selectedTarjetaId = "" }) {
  const [tarjetas, setTarjetas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [resumenes, setResumenes] = useState([]);
  const [movementFilters, setMovementFilters] = useState({
    resumenId: "",
    tipoMovimiento: "",
    moneda: "",
    search: "",
    generated: "",
  });
  const [selectedMovementIds, setSelectedMovementIds] = useState(() => new Set());
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [importingCard, setImportingCard] = useState(null);
  const [creditFlowTab, setCreditFlowTab] = useState("resumen");
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
  const selectedCardAccountId =
    selectedTarjeta?.cuentaTarjeta?._id || selectedTarjeta?.cuentaTarjeta || "";
  const paymentAccounts = useMemo(
    () => cuentas.filter((cuenta) => cuenta.tipo !== "tarjeta_credito"),
    [cuentas],
  );

  useEffect(() => {
    const defaultAccount =
      selectedTarjeta?.cuentaPagoDefault?._id ||
      selectedTarjeta?.cuentaPagoDefault ||
      "";
    setSelectedPaymentAccount(defaultAccount);
  }, [selectedTarjeta]);

  useEffect(() => {
    setMovementFilters((current) => ({
      ...current,
      resumenId: selectedResumenId || "",
    }));
  }, [selectedResumenId, selectedTarjetaId]);

  useEffect(() => {
    if (selectedResumenId) {
      setCreditFlowTab("movimientos");
    } else if (!selectedTarjetaId) {
      setCreditFlowTab("resumen");
    }
  }, [selectedResumenId, selectedTarjetaId]);

  useEffect(() => {
    if (!status.message) return;
    showToast({
      message: status.message,
      title: status.title,
      type: status.type || "info",
    });
  }, [status]);

  const loadMovements = useCallback(async () => {
    if (!selectedTarjetaId) {
      setMovimientos([]);
      setResumenes([]);
      return;
    }

    setLoadingMovements(true);

    try {
      const [movimientosResp, resumenesResp] = await Promise.all([
        apiRequest(`/tarjetas-credito/${selectedTarjetaId}/movimientos`),
        apiRequest(`/tarjetas-credito/${selectedTarjetaId}/resumenes`),
      ]);
      setMovimientos(normalizeItems(movimientosResp));
      setResumenes(normalizeItems(resumenesResp));
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
      const movimientoResumenId =
        typeof movimiento.resumen === "object" ? movimiento.resumen?._id : movimiento.resumen;
      const matchesSummary =
        !movementFilters.resumenId || movimientoResumenId === movementFilters.resumenId;
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

      return (
        matchesSummary &&
        matchesType &&
        matchesCurrency &&
        matchesSearch &&
        matchesGenerated
      );
    });
  }, [movementFilters, movimientos]);

  const selectedSummary = useMemo(() => {
    if (!movementFilters.resumenId) return null;
    return resumenes.find((resumen) => resumen._id === movementFilters.resumenId) || null;
  }, [resumenes, movementFilters.resumenId]);

  const importedSummaries = useMemo(() => {
    return [...resumenes].sort((a, b) => {
      const dateA = new Date(a.fechaCierre || a.createdAt || 0).getTime();
      const dateB = new Date(b.fechaCierre || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [resumenes]);

  const summaryToDisplay = selectedSummary || selectedTarjeta?.ultimoResumen || null;

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
    return filteredMovements;
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

  function getSelectedMovements() {
    return filteredMovements.filter((movimiento) =>
      selectedMovementIds.has(movimiento._id),
    );
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
      if (selectedTarjetaId === importingCard._id) {
        await loadMovements();
      }
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
        {
          method: "POST",
          body: { cuentaPago: selectedPaymentAccount || null },
        },
      );

      setStatus({
        type: "success",
        title:
          movimiento.tipoMovimiento === "compra"
            ? "Gasto pendiente creado"
            : "Movimiento generado",
        message:
          movimiento.tipoMovimiento === "compra"
            ? "La compra ahora aparece en Gastos Pendientes para completar categoria."
            : "El movimiento impacto la cuenta tarjeta sin duplicar gasto real.",
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
    const movimientoIds = getSelectedMovements()
      .filter((movimiento) => !movimiento.gastoGenerado)
      .map((movimiento) => movimiento._id);

    if (!selectedTarjetaId || !movimientoIds.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message:
          "Selecciona al menos un movimiento que todavia no este generado en cuenta.",
      });
      return;
    }

    try {
      const response = await apiRequest(
        `/tarjetas-credito/${selectedTarjetaId}/movimientos/crear-gastos`,
        {
          method: "POST",
          body: {
            movimientoIds,
            cuentaPago: selectedPaymentAccount || null,
          },
        },
      );
      const result = getApiData(response);

      setStatus({
        type: result.errores ? "warning" : "success",
        title: "Movimientos generados",
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

  async function handleDeleteSelectedMovements() {
    const selectedMovements = getSelectedMovements();

    if (!selectedTarjetaId || !selectedMovements.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message: "Selecciona al menos un movimiento para eliminar.",
      });
      return;
    }

    const generatedCount = selectedMovements.filter(
      (movimiento) => movimiento.gastoGenerado,
    ).length;
    const confirmed = window.confirm(
      generatedCount
        ? `Eliminar ${selectedMovements.length} movimiento(s) seleccionado(s) y tambien ${generatedCount} gasto(s) generado(s)?`
        : `Eliminar ${selectedMovements.length} movimiento(s) seleccionado(s)?`,
    );

    if (!confirmed) return;

    let deleted = 0;
    let failed = 0;

    for (const movimiento of selectedMovements) {
      try {
        await apiRequest(
          `/tarjetas-credito/${selectedTarjetaId}/movimientos/${movimiento._id}`,
          {
            method: "DELETE",
            body: { eliminarGastoGenerado: Boolean(movimiento.gastoGenerado) },
          },
        );
        deleted++;
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Eliminacion masiva finalizada",
      message: `Movimientos eliminados: ${deleted}. Errores: ${failed}.`,
    });
    setSelectedMovementIds(new Set());
    await loadMovements();
    await loadData();
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
    const targetSummary = selectedSummary || selectedTarjeta?.ultimoResumen;
    if (!selectedTarjeta?._id || !targetSummary?._id) return;

    const confirmed = window.confirm(
      `Eliminar el resumen ${targetSummary.periodo || ""}, sus movimientos y los gastos generados desde esos movimientos?`,
    );

    if (!confirmed) return;

    try {
      const response = await apiRequest(
        `/tarjetas-credito/${selectedTarjeta._id}/resumenes/${targetSummary._id}`,
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
      setMovementFilters((current) => ({ ...current, resumenId: "" }));
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
      key: "cuentaTarjeta",
      header: "Cuenta tarjeta",
      render: (tarjeta) => tarjeta.cuentaTarjeta?.nombre || "Sin cuenta",
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
          <EditIconButton
            label="Editar tarjeta"
            onClick={() => setEditingCard(tarjeta)}
          />
          <DeleteIconButton
            label="Eliminar tarjeta"
            onClick={() => handleDelete(tarjeta)}
          />
        </div>
      ),
    },
  ];

  const movementColumns = [
    {
      key: "select",
      header: (
        <input
          aria-label="Seleccionar movimientos visibles"
          checked={allSelectableMovementsSelected}
          disabled={!selectableMovements.length}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleAllSelectableMovements(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (movimiento) => {
        return (
          <input
            aria-label={`Seleccionar ${movimiento.detalle || "movimiento"}`}
            checked={selectedMovementIds.has(movimiento._id)}
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
      render: (movimiento) => {
        const state = getMovementGenerationState(movimiento);

        return (
          <span className={`status-pill ${state.className}`}>
            {state.label}
          </span>
        );
      },
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
          {movimiento.tipoMovimiento !== "compra" && !movimiento.gastoGenerado ? (
            <Button
              onClick={() => handleCreateExpenseFromMovement(movimiento)}
              variant="secondary"
            >
              Crear movimiento
            </Button>
          ) : null}
          {movimiento.gastoGenerado && movimiento.tipoMovimiento === "compra" ? (
            <Button
              onClick={() => window.location.assign("#/gastos-pendientes")}
              variant="secondary"
            >
              Completar gasto
            </Button>
          ) : null}
          {movimiento.gastoGenerado && movimiento.tipoMovimiento !== "compra" ? (
            <Button
              disabled={!selectedCardAccountId}
              onClick={() =>
                window.location.assign(`#/gastos-cuenta?cuenta=${selectedCardAccountId}`)
              }
              variant="secondary"
            >
              Ver cuenta
            </Button>
          ) : null}
          <DeleteIconButton
            label="Eliminar movimiento"
            onClick={() => handleDeleteMovement(movimiento)}
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
                  disabled={!summaryToDisplay}
                  onClick={handleDeleteImportedSummary}
                  variant="danger"
                >
                  Borrar resumen
                </Button>
                <Button
                  onClick={() => setImportingCard(selectedTarjeta)}
                  variant="secondary"
                  disabled={!selectedTarjeta}
                >
                  Importar resumen
                </Button>
                <Button
                  onClick={() => window.location.assign("#/tarjetas-credito")}
                  variant="secondary"
                >
                  Volver a tarjetas
                </Button>
              </div>
            </div>

            <div className="credit-flow-tabs" role="tablist" aria-label="Flujo de tarjeta">
              {[
                ["resumen", "Resumen"],
                ["movimientos", "Movimientos"],
                ["conciliacion", "Conciliacion"],
                ["cuenta", "Cuenta asociada"],
              ].map(([value, label]) => (
                <button
                  aria-selected={creditFlowTab === value}
                  className={`tab-button ${creditFlowTab === value ? "active" : ""}`}
                  key={value}
                  onClick={() => setCreditFlowTab(value)}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="credit-flow-helper">
              {creditFlowTab === "resumen"
                ? "Mira cuanto se debe pagar, que pagos ya aparecen y el estado del resumen."
                : null}
              {creditFlowTab === "movimientos"
                ? "Revisa compras, pagos y saldos importados. Selecciona movimientos para trabajarlos en conciliacion."
                : null}
              {creditFlowTab === "conciliacion"
                ? "Genera movimientos en la cuenta tarjeta o elimina importaciones seleccionadas."
                : null}
              {creditFlowTab === "cuenta"
                ? "Accede a la cuenta bancaria tipo Tarjeta de Credito para ver el impacto contable."
                : null}
            </p>

            {selectedTarjeta && creditFlowTab === "resumen" ? (
              <CreditCardSummary
                balance={cardBalance}
                movementSummary={movementSummary}
                resumen={summaryToDisplay}
                tarjeta={selectedTarjeta}
              />
            ) : null}
          </Card>

          {creditFlowTab === "resumen" || creditFlowTab === "movimientos" ? (
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
          ) : null}

          {creditFlowTab === "movimientos" ? (
            <>
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

                  <FormField id="movementSummaryFilter" label="Resumen">
                    <select
                      id="movementSummaryFilter"
                      onChange={(event) =>
                        setMovementFilters((current) => ({
                          ...current,
                          resumenId: event.target.value,
                        }))
                      }
                      value={movementFilters.resumenId}
                    >
                      <option value="">Todos los resumenes</option>
                      {importedSummaries.map((resumen) => (
                        <option key={resumen._id} value={resumen._id}>
                          {resumen.periodo}
                          {resumen.fechaCierre
                            ? ` - cierre ${formatDate(resumen.fechaCierre)}`
                            : ""}
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
                          resumenId: "",
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
                      {selectedSummary
                        ? `Resumen ${selectedSummary.periodo}. `
                        : "Todos los resumenes. "}
                      Seleccionados: {selectedMovementIds.size}. Usa Conciliacion para generar movimientos en cuenta.
                    </p>
                  </div>
                  <Button
                    onClick={() => setCreditFlowTab("conciliacion")}
                    variant="secondary"
                  >
                    Ir a conciliacion
                  </Button>
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
          ) : null}

          {creditFlowTab === "conciliacion" ? (
            <Card title="Conciliacion">
              <div className="section-toolbar">
                <div>
                  <h2>Generar movimientos en cuenta</h2>
                  <p>
                    Seleccionados: {selectedMovementIds.size}. Los pagos pueden conciliar con una cuenta bancaria; las compras impactan la cuenta tarjeta.
                  </p>
                </div>
                <Button onClick={() => setCreditFlowTab("movimientos")} variant="secondary">
                  Elegir movimientos
                </Button>
              </div>
              <div className="expense-filters">
                <FormField id="creditCardPaymentSource" label="Cuenta origen del pago">
                  <select
                    id="creditCardPaymentSource"
                    onChange={(event) => setSelectedPaymentAccount(event.target.value)}
                    value={selectedPaymentAccount}
                  >
                    <option value="">Usar default o no conciliar banco</option>
                    {paymentAccounts.map((cuenta) => (
                      <option key={cuenta._id} value={cuenta._id}>
                        {cuenta.nombre}
                      </option>
                    ))}
                  </select>
                  <small className="field-hint">
                    Solo aplica a movimientos tipo Pago. La cuenta Tarjeta de Credito se toma de la tarjeta.
                  </small>
                </FormField>
                <Button
                  disabled={!selectedMovementIds.size}
                  onClick={handleCreateSelectedExpenses}
                  variant="secondary"
                >
                  Crear movimientos seleccionados
                </Button>
                <Button
                  disabled={!selectedMovementIds.size}
                  onClick={handleDeleteSelectedMovements}
                  variant="danger"
                >
                  Eliminar seleccionados
                </Button>
                <Button
                  disabled={!selectedMovementIds.size}
                  onClick={() => setSelectedMovementIds(new Set())}
                  variant="secondary"
                >
                  Limpiar seleccion
                </Button>
              </div>
            </Card>
          ) : null}

          {creditFlowTab === "cuenta" ? (
            <Card title="Cuenta asociada">
              {selectedCardAccountId ? (
                <>
                  <p>
                    Esta tarjeta impacta en la cuenta bancaria tipo Tarjeta de Credito asociada. Ahi podes ver compras, pagos, saldo y categorias como cualquier cuenta.
                  </p>
                  <div className="button-row">
                    <Button
                      onClick={() =>
                        window.location.assign(`#/gastos-cuenta?cuenta=${selectedCardAccountId}`)
                      }
                    >
                      Ver cuenta tarjeta
                    </Button>
                  </div>
                </>
              ) : (
                <p className="empty-state">
                  Esta tarjeta todavia no tiene cuenta tarjeta asociada. Edita la tarjeta y vincula una cuenta tipo Tarjeta de credito.
                </p>
              )}
            </Card>
          ) : null}
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
            {tarjetas.flatMap((tarjeta) => {
              const summaries = tarjeta.resumenes?.length
                ? tarjeta.resumenes
                : tarjeta.ultimoResumen
                  ? [tarjeta.ultimoResumen]
                  : [];

              if (!summaries.length) {
                return (
                  <Card
                    className="credit-card-summary-card"
                    key={tarjeta._id}
                    title={`${tarjeta.nombre} - Sin resumenes`}
                  >
                    <CreditCardSummary tarjeta={tarjeta} />
                  </Card>
                );
              }

              return summaries.map((resumen) => (
                <Card
                  className="credit-card-summary-card"
                  key={`${tarjeta._id}-${resumen._id}`}
                  onClick={() =>
                    window.location.assign(
                      `#/tarjetas-credito?tarjeta=${tarjeta._id}&resumen=${resumen._id}`,
                    )
                  }
                  title={`${tarjeta.nombre} - ${resumen.periodo || "Resumen"}`}
                >
                  <CreditCardSummary resumen={resumen} tarjeta={tarjeta} />
                </Card>
              ));
            })}
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

function CreditCardSummary({ balance, movementSummary, resumen: selectedResumen, tarjeta }) {
  const resumen = selectedResumen || tarjeta.ultimoResumen;

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
  const resumenBalance = resumen.movimientosBalance || null;
  const displayedBalance = balance || resumenBalance?.saldoPendiente || null;
  const paymentState = resumenBalance?.estadoPago || getPaymentState(displayedBalance);
  const paymentStateMeta = paymentState ? getPaymentStateMeta(paymentState) : null;
  const pagosDetectados = movementSummary?.pagos || resumenBalance?.pagos || null;
  const montoAPagar = displayedBalance
    ? {
        uyu: Math.max(0, Number(displayedBalance.uyu || 0)),
        usd: Math.max(0, Number(displayedBalance.usd || 0)),
      }
    : null;
  const saldoAFavor = displayedBalance
    ? {
        uyu: Math.max(0, -Number(displayedBalance.uyu || 0)),
        usd: Math.max(0, -Number(displayedBalance.usd || 0)),
      }
    : null;

  return (
    <div className="credit-summary-stack">
      <div className="credit-payment-callout">
        <div className="credit-payment-title-row">
          <span>Total a pagar segun resumen</span>
          {paymentStateMeta ? (
            <span className={`status-pill ${paymentStateMeta.className}`}>
              {paymentState === "saldo_a_favor" && saldoAFavor
                ? `${paymentStateMeta.label}: ${formatCurrencyPair(saldoAFavor)}`
                : paymentStateMeta.label}
            </span>
          ) : null}
        </div>
        <strong>
          {formatCurrency(pagoUYU)} y US$ {pagoUSD.toFixed(2)}
        </strong>
        {hasMovementBalance || resumenBalance ? (
          <div className="credit-payment-breakdown">
            <small>Pagos detectados: {formatCurrencyPair(pagosDetectados)}</small>
            <small>Saldo estimado: {formatCurrencyPair(displayedBalance)}</small>
            {montoAPagar ? (
              <strong className="credit-payment-due">
                A pagar: {formatCurrencyPair(montoAPagar)}
              </strong>
            ) : null}
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
    cuentaTarjeta: tarjeta?.cuentaTarjeta?._id || tarjeta?.cuentaTarjeta || "",
    cuentaPagoDefault:
      tarjeta?.cuentaPagoDefault?._id || tarjeta?.cuentaPagoDefault || "",
    ultimosDigitos: tarjeta?.ultimosDigitos || "",
    monedaPrincipal: tarjeta?.monedaPrincipal || "UYU",
    limiteUYU: tarjeta?.limiteUYU ?? "",
    limiteUSD: tarjeta?.limiteUSD ?? "",
    diaCierre: tarjeta?.diaCierre ?? "",
    diaVencimiento: tarjeta?.diaVencimiento ?? "",
  });
  const cuentasTarjeta = cuentas.filter((cuenta) => cuenta.tipo === "tarjeta_credito");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      nombre: form.nombre.trim(),
      banco: form.banco || null,
      cuentaTarjeta: form.cuentaTarjeta || null,
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

        <FormField id="creditCardAccount" label="Cuenta tarjeta">
          <select
            id="creditCardAccount"
            onChange={(event) => updateField("cuentaTarjeta", event.target.value)}
            value={form.cuentaTarjeta}
          >
            <option value="">Sin cuenta tarjeta</option>
            {cuentasTarjeta.map((cuenta) => (
              <option key={cuenta._id} value={cuenta._id}>
                {cuenta.nombre}
              </option>
            ))}
          </select>
          <small className="field-hint">
            Los gastos generados desde compras de tarjeta se cargan en esta cuenta.
          </small>
        </FormField>
      </div>

      <div className="form-grid">
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
                {cuenta.nombre} - {accountTypeLabels[cuenta.tipo] || "Cuenta"}
              </option>
            ))}
          </select>
        </FormField>

        <div className="field-hint">
          Si todavia no existe, creala en Creaciones como tipo Tarjeta de credito.
        </div>
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
        message="Importa solo resumenes de tarjeta con secciones Cuenta, Pagos y movimientos con columnas Fecha, Tarjeta, Detalle, Importe $ e Importe U$S. Si el archivo no cumple ese formato, la importacion se rechaza sin guardar datos."
        title={tarjeta?.nombre || "Tarjeta"}
        tone="warning"
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
