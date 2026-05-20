import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
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

function currentMonthFilters() {
  return {
    ...currentMonthPeriod(),
    categoria: "",
    cuenta: "",
    search: "",
    estado: "",
  };
}

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

export function Expenses({ onLogout }) {
  const [filters, setFilters] = useState(currentMonthFilters);
  const [appliedFilters, setAppliedFilters] = useState(currentMonthFilters);
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [bulkValues, setBulkValues] = useState({
    categoria: "",
    cuenta: "",
    porcentajeEconomiaReal: "",
  });
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);

  const user = getUser();

  const loadResources = useCallback(async () => {
    const [categoriasResp, cuentasResp] = await Promise.all([
      apiRequest("/categorias"),
      apiRequest("/cuentas"),
    ]);

    setCategorias(normalizeItems(categoriasResp));
    setCuentas(normalizeItems(cuentasResp));
  }, []);

  const loadExpenses = useCallback(async (nextFilters, nextPage) => {
    setLoading(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      const { fechaDesde, fechaHasta } = buildDateRange(nextFilters);
      const params = new URLSearchParams();
      params.set("pagina", String(nextPage));
      params.set("fechaDesde", fechaDesde);
      params.set("fechaHasta", fechaHasta);
      if (nextFilters.categoria) params.set("categoria", nextFilters.categoria);
      if (nextFilters.cuenta) params.set("cuenta", nextFilters.cuenta);
      if (nextFilters.search.trim()) params.set("busqueda", nextFilters.search.trim());
      if (nextFilters.estado) params.set("estado", nextFilters.estado);

      const response = await apiRequest(`/gastos?${params.toString()}`);
      const items = normalizeItems(response);
      setGastos(items);
      setHasNextPage(items.length === 20);
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
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        await loadResources();
        await loadExpenses(currentMonthFilters(), 1);
      } catch (error) {
        setStatus({
          type: "error",
          title: "No se pudieron cargar datos",
          message: error.message,
        });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadExpenses, loadResources]);

  const totals = useMemo(() => {
    return gastos.reduce(
      (acc, gasto) => {
        if (gasto.estado === "pendiente") {
          acc.pendientes++;
          return acc;
        }

        acc.creados++;

        if (gasto.incluirEnGastoBancario !== false) {
          acc.bancario += Number(gasto.flujoBancario || 0);
        }

        if (gasto.incluirEnGastoReal !== false) {
          acc.real += Number(gasto.economiaReal || 0);
        }

        return acc;
      },
      { bancario: 0, real: 0, creados: 0, pendientes: 0 },
    );
  }, [gastos]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(1);
    await loadExpenses(filters, 1);
  }

  async function resetFilters() {
    const next = currentMonthFilters();
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
    await loadExpenses(next, 1);
  }

  async function handleCreate(payload) {
    const { facturaFile, ...gastoPayload } = payload;

    try {
      const response = await apiRequest("/gastos", {
        method: "POST",
        body: gastoPayload,
      });
      const created = getApiData(response);

      if (facturaFile && created?._id) {
        await uploadApiFile(`/gastos/${created._id}/factura`, "factura", facturaFile);
      }

      setIsCreateOpen(false);
      setStatus({
        type: "success",
        title: "Gasto creado",
        message: "El gasto se guardo correctamente.",
      });
      await loadExpenses(appliedFilters, page);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo crear",
        message: error.message,
      });
    }
  }

  async function handleEdit(payload) {
    if (!editingExpense?._id) return;
    const { facturaFile, ...gastoPayload } = payload;

    try {
      await apiRequest(`/gastos/${editingExpense._id}`, {
        method: "PATCH",
        body: gastoPayload,
      });

      if (facturaFile) {
        await uploadApiFile(
          `/gastos/${editingExpense._id}/factura`,
          "factura",
          facturaFile,
        );
      }

      setEditingExpense(null);
      setStatus({
        type: "success",
        title: "Gasto actualizado",
        message: "Los cambios se guardaron correctamente.",
      });
      await loadExpenses(appliedFilters, page);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo editar",
        message: error.message,
      });
    }
  }

  async function handleDelete(gasto) {
    const confirmed = window.confirm(`Eliminar ${gasto.descripcion}?`);
    if (!confirmed) return;

    try {
      await apiRequest(`/gastos/${gasto._id}`, { method: "DELETE" });
      setStatus({
        type: "success",
        title: "Gasto eliminado",
        message: "El gasto se elimino correctamente.",
      });
      await loadExpenses(appliedFilters, page);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo eliminar",
        message: error.message,
      });
    }
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllSelected(checked) {
    setSelectedIds(checked ? new Set(gastos.map((gasto) => gasto._id)) : new Set());
  }

  function updateBulkField(field, value) {
    setBulkValues((current) => ({ ...current, [field]: value }));
  }

  async function applyBulkChanges() {
    const selectedExpenses = gastos.filter((gasto) => selectedIds.has(gasto._id));

    if (!selectedExpenses.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message: "Selecciona al menos un gasto.",
      });
      return;
    }

    const hasCategoria = bulkValues.categoria !== "";
    const hasCuenta = bulkValues.cuenta !== "";
    const hasPorcentaje = bulkValues.porcentajeEconomiaReal !== "";

    if (!hasCategoria && !hasCuenta && !hasPorcentaje) {
      setStatus({
        type: "error",
        title: "Sin cambios",
        message: "Elige categoria, cuenta o porcentaje para aplicar.",
      });
      return;
    }

    const porcentaje = hasPorcentaje
      ? Number(bulkValues.porcentajeEconomiaReal)
      : null;

    if (
      hasPorcentaje &&
      (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100)
    ) {
      setStatus({
        type: "error",
        title: "Porcentaje invalido",
        message: "El porcentaje debe estar entre 0 y 100.",
      });
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const gasto of selectedExpenses) {
      if (gasto.estado === "pendiente" && !bulkValues.cuenta && !bulkValues.categoria) {
        failed++;
        continue;
      }

      try {
        const nextPercentage = hasPorcentaje
          ? porcentaje
          : Number(gasto.porcentajeEconomiaReal || 0);
        const nextFlow = Number(gasto.flujoBancario || 0);
        const nextReal = Number((nextFlow * (nextPercentage / 100)).toFixed(2));

        await apiRequest(`/gastos/${gasto._id}`, {
          method: "PATCH",
          body: {
            fecha: gasto.fecha,
            descripcion: gasto.descripcion,
            flujoBancario: nextFlow,
            economiaReal: nextReal,
            porcentajeEconomiaReal: nextPercentage,
            categoria: hasCategoria
              ? bulkValues.categoria
              : gasto.categoria?._id || gasto.categoria,
            cuenta: hasCuenta ? bulkValues.cuenta : gasto.cuenta?._id || gasto.cuenta,
            incluirEnGastoBancario: gasto.incluirEnGastoBancario !== false,
            incluirEnGastoReal: gasto.incluirEnGastoReal !== false,
          },
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
    setBulkValues({ categoria: "", cuenta: "", porcentajeEconomiaReal: "" });
    await loadExpenses(appliedFilters, page);
  }

  async function deleteSelected() {
    const selectedExpenses = gastos.filter((gasto) => selectedIds.has(gasto._id));

    if (!selectedExpenses.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message: "Selecciona al menos un gasto.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Eliminar ${selectedExpenses.length} gasto(s) seleccionado(s)?`,
    );
    if (!confirmed) return;

    let deleted = 0;
    let failed = 0;

    for (const gasto of selectedExpenses) {
      try {
        await apiRequest(`/gastos/${gasto._id}`, { method: "DELETE" });
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
    await loadExpenses(appliedFilters, page);
  }

  async function goToPage(nextPage) {
    if (nextPage < 1) return;
    setPage(nextPage);
    await loadExpenses(appliedFilters, nextPage);
  }

  const columns = [
    {
      key: "select",
      header: (
        <input
          aria-label="Seleccionar todos los gastos visibles"
          checked={gastos.length > 0 && selectedIds.size === gastos.length}
          onChange={(event) => toggleAllSelected(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (gasto) => (
        <input
          aria-label={`Seleccionar ${gasto.descripcion}`}
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
    {
      key: "fecha",
      header: "Fecha",
      render: (gasto) => formatDate(gasto.fecha),
    },
    {
      key: "descripcion",
      header: "Descripcion",
      render: (gasto) => gasto.descripcion || "N/A",
    },
    {
      key: "cuenta",
      header: "Cuenta",
      render: (gasto) => gasto.cuenta?.nombre || "N/A",
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (gasto) => gasto.categoria?.nombre || "N/A",
    },
    {
      key: "flujo",
      header: "Bancario",
      render: (gasto) => formatCurrency(gasto.flujoBancario),
    },
    {
      key: "real",
      header: "Real",
      render: (gasto) => formatCurrency(gasto.economiaReal),
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
          <Button onClick={() => setEditingExpense(gasto)} variant="secondary">
            {gasto.estado === "pendiente" ? "Completar" : "Editar"}
          </Button>
          <Button onClick={() => handleDelete(gasto)} variant="danger">
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
      subtitle="Gestion de gastos migrada a componentes reutilizables."
      title="Mis Gastos"
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
        <MetricCard label="Gastos listados" value={gastos.length} />
        <MetricCard label="Creados" value={totals.creados} />
        <MetricCard label="Pendientes" value={totals.pendientes} />
        <MetricCard
          label="Total bancario"
          value={formatCurrency(Math.abs(totals.bancario))}
        />
        <MetricCard
          label="Total real"
          value={formatCurrency(Math.abs(totals.real))}
        />
      </section>

      <Card title="Filtros">
        <form className="expense-filters" onSubmit={applyFilters}>
          <PeriodFilter
            filters={filters}
            idPrefix="expenseFilter"
            onChange={updateFilter}
          />

          <FormField id="expenseFilterSearch" label="Descripcion">
            <input
              id="expenseFilterSearch"
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Buscar por nombre o descripcion"
              value={filters.search}
            />
          </FormField>

          <FormField id="expenseFilterCategoria" label="Categoria">
            <select
              id="expenseFilterCategoria"
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

          <FormField id="expenseFilterCuenta" label="Cuenta">
            <select
              id="expenseFilterCuenta"
              onChange={(event) => updateFilter("cuenta", event.target.value)}
              value={filters.cuenta}
            >
              <option value="">Todas</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="expenseFilterEstado" label="Estado">
            <select
              id="expenseFilterEstado"
              onChange={(event) => updateFilter("estado", event.target.value)}
              value={filters.estado}
            >
              <option value="">Todos</option>
              <option value="creado">Creados</option>
              <option value="pendiente">Pendientes</option>
            </select>
          </FormField>

          <div className="button-row expense-filter-actions">
            <Button disabled={loading} type="submit">
              {loading ? "Cargando..." : "Aplicar"}
            </Button>
            <Button onClick={resetFilters} variant="secondary">
              Limpiar
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} variant="secondary">
              Crear gasto
            </Button>
          </div>
        </form>
      </Card>

      <Card className="expenses-table-card" title="Acciones masivas">
        <div className="bulk-actions">
          <FormField id="bulkCategoria" label="Categoria">
            <select
              id="bulkCategoria"
              onChange={(event) => updateBulkField("categoria", event.target.value)}
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

          <FormField id="bulkCuenta" label="Cuenta">
            <select
              id="bulkCuenta"
              onChange={(event) => updateBulkField("cuenta", event.target.value)}
              value={bulkValues.cuenta}
            >
              <option value="">No cambiar</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="bulkPorcentaje" label="Porcentaje real">
            <input
              id="bulkPorcentaje"
              max="100"
              min="0"
              onChange={(event) =>
                updateBulkField("porcentajeEconomiaReal", event.target.value)
              }
              placeholder="No cambiar"
              step="0.01"
              type="number"
              value={bulkValues.porcentajeEconomiaReal}
            />
          </FormField>

          <div className="button-row expense-filter-actions">
            <Button onClick={applyBulkChanges} variant="secondary">
              Aplicar a seleccionados
            </Button>
            <Button onClick={deleteSelected} variant="danger">
              Eliminar seleccionados
            </Button>
          </div>
        </div>
        <p className="selection-note">
          Seleccionados en esta pagina: {selectedIds.size}
        </p>
      </Card>

      <Card className="expenses-table-card" title="Listado de gastos">
        <DataTable
          columns={columns}
          emptyMessage="No hay gastos para el filtro seleccionado."
          getRowProps={(gasto) => ({
            className: gasto.estado === "pendiente" ? "pending-row" : "",
          })}
          items={gastos}
          rowKey={(gasto) => gasto._id}
        />
        <div className="pagination-row">
          <Button
            disabled={loading || page === 1}
            onClick={() => goToPage(page - 1)}
            variant="secondary"
          >
            Anterior
          </Button>
          <span>Pagina {page}</span>
          <Button
            disabled={loading || !hasNextPage}
            onClick={() => goToPage(page + 1)}
            variant="secondary"
          >
            Siguiente
          </Button>
        </div>
      </Card>

      <Modal
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        title="Crear Gasto"
      >
        <ExpenseForm
          key="create-expense"
          categorias={categorias}
          cuentas={cuentas}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        onClose={() => setEditingExpense(null)}
        open={Boolean(editingExpense)}
        title="Editar Gasto"
      >
        <ExpenseForm
          key={editingExpense?._id || "edit-expense"}
          categorias={categorias}
          cuentas={cuentas}
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
