import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { EditIconButton } from "../components/EditIconButton";
import { ExpenseForm } from "../components/ExpenseForm";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PeriodFilter } from "../components/PeriodFilter";
import { PageLayout } from "../layout/PageLayout";
import {
  apiRequest,
  getApiData,
  getUser,
  logout,
  uploadApiFile,
} from "../services/api";
import { formatCurrency, formatDate } from "../utils/formatters";
import { buildDateRange, currentMonthPeriod } from "../utils/periodFilters";

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

function currentAccountFilters() {
  return {
    ...currentMonthPeriod(),
    categoria: "",
    search: "",
  };
}

function idValue(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._id === "string") return value._id;
  return null;
}

function normalizeExpensePayload(payload, fallbackCuenta) {
  return {
    ...payload,
    categoria: idValue(payload.categoria),
    cuenta: idValue(payload.cuenta) || fallbackCuenta || null,
  };
}

export function AccountExpenses({ initialCuentaId = "", onLogout }) {
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedCuenta, setSelectedCuenta] = useState("");
  const [filters, setFilters] = useState(currentAccountFilters);
  const [appliedFilters, setAppliedFilters] = useState(currentAccountFilters);
  const [gastos, setGastos] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [draggedId, setDraggedId] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState({
    categoria: "",
    cuenta: "",
    porcentajeEconomiaReal: "",
    incluirEnGastoBancario: "",
    incluirEnGastoReal: "",
  });
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const user = getUser();
  const selectedCuentaData = useMemo(
    () => cuentas.find((cuenta) => cuenta._id === selectedCuenta) || null,
    [cuentas, selectedCuenta],
  );
  const isCreditCardAccount = selectedCuentaData?.tipo === "tarjeta_credito";

  const loadResources = useCallback(async () => {
    const [cuentasResp, categoriasResp] = await Promise.all([
      apiRequest("/cuentas"),
      apiRequest("/categorias"),
    ]);

    const cuentasData = normalizeItems(cuentasResp);
    setCuentas(cuentasData);
    setCategorias(normalizeItems(categoriasResp));

    setSelectedCuenta((current) => {
      if (current) return current;
      const initialExists = cuentasData.some((cuenta) => cuenta._id === initialCuentaId);
      return initialExists ? initialCuentaId : cuentasData[0]?._id || "";
    });
  }, [initialCuentaId]);

  const loadExpenses = useCallback(
    async (cuentaId = selectedCuenta, nextFilters = appliedFilters) => {
      if (!cuentaId) return;

      setLoading(true);
      setStatus({ type: "", title: "", message: "" });

      try {
        const { fechaDesde, fechaHasta } = buildDateRange(nextFilters);
        const params = new URLSearchParams();
        params.set("cuenta", cuentaId);
        if (fechaDesde) params.set("fechaDesde", fechaDesde);
        if (fechaHasta) params.set("fechaHasta", fechaHasta);
        if (nextFilters.categoria) params.set("categoria", nextFilters.categoria);
        if (nextFilters.search.trim()) params.set("busqueda", nextFilters.search.trim());

        const response = await apiRequest(`/gastos?${params.toString()}`);
        const items = normalizeItems(response);
        setGastos(items);
        setSelectedIds(new Set());
      } catch (error) {
        setStatus({
          type: "error",
          title: "No se pudieron cargar gastos",
          message: error.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, selectedCuenta],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        await loadResources();
      } catch (error) {
        setStatus({
          type: "error",
          title: "No se pudieron cargar recursos",
          message: error.message,
        });
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  useEffect(() => {
    if (!selectedCuenta) return;
    const timeoutId = window.setTimeout(() => loadExpenses(selectedCuenta, appliedFilters), 0);
    return () => window.clearTimeout(timeoutId);
  }, [appliedFilters, loadExpenses, selectedCuenta]);

  const totals = useMemo(() => {
    return gastos
      .reduce(
        (acc, gasto) => {
          const flujo = Number(gasto.flujoBancario || 0);
          const real = Number(gasto.economiaReal || 0);
          if (isCreditCardAccount || gasto.estado !== "pendiente") {
            acc.saldo += flujo;
          }
          if (gasto.estado === "pendiente") return acc;
          if (gasto.incluirEnGastoBancario !== false && flujo < 0) acc.bancario += flujo;
          if (gasto.incluirEnGastoReal !== false && real < 0) acc.real += real;
          return acc;
        },
        { bancario: 0, real: 0, saldo: 0 },
      );
  }, [gastos, isCreditCardAccount]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    gastos.filter((gasto) => gasto.estado !== "pendiente").forEach((gasto) => {
      if (gasto.incluirEnGastoReal === false) return;
      const key = gasto.categoria?.nombre || "Sin categoria";
      map.set(key, (map.get(key) || 0) + Math.abs(Number(gasto.economiaReal || 0)));
    });
    return Array.from(map.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  }, [gastos]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
    const next = currentAccountFilters();
    setFilters(next);
    setAppliedFilters(next);
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSelected(checked) {
    setSelectedIds(checked ? new Set(gastos.map((gasto) => gasto._id)) : new Set());
  }

  async function handleCreate(payload) {
    const { facturaFile, ...gastoPayload } = payload;

    try {
      const response = await apiRequest("/gastos", {
        method: "POST",
        body: { ...gastoPayload, cuenta: selectedCuenta },
      });
      const created = getApiData(response);

      if (facturaFile && created?._id) {
        await uploadApiFile(`/gastos/${created._id}/factura`, "factura", facturaFile);
      }

      setIsCreateOpen(false);
      setStatus({ type: "success", title: "Gasto creado", message: "Se guardo correctamente." });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({ type: "error", title: "No se pudo crear", message: error.message });
    }
  }

  async function handleEdit(payload) {
    if (!editingExpense?._id) return;
    const { facturaFile, ...gastoPayload } = payload;

    try {
      await apiRequest(`/gastos/${editingExpense._id}`, {
        method: "PATCH",
        body: normalizeExpensePayload(
          { ...gastoPayload, cuenta: selectedCuenta },
          selectedCuenta,
        ),
      });

      if (facturaFile) {
        await uploadApiFile(
          `/gastos/${editingExpense._id}/factura`,
          "factura",
          facturaFile,
        );
      }

      setEditingExpense(null);
      setStatus({ type: "success", title: "Gasto actualizado", message: "Se guardo correctamente." });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({ type: "error", title: "No se pudo editar", message: error.message });
    }
  }

  async function deleteExpense(gasto) {
    let deleteLinkedCardMovement = false;
    const isCardExpense = gasto.origen === "tarjeta_credito" || gasto.movimientoTarjeta;
    const confirmed = isCardExpense
      ? window.confirm(
          `Estas borrando ${gasto.descripcion} que esta asociado a una tarjeta. Aceptar: eliminar gasto en cuenta y tarjeta. Cancelar: elegir si borrarlo solo en cuenta.`,
        )
      : window.confirm(`Eliminar ${gasto.descripcion}?`);

    if (isCardExpense && confirmed) {
      deleteLinkedCardMovement = true;
    }

    if (isCardExpense && !confirmed) {
      const onlyAccount = window.confirm(
        "Queres eliminar el gasto solo en cuenta y conservar el movimiento en Tarjetas?",
      );
      if (!onlyAccount) return;
      await deleteMany([gasto], { deleteLinkedCardMovement: false });
      return;
    }

    if (!confirmed) return;
    await deleteMany([gasto], { deleteLinkedCardMovement });
  }

  async function deleteMany(items, options = {}) {
    let deleted = 0;
    let failed = 0;

    for (const gasto of items) {
      try {
        await apiRequest(`/gastos/${gasto._id}`, {
          method: "DELETE",
          body: {
            eliminarMovimientoTarjeta: options.deleteLinkedCardMovement === true,
          },
        });
        deleted++;
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Eliminacion finalizada",
      message: `Eliminados: ${deleted}. Errores: ${failed}.`,
    });
    await loadExpenses(selectedCuenta, appliedFilters);
  }

  async function deleteSelected() {
    const selected = gastos.filter((gasto) => selectedIds.has(gasto._id));
    if (!selected.length) {
      setStatus({ type: "error", title: "Sin seleccion", message: "Selecciona al menos un gasto." });
      return;
    }

    const confirmed = window.confirm(`Eliminar ${selected.length} gasto(s)?`);
    if (!confirmed) return;
    await deleteMany(selected);
  }

  async function applyBulkChanges() {
    const selected = gastos.filter((gasto) => selectedIds.has(gasto._id));
    if (!selected.length) {
      setStatus({ type: "error", title: "Sin seleccion", message: "Selecciona al menos un gasto." });
      return;
    }

    const hasChange = Object.values(bulkValues).some((value) => value !== "");
    if (!hasChange) {
      setStatus({ type: "error", title: "Sin cambios", message: "Elige algun valor para aplicar." });
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const gasto of selected) {
      try {
        const percentage =
          bulkValues.porcentajeEconomiaReal === ""
            ? Number(gasto.porcentajeEconomiaReal || 0)
            : Number(bulkValues.porcentajeEconomiaReal);
        const flow = Number(gasto.flujoBancario || 0);
        const real = Number((flow * (percentage / 100)).toFixed(2));

        await apiRequest(`/gastos/${gasto._id}`, {
          method: "PATCH",
          body: normalizeExpensePayload({
            fecha: gasto.fecha,
            descripcion: gasto.descripcion,
            flujoBancario: flow,
            porcentajeEconomiaReal: percentage,
            economiaReal: real,
            categoria: bulkValues.categoria || gasto.categoria?._id || gasto.categoria,
            cuenta: bulkValues.cuenta || selectedCuenta,
            incluirEnGastoBancario:
              bulkValues.incluirEnGastoBancario === ""
                ? gasto.incluirEnGastoBancario !== false
                : bulkValues.incluirEnGastoBancario === "true",
            incluirEnGastoReal:
              bulkValues.incluirEnGastoReal === ""
                ? gasto.incluirEnGastoReal !== false
                : bulkValues.incluirEnGastoReal === "true",
          }, selectedCuenta),
        });
        updated++;
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Cambios aplicados",
      message: `Actualizados: ${updated}. Errores: ${failed}.`,
    });
    await loadExpenses(selectedCuenta, appliedFilters);
  }

  async function moveExpenseToAccount(gasto, cuentaId) {
    if (!gasto?._id || !cuentaId || cuentaId === selectedCuenta) return;

    try {
      await apiRequest(`/gastos/${gasto._id}`, {
        method: "PATCH",
        body: normalizeExpensePayload({
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: gasto.flujoBancario,
          economiaReal: gasto.economiaReal,
          porcentajeEconomiaReal: gasto.porcentajeEconomiaReal,
          categoria: gasto.categoria?._id || gasto.categoria,
          cuenta: cuentaId,
          incluirEnGastoBancario: gasto.incluirEnGastoBancario !== false,
          incluirEnGastoReal: gasto.incluirEnGastoReal !== false,
        }, cuentaId),
      });

      setStatus({
        type: "success",
        title: "Gasto movido",
        message: "El gasto se movio a la cuenta seleccionada.",
      });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo mover",
        message: error.message,
      });
    }
  }

  async function updateExpenseInclusion(gasto, field, checked) {
    if (!gasto?._id) return;

    try {
      await apiRequest(`/gastos/${gasto._id}`, {
        method: "PATCH",
        body: normalizeExpensePayload({
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: gasto.flujoBancario,
          economiaReal: gasto.economiaReal,
          porcentajeEconomiaReal: gasto.porcentajeEconomiaReal,
          categoria: gasto.categoria?._id || gasto.categoria,
          cuenta: gasto.cuenta?._id || gasto.cuenta || selectedCuenta,
          incluirEnGastoBancario:
            field === "bancario" ? checked : gasto.incluirEnGastoBancario !== false,
          incluirEnGastoReal:
            field === "real" ? checked : gasto.incluirEnGastoReal !== false,
        }, selectedCuenta),
      });

      setStatus({
        type: "success",
        title: "Gasto actualizado",
        message: "La inclusion del gasto se actualizo correctamente.",
      });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo actualizar",
        message: error.message,
      });
    }
  }

  function reorderExpenses(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setGastos((current) => {
      const sourceIndex = current.findIndex((gasto) => gasto._id === sourceId);
      const targetIndex = current.findIndex((gasto) => gasto._id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function saveOrder() {
    try {
      await apiRequest("/gastos/orden-cuenta", {
        method: "PATCH",
        body: {
          gastos: gastos.map((gasto) => ({ id: gasto._id })),
        },
      });

      setStatus({
        type: "success",
        title: "Orden guardado",
        message: "El orden manual de los gastos visibles se guardo correctamente.",
      });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo guardar orden",
        message: error.message,
      });
    }
  }

  const columns = [
    {
      key: "select",
      header: (
        <input
          checked={gastos.length > 0 && selectedIds.size === gastos.length}
          onChange={(event) => toggleAllSelected(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (gasto) => (
        <input
          checked={selectedIds.has(gasto._id)}
          onChange={() => toggleSelected(gasto._id)}
          type="checkbox"
        />
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (gasto) => (
        <span className={`status-pill status-${gasto.estado || "creado"}`}>
          {gasto.estado === "pendiente" ? "Pendiente" : "Creado"}
        </span>
      ),
    },
    { key: "fecha", header: "Fecha", render: (gasto) => formatDate(gasto.fecha) },
    { key: "descripcion", header: "Descripcion", render: (gasto) => gasto.descripcion || "N/A" },
    { key: "bancario", header: "Bancario", render: (gasto) => formatCurrency(gasto.flujoBancario) },
    { key: "real", header: "Real", render: (gasto) => formatCurrency(gasto.economiaReal) },
    { key: "categoria", header: "Categoria", render: (gasto) => gasto.categoria?.nombre || "N/A" },
    {
      key: "incluir",
      header: "Incluir",
      render: (gasto) => (
        <div className="table-include-controls">
          <label>
            <input
              checked={gasto.incluirEnGastoBancario !== false}
              onChange={(event) =>
                updateExpenseInclusion(gasto, "bancario", event.target.checked)
              }
              type="checkbox"
            />
            <span>Bancario</span>
          </label>
          <label>
            <input
              checked={gasto.incluirEnGastoReal !== false}
              onChange={(event) =>
                updateExpenseInclusion(gasto, "real", event.target.checked)
              }
              type="checkbox"
            />
            <span>Real</span>
          </label>
        </div>
      ),
    },
    {
      key: "mover",
      header: "Mover",
      render: (gasto) => (
        <select
          className="table-select"
          onChange={(event) => moveExpenseToAccount(gasto, event.target.value)}
          value=""
        >
          <option value="">Mover a...</option>
          {cuentas
            .filter((cuenta) => cuenta._id !== selectedCuenta)
            .map((cuenta) => (
              <option key={cuenta._id} value={cuenta._id}>
                {cuenta.nombre}
              </option>
            ))}
        </select>
      ),
    },
    {
      key: "factura",
      header: "Factura",
      render: (gasto) =>
        gasto.facturaUrl ? (
          <a
            className="text-link table-link"
            href={gasto.facturaUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver
          </a>
        ) : (
          "N/A"
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (gasto) => (
        <div className="table-actions">
          <EditIconButton onClick={() => setEditingExpense(gasto)} />
          <DeleteIconButton onClick={() => deleteExpense(gasto)} />
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
      subtitle="Vista de gastos filtrada por cuenta, con totales y edicion multiple."
      title="Gastos por Cuenta"
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      <Card title="Cuenta">
        <div className="form-grid">
          <FormField id="accountExpenseCuenta" label="Cuenta">
            <select
              id="accountExpenseCuenta"
              onChange={(event) => setSelectedCuenta(event.target.value)}
              value={selectedCuenta}
            >
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <div className="button-row">
            <Button disabled={!selectedCuenta} onClick={() => setIsCreateOpen(true)}>
              Crear gasto en cuenta
            </Button>
          </div>
        </div>
      </Card>

      <section className="metric-grid metric-grid-wide">
        <MetricCard label="Gasto bancario" value={formatCurrency(Math.abs(totals.bancario))} />
        <MetricCard label="Gasto real" value={formatCurrency(Math.abs(totals.real))} />
        <MetricCard
          label={isCreditCardAccount ? "Saldo tarjeta" : "Saldo bancario"}
          value={formatCurrency(totals.saldo)}
        />
        <MetricCard label="Gastos visibles" value={gastos.length} />
      </section>

      <section className="dashboard-grid dashboard-grid-spaced">
        <Card title="Filtros">
          <form className="expense-filters" onSubmit={applyFilters}>
            <PeriodFilter
              filters={filters}
              idPrefix="accountFilter"
              onChange={updateFilter}
            />
            <FormField id="accountFilterCategoria" label="Categoria">
              <select
                id="accountFilterCategoria"
                onChange={(event) => updateFilter("categoria", event.target.value)}
                value={filters.categoria}
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria._id} value={categoria._id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="accountFilterSearch" label="Buscar">
              <input
                id="accountFilterSearch"
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Descripcion"
                value={filters.search}
              />
            </FormField>
            <div className="button-row expense-filter-actions">
              <Button disabled={loading || !selectedCuenta} type="submit">
                {loading ? "Cargando..." : "Aplicar"}
              </Button>
              <Button onClick={resetFilters} variant="secondary">
                Limpiar
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Totales por categoria">
          <div className="ranked-list">
            {categoryTotals.length ? (
              categoryTotals.map((item) => (
                <article className="ranked-item" key={item.nombre}>
                  <span>{item.nombre}</span>
                  <strong>{formatCurrency(item.total)}</strong>
                </article>
              ))
            ) : (
              <p className="empty-state">No hay datos.</p>
            )}
          </div>
        </Card>
      </section>

      <Card className="expenses-table-card" title="Edicion Multiple">
        <div className="bulk-actions">
          <FormField id="accountBulkCategoria" label="Categoria">
            <select
              id="accountBulkCategoria"
              onChange={(event) =>
                setBulkValues((current) => ({ ...current, categoria: event.target.value }))
              }
              value={bulkValues.categoria}
            >
              <option value="">No cambiar</option>
              {categorias.map((categoria) => (
                <option key={categoria._id} value={categoria._id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="accountBulkPorcentaje" label="Porcentaje real">
            <input
              id="accountBulkPorcentaje"
              onChange={(event) =>
                setBulkValues((current) => ({
                  ...current,
                  porcentajeEconomiaReal: event.target.value,
                }))
              }
              placeholder="No cambiar"
              type="number"
              value={bulkValues.porcentajeEconomiaReal}
            />
          </FormField>
          <FormField id="accountBulkCuenta" label="Mover a cuenta">
            <select
              id="accountBulkCuenta"
              onChange={(event) =>
                setBulkValues((current) => ({ ...current, cuenta: event.target.value }))
              }
              value={bulkValues.cuenta}
            >
              <option value="">No mover</option>
              {cuentas
                .filter((cuenta) => cuenta._id !== selectedCuenta)
                .map((cuenta) => (
                  <option key={cuenta._id} value={cuenta._id}>
                    {cuenta.nombre}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField id="accountBulkBancario" label="Incluir bancario">
            <select
              id="accountBulkBancario"
              onChange={(event) =>
                setBulkValues((current) => ({
                  ...current,
                  incluirEnGastoBancario: event.target.value,
                }))
              }
              value={bulkValues.incluirEnGastoBancario}
            >
              <option value="">No cambiar</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </FormField>
          <FormField id="accountBulkReal" label="Incluir real">
            <select
              id="accountBulkReal"
              onChange={(event) =>
                setBulkValues((current) => ({
                  ...current,
                  incluirEnGastoReal: event.target.value,
                }))
              }
              value={bulkValues.incluirEnGastoReal}
            >
              <option value="">No cambiar</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </FormField>
        </div>
        <div className="button-row">
          <Button onClick={applyBulkChanges} variant="secondary">
            Aplicar seleccionados
          </Button>
          <Button onClick={saveOrder} variant="secondary">
            Guardar orden visible
          </Button>
          <Button onClick={deleteSelected} variant="danger">
            Eliminar seleccionados
          </Button>
        </div>
        <p className="selection-note">Seleccionados: {selectedIds.size}</p>
      </Card>

      <Card className="expenses-table-card continuous-table-card" title="Gastos">
        <div className="continuous-table">
          <DataTable
            columns={columns}
            emptyMessage="No hay gastos para esta cuenta/filtro."
            getRowProps={(gasto) => ({
              className: draggedId === gasto._id ? "dragging-row" : "",
              draggable: true,
              onDragOver: (event) => event.preventDefault(),
              onDragStart: () => setDraggedId(gasto._id),
              onDrop: () => {
                reorderExpenses(draggedId, gasto._id);
                setDraggedId("");
              },
              onDragEnd: () => setDraggedId(""),
            })}
            items={gastos}
            rowKey={(gasto) => gasto._id}
          />
        </div>
      </Card>

      <Modal
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        title="Crear gasto en cuenta"
      >
        <ExpenseForm
          categorias={categorias}
          cuentas={cuentas.filter((cuenta) => cuenta._id === selectedCuenta)}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        onClose={() => setEditingExpense(null)}
        open={Boolean(editingExpense)}
        title="Editar gasto"
      >
        <ExpenseForm
          categorias={categorias}
          cuentas={cuentas.filter((cuenta) => cuenta._id === selectedCuenta)}
          expense={editingExpense}
          onCancel={() => setEditingExpense(null)}
          onSubmit={handleEdit}
          submitLabel="Guardar cambios"
        />
      </Modal>
    </PageLayout>
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
